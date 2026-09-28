/**
 * BukSU Institutional Grading Scale Standard (1.00 – 5.00)
 *
 * Official point grade tiers mapped to institutional academic meanings and status indicators:
 * - 1.00, 1.25, 1.50, 1.75, 2.00 : Excellent to Very Good | Passed (Standard Green)
 * - 2.25, 2.50, 2.75             : Good to Satisfactory   | Conditional Pass (Yellow Alert)
 * - 3.00                         : Passing Threshold      | Borderline Pass (Warning Alert)
 * - 5.00                         : Failure                | Failed / Re-defense Required
 */

export const BUKSU_GRADE_SCALE = Object.freeze([
  {
    grade: '1.00',
    minPercentage: 97.0,
    maxPercentage: 100.0,
    meaning: 'Excellent',
    status: 'passed',
    indicator: 'Standard Green',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    grade: '1.25',
    minPercentage: 94.0,
    maxPercentage: 96.99,
    meaning: 'Very Good (High)',
    status: 'passed',
    indicator: 'Standard Green',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    grade: '1.50',
    minPercentage: 91.0,
    maxPercentage: 93.99,
    meaning: 'Very Good',
    status: 'passed',
    indicator: 'Standard Green',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    grade: '1.75',
    minPercentage: 88.0,
    maxPercentage: 90.99,
    meaning: 'Very Good (Satisfactory)',
    status: 'passed',
    indicator: 'Standard Green',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    grade: '2.00',
    minPercentage: 85.0,
    maxPercentage: 87.99,
    meaning: 'Good (Above Average)',
    status: 'passed',
    indicator: 'Standard Green',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    grade: '2.25',
    minPercentage: 82.0,
    maxPercentage: 84.99,
    meaning: 'Good',
    status: 'conditional_pass',
    indicator: 'Yellow Alert',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    grade: '2.50',
    minPercentage: 79.0,
    maxPercentage: 81.99,
    meaning: 'Satisfactory (Above Average)',
    status: 'conditional_pass',
    indicator: 'Yellow Alert',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    grade: '2.75',
    minPercentage: 76.0,
    maxPercentage: 78.99,
    meaning: 'Satisfactory',
    status: 'conditional_pass',
    indicator: 'Yellow Alert',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    grade: '3.00',
    minPercentage: 75.0,
    maxPercentage: 75.99,
    meaning: 'Passing Threshold',
    status: 'borderline_pass',
    indicator: 'Warning Alert',
    badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  },
  {
    grade: '5.00',
    minPercentage: 0.0,
    maxPercentage: 74.99,
    meaning: 'Failure / Re-defense Required',
    status: 'failed',
    indicator: 'Crimson Red',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
  },
]);

export const BUKSU_GRADE_VALUES = Object.freeze(BUKSU_GRADE_SCALE.map((g) => g.grade));

/**
 * Computes the BukSU institutional point grade from a percentage score.
 *
 * @param {number|null|undefined} percentage - Raw score percentage (0 - 100)
 * @returns {Object|null} BukSU grade descriptor or null if invalid input
 */
export function computeBukSUGrade(percentage) {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return null;
  }

  const normalized = Math.max(0, Math.min(100, percentage));

  for (const tier of BUKSU_GRADE_SCALE) {
    if (normalized >= tier.minPercentage) {
      return {
        ...tier,
        percentage: normalized,
        isPassing: tier.grade !== '5.00',
      };
    }
  }

  // Fallback to 5.00
  const failTier = BUKSU_GRADE_SCALE[BUKSU_GRADE_SCALE.length - 1];
  return {
    ...failTier,
    percentage: normalized,
    isPassing: false,
  };
}
