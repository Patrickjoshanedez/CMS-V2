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
} from 'lucide-react';
import { SUBMISSION_STATUSES } from '@cms/shared';
import { useReviewSubmission } from '@/hooks/useSubmissions';

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
  [SUBMISSION_STATUSES.LOCKED]: {
    label: 'Locked ✓',
    variant: 'default',
    icon: Lock,
    iconClass: 'text-primary',
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
  return STATUS_CONFIG[status] ?? {
    label: 'Not Started',
    variant: 'outline',
    icon: FileText,
    iconClass: 'text-muted-foreground',
  };
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
  const [action, setAction] = useState(null); // null | 'approve' | 'revise'
  const [note, setNote] = useState('');
  const reviewMutation = useReviewSubmission();

  const isLocked = round.status === SUBMISSION_STATUSES.LOCKED;
  const isApproved = round.status === SUBMISSION_STATUSES.APPROVED;
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
      { submissionId: round._id, status, reviewNote: note.trim() || undefined },
      {
        onSuccess: () => {
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
              onClick={() => { setAction(null); setNote(''); }}
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
            {reviewMutation.isPending ? 'Saving…' : action === 'approve' ? 'Confirm Approval' : 'Send for Revision'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── ChapterProgressionGate — visual unlock chain indicator ── */
function ProgressionGate({ chapters, chapterRoundsMap }) {
  const approved = new Set();
  const GATE_STATUSES = [SUBMISSION_STATUSES.LOCKED, SUBMISSION_STATUSES.APPROVED];

  for (const ch of chapters) {
    const latest = chapterRoundsMap.get(ch)?.[0];
    if (latest && GATE_STATUSES.includes(latest.status)) approved.add(ch);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1">
      {chapters.map((ch, i) => {
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
              {isApproved ? '✓ ' : ''}{CHAPTER_LABELS[ch]}
            </span>
            {i < chapters.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
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
 *   title?: string,
 *   description?: string,
 *   showReviewActions?: boolean,
 * }} props
 *   - submissions: the submissionsData object from useProjectSubmissions
 *   - chapters: which chapter numbers to show (default [1,2,3])
 *   - showReviewActions: whether to show approve/revise buttons (default true)
 */
export default function ChapterReviewPanel({
  submissions,
  chapters = [1, 2, 3],
  title = 'Chapter Submissions',
  description = 'Review each chapter submission and approve or request revisions.',
  showReviewActions = true,
}) {
  const navigate = useNavigate();

  /* Build chapter → rounds map */
  const chapterRoundsMap = useMemo(() => {
    const map = new Map();
    for (const ch of chapters) map.set(ch, []);

    const list = submissions?.submissions || [];
    for (const sub of list) {
      if (sub?.type !== 'chapter') continue;
      if (!chapters.includes(sub.chapter)) continue;
      map.get(sub.chapter)?.push(sub);
    }

    for (const ch of chapters) {
      const rounds = map.get(ch) || [];
      rounds.sort((a, b) => (b.version || 0) - (a.version || 0));
      map.set(ch, rounds);
    }

    return map;
  }, [chapters, submissions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Progression gate indicator */}
        <ProgressionGate chapters={chapters} chapterRoundsMap={chapterRoundsMap} />

        <div className="space-y-4">
          {chapters.map((chapter) => {
            const rounds = chapterRoundsMap.get(chapter) || [];
            const latest = rounds[0];
            const cfg = statusConfig(latest?.status);
            const Icon = cfg.icon;

            return (
              <div
                key={chapter}
                className="rounded-xl border border-border bg-card/60 transition-colors hover:bg-card"
              >
                {/* Chapter header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      {chapter}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{CHAPTER_LABELS[chapter]}</p>
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
                          const roundCfg = statusConfig(round.status);
                          return (
                            <TabsTrigger
                              key={round._id}
                              value={String(round._id)}
                              className="h-7 gap-1 rounded-md border px-2.5 py-1 text-xs data-[state=active]:bg-muted"
                            >
                              Round {round.version || 1}
                              {(round.status === SUBMISSION_STATUSES.LOCKED || round.status === SUBMISSION_STATUSES.APPROVED) && (
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
                              <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                              <p className="mt-0.5 font-medium">{formatDate(round.createdAt)}</p>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Reviewer</p>
                              <p className="mt-0.5 font-medium">{reviewerName(round.reviewedBy)}</p>
                            </div>

                            {round.reviewNote && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <p className="text-xs font-medium text-muted-foreground">Review Comment</p>
                                <p className="mt-0.5 rounded-md bg-muted px-3 py-2 text-sm">{round.reviewNote}</p>
                              </div>
                            )}
                          </div>

                          {/* Action buttons row */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => navigate(`/project/submissions/${round._id}`)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View Document
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
                    <p className="text-xs text-muted-foreground">No submissions yet for this chapter.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
