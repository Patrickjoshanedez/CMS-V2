import { Badge } from '@/components/ui/Badge';
import { TITLE_STATUSES } from '@cms/shared';

/**
 * TitleStatusBadge — renders a colour-coded badge for a project title status.
 *
 * Maps each TITLE_STATUS to a semantic badge variant so the status is
 * immediately recognisable at a glance.
 */

const statusConfig = {
  [TITLE_STATUSES.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [TITLE_STATUSES.SUBMITTED]: { label: 'Submitted', variant: 'info' },
  [TITLE_STATUSES.APPROVED]: { label: 'Approved', variant: 'success' },
  [TITLE_STATUSES.REVISION_REQUIRED]: { label: 'Revisions Required', variant: 'warning' },
  [TITLE_STATUSES.PENDING_MODIFICATION]: { label: 'Pending Modification', variant: 'warning' },
};

export default function TitleStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
