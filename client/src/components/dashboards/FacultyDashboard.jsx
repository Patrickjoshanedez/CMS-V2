import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import { dashboardService } from '../../services/dashboardService';
import { useDashboard } from '@/hooks/useDashboard';
import { usePrefetchSubmissionReviewWorkspace } from '@/hooks/useSubmissions';
import { prefetchRoute } from '@/lib/routePrefetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { PageHeader, MetricGrid, StatCard } from '@/components/common';
import {
  Plus,
  Users,
  ClipboardCheck,
  Bell,
  Activity,
  Lock,
  Unlock,
  FileSignature,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Clock,
  ExternalLink,
  GitBranch,
} from 'lucide-react';

export const VIEW_MODES = {
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  SECRETARY: 'secretary',
};

const FACULTY_VIEW_TABS = [
  { mode: VIEW_MODES.ADVISER, label: 'Adviser View' },
  { mode: VIEW_MODES.PANELIST, label: 'Panelist View' },
  { mode: VIEW_MODES.SECRETARY, label: 'Secretary View' },
];

function getQueueTime(createdAt) {
  if (!createdAt) return null;
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (days >= 1) return `${days}d in queue`;
  if (hours >= 1) return `${hours}h in queue`;
  return 'Just submitted';
}

function getQueueBadgeColor(createdAt) {
  if (!createdAt) return 'text-muted-foreground bg-muted/40';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 2) return 'text-success-foreground bg-success/10 border-success/30';
  if (days < 5) return 'text-warning-foreground bg-warning/10 border-warning/30';
  return 'text-destructive bg-destructive/10 border-destructive/30';
}

function isArchivedRecord(item) {
  if (!item || typeof item !== 'object') return false;

  const statusCandidates = [
    item.projectStatus,
    item.status,
    item.state,
    item.project?.projectStatus,
    item.project?.status,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim().toLowerCase());

  return item.isArchived === true || statusCandidates.includes('archived');
}

// List card container with balanced padding and hairline dividers
function DenseCardList({ title, items = [], emptyState, icon: Icon, renderItem, action }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Badge variant="outline" className="text-[11px] tabular-nums">
              {items.length}
            </Badge>
          )}
          {action}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 flex-1 p-0 xl:max-h-[480px] xl:overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex px-5 py-8 text-xs text-muted-foreground justify-center text-center">
            {emptyState}
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {items.map((item, idx) => (
              <div key={item._id || idx} className="transition-colors">
                {renderItem(item, idx)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper for detailed project status
function ProjectDetailedStatus({ project }) {
  const { titleStatus, projectStatus, capstonePhase } = project;

  // Case 1: Title not yet approved - focus on Title Stage
  if (titleStatus !== TITLE_STATUSES.APPROVED) {
    const config = {
      [TITLE_STATUSES.DRAFT]: { label: 'Draft', variant: 'secondary' },
      [TITLE_STATUSES.SUBMITTED]: { label: 'Pending Title', variant: 'warning' },
      [TITLE_STATUSES.REVISION_REQUIRED]: { label: 'Title Revision', variant: 'destructive' },
      [TITLE_STATUSES.PENDING_MODIFICATION]: { label: 'Mod. Pending', variant: 'warning' },
    };
    const { label, variant } = config[titleStatus] || { label: titleStatus, variant: 'outline' };
    return (
      <Badge variant={variant} className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
        {label}
      </Badge>
    );
  }

  // Case 2: Title approved - focus on Project Lifecycle
  // Once title is approved, project is actively in Capstone 2 (Chapters 1–3) or higher.
  const rawPhase = Number(capstonePhase || 1);
  const effectivePhase = Math.max(2, rawPhase);

  // Map capstone phase to proper institutional label
  const phaseLabels = {
    1: 'Capstone 1',
    2: 'Capstone 2',
    3: 'Capstone 3',
    4: 'Final Capstone',
  };
  const phaseLabel = phaseLabels[effectivePhase] || `Capstone ${effectivePhase}`;

  // Check specific project statuses within the phase
  if (projectStatus === PROJECT_STATUSES.REVISION_NEEDED) {
    return (
      <Badge variant="destructive" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
        Revision: {phaseLabel}
      </Badge>
    );
  }

  if (
    projectStatus === PROJECT_STATUSES.PENDING_IN_REVIEW ||
    (project.pendingChapter && !['approved', 'completed', 'archived'].includes(projectStatus))
  ) {
    return (
      <Badge
        variant="outline"
        className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-warning/40 text-warning-foreground bg-warning/10"
      >
        Review: {phaseLabel}
      </Badge>
    );
  }

  if (projectStatus === PROJECT_STATUSES.PENDING_FOR_SUBMISSION) {
    return (
      <Badge variant="info" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
        Pending: {phaseLabel}
      </Badge>
    );
  }

  // Default active/approved state for the phase
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-success/50 text-success-foreground bg-success/5"
    >
      {phaseLabel}
    </Badge>
  );
}

export default function FacultyDashboard({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefetchSubmissionWorkspace = usePrefetchSubmissionReviewWorkspace();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [mode, setMode] = useState(() =>
    user?.role === ROLES.PANELIST ? VIEW_MODES.PANELIST : VIEW_MODES.ADVISER,
  );

  // Common Dashboard queries
  const { data: dashboardData, isLoading } = useDashboard();
  const ds = dashboardData || {};
  const counts = ds.counts || {};

  // Filter out archived items (memoized)
  const assignedProjects = useMemo(
    () => (ds.assignedProjects || ds.adviserProjects || []).filter((p) => !isArchivedRecord(p)),
    [ds.assignedProjects, ds.adviserProjects],
  );
  const pendingReviews = useMemo(
    () => (ds.pendingReviews || []).filter((r) => !isArchivedRecord(r)),
    [ds.pendingReviews],
  );
  const secretaryProjects = useMemo(
    () => (ds.secretaryProjects || []).filter((p) => !isArchivedRecord(p)),
    [ds.secretaryProjects],
  );

  // Specific queries only for specific modes
  useQuery({
    queryKey: ['adviserWorkload'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: mode === VIEW_MODES.ADVISER,
  });

  const { data: panelistData, isLoading: panelistLoading } = useQuery({
    queryKey: ['panelistTopics'],
    queryFn: async () => {
      const res = await dashboardService.getPanelistTopics();
      return res.data?.data || res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: mode === VIEW_MODES.PANELIST,
  });

  const panelTopicsRaw = panelistData || { assigned: [], available: [] };
  const panelTopics = useMemo(() => {
    const assigned = (panelTopicsRaw.assigned || []).filter((p) => !isArchivedRecord(p));
    const available = (panelTopicsRaw.available || []).filter((p) => !isArchivedRecord(p));
    return { assigned, available };
  }, [panelTopicsRaw.assigned, panelTopicsRaw.available]);

  const selectTopicMutation = useMutation({
    mutationFn: (projectId) => dashboardService.selectPanelistTopic(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panelistTopics'] }),
  });

  // Raul Lecaros Mandate: FR4 Top-Positioned Lock Status (Memoized)
  const isPeriodLocked = useMemo(() => {
    return (
      ds.isSystemLocked ??
      (assignedProjects.length > 0 && assignedProjects.every((p) => p.isLocked))
    );
  }, [ds.isSystemLocked, assignedProjects]);

  if (isLoading && !dashboardData) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading faculty dashboard"
        className="flex flex-col space-y-4"
      >
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Faculty Workspace"
        title="Faculty Overview"
        description="Review assigned teams, submissions, and committee work."
        actions={
          <div
            role="group"
            aria-label="Committee role"
            className="grid grid-cols-3 rounded-lg border border-border bg-muted/40 p-1 gap-1"
          >
            {FACULTY_VIEW_TABS.map((tab) => {
              const isActive = mode === tab.mode;
              return (
                <Button
                  key={tab.mode}
                  type="button"
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMode(tab.mode)}
                  aria-pressed={isActive}
                  className="min-h-10 px-2.5 py-1.5 text-xs font-medium sm:px-3.5 sm:text-sm"
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        }
      />

      {/* Top-Positioned Submission & Roster Status Banner */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
          isPeriodLocked
            ? 'border-destructive/35 bg-destructive/10 text-destructive-text'
            : 'border-success/35 bg-success/10 text-success-foreground',
        )}
      >
        <div className="flex items-center gap-3">
          {isPeriodLocked ? (
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Unlock className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isPeriodLocked
                ? 'Team Rosters & Submissions: Locked'
                : 'Submission & Group Formation: Active'}
            </span>
            <span className="text-xs opacity-90">
              {isPeriodLocked
                ? 'Modifications and team roster changes are restricted by faculty administration.'
                : 'Students may form groups (1-4 members) and submit manuscript deliverables for panel evaluation.'}
            </span>
          </div>
        </div>
        <Badge
          variant={isPeriodLocked ? 'destructive' : 'success'}
          className="text-[10px] font-semibold uppercase tracking-wider"
        >
          {isPeriodLocked ? 'Locked' : 'Open'}
        </Badge>
      </div>

      {/* Plain-Language Faculty Role Guide & Quick-Jump Bar */}
      <div
        data-testid="faculty-role-guide-bar"
        className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xs"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Committee Role Guide (
            {FACULTY_VIEW_TABS.find((t) => t.mode === mode)?.label || 'Faculty'})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {mode === VIEW_MODES.ADVISER &&
              'Check pending chapter uploads below, leave comments inside the document reader, and track advisee consultations.'}
            {mode === VIEW_MODES.PANELIST &&
              'Select an assigned capstone team below to inspect manuscripts, check originality scores, and complete your scoring rubric.'}
            {mode === VIEW_MODES.SECRETARY &&
              'Record official defense minutes, publish action directives to the ADM matrix, and complete Phase 4 verification sign-off.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === VIEW_MODES.ADVISER ? 'default' : 'outline'}
            onClick={() => navigate('/adviser/team-review')}
            className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Adviser Queue</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === VIEW_MODES.PANELIST ? 'default' : 'outline'}
            onClick={() => navigate('/projects')}
            className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Browse Assigned Projects</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === VIEW_MODES.SECRETARY ? 'default' : 'outline'}
            onClick={() => navigate('/secretary-review')}
            className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
          >
            <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Secretary Studio</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate('/archive')}
            className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search Repository Archive</span>
          </Button>
        </div>
      </div>

      {mode === VIEW_MODES.ADVISER && (
        <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <MetricGrid cols={4}>
            <StatCard
              icon={Users}
              label="Handled Teams"
              value={assignedProjects.length}
              tone="primary"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Pending Reviews"
              value={pendingReviews.length}
              tone={pendingReviews.length > 0 ? 'warning' : 'default'}
            />
            <StatCard
              icon={Activity}
              label="Active Projects"
              value={
                counts.activeProjects > 0
                  ? counts.activeProjects
                  : assignedProjects.filter((p) => p.projectStatus !== 'archived').length
              }
              tone="primary"
            />
            <StatCard
              icon={Bell}
              label="Notifications"
              value={ds.recentNotifications?.length ?? 0}
              tone={ds.unreadNotifications > 0 ? 'warning' : 'default'}
            />
          </MetricGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
            <div className="min-w-0 xl:col-span-7 space-y-6">
              <DenseCardList
                title="Handled Teams (Adviser)"
                icon={Users}
                items={assignedProjects}
                emptyState="No assigned teams yet."
                renderItem={(p, idx) => {
                  const isSelected = selectedTeam ? selectedTeam._id === p._id : idx === 0;
                  return (
                    <div
                      className={`flex flex-col gap-2 cursor-pointer px-5 py-3.5 transition-colors ${
                        isSelected
                          ? 'bg-primary/[0.06] border-l-2 border-l-primary'
                          : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedTeam(p)}
                    >
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="break-words text-sm font-semibold text-foreground">
                            {p.teamName}
                          </span>
                          <span className="break-words text-xs leading-relaxed text-muted-foreground">
                            {p.title || 'Untitled Project'}
                          </span>
                        </div>
                        <ProjectDetailedStatus project={p} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          IT Field of Discipline:{' '}
                          {Array.isArray(p.capstoneType)
                            ? p.capstoneType.join(', ')
                            : p.capstoneType || 'IT / Software'}
                        </span>
                        {p.chapterProgressSummary && (
                          <Badge variant="success" className="gap-1 rounded-sm px-1.5 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            {p.chapterProgressSummary}
                          </Badge>
                        )}
                        {p.pendingChapter && (
                          <Badge variant="warning" className="gap-1 rounded-sm px-1.5 text-[10px]">
                            <Clock className="h-3 w-3" />
                            Ch. {p.pendingChapter} in review
                          </Badge>
                        )}
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GitBranch className="h-3 w-3" aria-hidden="true" />
                            GitHub Repo
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                        {p.googleDocUrl && (
                          <a
                            href={p.googleDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="h-3 w-3" aria-hidden="true" />
                            Google Doc
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              <DenseCardList
                title="Pending Reviews"
                action={
                  user?.role !== ROLES.PANELIST ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      onClick={() => navigate('/adviser/team-review')}
                    >
                      View review queue
                    </Button>
                  ) : null
                }
                icon={ClipboardCheck}
                items={pendingReviews}
                emptyState="No pending reviews in queue."
                renderItem={(r) => {
                  const targetProjectId = r.projectId || r._id;
                  const queueTime = getQueueTime(r.createdAt);
                  const badgeColor = getQueueBadgeColor(r.createdAt);
                  const reviewDest = `/project/submissions/${r._id}/review`;
                  const handleWarmup = () => {
                    prefetchRoute(reviewDest);
                    prefetchRoute(`/submissions/${r._id}/review`);
                    prefetchSubmissionWorkspace(r._id);
                    if (r.projectId) prefetchRoute(`/projects/${r.projectId}`);
                  };
                  return (
                    <div
                      key={r._id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() =>
                        navigate(reviewDest, {
                          state: { from: `/projects/${targetProjectId}?tab=capstone_2` },
                        })
                      }
                      onMouseEnter={handleWarmup}
                      onFocus={handleWarmup}
                    >
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Ch. {r.chapter}{' '}
                            <span className="opacity-75 font-medium ml-1">({r.projectTitle})</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>Version {r.version || 1}</span>
                          <span>&bull;</span>
                          <span>{r.submittedBy || 'Proponent Team'}</span>
                          {queueTime && (
                            <>
                              <span>&bull;</span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeColor}`}
                              >
                                <Clock className="h-3 w-3" />
                                {queueTime}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold text-warning-foreground uppercase bg-warning/10 border-warning/30 px-2 py-0.5"
                        >
                          {r.status?.replace(/_/g, ' ') || 'Pending'}
                        </Badge>
                        <Button
                          size="sm"
                          className="min-h-11 px-3 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(reviewDest, {
                              state: { from: `/projects/${targetProjectId}?tab=capstone_2` },
                            });
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Review
                        </Button>
                        {r.projectId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${r.projectId}?tab=capstone_2`);
                            }}
                          >
                            Project
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* Right-hand Team Member Roster Sidebar (FRAD2) */}
            {(() => {
              const activeTeam =
                (selectedTeam && assignedProjects.find((p) => p._id === selectedTeam._id)) ||
                selectedTeam ||
                assignedProjects[0];
              return (
                <div className="min-w-0 xl:col-span-5 rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Team Roster Details
                    </h3>
                    {activeTeam && (
                      <Badge variant="outline" className="text-xs font-medium">
                        {activeTeam.teamName}
                      </Badge>
                    )}
                  </div>

                  {activeTeam ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                          Project:
                        </span>
                        <p className="font-medium text-foreground mt-0.5">
                          {activeTeam.title || 'Untitled'}
                        </p>
                      </div>

                      {/* 5-Chapter Progression Bar */}
                      <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                            Chapter Progress
                          </span>
                          <span className="font-semibold text-success-foreground">
                            {activeTeam.chapterProgressSummary ||
                              `${activeTeam.approvedChaptersCount || 0}/5 approved`}
                          </span>
                        </div>
                        <Progress
                          value={Math.round(((activeTeam.approvedChaptersCount || 0) / 5) * 100)}
                          aria-label="Approved chapter progress"
                          className="h-1.5"
                          indicatorClassName="bg-success transition-all duration-500"
                        />
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((ch) => {
                            const isApproved = ch <= (activeTeam.approvedChaptersCount || 0);
                            const isPending = ch === activeTeam.pendingChapter;
                            return (
                              <div
                                key={ch}
                                className={`text-center py-1 rounded text-[10px] font-bold border transition-all ${
                                  isApproved
                                    ? 'bg-success/15 border-success/30 text-success-foreground'
                                    : isPending
                                      ? 'bg-warning/15 border-warning/30 text-warning-foreground'
                                      : 'bg-muted/40 border-border/40 text-muted-foreground'
                                }`}
                                title={
                                  isApproved
                                    ? `Chapter ${ch}: Approved`
                                    : isPending
                                      ? `Chapter ${ch}: Pending Review`
                                      : `Chapter ${ch}: Not Approved`
                                }
                              >
                                Ch {ch}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                          IT Field of Discipline:
                        </span>
                        <p className="text-foreground mt-0.5">
                          {Array.isArray(activeTeam.capstoneType)
                            ? activeTeam.capstoneType.join(', ')
                            : activeTeam.capstoneType || 'Information Technology'}
                        </p>
                      </div>

                      {(activeTeam.githubUrl || activeTeam.googleDocUrl) && (
                        <div className="flex flex-col gap-1.5">
                          {activeTeam.googleDocUrl && (
                            <div>
                              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                                Working Document:
                              </span>
                              <p className="mt-0.5">
                                <a
                                  href={activeTeam.googleDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1.5 text-xs"
                                >
                                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                  Google Docs Manuscript
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              </p>
                            </div>
                          )}
                          {activeTeam.githubUrl && (
                            <div>
                              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                                Repository:
                              </span>
                              <p className="mt-0.5">
                                <a
                                  href={activeTeam.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1.5 text-xs"
                                >
                                  <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                                  GitHub Repository
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t pt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                            Proponent Team Roster (
                            {activeTeam.members?.length ||
                              activeTeam.memberRoles?.length ||
                              activeTeam.memberCount ||
                              0}
                            ):
                          </span>
                          {activeTeam.isLocked && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 border-destructive/30 text-destructive bg-destructive/10"
                            >
                              Locked
                            </Badge>
                          )}
                        </div>
                        <div className="divide-y divide-border/70 border-t border-border/60 max-h-48 overflow-y-auto">
                          {(activeTeam.members || activeTeam.memberRoles || []).length > 0 ? (
                            (activeTeam.members || activeTeam.memberRoles || []).map((m, idx) => (
                              <div key={m._id || idx} className="py-2 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-foreground truncate">
                                    {m.fullName ||
                                      m.name ||
                                      m.userId?.fullName ||
                                      `Member ${idx + 1}`}
                                  </span>
                                  {m.isLeader && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-semibold px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/10 shrink-0"
                                    >
                                      Lead
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {m.role ||
                                    m.traditionalRole ||
                                    m.capstoneTitle ||
                                    'Proponent Member'}
                                </span>
                                {m.email && (
                                  <span className="text-[10px] text-muted-foreground/80 truncate">
                                    {m.email}
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="py-2.5 text-xs text-muted-foreground">
                              {activeTeam.memberCount || 0} enrolled team proponent
                              {(activeTeam.memberCount || 0) === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="min-h-11 w-full gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                          onClick={() =>
                            navigate(`/project/submissions?mode=view&projectId=${activeTeam._id}`)
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Submissions & Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-11 w-full gap-2 text-sm text-foreground hover:bg-muted/30 font-semibold"
                          onClick={() => navigate(`/projects/${activeTeam._id}?tab=capstone_2`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Project Workspace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
                      <Users className="h-8 w-8 mb-2 opacity-40 text-muted-foreground" />
                      Select a handled team on the left to view member roster, roles, and repository
                      details.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {mode === VIEW_MODES.PANELIST && (
        <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <MetricGrid cols={4}>
            <StatCard
              icon={Users}
              label="Handled Panels"
              value={panelTopics.assigned.length}
              tone="primary"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Pending Evals"
              value={counts.pendingEvaluations ?? 0}
              tone={(counts.pendingEvaluations ?? 0) > 0 ? 'warning' : 'default'}
            />
            <StatCard
              icon={Activity}
              label="Active Topics"
              value={counts.activeProjects ?? 0}
              tone="primary"
            />
            <StatCard
              icon={Plus}
              label="Available Topics"
              value={panelTopics.available.length}
              tone="default"
            />
          </MetricGrid>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <DenseCardList
              title="Handled Teams (Panelist)"
              icon={Users}
              items={panelTopics.assigned}
              emptyState="You have not been assigned to any panels."
              renderItem={(topic) => (
                <div className="flex flex-col items-start gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/25 transition-colors">
                  <div className="flex min-w-0 flex-col">
                    <span className="break-words text-sm font-semibold">
                      {topic.title || 'Untitled'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground mt-0.5">
                      Lead: {topic.proposerName || 'System'}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-primary/20 bg-primary/5 text-primary"
                  >
                    Panelist
                  </Badge>
                </div>
              )}
            />
            <DenseCardList
              title="Available Topics"
              icon={Plus}
              items={panelTopics.available}
              emptyState={panelistLoading ? 'Loading...' : 'No new topics available to select.'}
              renderItem={(topic) => (
                <div className="flex flex-col items-start gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/25 transition-colors">
                  <div className="flex min-w-0 flex-col">
                    <span className="break-words text-sm font-semibold">
                      {topic.title || 'Untitled'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground mt-0.5">
                      Area: {topic.researchArea || 'General'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => selectTopicMutation.mutate(topic._id)}
                    disabled={selectTopicMutation.isPending}
                    className="min-h-11 shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {selectTopicMutation.isPending ? <Spinner className="size-3" /> : 'Select'}
                  </Button>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {mode === VIEW_MODES.SECRETARY && (
        <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <MetricGrid cols={4}>
            <StatCard
              icon={Users}
              label="Handled Teams (Secretary)"
              value={counts.secretaryProjects ?? secretaryProjects.length}
              tone="primary"
            />
            <StatCard
              icon={FileText}
              label="Pending Minutes"
              value={counts.pendingSecretaryMinutes ?? 0}
              tone={(counts.pendingSecretaryMinutes ?? 0) > 0 ? 'warning' : 'default'}
            />
            <StatCard
              icon={AlertCircle}
              label="Pending Endorsement"
              value={counts.pendingSecretaryEndorsement ?? 0}
              tone={(counts.pendingSecretaryEndorsement ?? 0) > 0 ? 'warning' : 'default'}
            />
            <StatCard
              icon={CheckCircle2}
              label="Endorsed Matrices"
              value={counts.endorsedSecretaryMatrices ?? 0}
              tone="success"
            />
          </MetricGrid>

          {/* Secretary Workspace Split: Teams on Left (7 cols), Studio Banner on Right (5 cols) */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
            <div className="min-w-0 xl:col-span-7">
              <DenseCardList
                title="Secretary Assigned Capstone Teams"
                icon={FileSignature}
                items={secretaryProjects}
                emptyState="You are not currently appointed as Committee Secretary for any active teams."
                renderItem={(project) => {
                  const hasMinutes = project.actionDoneMatrixCount > 0;
                  const isEndorsed = project.admSignatures?.secretary?.endorsed === true;
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/25 transition-colors">
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {project.title || 'Untitled Project'}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold shrink-0"
                          >
                            {project.teamName}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Adviser: {project.adviserName || 'Unassigned'} &bull; Phase{' '}
                          {project.capstonePhase || 1} &bull; {project.actionDoneMatrixCount} ADM
                          Remark(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isEndorsed ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-success-foreground bg-success/10 border-success/30"
                          >
                            Endorsed & Unlocked
                          </Badge>
                        ) : hasMinutes ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-info-foreground bg-info/10 border-info/30"
                          >
                            In Revision / Review
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-warning-foreground bg-warning/10 border-warning/30"
                          >
                            Needs Minutes Upload
                          </Badge>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate(`/secretary-review?projectId=${project._id}`)}
                          className="min-h-11 gap-1 px-3 py-2 text-[11px] font-semibold"
                        >
                          Review Studio
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* Secretary Governance Guide & Quick Actions Card */}
            <div className="min-w-0 xl:col-span-5 rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" />
                  Secretary Workflow
                </h3>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  As the <strong className="text-foreground">Committee Secretary</strong>, you
                  record defense minutes and verify the Action Done Matrix (ADM):
                </p>

                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      1
                    </span>
                    <p>
                      <strong className="text-foreground">Upload Defense Minutes:</strong> Upload
                      defense hearing minutes (PDF/DOCX) to parse panel remarks into structured ADM
                      rows.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      2
                    </span>
                    <p>
                      <strong className="text-foreground">Verify Proponent Actions:</strong> Inspect
                      revisions and page numbers submitted by the student proponents.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      3
                    </span>
                    <p>
                      <strong className="text-foreground">Endorse Matrix:</strong> Grant Secretary
                      Endorsement to unlock Tier 1, Tier 2, and Tier 3 digital signatures.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/secretary-review')}
                  className="w-full gap-2 text-xs font-bold"
                >
                  <FileSignature className="h-4 w-4" />
                  Open Secretary Review Studio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
