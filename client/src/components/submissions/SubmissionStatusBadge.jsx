import { Badge } from '@/components/ui/Badge';
import { SUBMISSION_STATUSES } from '@cms/shared';

/**
 * SubmissionStatusBadge — colour-coded badge for a chapter submission's status.
 *
 * Maps each SUBMISSION_STATUSES value to a human-readable label and
 * a Badge variant consistent with the project's dark/light theme support.
 */

const statusConfig = {
  [SUBMISSION_STATUSES.PENDING]: { label: 'Pending', variant: 'warning' },
  [SUBMISSION_STATUSES.UNDER_REVIEW]: { label: 'Under Review', variant: 'info' },
  [SUBMISSION_STATUSES.APPROVED]: { label: 'Approved', variant: 'success' },
  [SUBMISSION_STATUSES.REVISIONS_REQUIRED]: {
    label: 'Revisions Required',
    variant: 'warning',
  },
  [SUBMISSION_STATUSES.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  [SUBMISSION_STATUSES.LOCKED]: { label: 'Locked', variant: 'secondary' },
};

export default function SubmissionStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
