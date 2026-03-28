/**
 * MidSemesterBalancingStrategy — Concrete Strategy for mid-semester workload rebalancing.
 *
 * During the mid-semester phase, faculty capacity is still flexible. This strategy
 * prioritizes rapid reassignment of pending and revision-heavy projects to prevent
 * adviser burnout before the end-semester crunch. It applies a lower imbalance
 * threshold and proposes multiple reassignment actions to aggressively flatten the
 * workload distribution curve.
 *
 * @module modules/optimization/MidSemesterBalancingStrategy
 */
import { WorkloadOptimizationStrategy } from './WorkloadOptimizationStrategy.js';

/** Minimum workload score gap that warrants a mid-semester intervention. */
const MID_SEMESTER_IMBALANCE_THRESHOLD = 3;

/** Fraction of the score gap reduction achievable per reassignment action. */
const REDUCTION_FACTOR = 0.45;

export class MidSemesterBalancingStrategy extends WorkloadOptimizationStrategy {
  get strategyName() {
    return 'MidSemesterBalancingStrategy';
  }

  /**
   * Proposes rapid reassignment actions to aggressively balance adviser loads.
   * Unlike end-semester strategy, it also surfaces medium-severity imbalances
   * and generates multiple granular suggestions.
   *
   * @param {Object} workload
   * @param {Array<Object>} workload.advisers
   * @param {Object} workload.summary
   * @returns {Promise<Object>}
   */
  async executeOptimization(workload) {
    const { advisers } = workload;

    if (advisers.length < 2) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason: 'At least two advisers are needed for balancing suggestions.',
        suggestions: [],
        snapshot: null,
      };
    }

    const heaviest = advisers[0];
    const lightest = advisers[advisers.length - 1];
    const scoreGap = heaviest.workloadScore - lightest.workloadScore;

    if (scoreGap < MID_SEMESTER_IMBALANCE_THRESHOLD) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason: 'Workload distribution is within acceptable mid-semester tolerance.',
        suggestions: [],
        snapshot: { heaviest, lightest, scoreGap: Number(scoreGap.toFixed(2)) },
      };
    }

    // Mid-semester: generate suggestions for top-heavy advisers against all lighter ones
    const suggestions = advisers
      .slice(0, Math.ceil(advisers.length / 2))
      .flatMap((overloaded) => {
        const underloaded = advisers.filter(
          (a) =>
            a.adviserId.toString() !== overloaded.adviserId.toString() &&
            a.workloadScore < overloaded.workloadScore - MID_SEMESTER_IMBALANCE_THRESHOLD,
        );

        return underloaded.map((target) => {
          const gap = overloaded.workloadScore - target.workloadScore;
          return {
            fromAdviserId: overloaded.adviserId,
            fromAdviserName: overloaded.adviserName,
            toAdviserId: target.adviserId,
            toAdviserName: target.adviserName,
            action: `Reassign 1-2 pending projects from ${overloaded.adviserName} to ${target.adviserName} to reduce mid-semester pressure.`,
            estimatedScoreGapReduction: Number((gap * REDUCTION_FACTOR).toFixed(2)),
          };
        });
      });

    return {
      strategy: this.strategyName,
      suggested: suggestions.length > 0,
      reason:
        suggestions.length > 0
          ? 'Mid-semester workload imbalance detected. Rapid reassignment recommended.'
          : 'No actionable mid-semester reassignment targets found.',
      suggestions,
      snapshot: {
        heaviest,
        lightest,
        scoreGap: Number(scoreGap.toFixed(2)),
      },
    };
  }
}
