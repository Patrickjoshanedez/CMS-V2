import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@cms/shared';
import { dashboardService } from '../../services/dashboardService';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Plus, Users, ClipboardCheck, Bell, Activity } from 'lucide-react';

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
    info: 'bg-sky-500/5 text-sky-600 border-sky-500/20'
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
              <div key={item._id || idx} className="px-4 py-2.5 transition-colors hover:bg-muted/10">
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FacultyDashboard({ user }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(() => 
    user?.role === ROLES.PANELIST ? VIEW_MODES.PANELIST : VIEW_MODES.ADVISER
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
          <h2 className="text-lg font-bold tracking-tight text-foreground">Faculty Overview</h2>
          <p className="text-xs text-muted-foreground">Manage your handled teams and specific actions without scrolling.</p>
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

      {mode === VIEW_MODES.ADVISER && (
        <div className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Micro-Stat Grid for Adviser */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MicroStat icon={Users} label="Handled Teams" value={assignedProjects.length} tone="accent" />
            <MicroStat icon={ClipboardCheck} label="Pending Reviews" value={pendingReviews.length} tone="warning" />
            <MicroStat icon={Activity} label="Active Projects" value={counts.activeProjects ?? 0} tone="info" />
            <MicroStat icon={Bell} label="Notifications" value={ds.recentNotifications?.length ?? 0} tone="default" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DenseCardList
              title="Handled Teams (Adviser)"
              icon={Users}
              items={assignedProjects}
              emptyState="No assigned teams yet."
              renderItem={(p) => (
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{p.teamName}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.title || 'Untitled Project'}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5">
                    {p.titleStatus || 'Draft'}
                  </Badge>
                </div>
              )}
            />
            <DenseCardList
              title="Pending Reviews"
              icon={ClipboardCheck}
              items={pendingReviews}
              emptyState="No pending reviews in queue."
              renderItem={(r) => (
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">Ch. {r.chapter} <span className="opacity-70 font-medium ml-1">({r.projectTitle})</span></span>
                    <span className="truncate text-xs text-muted-foreground">Version {r.version || 1} &bull; {r.submittedBy}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-amber-600 uppercase bg-amber-500/10 px-2 py-0.5 rounded-sm">
                    {r.status?.replace(/_/g, ' ') || 'Pending'}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {mode === VIEW_MODES.PANELIST && (
        <div className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Micro-Stat Grid for Panelist */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MicroStat icon={Users} label="Handled Panels" value={panelTopics.assigned.length} tone="accent" />
            <MicroStat icon={ClipboardCheck} label="Pending Evals" value={counts.pendingEvaluations ?? 0} tone="warning" />
            <MicroStat icon={Activity} label="Active Topics" value={counts.activeProjects ?? 0} tone="info" />
            <MicroStat icon={Plus} label="Available Topics" value={panelTopics.available.length} tone="default" />
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
                    <span className="truncate text-sm font-semibold">{topic.title || 'Untitled'}</span>
                    <span className="truncate text-xs text-muted-foreground">Lead: {topic.proposerName || 'System'}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-bold h-5 px-1.5 border-primary/20 bg-primary/5 text-primary">
                    Panelist
                  </Badge>
                </div>
              )}
            />
            <DenseCardList
              title="Available Topics"
              icon={Plus}
              items={panelTopics.available}
              emptyState={panelistLoading ? "Loading..." : "No new topics available to select."}
              renderItem={(topic) => (
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{topic.title || 'Untitled'}</span>
                    <span className="truncate text-xs text-muted-foreground">Area: {topic.researchArea || 'General'}</span>
                  </div>
                  <button
                    onClick={() => selectTopicMutation.mutate(topic._id)}
                    disabled={selectTopicMutation.isPending}
                    className="flex shrink-0 items-center justify-center rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {selectTopicMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Select'}
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
