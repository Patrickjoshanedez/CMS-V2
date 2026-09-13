export const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

/**
 * Returns a standardized institutional document title for any submission record.
 * Maps proposals cleanly to "Chapter 1–3 Manuscript" rather than "Chapter null".
 */
export function getSubmissionDocumentTitle(sub) {
  if (!sub) return 'Submission Document';
  if (sub.type === 'proposal') return 'Chapter 1–3 Manuscript';
  if (sub.type === 'system_design') return 'System Design Document';
  if (sub.type === 'test_results') return 'Test Results Document';
  if (sub.type === 'final_academic') return 'Final Academic Manuscript';
  if (sub.type === 'final_journal') return 'Publishable Journal Manuscript';
  if (sub.chapter) {
    const label = CHAPTER_LABELS[sub.chapter - 1] || `Chapter ${sub.chapter}`;
    return `${label} Manuscript`;
  }
  return 'Chapter 1–3 Manuscript';
}
