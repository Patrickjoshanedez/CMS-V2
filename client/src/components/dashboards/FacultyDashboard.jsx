import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import { dashboardService } from '../../services/dashboardService';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Plus, Users, ClipboardCheck, Bell, Activity, Lock, Unlock } from 'lucide-react';

const VIEW_MODES = {
  ADVISER: 'adviser',
  PANELIST: 'panelist',
};

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
  // Map phase to label
  const phaseLabels = {
    1: 'Proposal Stage',
    2: 'Design Stage',
    3: 'Development',
    4: 'Final Defense',
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
  const assignedProjects = (ds.assignedProjects || []).filter((p) => !isArchivedRecord(p));

  const pendingReviews = (ds.pendingReviews || []).filter((r) => !isArchivedRecord(r));

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
            Manage your handled teams and specific actions without scrolling.
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
                    : 'Students may form groups (2-4 members) and submit manuscript deliverables for panel evaluation.'}
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
              tone="warning"
            />
            <MicroStat
              icon={Activity}
              label="Active Projects"
              value={counts.activeProjects ?? 0}
              tone="info"
            />
            <MicroStat
              icon={Bell}
              label="Notifications"
              value={ds.recentNotifications?.length ?? 0}
              tone="default"
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
                renderItem={(r) => (
                  <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">
                        Ch. {r.chapter}{' '}
                        <span className="opacity-70 font-medium ml-1">({r.projectTitle})</span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Version {r.version || 1} &bull; {r.submittedBy}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-amber-600 uppercase bg-amber-500/10 px-2 py-0.5 rounded-sm">
                      {r.status?.replace(/_/g, ' ') || 'Pending'}
                    </span>
                  </div>
                )}
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
                          {activeTeam.members?.length || activeTeam.memberRoles?.length || 0}):
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(activeTeam.members || activeTeam.memberRoles || []).map((m, idx) => (
                            <div
                              key={m._id || idx}
                              className="p-2 rounded bg-muted/30 border border-border/50 flex flex-col gap-0.5"
                            >
                              <span className="font-bold text-foreground">
                                {m.fullName || m.name || m.userId?.fullName || `Member ${idx + 1}`}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {m.role || m.traditionalRole || m.capstoneTitle || 'Proponent'}
                              </span>
                            </div>
                          ))}
                        </div>
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
    </div>
  );
}
