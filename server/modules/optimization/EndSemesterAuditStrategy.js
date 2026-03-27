/**
 * EndSemesterAuditStrategy — Concrete Strategy for end-semester workload auditing.
 *
 * During the end-semester phase, project assignments are largely finalized and
 * transfers are restricted to prevent disruption of active defense schedules.
 * This strategy applies a higher imbalance threshold before recommending any action
 * and generates conservative, audit-focused suggestions that flag critical overloads
 * for instructor review without proposing blanket reassignments.
 *
 * @module modules/optimization/EndSemesterAuditStrategy
 */
import { WorkloadOptimizationStrategy } from './WorkloadOptimizationStrategy.js';

/** Higher threshold: only flag severe end-semester overloads. */
const END_SEMESTER_IMBALANCE_THRESHOLD = 6;

/** Conservative reduction estimate — transfers are limited near defense season. */
const REDUCTION_FACTOR = 0.25;

export class EndSemesterAuditStrategy extends WorkloadOptimizationStrategy {
  get strategyName() {
    return 'EndSemesterAuditStrategy';
  }

  /**
   * Performs a conservative audit of adviser workloads. Only surfaces critical
   * overloads that exceed the high end-semester threshold, and restricts transfer
   * suggestions to non-defense-phase projects.
   *
   * @param {Object} workload
   * @param {Array<Object>} workload.advisers
   * @param {Object} workload.summary
   * @returns {Promise<Object>}
   */
  async executeOptimization(workload) {
    const { advisers, summary } = workload;

    if (advisers.length < 2) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason: 'At least two advisers are needed for an end-semester audit.',
        suggestions: [],
        snapshot: null,
      };
    }

    const heaviest = advisers[0];
    const lightest = advisers[advisers.length - 1];
    const scoreGap = heaviest.workloadScore - lightest.workloadScore;

    // Flag advisers whose score significantly exceeds the cohort average
    const criticalOverloads = advisers.filter(
      (a) => a.workloadScore > summary.averageScore + END_SEMESTER_IMBALANCE_THRESHOLD,
    );

    if (scoreGap < END_SEMESTER_IMBALANCE_THRESHOLD && criticalOverloads.length === 0) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason:
          'End-semester workload distribution is within acceptable bounds. No transfers recommended.',
        suggestions: [],
        snapshot: { heaviest, lightest, scoreGap: Number(scoreGap.toFixed(2)) },
      };
    }

    // End-semester: only propose targeted relief for critically overloaded advisers
    const suggestions = criticalOverloads.map((overloaded) => {
      const gap = overloaded.workloadScore - lightest.workloadScore;
      return {
        fromAdviserId: overloaded.adviserId,
        fromAdviserName: overloaded.adviserName,
        toAdviserId: lightest.adviserId,
        toAdviserName: lightest.adviserName,
        action: `AUDIT FLAG: ${overloaded.adviserName} is critically overloaded near end-semester. Review pending projects for potential transfer (non-defense phase only).`,
        estimatedScoreGapReduction: Number((gap * REDUCTION_FACTOR).toFixed(2)),
        restrictionNote:
          'Transfers restricted to projects not yet in defense phase. Instructor review required.',
      };
    });

    return {
      strategy: this.strategyName,
      suggested: suggestions.length > 0,
      reason:
        suggestions.length > 0
          ? 'End-semester audit detected critical adviser overloads requiring instructor review.'
          : 'Minor imbalance detected but end-semester transfer restrictions apply.',
      suggestions,
      snapshot: {
        heaviest,
        lightest,
        scoreGap: Number(scoreGap.toFixed(2)),
        criticalOverloadCount: criticalOverloads.length,
      },
    };
  }
}
