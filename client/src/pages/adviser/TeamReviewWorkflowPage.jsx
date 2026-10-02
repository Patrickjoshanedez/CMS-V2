import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import {
  Loader2,
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
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="border border-border/60 bg-card shadow-xs">
        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-foreground">
              {awaiting.length}
            </p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground">
              Awaiting Review
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 bg-card shadow-xs">
        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <RotateCw className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-foreground">
              {underReview.length}
            </p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground">
              In Revision
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 bg-card shadow-xs">
        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-foreground">
              {
                underReview.filter(
                  (i) => typeof i.daysRemaining === 'number' && i.daysRemaining < 0,
                ).length
              }
            </p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground">
              Overdue
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 bg-card shadow-xs">
        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-foreground">
              {awaiting.length + underReview.length}
            </p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground">
              Total Active
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────── Submission Card ────────── */

function SubmissionCard({ item }) {
  const navigate = useNavigate();
  const isOverdue = typeof item.daysRemaining === 'number' && item.daysRemaining < 0;
  const isUrgent =
    typeof item.daysRemaining === 'number' && item.daysRemaining >= 0 && item.daysRemaining <= 2;

  return (
    <div
      className={[
        'group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5 transition-all cursor-pointer hover:bg-muted/40 shadow-xs',
        isOverdue ? 'border-red-500/40 bg-red-500/[0.03]' : '',
        isUrgent ? 'border-amber-500/40 bg-amber-500/[0.03]' : '',
      ].join(' ')}
      onClick={() => navigate(`/project/submissions/${item._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/project/submissions/${item._id}`)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/60">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-foreground truncate">
              {item.teamName}
            </p>
            <Badge variant="outline" className="shrink-0 text-[10px] font-medium">
              {toChapterLabel(item.chapter)}
            </Badge>
            <Badge variant="outline" className="shrink-0 text-[10px] font-medium font-mono">
              v{item.version}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.projectTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-slate-700 dark:text-muted-foreground">
              by {item.submittedBy}
            </span>
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
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : isUrgent
                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
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
      <div className="flex items-center gap-3 shrink-0">
        <SubmissionStatusBadge status={item.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

/* ────────── Section ────────── */

function ReviewSection({ title, icon: Icon, items, emptyMessage, accentColor }) {
  if (items.length === 0) {
    return (
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accentColor}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-muted-foreground">
            {title}
          </h2>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {items.length}
          </Badge>
        </div>
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground bg-muted/10">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accentColor}`} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-muted-foreground">
          {title}
        </h2>
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
  const navigate = useNavigate();

  const {
    data: workloadData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['adviserWorkload', 'teamReviewWorkflow'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const workload = useMemo(
    () => workloadData?.data?.data || workloadData?.data || workloadData || null,
    [workloadData],
  );

  const awaiting = workload?.awaitingReview || [];
  const underReview = workload?.underReview || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {isLoading && !workload && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading review queue...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Unable to load team workflow: {error.message}</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
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
              accentColor="text-amber-500"
            />

            <ReviewSection
              title="Revision Follow-ups"
              icon={RotateCw}
              items={underReview}
              emptyMessage="No ongoing revision cycles at the moment."
              accentColor="text-blue-500"
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
