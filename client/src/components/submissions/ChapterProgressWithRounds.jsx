import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SUBMISSION_STATUSES } from '@cms/shared';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  Upload,
} from 'lucide-react';

const CHAPTER_LABELS = {
  1: 'Chapter 1',
  2: 'Chapter 2',
  3: 'Chapter 3',
  4: 'Chapter 4',
  5: 'Chapter 5',
};

function chapterStatusBadge(status) {
  const map = {
    [SUBMISSION_STATUSES.PENDING]: { label: 'Pending', variant: 'secondary' },
    [SUBMISSION_STATUSES.UNDER_REVIEW]: { label: 'Under Review', variant: 'outline' },
    [SUBMISSION_STATUSES.APPROVED]: { label: 'Approved', variant: 'default' },
    [SUBMISSION_STATUSES.REVISIONS_REQUIRED]: { label: 'Needs Revision', variant: 'destructive' },
    [SUBMISSION_STATUSES.LOCKED]: { label: 'Locked', variant: 'default' },
    [SUBMISSION_STATUSES.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  };

  return map[status] || { label: 'Not Started', variant: 'outline' };
}

function chapterStatusIcon(status) {
  switch (status) {
    case SUBMISSION_STATUSES.LOCKED:
      return <Lock className="h-4 w-4 text-primary" />;
    case SUBMISSION_STATUSES.APPROVED:
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case SUBMISSION_STATUSES.UNDER_REVIEW:
    case SUBMISSION_STATUSES.PENDING:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case SUBMISSION_STATUSES.REVISIONS_REQUIRED:
    case SUBMISSION_STATUSES.REJECTED:
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function reviewerName(reviewer) {
  if (!reviewer) return '—';
  const fullName = [reviewer.firstName, reviewer.middleName, reviewer.lastName]
    .filter(Boolean)
    .join(' ');
  return fullName || reviewer.email || '—';
}

/**
 * Keeps chapter status cards while adding per-round tabs under each chapter.
 */
export default function ChapterProgressWithRounds({
  submissions,
  chapters = [1, 2, 3],
  title = 'Chapter Progress',
  description = 'Track the status of each chapter submission.',
  showAllSubmissionsButton = true,
  showUploadButton = false,
}) {
  const navigate = useNavigate();

  const chapterRoundsMap = useMemo(() => {
    const map = new Map();
    for (const chapter of chapters) map.set(chapter, []);

    const list = submissions?.submissions || [];
    for (const sub of list) {
      if (sub?.type !== 'chapter') continue;
      if (!chapters.includes(sub.chapter)) continue;
      map.get(sub.chapter)?.push(sub);
    }

    for (const chapter of chapters) {
      const chapterRounds = map.get(chapter) || [];
      chapterRounds.sort((a, b) => (b.version || 0) - (a.version || 0));
      map.set(chapter, chapterRounds);
    }

    return map;
  }, [chapters, submissions]);

  const suggestedUploadChapter = useMemo(() => {
    for (const chapter of chapters) {
      const latest = chapterRoundsMap.get(chapter)?.[0];
      if (!latest || latest.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
        return chapter;
      }
    }

    return chapters[0];
  }, [chapters, chapterRoundsMap]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showUploadButton && (
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/project/submissions/upload?chapter=${suggestedUploadChapter}`)
                }
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Chapter
              </Button>
            )}
            {showAllSubmissionsButton && (
              <Button variant="outline" size="sm" onClick={() => navigate('/project/submissions')}>
                <ClipboardList className="mr-2 h-4 w-4" />
                All Submissions
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {chapters.map((chapter) => {
            const rounds = chapterRoundsMap.get(chapter) || [];
            const latest = rounds[0];
            const latestBadge = latest
              ? chapterStatusBadge(latest.status)
              : { label: 'Not Started', variant: 'outline' };

            return (
              <div key={chapter} className="rounded-lg border p-3">
                <div className="flex items-center justify-between px-1 py-1">
                  <div className="flex items-center gap-3">
                    {latest ? (
                      chapterStatusIcon(latest.status)
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{CHAPTER_LABELS[chapter]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={latestBadge.variant}>{latestBadge.label}</Badge>
                    {latest?.version > 0 && (
                      <span className="text-xs text-muted-foreground">v{latest.version}</span>
                    )}
                  </div>
                </div>

                {rounds.length > 0 ? (
                  <Tabs defaultValue={String(rounds[0]._id)} className="mt-3">
                    <TabsList className="mb-2 h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                      {rounds.map((round) => (
                        <TabsTrigger
                          key={round._id}
                          value={String(round._id)}
                          className="h-7 rounded-md border px-2 py-1 text-xs data-[state=active]:bg-muted"
                        >
                          Round {round.version || 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {rounds.map((round) => (
                      <TabsContent
                        key={round._id}
                        value={String(round._id)}
                        className="rounded-md border bg-muted/30 p-3"
                      >
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Adviser Review / Comment
                            </p>
                            <p className="font-medium">
                              {round.reviewNote || 'No adviser comment yet.'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Reviewer: {reviewerName(round.reviewedBy)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium">
                              {round.reviewedBy
                                ? formatDate(round.updatedAt)
                                : formatDate(round.uploadedAt || round.createdAt)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {round.reviewedBy ? 'Reviewed date' : 'Uploaded date'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/project/submissions/${round._id}`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Document
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No rounds yet for this chapter.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
