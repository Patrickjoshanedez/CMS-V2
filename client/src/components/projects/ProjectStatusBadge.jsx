import { Badge } from '@/components/ui/Badge';
import { PROJECT_STATUSES } from '@cms/shared';

/**
 * ProjectStatusBadge — colour-coded badge for the overall project status.
 */

const statusConfig = {
  [PROJECT_STATUSES.ACTIVE]: { label: 'Active', variant: 'info' },
  [PROJECT_STATUSES.PROPOSAL_SUBMITTED]: { label: 'Proposal Submitted', variant: 'info' },
  [PROJECT_STATUSES.PROPOSAL_APPROVED]: { label: 'Proposal Approved', variant: 'success' },
  [PROJECT_STATUSES.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  [PROJECT_STATUSES.ARCHIVED]: { label: 'Archived', variant: 'secondary' },
};

export default function ProjectStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
