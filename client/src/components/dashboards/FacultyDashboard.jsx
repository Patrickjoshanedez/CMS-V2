import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import { dashboardService } from '../../services/dashboardService';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Loader2,
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
} from 'lucide-react';

export const VIEW_MODES = {
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  SECRETARY: 'secretary',
};

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
  if (days < 2)
    return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (days < 5) return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
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

// Extremely compact metric card
function MicroStat({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-muted/30 text-foreground border-border',
    accent: 'bg-primary/5 text-primary border-primary/20',
    warning: 'bg-amber-500/5 text-amber-600 border-amber-500/20',
    success: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20',
    info: 'bg-sky-500/5 text-sky-600 border-sky-500/20',
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background shadow-sm">
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        <span className="text-xl font-bold leading-none tracking-tight">{value}</span>
      </div>
    </div>
  );
}

// Compact list that removes padding and shrinks items
function DenseCardList({ title, items = [], emptyState, icon: Icon, renderItem }) {
  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b bg-muted/10 px-4 py-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 max-h-[320px] custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex px-4 py-6 text-xs text-muted-foreground justify-center text-center">
            {emptyState}
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {items.map((item, idx) => (
              <div
                key={item._id || idx}
                className="px-4 py-2.5 transition-colors hover:bg-muted/10"
              >
                {renderItem(item)}
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
  // Map capstone phase to proper institutional label
  const phaseLabels = {
    1: 'Capstone 1',
    2: 'Capstone 2',
    3: 'Capstone 3',
    4: 'Capstone 4 (Final)',
  };
  const phaseLabel = phaseLabels[capstonePhase] || `Phase ${capstonePhase}`;

  // Check specific project statuses within the phase
  if (projectStatus === PROJECT_STATUSES.REVISION_NEEDED) {
    return (
      <Badge variant="destructive" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
        Revision: {phaseLabel}
      </Badge>
    );
  }

  if (projectStatus === PROJECT_STATUSES.PENDING_IN_REVIEW) {
    return (
      <Badge variant="warning" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
        Review: {phaseLabel}
      </Badge>
    );
  }

  if (projectStatus === PROJECT_STATUSES.PENDING_FOR_SUBMISSION) {
    return (
      <Badge
        variant="outline"
        className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-sky-500/50 text-sky-600 bg-sky-500/5"
      >
        Pending: {phaseLabel}
      </Badge>
    );
  }

  // Default active/approved state for the phase
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-500/5"
    >
      {phaseLabel}
    </Badge>
  );
}

export default function FacultyDashboard({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [mode, setMode] = useState(() =>
    user?.role === ROLES.PANELIST ? VIEW_MODES.PANELIST : VIEW_MODES.ADVISER,
  );

  // Common Dashboard queries
  const { data: dashboardData } = useDashboard();
  const ds = dashboardData || {};
  const counts = ds.counts || {};

  // Filter out archived items
  const assignedProjects = (ds.assignedProjects || ds.adviserProjects || []).filter(
    (p) => !isArchivedRecord(p),
  );
  const pendingReviews = (ds.pendingReviews || []).filter((r) => !isArchivedRecord(r));
  const secretaryProjects = (ds.secretaryProjects || []).filter((p) => !isArchivedRecord(p));

  // Specific queries only for specific modes
  useQuery({
    queryKey: ['adviserWorkload'],
    queryFn: () => dashboardService.getAdviserWorkload(),
    enabled: mode === VIEW_MODES.ADVISER,
  });

  const { data: panelistData, isLoading: panelistLoading } = useQuery({
    queryKey: ['panelistTopics'],
    queryFn: async () => {
      const res = await dashboardService.getPanelistTopics();
      return res.data?.data || res.data;
    },
    enabled: mode === VIEW_MODES.PANELIST,
  });

  const panelTopicsRaw = panelistData || { assigned: [], available: [] };
  const panelTopics = {
    assigned: (panelTopicsRaw.assigned || []).filter((p) => !isArchivedRecord(p)),
    available: (panelTopicsRaw.available || []).filter((p) => !isArchivedRecord(p)),
  };

  const selectTopicMutation = useMutation({
    mutationFn: (projectId) => dashboardService.selectPanelistTopic(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panelistTopics'] }),
  });

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Header & Tabs (Very Space Efficient) */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Faculty Overview</h1>
          <p className="text-xs text-muted-foreground">
            Manage your handled teams and committee roles without friction.
          </p>
        </div>
        <div className="flex shrink-0 rounded-md border bg-muted/30 p-1">
          <button
            onClick={() => setMode(VIEW_MODES.ADVISER)}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === VIEW_MODES.ADVISER
                ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Adviser View
          </button>
          <button
            onClick={() => setMode(VIEW_MODES.PANELIST)}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === VIEW_MODES.PANELIST
                ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Panelist View
          </button>
          <button
            onClick={() => setMode(VIEW_MODES.SECRETARY)}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === VIEW_MODES.SECRETARY
                ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Secretary View
          </button>
        </div>
      </div>

      {/* Raul Lecaros Mandate: FR4 Top-Positioned Lock Banner (Red/Green) */}
      {(() => {
        const isPeriodLocked =
          ds?.isSystemLocked ??
          (assignedProjects.length > 0 && assignedProjects.every((p) => p.isLocked));
        return (
          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 shadow-sm transition-all ${
              isPeriodLocked
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  isPeriodLocked ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                {isPeriodLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isPeriodLocked
                    ? 'Team Rosters & Submissions: Locked'
                    : 'Submission & Group Formation: Active'}
                </span>
                <span className="text-[11px] opacity-85">
                  {isPeriodLocked
                    ? 'Modifications and team roster changes are restricted by faculty administration.'
                    : 'Students may form groups (1-4 members) and submit manuscript deliverables for panel evaluation.'}
                </span>
              </div>
            </div>
            <Badge
              variant={isPeriodLocked ? 'destructive' : 'success'}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
            >
              {isPeriodLocked ? 'Locked' : 'Open'}
            </Badge>
          </div>
        );
      })()}

      {mode === VIEW_MODES.ADVISER && (
        <div className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Micro-Stat Grid for Adviser */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MicroStat
              icon={Users}
              label="Handled Teams"
              value={assignedProjects.length}
              tone="accent"
            />
            <MicroStat
              icon={ClipboardCheck}
              label="Pending Reviews"
              value={pendingReviews.length}
              tone={pendingReviews.length > 0 ? 'warning' : 'default'}
            />
            <MicroStat
              icon={Activity}
              label="Active Projects"
              value={
                counts.activeProjects > 0
                  ? counts.activeProjects
                  : assignedProjects.filter((p) => p.projectStatus !== 'archived').length
              }
              tone="info"
            />
            <MicroStat
              icon={Bell}
              label="Notifications"
              value={ds.recentNotifications?.length ?? 0}
              tone={ds.unreadNotifications > 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <DenseCardList
                title="Handled Teams (Adviser)"
                icon={Users}
                items={assignedProjects}
                emptyState="No assigned teams yet."
                renderItem={(p, idx) => {
                  const isSelected = selectedTeam ? selectedTeam._id === p._id : idx === 0;
                  return (
                    <div
                      className={`flex flex-col gap-2 cursor-pointer p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                          : 'border-transparent hover:bg-muted/20'
                      }`}
                      onClick={() => setSelectedTeam(p)}
                    >
                      <div className="flex flex-row items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold">{p.teamName}</span>
                          <span className="truncate text-xs text-muted-foreground">
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
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📦 GitHub Repo ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              <DenseCardList
                title="Pending Reviews"
                icon={ClipboardCheck}
                items={pendingReviews}
                emptyState="No pending reviews in queue."
                renderItem={(r) => {
                  const targetProjectId = r.projectId || r._id;
                  const queueTime = getQueueTime(r.createdAt);
                  const badgeColor = getQueueBadgeColor(r.createdAt);
                  const reviewDest = `/project/submissions/${r._id}/review`;
                  return (
                    <div
                      key={r._id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-all cursor-pointer"
                      onClick={() =>
                        navigate(reviewDest, {
                          state: { from: `/projects/${targetProjectId}?tab=capstone_2` },
                        })
                      }
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
                          className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 border-amber-500/30 px-2 py-0.5"
                        >
                          {r.status?.replace(/_/g, ' ') || 'Pending'}
                        </Badge>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
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
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
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
              const activeTeam = selectedTeam || assignedProjects[0];
              return (
                <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Team Roster Details
                    </h3>
                    {activeTeam && (
                      <Badge variant="outline" className="text-[10px]">
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
                              className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              🔗 {activeTeam.githubUrl}
                            </a>
                          </p>
                        </div>
                      )}
                      <div className="border-t pt-2 space-y-2">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                          Members (
                          {activeTeam.members?.length ||
                            activeTeam.memberRoles?.length ||
                            activeTeam.memberCount ||
                            0}
                          ):
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(activeTeam.members || activeTeam.memberRoles || []).length > 0 ? (
                            (activeTeam.members || activeTeam.memberRoles || []).map((m, idx) => (
                              <div
                                key={m._id || idx}
                                className="p-2 rounded bg-muted/30 border border-border/50 flex flex-col gap-0.5"
                              >
                                <span className="font-bold text-foreground">
                                  {m.fullName ||
                                    m.name ||
                                    m.userId?.fullName ||
                                    `Member ${idx + 1}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {m.role || m.traditionalRole || m.capstoneTitle || 'Proponent'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-2 rounded bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
                              {activeTeam.memberCount || 0} enrolled team proponent
                              {(activeTeam.memberCount || 0) === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-none font-semibold"
                        onClick={() => navigate(`/projects/${activeTeam._id}?tab=capstone_2`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Project Workspace
                      </Button>
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
        <div className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Micro-Stat Grid for Panelist */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MicroStat
              icon={Users}
              label="Handled Panels"
              value={panelTopics.assigned.length}
              tone="accent"
            />
            <MicroStat
              icon={ClipboardCheck}
              label="Pending Evals"
              value={counts.pendingEvaluations ?? 0}
              tone="warning"
            />
            <MicroStat
              icon={Activity}
              label="Active Topics"
              value={counts.activeProjects ?? 0}
              tone="info"
            />
            <MicroStat
              icon={Plus}
              label="Available Topics"
              value={panelTopics.available.length}
              tone="default"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DenseCardList
              title="Handled Teams (Panelist)"
              icon={Users}
              items={panelTopics.assigned}
              emptyState="You have not been assigned to any panels."
              renderItem={(topic) => (
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {topic.title || 'Untitled'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
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
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {topic.title || 'Untitled'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Area: {topic.researchArea || 'General'}
                    </span>
                  </div>
                  <button
                    onClick={() => selectTopicMutation.mutate(topic._id)}
                    disabled={selectTopicMutation.isPending}
                    className="flex shrink-0 items-center justify-center rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {selectTopicMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Select'
                    )}
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {mode === VIEW_MODES.SECRETARY && (
        <div className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Micro-Stat Grid for Secretary */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MicroStat
              icon={Users}
              label="Handled Teams (Secretary)"
              value={counts.secretaryProjects ?? secretaryProjects.length}
              tone="accent"
            />
            <MicroStat
              icon={FileText}
              label="Pending Minutes"
              value={counts.pendingSecretaryMinutes ?? 0}
              tone="warning"
            />
            <MicroStat
              icon={AlertCircle}
              label="Pending Endorsement"
              value={counts.pendingSecretaryEndorsement ?? 0}
              tone="info"
            />
            <MicroStat
              icon={CheckCircle2}
              label="Endorsed Matrices"
              value={counts.endorsedSecretaryMatrices ?? 0}
              tone="default"
            />
          </div>

          {/* Secretary Workspace Split: Teams on Left, Studio Banner on Right */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DenseCardList
                title="Secretary Assigned Capstone Teams"
                icon={FileSignature}
                items={secretaryProjects}
                emptyState="You are not currently appointed as Committee Secretary for any active teams."
                renderItem={(project) => {
                  const hasMinutes = project.actionDoneMatrixCount > 0;
                  const isEndorsed = project.admSignatures?.secretary?.endorsed === true;
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                          >
                            Endorsed & Unlocked
                          </Badge>
                        ) : hasMinutes ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-sky-600 bg-sky-500/10 border-sky-500/30"
                          >
                            In Revision / Review
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 border-amber-500/30"
                          >
                            Needs Minutes Upload
                          </Badge>
                        )}
                        <button
                          onClick={() => navigate(`/secretary-review?projectId=${project._id}`)}
                          className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Review Studio
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* Secretary Governance Guide & Quick Actions Card */}
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" />
                  Secretary Studio
                </h3>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                  ASDLC Gate
                </Badge>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  As the <strong className="text-foreground">Committee Secretary</strong>, you
                  manage the hearing defense minutes and the Action Done Matrix (ADM) compliance
                  pipeline:
                </p>

                <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-2.5 text-[11px]">
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

                <button
                  onClick={() => navigate('/secretary-review')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <FileSignature className="h-4 w-4" />
                  Open Secretary Review Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
