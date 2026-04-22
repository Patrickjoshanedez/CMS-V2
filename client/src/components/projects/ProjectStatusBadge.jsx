import { Badge } from '@/components/ui/Badge';
import { PROJECT_STATUSES } from '@cms/shared';

/**
 * ProjectStatusBadge — colour-coded badge for the overall project status.
 */

const statusConfig = {
  [PROJECT_STATUSES.ACTIVE]: { label: 'Active', variant: 'info' },
  [PROJECT_STATUSES.PENDING_FOR_SUBMISSION]: { label: 'Pending for Submission', variant: 'warning' },
  [PROJECT_STATUSES.PENDING_IN_REVIEW]: { label: 'Pending in Review', variant: 'warning' },
  [PROJECT_STATUSES.REVISION_NEEDED]: { label: 'Revision Needed', variant: 'destructive' },
  [PROJECT_STATUSES.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  [PROJECT_STATUSES.ARCHIVED]: { label: 'Archived', variant: 'secondary' },
};

export default function ProjectStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
