import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import { usePrefetchSubmissionReviewWorkspace } from '@/hooks/useSubmissions';
import { prefetchRoute } from '@/lib/routePrefetch';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import {
  RefreshCw,
  Clock,
  FileText,
  ChevronRight,
  Inbox,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

function toChapterLabel(chapter) {
  if (!chapter || chapter < 1 || chapter > CHAPTER_LABELS.length) {
    return `Chapter ${chapter || '?'}`;
  }
  return CHAPTER_LABELS[chapter - 1];
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ────────── Stats Row ────────── */

function StatsRow({ awaiting, underReview }) {
  const metrics = [
    {
      label: 'Awaiting Review',
      value: awaiting.length,
      icon: Inbox,
      tone: 'bg-warning/10 text-warning-foreground',
    },
    {
      label: 'In Revision',
      value: underReview.length,
      icon: RotateCw,
      tone: 'bg-info/10 text-info-foreground',
    },
    {
      label: 'Overdue',
      value: underReview.filter(
        (item) => typeof item.daysRemaining === 'number' && item.daysRemaining < 0,
      ).length,
      icon: AlertTriangle,
      tone: 'bg-destructive/10 text-destructive-text',
    },
    {
      label: 'Total Active',
      value: awaiting.length + underReview.length,
      icon: CheckCircle2,
      tone: 'bg-success/10 text-success-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="border-border/60 shadow-xs">
          <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
              <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ────────── Submission Card ────────── */

function SubmissionCard({ item }) {
  const prefetchWorkspace = usePrefetchSubmissionReviewWorkspace();
  const isOverdue = typeof item.daysRemaining === 'number' && item.daysRemaining < 0;
  const isUrgent =
    typeof item.daysRemaining === 'number' && item.daysRemaining >= 0 && item.daysRemaining <= 2;

  const handleWarmup = () => {
    prefetchRoute(`/project/submissions/${item._id}`);
    prefetchRoute(`/submissions/${item._id}/review`);
    prefetchRoute(`/project/submissions/${item._id}/review`);
    prefetchWorkspace(item._id);
  };

  return (
    <Link
      to={`/project/submissions/${item._id}`}
      className={[
        'group flex min-h-[44px] flex-col justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center',
        isOverdue ? 'border-destructive/40 bg-destructive/[0.03]' : '',
        isUrgent ? 'border-warning/40 bg-warning/[0.03]' : '',
      ].join(' ')}
      onMouseEnter={handleWarmup}
      onFocus={handleWarmup}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/60">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{item.teamName}</p>
            <Badge variant="outline" className="shrink-0 text-[10px] font-medium">
              {toChapterLabel(item.chapter)}
            </Badge>
            <Badge variant="outline" className="shrink-0 text-[10px] font-medium font-mono">
              v{item.version}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.projectTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-muted-foreground">by {item.submittedBy}</span>
            {item.createdAt && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(item.createdAt)}
              </span>
            )}
            {item.annotationCount > 0 && <span>{item.annotationCount} note(s)</span>}
            {typeof item.daysRemaining === 'number' && (
              <span
                className={
                  isOverdue
                    ? 'font-semibold text-destructive-text'
                    : isUrgent
                      ? 'font-semibold text-warning-foreground'
                      : ''
                }
              >
                {item.daysRemaining < 0
                  ? `${Math.abs(item.daysRemaining)}d overdue`
                  : `${item.daysRemaining}d remaining`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <SubmissionStatusBadge status={item.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

/* ────────── Section ────────── */

function ReviewSection({ title, icon: Icon, items, emptyMessage, iconTone }) {
  if (items.length === 0) {
    return (
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {items.length}
          </Badge>
        </div>
        <EmptyState
          icon={Icon}
          iconVariant="square"
          title={emptyMessage}
          description="New submissions will appear here when your assigned teams send them for review."
          compact
          className="bg-muted/10"
        />
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <SubmissionCard key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}

/* ────────── Main Page ────────── */

export default function TeamReviewWorkflowPage() {
  const {
    data: workloadData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['adviserWorkload', 'teamReviewWorkflow'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const workload = useMemo(
    () => workloadData?.data?.data || workloadData?.data || workloadData || null,
    [workloadData],
  );

  const awaiting = workload?.awaitingReview || [];
  const underReview = workload?.underReview || [];

  return (
    <DashboardLayout>
      <div data-testid="team-review-workflow" className="min-w-0 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review submissions, manage revisions, and approve chapters for your assigned teams.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[44px] gap-2 self-start"
          >
            {isFetching ? (
              <Spinner className="size-4" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {isLoading && !workload && (
          <div role="status" aria-label="Loading team review queue" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} aria-hidden="true" className="border-border/60">
                  <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-7 w-10" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <span className="sr-only">Loading review queue...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="pr-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <AlertTitle>Unable to load team workflow</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </div>
              <Button variant="outline" className="min-h-[44px]" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Content */}
        {workload && (
          <>
            <StatsRow awaiting={awaiting} underReview={underReview} />

            <ReviewSection
              title="Awaiting Your Decision"
              icon={Inbox}
              items={awaiting}
              emptyMessage="No submissions are waiting for review right now."
              iconTone="text-warning-foreground"
            />

            <ReviewSection
              title="Revision Follow-ups"
              icon={RotateCw}
              items={underReview}
              emptyMessage="No ongoing revision cycles at the moment."
              iconTone="text-info-foreground"
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
