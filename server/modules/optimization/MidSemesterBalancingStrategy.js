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
  async executeOptimization(workload, options = {}) {
    const roleScope = options.roleScope || 'all';
    const advisers = workload.advisers || [];
    const panelists = workload.panelists || [];
    const faculty = workload.faculty || [];

    const targetPool =
      roleScope === 'panelist' && panelists.length > 0
        ? panelists
        : roleScope === 'adviser' && advisers.length > 0
          ? advisers
          : faculty.length >= 2
            ? faculty
            : advisers;

    if (targetPool.length < 2) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason:
          roleScope === 'panelist'
            ? 'At least two panelists are needed for balancing suggestions.'
            : roleScope === 'adviser'
              ? 'At least two advisers are needed for balancing suggestions.'
              : 'At least two faculty members or committee members are needed for balancing suggestions.',
        suggestions: [],
        snapshot: null,
      };
    }

    const heaviest = targetPool[0];
    const lightest = targetPool[targetPool.length - 1];
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

    // Mid-semester: generate suggestions for top-heavy members against all lighter ones
    const suggestions = targetPool
      .slice(0, Math.ceil(targetPool.length / 2))
      .flatMap((overloaded) => {
        const overloadedId = overloaded.facultyId || overloaded.panelistId || overloaded.adviserId;
        const overloadedName =
          overloaded.facultyName || overloaded.panelistName || overloaded.adviserName;
        const roleLabel =
          overloaded.roleType ||
          (roleScope === 'panelist'
            ? 'panelist'
            : roleScope === 'adviser'
              ? 'adviser'
              : 'committee member');

        const underloaded = targetPool.filter((a) => {
          const aId = a.facultyId || a.panelistId || a.adviserId;
          return (
            aId.toString() !== overloadedId.toString() &&
            a.workloadScore < overloaded.workloadScore - MID_SEMESTER_IMBALANCE_THRESHOLD
          );
        });

        return underloaded.map((target) => {
          const targetId = target.facultyId || target.panelistId || target.adviserId;
          const targetName = target.facultyName || target.panelistName || target.adviserName;
          const gap = overloaded.workloadScore - target.workloadScore;
          return {
            fromAdviserId: overloadedId,
            fromAdviserName: overloadedName,
            toAdviserId: targetId,
            toAdviserName: targetName,
            fromFacultyId: overloadedId,
            fromFacultyName: overloadedName,
            toFacultyId: targetId,
            toFacultyName: targetName,
            roleType: roleLabel,
            action: `Reassign 1-2 pending ${roleLabel} assignments from ${overloadedName} to ${targetName} to reduce mid-semester pressure.`,
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
