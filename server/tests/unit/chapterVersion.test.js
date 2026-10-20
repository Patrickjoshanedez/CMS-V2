import { beforeEach, describe, expect, it, vi } from 'vitest';

const model = vi.hoisted(() => ({ updateOne: vi.fn(), findOneAndUpdate: vi.fn() }));
vi.mock('../../modules/submissions/submissionVersion.model.js', () => ({ default: model }));
import { reserveChapterVersion } from '../../modules/submissions/chapterVersion.service.js';

// These tests check allocation policy and error handling with a model double.
// MongoDB atomicity and competing-process behavior require the separate isolated benchmark.
describe('reserveChapterVersion allocation policy', () => {
  let counters;

  beforeEach(() => {
    counters = new Map();
    model.updateOne.mockReset().mockImplementation(async (filter, update, options) => {
      let counter = counters.get(filter._id);
      if (!counter && !options.upsert) return { matchedCount: 0 };
      counter ||= { version: -Infinity, revisionRound: -Infinity };
      for (const [field, value] of Object.entries(update.$max)) {
        counter[field] = Math.max(counter[field], value);
      }
      counters.set(filter._id, counter);
      return { matchedCount: 1 };
    });
    model.findOneAndUpdate.mockReset().mockImplementation((filter, update) => ({
      lean: async () => {
        const counter = counters.get(filter._id);
        if (!counter) return null;
        for (const [field, value] of Object.entries(update.$inc)) counter[field] += value;
        return { ...counter };
      },
    }));
  });

  it('allocates version 1 and revision round 0 for a new chapter', async () => {
    await expect(reserveChapterVersion('project-a', 1)).resolves.toEqual({
      version: 1,
      revisionRound: 0,
    });
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: 'chapter:project-a:1' },
      { $max: { version: 0, revisionRound: -1 } },
      { upsert: true, setDefaultsOnInsert: false },
    );
  });

  it('continues a legacy chapter from version 7 and revision round 3', async () => {
    await expect(
      reserveChapterVersion('project-a', 2, { version: 7, revisionRound: 3 }),
    ).resolves.toEqual({ version: 8, revisionRound: 4 });
  });

  it('treats a legacy missing revision round as round 0 before reserving round 1', async () => {
    await expect(reserveChapterVersion('project-a', 1, { version: 7 })).resolves.toEqual({
      version: 8,
      revisionRound: 1,
    });
  });

  it('does not rewind allocations when a later caller supplies a stale latest submission', async () => {
    const first = await reserveChapterVersion('project-a', 1, { version: 7, revisionRound: 3 });
    const second = await reserveChapterVersion('project-a', 1, { version: 2, revisionRound: 1 });
    const third = await reserveChapterVersion('project-a', 1);
    expect([first, second, third]).toEqual([
      { version: 8, revisionRound: 4 },
      { version: 9, revisionRound: 5 },
      { version: 10, revisionRound: 6 },
    ]);
  });

  it('keeps projects and chapters in independent allocation scopes', async () => {
    expect(await reserveChapterVersion('project-a', 1)).toEqual({ version: 1, revisionRound: 0 });
    expect(await reserveChapterVersion('project-a', 2)).toEqual({ version: 1, revisionRound: 0 });
    expect(await reserveChapterVersion('project-b', 1)).toEqual({ version: 1, revisionRound: 0 });
    expect(await reserveChapterVersion('project-a', '1')).toEqual({ version: 2, revisionRound: 1 });
    expect([...counters.keys()].sort()).toEqual([
      'chapter:project-a:1',
      'chapter:project-a:2',
      'chapter:project-b:1',
    ]);
  });

  it('recovers an initializer duplicate-key race by reconciling the winning counter', async () => {
    counters.set('chapter:project-a:1', { version: 4, revisionRound: 2 });
    model.updateOne.mockRejectedValueOnce(
      Object.assign(new Error('duplicate key'), { code: 11000 }),
    );
    await expect(
      reserveChapterVersion('project-a', 1, { version: 7, revisionRound: 3 }),
    ).resolves.toEqual({ version: 8, revisionRound: 4 });
    expect(model.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'chapter:project-a:1' },
      { $max: { version: 7, revisionRound: 3 } },
      { upsert: false },
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('propagates nonduplicate initialization errors without reserving a version', async () => {
    const failure = Object.assign(new Error('database unavailable'), { code: 91 });
    model.updateOne.mockRejectedValueOnce(failure);
    await expect(reserveChapterVersion('project-a', 1)).rejects.toBe(failure);
    expect(model.updateOne).toHaveBeenCalledTimes(1);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('propagates reconciliation failure instead of claiming a reserved version', async () => {
    const failure = new Error('reconciliation unavailable');
    model.updateOne
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }))
      .mockRejectedValueOnce(failure);
    await expect(reserveChapterVersion('project-a', 1)).rejects.toBe(failure);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('propagates allocation failure without retrying the increment', async () => {
    const failure = new Error('allocation failed');
    model.findOneAndUpdate.mockReturnValueOnce({ lean: () => Promise.reject(failure) });
    await expect(reserveChapterVersion('project-a', 1)).rejects.toBe(failure);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing counter returned by the allocation operation', async () => {
    model.findOneAndUpdate.mockReturnValueOnce({ lean: async () => null });
    await expect(reserveChapterVersion('project-a', 1)).rejects.toMatchObject({
      code: 'CHAPTER_VERSION_RESERVATION_FAILED',
      statusCode: 503,
    });
  });
});
