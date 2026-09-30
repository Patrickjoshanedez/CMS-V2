import { describe, it, expect } from 'vitest';
import {
  filterSignificantIntervals,
  compareAgainstCorpus,
} from '../../services/plagiarism.service.js';

describe('plagiarism denoising & span consolidation', () => {
  it('filters out isolated micro-intervals below minimum word and character thresholds', () => {
    const text = 'The researchers conducted a survey to evaluate system usability metrics.';
    // interval for "The researchers conducted" (~23 chars, 3 words)
    const microInterval = [{ start: 0, end: 23 }];
    const filtered = filterSignificantIntervals(text, microInterval, 8, 40);
    expect(filtered).toHaveLength(0);
  });

  it('preserves substantial intervals meeting or exceeding threshold', () => {
    const text =
      'The researchers conducted a comprehensive survey to evaluate system usability and overall performance under real-world conditions.';
    const substantialInterval = [{ start: 0, end: 110 }];
    const filtered = filterSignificantIntervals(text, substantialInterval, 8, 40);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual({ start: 0, end: 110 });
  });

  it('consolidates and merges contiguous overlapping spans', () => {
    const text =
      'This is a long sentence that repeats and matches across multiple sliding window positions.';
    const overlappingIntervals = [
      { start: 0, end: 35 },
      { start: 20, end: 55 },
      { start: 50, end: 85 },
    ];
    const filtered = filterSignificantIntervals(text, overlappingIntervals, 8, 40);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual({ start: 0, end: 85 });
  });
});
