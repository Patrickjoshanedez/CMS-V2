import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BookOpen, ExternalLink } from 'lucide-react';
import { TITLE_STATUSES } from '@cms/shared';

export default function ProjectContextWidget({ project }) {
  const githubUrl =
    project?.developmentAssets?.githubRepoUrl ||
    project?.teamId?.githubUrl ||
    project?.githubRepoUrl ||
    project?.githubRepo;

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          Project Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Academic Year</span>
          <span className="font-medium text-card-foreground">
            {project.academicYear || '\u2014'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Phase</span>
          <Badge
            variant="outline"
            className="border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-500/10"
          >
            {project.titleStatus !== TITLE_STATUSES.APPROVED
              ? 'Proposal'
              : `Capstone ${project.capstonePhase || 1}`}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-muted-foreground">Program / Department</span>
          <span className="font-medium text-card-foreground">
            {project.courseId?.name || 'Not specified'}
          </span>
        </div>

        {/* FR11 - GitHub Repository Link Visibility for Transparency & Monitoring */}
        {githubUrl && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Repository Monitoring (FR11)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start border-primary/30 text-xs font-semibold"
              asChild
            >
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5 text-primary" />
                View GitHub Repository
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
