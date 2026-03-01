import { Badge } from '@/components/ui/Badge';
import { PLAGIARISM_STATUSES } from '@cms/shared';

/**
 * OriginalityBadge — colour-coded badge displaying a submission's
 * plagiarism / originality check status and score.
 *
 * Colour rules (matches project status-colour conventions):
 *   - Green:  score >= 80 (high originality)
 *   - Yellow: score >= 60 (moderate — needs review)
 *   - Red:    score <  60 (low originality — flagged)
 *
 * Non-terminal states (queued, processing, failed) show a
 * descriptive label instead of a numeric score.
 *
 * @param {Object}  props
 * @param {Object}  [props.plagiarismResult] - The plagiarismResult sub-document.
 * @param {string}  [props.className]        - Extra Tailwind classes.
 */
export default function OriginalityBadge({ plagiarismResult, className }) {
  // No result yet — nothing to show
  if (!plagiarismResult || !plagiarismResult.status) {
    return null;
  }

  const { status, score } = plagiarismResult;

  // — Queued / Processing: pulsing info badge —
  if (status === PLAGIARISM_STATUSES.QUEUED) {
    return (
      <Badge variant="info" className={className}>
        Originality: Queued
      </Badge>
    );
  }

  if (status === PLAGIARISM_STATUSES.PROCESSING) {
    return (
      <Badge variant="info" className={className}>
        <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
        Checking…
      </Badge>
    );
  }

  // — Failed: destructive badge —
  if (status === PLAGIARISM_STATUSES.FAILED) {
    return (
      <Badge variant="destructive" className={className}>
        Check Failed
      </Badge>
    );
  }

  // — Completed: score-based colour —
  const scoreNum = typeof score === 'number' ? score : 0;
  let variant = 'destructive'; // < 60
  if (scoreNum >= 80) variant = 'success';
  else if (scoreNum >= 60) variant = 'warning';

  return (
    <Badge variant={variant} className={className}>
      {scoreNum}% Original
    </Badge>
  );
}
