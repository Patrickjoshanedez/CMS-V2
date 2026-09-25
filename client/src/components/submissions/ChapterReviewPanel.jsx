/**
 * ChapterReviewPanel
 *
 * Faculty/instructor view of chapter-level submission progress with
 * inline Approve / Request Revision controls.
 *
 * Sequential progression:
 *   Ch 1 → Ch 2 → Ch 3 → [Development] → Ch 4 → Ch 5 → [Final Paper]
 *
 * When a chapter is approved, it is LOCKED by the server automatically.
 * LOCKED status is the gate that allows the student to upload the next chapter.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  XCircle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { SUBMISSION_STATUSES } from '@cms/shared';
import { useReviewSubmission } from '@/hooks/useSubmissions';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';

/* ── Constants ── */

const CHAPTER_LABELS = {
  1: 'Chapter 1',
  2: 'Chapter 2',
  3: 'Chapter 3',
  4: 'Chapter 4',
  5: 'Chapter 5',
};

const STATUS_CONFIG = {
  [SUBMISSION_STATUSES.PENDING]: {
    label: 'Pending Review',
    variant: 'secondary',
    icon: Clock,
    iconClass: 'text-amber-500',
  },
  [SUBMISSION_STATUSES.UNDER_REVIEW]: {
    label: 'Under Review',
    variant: 'outline',
    icon: Clock,
    iconClass: 'text-amber-500',
  },
  [SUBMISSION_STATUSES.APPROVED]: {
    label: 'Approved',
    variant: 'default',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  [SUBMISSION_STATUSES.ACCEPTED]: {
    label: 'Approved ✓',
    variant: 'default',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  [SUBMISSION_STATUSES.LOCKED]: {
    label: 'Approved ✓',
    variant: 'default',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  [SUBMISSION_STATUSES.REVISIONS_REQUIRED]: {
    label: 'Needs Revision',
    variant: 'destructive',
    icon: AlertTriangle,
    iconClass: 'text-destructive',
  },
  [SUBMISSION_STATUSES.REJECTED]: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
    iconClass: 'text-destructive',
  },
};

function statusConfig(status) {
  return (
    STATUS_CONFIG[status] ?? {
      label: 'Not Started',
      variant: 'outline',
      icon: FileText,
      iconClass: 'text-muted-foreground',
    }
  );
}

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function reviewerName(r) {
  if (!r) return '—';
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || r.email || '—';
}

/* ── ReviewActions — inline approve/revise form for a single round ── */
function ReviewActions({ round, onSuccess }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null); // null | 'approve' | 'revise'
  const [note, setNote] = useState('');
  const reviewMutation = useReviewSubmission();

  const isLocked = round.status === SUBMISSION_STATUSES.LOCKED;
  const isApproved =
    round.status === SUBMISSION_STATUSES.APPROVED || round.status === SUBMISSION_STATUSES.ACCEPTED;
  const isReviewed = isLocked || isApproved || round.status === SUBMISSION_STATUSES.REJECTED;
  const isPending = [
    SUBMISSION_STATUSES.PENDING,
    SUBMISSION_STATUSES.UNDER_REVIEW,
    SUBMISSION_STATUSES.REVISIONS_REQUIRED,
  ].includes(round.status);

  const handleSubmit = () => {
    if (!action) return;
    const status =
      action === 'approve' ? SUBMISSION_STATUSES.APPROVED : SUBMISSION_STATUSES.REVISIONS_REQUIRED;

    if (action === 'revise' && !note.trim()) {
      toast.error('Please provide revision feedback before requesting revisions.');
      return;
    }

    reviewMutation.mutate(
      {
        submissionId: round._id,
        status,
        reviewNote: note.trim() || undefined,
        expectedUpdatedAt: round.updatedAt,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['submissions'] });
          queryClient.invalidateQueries({ queryKey: ['submission'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['project'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          const label = action === 'approve' ? 'approved & locked' : 'sent back for revision';
          toast.success(`Chapter ${label} successfully.`);
          setAction(null);
          setNote('');
          onSuccess?.();
        },
        onError: (err) => {
          const msg =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            'Review action failed.';
          toast.error(msg);
        },
      },
    );
  };

  if (isLocked) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Chapter approved &amp; locked — next chapter is now unlocked for the student.
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Approved
      </div>
    );
  }

  if (!isPending) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      {/* Action toggle buttons */}
      {!action && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setAction('approve')}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve &amp; Lock
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
            onClick={() => setAction('revise')}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Request Revision
          </Button>
        </div>
      )}

      {/* Confirm form */}
      {action && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={action === 'approve' ? 'default' : 'outline'}
              className={
                action === 'approve'
                  ? 'bg-emerald-600 text-white'
                  : 'border-amber-400 text-amber-700'
              }
            >
              {action === 'approve' ? '✓ Approve & Lock' : '↩ Request Revision'}
            </Badge>
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setAction(null);
                setNote('');
              }}
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`note-${round._id}`} className="text-xs">
              {action === 'approve' ? 'Review comment (optional)' : 'Revision feedback *'}
            </Label>
            <Textarea
              id={`note-${round._id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === 'approve'
                  ? 'Great work! Approved and locked.'
                  : 'Describe what needs to be revised...'
              }
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <Button
            size="sm"
            className={
              action === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
                : 'gap-1.5'
            }
            variant={action === 'revise' ? 'destructive' : undefined}
            disabled={reviewMutation.isPending}
            onClick={handleSubmit}
          >
            {reviewMutation.isPending
              ? 'Saving…'
              : action === 'approve'
                ? 'Confirm Approval'
                : 'Send for Revision'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── ChapterProgressionGate — visual unlock chain indicator ── */
function ProgressionGate({ items, chapters, chapterRoundsMap }) {
  if (Array.isArray(items)) {
    const GATE_STATUSES = [
      SUBMISSION_STATUSES.LOCKED,
      SUBMISSION_STATUSES.APPROVED,
      SUBMISSION_STATUSES.ACCEPTED,
    ];

    return (
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const latest = item.rounds?.[0];
          const isApproved = Boolean(latest && GATE_STATUSES.includes(latest.status));
          return (
            <div key={item.id} className="flex items-center gap-1">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isApproved ? '✓ ' : ''}
                {item.label}
              </span>
              {i < items.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>
    );
  }

  const approved = new Set();
  const GATE_STATUSES = [
    SUBMISSION_STATUSES.LOCKED,
    SUBMISSION_STATUSES.APPROVED,
    SUBMISSION_STATUSES.ACCEPTED,
  ];

  for (const ch of chapters || []) {
    const latest = chapterRoundsMap?.get(ch)?.[0];
    if (latest && GATE_STATUSES.includes(latest.status)) approved.add(ch);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1">
      {(chapters || []).map((ch, i) => {
        const isApproved = approved.has(ch);
        return (
          <div key={ch} className="flex items-center gap-1">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isApproved ? '✓ ' : ''}
              {CHAPTER_LABELS[ch]}
            </span>
            {i < chapters.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ── */

/**
 * ChapterReviewPanel — Faculty/instructor view with inline review actions.
 *
 * @param {{
 *   submissions: Object,
 *   chapters?: number[],
 *   extraItems?: Array<{ id: string, label: string, filter: Function, emptyText?: string, number?: any }>,
 *   title?: string,
 *   description?: string,
 *   showReviewActions?: boolean,
 * }} props
 *   - submissions: the submissionsData object from useProjectSubmissions
 *   - chapters: which chapter numbers to show (default [1,2,3])
 *   - extraItems: custom manuscript submission descriptors
 *   - showReviewActions: whether to show approve/revise buttons (default true)
 */
export default function ChapterReviewPanel({
  submissions,
  chapters = [1, 2, 3],
  extraItems = [],
  title = 'Chapter Submissions',
  description = 'Review each chapter submission and approve or request revisions.',
  showReviewActions = true,
}) {
  const navigate = useNavigate();
  const [activeViewerSubmission, setActiveViewerSubmission] = useState(null);

  /* Build unified items map (chapters + extraItems) */
  const displayItems = useMemo(() => {
    const list = Array.isArray(submissions)
      ? submissions
      : submissions?.submissions || submissions?.data || [];

    const items = chapters.map((ch) => {
      const rounds = list.filter(
        (sub) => sub?.type === 'chapter' && Number(sub.chapter || sub.chapterNumber) === ch,
      );
      rounds.sort((a, b) => (b.version || 0) - (a.version || 0));
      return {
        id: `chapter-${ch}`,
        itemKey: ch,
        indexNumber: ch,
        label: CHAPTER_LABELS[ch] || `Chapter ${ch}`,
        rounds,
        emptyText: 'No submissions yet for this chapter.',
      };
    });

    if (Array.isArray(extraItems)) {
      extraItems.forEach((extra, idx) => {
        const rounds = list.filter(extra.filter || (() => false));
        rounds.sort((a, b) => (b.version || 0) - (a.version || 0));
        items.push({
          id: extra.id || `extra-${idx}`,
          itemKey: extra.id || `extra-${idx}`,
          indexNumber:
            extra.number !== undefined
              ? extra.number
              : typeof extra.index === 'number'
                ? extra.index
                : chapters.length + idx + 1,
          label: extra.label,
          rounds,
          emptyText: extra.emptyText || 'No submissions yet for this manuscript.',
        });
      });
    }

    return items;
  }, [chapters, extraItems, submissions]);

  const [selectedSession, setSelectedSession] = useState('all');

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Session:
            </span>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Review Sessions</option>
              <option value="s1">Session 1 (Initial Rounds)</option>
              <option value="s2">Session 2 (Revisions &amp; Defense)</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Progression gate indicator */}
          <ProgressionGate items={displayItems} />

          <div className="space-y-4">
            {displayItems.map((item) => {
              const rounds = item.rounds || [];
              const latest = rounds[0];
              const cfg = statusConfig(latest?.status);
              const Icon = cfg.icon;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card/60 transition-colors hover:bg-card"
                >
                  {/* Chapter/Item header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                        {item.indexNumber}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        {latest?.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            Last upload: {formatDate(latest.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
                      <Badge variant={cfg.variant} className="text-xs">
                        {cfg.label}
                      </Badge>
                      {latest?.version > 0 && (
                        <span className="text-xs text-muted-foreground">v{latest.version}</span>
                      )}
                    </div>
                  </div>

                  {/* Rounds */}
                  {rounds.length > 0 ? (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <Tabs defaultValue={String(rounds[0]._id)}>
                        <TabsList className="mb-3 h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                          {rounds.map((round) => {
                            return (
                              <TabsTrigger
                                key={round._id}
                                value={String(round._id)}
                                className="h-7 gap-1 rounded-md border px-2.5 py-1 text-xs data-[state=active]:bg-muted"
                              >
                                Round {round.version || 1}
                                {(round.status === SUBMISSION_STATUSES.LOCKED ||
                                  round.status === SUBMISSION_STATUSES.APPROVED) && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                )}
                                {round.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {rounds.map((round) => (
                          <TabsContent
                            key={round._id}
                            value={String(round._id)}
                            className="rounded-lg border border-border bg-muted/20 p-3"
                          >
                            {/* Round metadata grid */}
                            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Status</p>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  {(() => {
                                    const rc = statusConfig(round.status);
                                    const RIcon = rc.icon;
                                    return (
                                      <>
                                        <RIcon className={`h-3.5 w-3.5 ${rc.iconClass}`} />
                                        <span className="font-medium">{rc.label}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Submitted
                                </p>
                                <p className="mt-0.5 font-medium">{formatDate(round.createdAt)}</p>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Reviewer
                                </p>
                                <p className="mt-0.5 font-medium">
                                  {reviewerName(round.reviewedBy)}
                                </p>
                              </div>

                              {round.reviewNote && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Review Comment
                                  </p>
                                  <p className="mt-0.5 rounded-md bg-muted px-3 py-2 text-sm">
                                    {round.reviewNote}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Previous round revision notes callout to verify changes */}
                            {round._id === rounds[0]._id &&
                              rounds.length > 1 &&
                              rounds[1]?.reviewNote && (
                                <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-500/10 p-3 text-xs dark:border-amber-700/50">
                                  <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Previous Round {rounds[1].version || 1} Feedback to Verify:
                                  </div>
                                  <p className="mt-1 text-muted-foreground italic">
                                    &quot;{rounds[1].reviewNote}&quot;
                                  </p>
                                </div>
                              )}

                            {/* Action buttons row */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1.5"
                                onClick={() => setActiveViewerSubmission(round)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Read Document
                              </Button>

                              {round.syncedGoogleDocUrl && (
                                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                  <a
                                    href={round.syncedGoogleDocUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Open in Google Docs
                                  </a>
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => navigate(`/project/submissions/${round._id}/review`)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Review Studio
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => navigate(`/project/submissions/${round._id}`)}
                              >
                                View Details
                              </Button>
                            </div>

                            {/* Inline review form — only for the latest round */}
                            {showReviewActions && round._id === rounds[0]._id && (
                              <ReviewActions round={round} />
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  ) : (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        {item.emptyText || 'No submissions yet for this chapter.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Institutional Document & Diff Viewer Modal */}
      {activeViewerSubmission && (
        <SophisticatedDocumentViewer
          open={Boolean(activeViewerSubmission)}
          onOpenChange={(isOpen) => !isOpen && setActiveViewerSubmission(null)}
          submission={activeViewerSubmission}
        />
      )}
    </>
  );
}
