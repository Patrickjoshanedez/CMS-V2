import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TITLE_STATUSES } from '@cms/shared';

/**
 * ProjectTitleCard — Shared title header card used by both
 * MyProjectPage (student) and ProjectDetailPage (instructor).
 */
export default function ProjectTitleCard({ project }) {
  const displayTitle =
    project.titleStatus !== TITLE_STATUSES.APPROVED
      ? `${project.teamId?.name || 'Team'} Title Proposal`
      : project.title || 'Pending Title Approval';

  return (
    <Card className="rounded-2xl border-y border-r border-l-4 border-border border-l-primary bg-card shadow-lg">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground mb-2 leading-tight">
              {displayTitle}
            </h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                {project.projectStatus}
              </Badge>
              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                {project.titleStatus}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
