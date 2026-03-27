/**
 * Unit tests for the Strategy Design Pattern implementation:
 *   - WorkloadOptimizationStrategy (abstract base)
 *   - MidSemesterBalancingStrategy
 *   - EndSemesterAuditStrategy
 *   - WorkloadOptimizationContext
 */
import { describe, it, expect } from 'vitest';

import { WorkloadOptimizationStrategy } from '../../modules/optimization/WorkloadOptimizationStrategy.js';
import { MidSemesterBalancingStrategy } from '../../modules/optimization/MidSemesterBalancingStrategy.js';
import { EndSemesterAuditStrategy } from '../../modules/optimization/EndSemesterAuditStrategy.js';
import { WorkloadOptimizationContext } from '../../modules/optimization/WorkloadOptimizationContext.js';

/* ─────────────── Fixtures ─────────────── */

const makeWorkload = (advisers) => ({
  advisers,
  summary: {
    adviserCount: advisers.length,
    averageScore:
      advisers.length > 0
        ? Number(
            (advisers.reduce((acc, a) => acc + a.workloadScore, 0) / advisers.length).toFixed(2),
          )
        : 0,
  },
});

const adviser = (id, name, score) => ({
  adviserId: id,
  adviserName: name,
  workloadScore: score,
  projectCount: 3,
  pending: 1,
  revisions: 1,
  overdue: 0,
});

/* ─────────────── WorkloadOptimizationStrategy (abstract base) ─────────────── */

describe('WorkloadOptimizationStrategy (abstract base)', () => {
  it('should throw when executeOptimization() is called directly on the base class', async () => {
    const base = new WorkloadOptimizationStrategy();
    await expect(base.executeOptimization({})).rejects.toThrow(
      'executeOptimization() must be implemented',
    );
  });

  it('should return the class name as strategyName', () => {
    const base = new WorkloadOptimizationStrategy();
    expect(base.strategyName).toBe('WorkloadOptimizationStrategy');
  });
});

/* ─────────────── MidSemesterBalancingStrategy ─────────────── */

describe('MidSemesterBalancingStrategy', () => {
  const strategy = new MidSemesterBalancingStrategy();

  it('should return strategyName as "MidSemesterBalancingStrategy"', () => {
    expect(strategy.strategyName).toBe('MidSemesterBalancingStrategy');
  });

  it('should return suggested=false when fewer than 2 advisers exist', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 10)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(false);
    expect(result.strategy).toBe('MidSemesterBalancingStrategy');
  });

  it('should return suggested=false when score gap is below mid-semester threshold (3)', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 5), adviser('a2', 'Bob', 3)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(false);
  });

  it('should return suggestions when score gap exceeds mid-semester threshold', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 12), adviser('a2', 'Bob', 2)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].fromAdviserName).toBe('Alice');
    expect(result.suggestions[0].toAdviserName).toBe('Bob');
  });

  it('should include a snapshot in the result', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 12), adviser('a2', 'Bob', 2)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot.scoreGap).toBeCloseTo(10, 1);
  });
});

/* ─────────────── EndSemesterAuditStrategy ─────────────── */

describe('EndSemesterAuditStrategy', () => {
  const strategy = new EndSemesterAuditStrategy();

  it('should return strategyName as "EndSemesterAuditStrategy"', () => {
    expect(strategy.strategyName).toBe('EndSemesterAuditStrategy');
  });

  it('should return suggested=false when fewer than 2 advisers exist', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 10)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(false);
    expect(result.strategy).toBe('EndSemesterAuditStrategy');
  });

  it('should return suggested=false when score gap is below end-semester threshold (6)', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 7), adviser('a2', 'Bob', 5)]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(false);
  });

  it('should flag critical overloads exceeding average + threshold', async () => {
    const workload = makeWorkload([
      adviser('a1', 'Alice', 20),
      adviser('a2', 'Bob', 5),
      adviser('a3', 'Charlie', 4),
    ]);
    const result = await strategy.executeOptimization(workload);
    expect(result.suggested).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].action).toMatch(/AUDIT FLAG/);
  });

  it('should include restrictionNote in end-semester suggestions', async () => {
    const workload = makeWorkload([
      adviser('a1', 'Alice', 20),
      adviser('a2', 'Bob', 4),
    ]);
    const result = await strategy.executeOptimization(workload);
    if (result.suggestions.length > 0) {
      expect(result.suggestions[0].restrictionNote).toBeDefined();
    }
  });
});

/* ─────────────── WorkloadOptimizationContext ─────────────── */

describe('WorkloadOptimizationContext', () => {
  it('should resolve mid_semester strategy by mode key', () => {
    const ctx = new WorkloadOptimizationContext();
    ctx.resolveStrategy('mid_semester');
    expect(ctx.activeStrategyName).toBe('MidSemesterBalancingStrategy');
  });

  it('should resolve end_semester strategy by mode key', () => {
    const ctx = new WorkloadOptimizationContext();
    ctx.resolveStrategy('end_semester');
    expect(ctx.activeStrategyName).toBe('EndSemesterAuditStrategy');
  });

  it('should throw for unknown mode keys', () => {
    const ctx = new WorkloadOptimizationContext();
    expect(() => ctx.resolveStrategy('unknown_mode')).toThrow(
      'Unknown optimization mode: "unknown_mode"',
    );
  });

  it('should accept an injected strategy instance via setStrategy()', () => {
    const ctx = new WorkloadOptimizationContext();
    const strategy = new MidSemesterBalancingStrategy();
    ctx.setStrategy(strategy);
    expect(ctx.activeStrategyName).toBe('MidSemesterBalancingStrategy');
  });

  it('should reject non-strategy objects via setStrategy()', () => {
    const ctx = new WorkloadOptimizationContext();
    expect(() => ctx.setStrategy({ executeOptimization: () => {} })).toThrow(
      'strategy must be an instance of WorkloadOptimizationStrategy',
    );
  });

  it('should throw when executeOptimization() is called with no strategy set', async () => {
    const ctx = new WorkloadOptimizationContext();
    await expect(ctx.executeOptimization({})).rejects.toThrow('No strategy is set');
  });

  it('should delegate execution to the active strategy', async () => {
    const workload = makeWorkload([adviser('a1', 'Alice', 12), adviser('a2', 'Bob', 2)]);
    const ctx = new WorkloadOptimizationContext();
    ctx.resolveStrategy('mid_semester');
    const result = await ctx.executeOptimization(workload);
    expect(result.strategy).toBe('MidSemesterBalancingStrategy');
    expect(result.suggested).toBe(true);
  });

  it('should list all available mode keys', () => {
    const modes = WorkloadOptimizationContext.getAvailableModes();
    expect(modes).toContain('mid_semester');
    expect(modes).toContain('end_semester');
  });
});
