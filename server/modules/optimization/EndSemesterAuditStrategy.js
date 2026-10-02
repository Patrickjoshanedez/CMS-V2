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
   * Performs a conservative audit of faculty workloads. Only surfaces critical
   * overloads that exceed the high end-semester threshold, and restricts transfer
   * suggestions to non-defense-phase projects.
   *
   * @param {Object} workload
   * @param {Array<Object>} [workload.advisers]
   * @param {Array<Object>} [workload.panelists]
   * @param {Array<Object>} [workload.faculty]
   * @param {Object} workload.summary
   * @param {Object} [options]
   * @param {'all'|'adviser'|'panelist'} [options.roleScope='all']
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
            : advisers.length >= 2
              ? advisers
              : panelists.length >= 2
                ? panelists
                : advisers;

    const summary = workload.summary || {};
    const averageScore =
      summary.averageScore ||
      (targetPool.length > 0
        ? targetPool.reduce((acc, f) => acc + (f.workloadScore || 0), 0) / targetPool.length
        : 0);

    if (targetPool.length < 2) {
      return {
        strategy: this.strategyName,
        suggested: false,
        reason:
          roleScope === 'panelist'
            ? 'At least two panelists are needed for an end-semester audit.'
            : roleScope === 'adviser'
              ? 'At least two advisers are needed for an end-semester audit.'
              : 'At least two faculty members or committee members are needed for an end-semester audit.',
        suggestions: [],
        snapshot: null,
      };
    }

    const heaviest = targetPool[0];
    const lightest = targetPool[targetPool.length - 1];
    const scoreGap = heaviest.workloadScore - lightest.workloadScore;

    // Flag faculty whose score significantly exceeds the cohort average
    const criticalOverloads = targetPool.filter(
      (a) => a.workloadScore > averageScore + END_SEMESTER_IMBALANCE_THRESHOLD,
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

    // End-semester: only propose targeted relief for critically overloaded faculty
    const lightestId = lightest.facultyId || lightest.panelistId || lightest.adviserId;
    const lightestName = lightest.facultyName || lightest.panelistName || lightest.adviserName;

    const suggestions = criticalOverloads.map((overloaded) => {
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
      const gap = overloaded.workloadScore - lightest.workloadScore;

      return {
        fromAdviserId: overloadedId,
        fromAdviserName: overloadedName,
        toAdviserId: lightestId,
        toAdviserName: lightestName,
        fromFacultyId: overloadedId,
        fromFacultyName: overloadedName,
        toFacultyId: lightestId,
        toFacultyName: lightestName,
        roleType: roleLabel,
        action: `AUDIT FLAG: ${overloadedName} is critically overloaded near end-semester (${roleLabel}). Review pending projects for potential transfer (non-defense phase only).`,
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
          ? 'End-semester audit detected critical faculty overloads requiring instructor review.'
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
