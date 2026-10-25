import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { getSocket, connectSocket } from '@/services/socket';
import { useProjects, useProject, usePrefetchProject } from '@/hooks/useProjects';
import { FileSignature, Search, RefreshCw, ChevronRight, ExternalLink } from 'lucide-react';
import { resolveWorkflowPhase } from '@cms/shared';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import { resolveAdmStatus } from '@/components/projects/adm/admWorkflow';

export default function SecretaryReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authState = useAuthStore((s) => s?.user);
  const user = authState?.user ?? authState;
  const queryClient = useQueryClient();
  const prefetchProject = usePrefetchProject();

  const initialProjectId = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const initialView = searchParams.get('tab') === 'adm' ? 'adm' : 'minutes';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fetch projects where user is Secretary
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = useProjects({
    secretaryId: user?._id || user?.id,
    excludeArchived: false,
  });

  const projects = useMemo(() => {
    return projectsData?.projects || [];
  }, [projectsData]);

  // Set default selected project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const firstId = projects[0]._id;
      setSelectedProjectId(firstId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('projectId', firstId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [projects, selectedProjectId, searchParams, setSearchParams]);

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('projectId', id);
    setSearchParams(nextParams);
  };

  // Fetch full details of selected project with shared cache and placeholderData
  const {
    data: selectedProjectData,
    isLoading: isProjectDetailsLoading,
    refetch: refetchProjectDetails,
  } = useProject(selectedProjectId);

  const hasSelectedProjectDetails =
    selectedProjectData && String(selectedProjectData._id) === String(selectedProjectId);
  const project = hasSelectedProjectDetails
    ? selectedProjectData
    : projects.find((p) => p._id === selectedProjectId);

  const projectListWithSelectedDetails = useMemo(
    () =>
      projects.map((listedProject) =>
        hasSelectedProjectDetails && String(listedProject._id) === String(selectedProjectId)
          ? { ...listedProject, ...selectedProjectData }
          : listedProject,
      ),
    [projects, hasSelectedProjectDetails, selectedProjectData, selectedProjectId],
  );

  // Filter project list
  const filteredProjects = useMemo(() => {
    return projectListWithSelectedDetails.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamId?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const { key: admKey, total } = resolveAdmStatus(p);
      const hasMinutes = total > 0 || (p.actionDoneMatrixCount ?? 0) > 0;
      const isEndorsed = admKey === 'endorsed' || admKey === 'approved';

      if (statusFilter === 'NEEDS_MINUTES') return !hasMinutes;
      if (statusFilter === 'IN_REVISION') return hasMinutes && !isEndorsed;
      if (statusFilter === 'ENDORSED') return isEndorsed;
      return true;
    });
  }, [projectListWithSelectedDetails, searchTerm, statusFilter]);

  // Real-time synchronization with Proponents, Committee, and Instructor
  useEffect(() => {
    if (!selectedProjectId) return;

    let s = getSocket();
    if (!s) {
      s = connectSocket();
    }
    if (!s) return;

    try {
      s.emit('join:project', selectedProjectId);
    } catch {
      // Non-blocking
    }

    const handleSync = (data) => {
      if (!data?.projectId || String(data.projectId) === String(selectedProjectId)) {
        refetchProjectDetails();
        queryClient.invalidateQueries({ queryKey: ['project', selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['secretary-minutes', selectedProjectId] });
      }
    };

    s.on('adm:row_updated', handleSync);
    s.on('adm:row_created', handleSync);
    s.on('adm:row_deleted', handleSync);
    s.on('adm:endorsed', handleSync);
    s.on('adm:signed', handleSync);
    s.on('adm:submitted', handleSync);
    s.on('defense:minutes_updated', handleSync);
    s.on('project:updated', handleSync);

    return () => {
      s.off('adm:row_updated', handleSync);
      s.off('adm:row_created', handleSync);
      s.off('adm:row_deleted', handleSync);
      s.off('adm:endorsed', handleSync);
      s.off('adm:signed', handleSync);
      s.off('adm:submitted', handleSync);
      s.off('defense:minutes_updated', handleSync);
      s.off('project:updated', handleSync);
    };
  }, [selectedProjectId, refetchProjectDetails, queryClient]);

  // Matrix metrics for the project's active milestone (same resolver as every other ADM surface)
  const admStatus = resolveAdmStatus(project);
  const addressedCount = admStatus.addressed;
  const totalRows = admStatus.total;

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 lg:space-y-8">
        {/* Institutional Top Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Secretary Review
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review defense minutes and Action Done Matrix compliance.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProjects();
                refetchProjectDetails();
              }}
              className="min-h-11 gap-2 text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="min-h-11 gap-2 text-sm"
            >
              Faculty Overview
            </Button>
          </div>
        </div>

        {/* Studio Split Workspace */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* Left Column: Assigned Secretary Teams Queue (3 cols) */}
          <div className="min-w-0 space-y-4 xl:col-span-4 no-print">
            <Card className="shadow-sm">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Assigned Teams</CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {projects.length} Total
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Teams where you serve as Committee Secretary.
                </CardDescription>

                {/* Filter & Search */}
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team or title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search assigned teams"
                      className="pl-9 text-base sm:text-sm min-h-11"
                    />
                  </div>
                  <div
                    role="group"
                    aria-label="Compliance status"
                    className="grid grid-cols-2 gap-2 text-xs"
                  >
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'NEEDS_MINUTES', label: 'Needs Minutes' },
                      { id: 'IN_REVISION', label: 'Under Review' },
                      { id: 'ENDORSED', label: 'Endorsed' },
                    ].map((tab) => (
                      <Button
                        key={tab.id}
                        type="button"
                        aria-pressed={statusFilter === tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        variant={statusFilter === tab.id ? 'default' : 'outline'}
                        className="min-h-11 w-full px-3 py-2 text-xs font-medium"
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-2 pt-0 max-h-[600px] overflow-y-auto space-y-1.5 custom-scrollbar">
                {isProjectsLoading ? (
                  <div role="status" aria-label="Loading assigned teams" className="space-y-3 p-2">
                    {[0, 1, 2].map((item) => (
                      <Skeleton key={item} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No matching teams"
                    description="Try a different title, team name, or compliance filter."
                    compact
                    className="border-0"
                  />
                ) : (
                  filteredProjects.map((p) => {
                    const isSelected = p._id === selectedProjectId;
                    const pStatus = resolveAdmStatus(p);
                    const pHasMinutes = pStatus.total > 0 || (p.actionDoneMatrixCount ?? 0) > 0;
                    const pIsEndorsed = pStatus.key === 'endorsed' || pStatus.key === 'approved';

                    return (
                      <Button
                        key={p._id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectProject(p._id)}
                        onMouseEnter={() => prefetchProject(p._id)}
                        onFocus={() => prefetchProject(p._id)}
                        variant="ghost"
                        className={`h-auto w-full cursor-pointer flex-col items-stretch justify-start rounded-lg border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border/60 hover:border-border hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words text-sm font-semibold text-foreground line-clamp-2">
                            {p.title || 'Untitled Project'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {p.teamId?.name || 'Unknown Team'}
                          </span>
                          <span>&bull;</span>
                          <span>Phase {resolveWorkflowPhase(p)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {pIsEndorsed ? (
                            <Badge variant="success" className="text-[9px] font-bold">
                              {pStatus.label}
                            </Badge>
                          ) : pHasMinutes ? (
                            <Badge variant="info" className="text-[9px] font-bold">
                              {pStatus.label} ({pStatus.total || p.actionDoneMatrixCount} items)
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[9px] font-bold">
                              Needs Minutes
                            </Badge>
                          )}
                        </div>
                      </Button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Active Project Workspace (9 cols) */}
          <div className="min-w-0 space-y-6 xl:col-span-8">
            {!project && isProjectDetailsLoading ? (
              <div role="status" aria-label="Loading project details and Action Done Matrix">
                <SkeletonCard className="p-6 shadow-sm" />
              </div>
            ) : !project ? (
              <EmptyState
                icon={FileSignature}
                title="Select an assigned team"
                description="Choose a team from your queue to review defense minutes and compliance."
                compact
              />
            ) : (
              <>
                {/* Project Header Banner */}
                <Card className="border-border/70 shadow-sm no-print">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {project.teamId?.name || 'Assigned Team'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Phase {project.capstonePhase || 1}
                          </Badge>
                        </div>
                        <h2 className="break-words text-lg font-bold text-foreground tracking-tight">
                          {project.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/projects/${project._id}`)}
                          className="text-xs gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Project Page
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Adviser
                        </span>
                        <p className="font-medium text-foreground">
                          {project.adviserId?.fullName ||
                            `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.trim() ||
                            'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Secretary
                        </span>
                        <p className="font-medium text-foreground">
                          {user?.fullName ||
                            `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Matrix Status
                        </span>
                        <p className="font-medium text-foreground capitalize">{admStatus.label}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Compliance
                        </span>
                        <p className="font-bold text-foreground">
                          {totalRows > 0
                            ? `${addressedCount} of ${totalRows} (${Math.round((addressedCount / totalRows) * 100)}%)`
                            : 'No remarks'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Single ADM interface: same document, minutes view and sign-off gate as every other role */}
                <ActionDoneMatrixTab
                  key={project._id}
                  project={project}
                  user={user}
                  isFaculty
                  initialView={initialView}
                  onRefresh={async () => {
                    await Promise.all([refetchProjectDetails(), refetchProjects()]);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
