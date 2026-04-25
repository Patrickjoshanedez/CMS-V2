import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { TITLE_STATUSES } from '@cms/shared';
import {
  BookOpen,
  Calendar,
  FileText,
  User,
  Users,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

export default function ProjectSidebarInfo({ project }) {
  const capstoneRaw = project.capstoneType || project.projectType;
  const capstoneTypeOrPhase = Array.isArray(capstoneRaw)
    ? capstoneRaw.join(', ')
    : capstoneRaw || `Capstone ${project.capstonePhase}`;

  const isProposalPhase = project.titleStatus !== TITLE_STATUSES.APPROVED;
  const proposalTitles = Array.isArray(project.titleProposals)
    ? project.titleProposals.map((p) => (typeof p === 'string' ? p : p?.title)).filter(Boolean)
    : [];
  const proposalCount = proposalTitles.length;

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          Project Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isProposalPhase && proposalCount > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Submitted Proposals ({proposalCount})
            </p>
            <div className="space-y-1">
              {proposalTitles.map((title, idx) => (
                <p key={`proposal-${idx}`} className="text-sm text-foreground/80">
                  {idx + 1}. {title}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Academic Year: {project.academicYear || '\u2014'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Phase: {capstoneTypeOrPhase}</span>
          </div>
          {project.adviserId && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                Adviser:{' '}
                {project.adviserId?.fullName || project.adviserId?.firstName || project.adviserId}
              </span>
            </div>
          )}
          {project.panelistIds?.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Panelists: {project.panelistIds.length}</span>
            </div>
          )}
        </div>

        {project.sdgTags?.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-2">SDG Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {project.sdgTags.map((tag, idx) => (
                <Badge key={`${tag}-${idx}`} variant="outline" className="bg-muted">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {project.keywords?.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-2">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {project.keywords.map((kw) => (
                <Badge key={kw} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(project.teamId?.googleDocUrl || project.teamId?.githubUrl) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
            {project.teamId?.googleDocUrl && (
              <Button type="button" variant="secondary" size="sm" asChild>
                <a href={project.teamId.googleDocUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Team Google Doc
                </a>
              </Button>
            )}
            {project.teamId?.githubUrl && (
              <Button type="button" variant="secondary" size="sm" asChild>
                <a href={project.teamId.githubUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Team GitHub
                </a>
              </Button>
            )}
          </div>
        )}

        {project.rejectionReason && (
          <Alert className="bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold block mb-1">Instructor Revision Notes:</span>
              {project.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {project.titleProposalComments?.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-3 mt-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Title Feedback &amp; Remarks
            </p>
            <div className="space-y-4">
              {project.titleProposalComments.map((thread, i) => (
                <div key={i} className="space-y-2">
                  {thread.comments?.map((comment, j) => (
                    <div key={j} className="bg-card border border-border p-3 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary">{comment.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
