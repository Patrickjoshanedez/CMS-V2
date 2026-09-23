import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsContent } from '@/components/ui/Tabs';
import {
  AlertTriangle,
  Info,
  FileText,
  BookOpen,
  Award,
  Lock,
  FileSpreadsheet,
  MessageSquareMore,
  Code2,
  BookMarked,
  ExternalLink,
  Send,
} from 'lucide-react';

// Extracted reusable components
import EmptyProjectState from '@/components/projects/EmptyProjectState';
import RejectedProjectState from '@/components/projects/RejectedProjectState';
import ProjectSidebarInfo from '@/components/projects/ProjectSidebarInfo';
import ProjectDetailsModal from '@/components/projects/ProjectDetailsModal';
import TitleFeedbackRemarksCard from '@/components/projects/TitleFeedbackRemarksCard';
import TitleActionsSection from '@/components/projects/TitleWorkflowCards';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProposalTab from '@/components/projects/ProposalTab';
import Capstone1CollapsibleSections from '@/components/projects/Capstone1CollapsibleSections';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import ProjectInformationSidebar from '@/components/projects/ProjectInformationSidebar';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { getProjectAuthors, formatCitation } from '@/pages/projects/projectDetailUtils';

// Hooks & constants
import { useMyProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { WORKFLOW_TABS, resolveActiveWorkflowTab } from './myProjectTabs';
import { TITLE_STATUSES, CAPSTONE_PHASES, PROJECT_STATUSES } from '@cms/shared';
import { toast } from 'sonner';

/**
 * MyProjectPage — Student project dashboard.
 *
 * Displays the current project info, title status, adviser/panelists,
 * and provides contextual actions based on title workflow state.
 */
export default function MyProjectPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);
  const [selectedProposalIndex, setSelectedProposalIndex] = useState(0);
  const { data: project, isLoading, error, refetch } = useMyProject();
  const { data: team, isLoading: isTeamLoading } = useMyTeam(user?._id);

  // Derived unlock conditions
  const titleStatus = project?.titleStatus;
  const titleApproved = titleStatus === TITLE_STATUSES.APPROVED;
  const _hasPanelists = Array.isArray(project?.panelistIds) && project.panelistIds.length > 0;

  const numericPhase = Number(project?.capstonePhase ?? project?.phase ?? 0);

  // Capstone 1 (Proposal & Chapters 1–3) is always accessible.
  const _capstone1Unlocked = true;
  // Capstone 2 (System Development & Prototype) is unlocked once title is fully approved
  const capstone2Unlocked = titleApproved || numericPhase >= CAPSTONE_PHASES.PHASE_2;
  // Capstone 3 (Chapters 4–5, Academic Journal & Final Defense) requires Phase 3
  const capstone3Unlocked = numericPhase >= CAPSTONE_PHASES.PHASE_3;

  const isArchivedProject =
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED || Boolean(project?.isArchived);

  // When proposals are submitted and awaiting committee/instructor approval,
  // guide proponents to the dedicated Title Approval Page unless they explicitly
  // requested to view the capstone overview or a specific workflow tab.
  useEffect(() => {
    if (
      !isLoading &&
      project &&
      searchParams.get('view') !== 'overview' &&
      !searchParams.get('tab') &&
      project.titleStatus !== TITLE_STATUSES.APPROVED &&
      project.projectStatus !== PROJECT_STATUSES.REJECTED &&
      !isArchivedProject
    ) {
      navigate('/project/approval', { replace: true });
    }
  }, [isLoading, project, isArchivedProject, navigate, searchParams]);

  const unlockedTabs = ['proposal', 'capstone_1', 'adm'];
  if (capstone2Unlocked) unlockedTabs.push('capstone_2');
  if (capstone3Unlocked) unlockedTabs.push('capstone_3');
  if (titleApproved) unlockedTabs.push('consultation');

  function getDefaultTab() {
    if (!project) return 'proposal';
    if (capstone3Unlocked) return 'capstone_3';
    if (capstone2Unlocked) return 'capstone_2';
    if (titleApproved) return 'capstone_1';
    return 'proposal';
  }

  const defaultTab = getDefaultTab();
  const requestedTab = searchParams.get('tab');
  const { activeTab, shouldNormalizeRequestedTab } = resolveActiveWorkflowTab({
    requestedTab: isLoading || !project ? requestedTab || defaultTab : requestedTab,
    unlockedTabs:
      (isLoading || !project) && requestedTab
        ? Array.from(new Set([requestedTab, ...unlockedTabs]))
        : unlockedTabs,
    workflowTabs: WORKFLOW_TABS,
    defaultTab,
  });

  useEffect(() => {
    if (isLoading || !project) return;
    if (!shouldNormalizeRequestedTab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', activeTab);
    setSearchParams(nextParams, { replace: true });
  }, [isLoading, project, activeTab, searchParams, setSearchParams, shouldNormalizeRequestedTab]);

  if (!user) {
    fetchUser();
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const getLockedReason = (tabName) => {
    if (tabName === 'capstone_2' && !titleApproved) {
      if (titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION)
        return 'Your title was approved with revision. Submit a revised title for instructor approval to unlock Capstone 2.';
      if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION)
        return 'Your revised title is pending instructor approval. Capstone 2 will unlock once it is accepted.';
      return 'Your title must be approved before you can access Capstone 2.';
    }
    if (tabName === 'capstone_3') return 'Complete Capstone 2 to unlock Capstone 3.';
    if (tabName === 'consultation' && !titleApproved)
      return 'Your title must be approved before you can access consultation logs.';
    return 'This tab is currently locked.';
  };

  const handleLockedTabClick = (tabName) => {
    toast.info(getLockedReason(tabName), {
      icon: <Lock className="h-4 w-4" />,
      description: 'Complete the required prerequisites to unlock this section.',
    });
  };

  const handleTabChange = (tabName) => {
    if (!unlockedTabs.includes(tabName)) {
      handleLockedTabClick(tabName);
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabName);
    setSearchParams(nextParams, { replace: true });
  };

  const handleSelectProposal = (idx) => {
    setSelectedProposalIndex(idx);
    handleTabChange('proposal');
  };

  const handleStepClick = (stepId) => {
    if (stepId === 0) {
      toast.info('Phase 0: Team Formation & Committee Appointed', {
        description:
          'Your capstone team roster is locked and defense committee has been appointed.',
      });
      return;
    }
    const tabMap = {
      1: 'proposal',
      2: 'capstone_1',
      3: 'capstone_2',
      4: 'capstone_3',
    };
    const targetTab = tabMap[stepId];
    if (targetTab) {
      handleTabChange(targetTab);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Capstone</h1>
            <p className="text-muted-foreground">
              Draft title proposals, track capstone phase progress, and view Action Done Matrix
              (ADM) revisions.
            </p>
          </div>
          {project && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProjectDetailsOpen(true)}
                className="gap-2 text-xs border-border/60 hover:bg-muted font-medium shadow-xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Project Details &amp; Approval
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/project/approval')}
                className="gap-2 text-xs border-border/60 hover:bg-muted font-medium shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                {titleApproved
                  ? 'View Title Proposals & Approval'
                  : 'Title Proposals & Approval Studio'}
              </Button>
            </div>
          )}
        </div>

        {isLoading && <PageSkeleton />}

        {error && !isLoading && error.response?.status === 404 && (
          <EmptyProjectState team={isTeamLoading ? null : team} />
        )}

        {!project && !isLoading && !error && (
          <EmptyProjectState team={isTeamLoading ? null : team} />
        )}

        {error && !isLoading && error.response?.status !== 404 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load project'}
            </AlertDescription>
          </Alert>
        )}

        {project && !isLoading && !error && project.projectStatus === PROJECT_STATUSES.REJECTED && (
          <RejectedProjectState project={project} />
        )}

        {project &&
          !isLoading &&
          !error &&
          project.projectStatus !== PROJECT_STATUSES.REJECTED &&
          isArchivedProject && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This project is archived. Workflow uploads and edits are read-only.
                </AlertDescription>
              </Alert>
              <Card className="rounded-2xl border-y border-r border-l-4 border-border border-l-primary bg-card shadow-lg mb-6 mt-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-card-foreground mb-2 leading-tight">
                        {project.title || 'Archived Project'}
                      </h2>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className="bg-muted border-border text-muted-foreground"
                        >
                          {project.projectStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Official Full Manuscript Paper Reader & Archival Document Package */}
              <div className="rounded-2xl border border-border bg-card shadow-lg p-6 space-y-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BookMarked className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">
                        Official Full Manuscript Paper
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Conferred Capstone Study — Bukidnon State University Institutional Repository
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-2 font-semibold shadow-sm"
                      asChild
                    >
                      <a href={`/api/archive/${project._id}/view`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Read Full Paper (PDF)
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/projects/${project._id}/certificate`)}
                      className="gap-2 text-xs"
                    >
                      <Award className="h-4 w-4 text-emerald-500" />
                      View Certificate
                    </Button>
                  </div>
                </div>

                {/* Abstract Reader */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Executive Abstract
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap rounded-xl bg-muted/20 p-4 border border-border/60">
                    {project.abstract ||
                      project.approvedProposal?.abstract ||
                      'No abstract text recorded for this manuscript.'}
                  </p>
                </div>

                {/* Citation Generator */}
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Academic Citation Formats
                  </h4>
                  <div className="space-y-2 text-xs font-mono bg-card border rounded-lg p-3">
                    <p className="text-muted-foreground">
                      <span className="font-bold text-primary not-mono">[APA 7th]:</span>{' '}
                      {formatCitation(project, 'apa', getProjectAuthors(project))}
                    </p>
                    <p className="text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-bold text-primary not-mono">[IEEE]:</span>{' '}
                      {formatCitation(project, 'ieee', getProjectAuthors(project))}
                    </p>
                  </div>
                </div>
              </div>

              <ProjectSidebarInfo project={project} />
            </>
          )}

        {project &&
          !isLoading &&
          !error &&
          project.projectStatus !== PROJECT_STATUSES.REJECTED &&
          !isArchivedProject && (
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mt-2">
              {/* Main Workspace (Left - xl:col-span-8) */}
              <div className="xl:col-span-8 space-y-6">
                {/* Status & Deadline Alerts */}
                {project.deadlines && <DeadlineWarning deadlines={project.deadlines} compact />}

                {/* Unified Capstone Milestone Progression & Executive Project Card */}
                <WorkflowPhaseTracker
                  project={project}
                  onStepClick={handleStepClick}
                  onSelectProposal={handleSelectProposal}
                  className="mb-2"
                />

                {/* Tabbed workflow */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <div className="w-full mb-6 p-0.5">
                    <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-muted/60 dark:bg-muted/30 p-1.5 rounded-xl border border-border/60 gap-1.5 h-auto shadow-xs">
                      <WorkflowTabTrigger
                        value="proposal"
                        icon={FileText}
                        label="Proposal Drafting"
                      />
                      <WorkflowTabTrigger value="capstone_1" icon={BookOpen} label="Capstone 1" />
                      <WorkflowTabTrigger
                        value="capstone_2"
                        icon={Code2}
                        label="Capstone 2"
                        locked={!capstone2Unlocked}
                        lockedReason={getLockedReason('capstone_2')}
                        onLockedClick={() => handleLockedTabClick('capstone_2')}
                      />
                      <WorkflowTabTrigger
                        value="capstone_3"
                        icon={Award}
                        label="Capstone 3"
                        locked={!capstone3Unlocked}
                        lockedReason={getLockedReason('capstone_3')}
                        onLockedClick={() => handleLockedTabClick('capstone_3')}
                      />
                      <WorkflowTabTrigger
                        value="consultation"
                        icon={MessageSquareMore}
                        label="Consultations"
                        locked={!titleApproved}
                        lockedReason={getLockedReason('consultation')}
                        onLockedClick={() => handleLockedTabClick('consultation')}
                      />
                    </TabsList>
                  </div>

                  {/* Tab 1: Proposal Drafting Studio */}
                  <TabsContent
                    value="proposal"
                    className="mt-0 focus-visible:outline-none space-y-6"
                  >
                    <TitleActionsSection
                      project={project}
                      onSelectProposal={handleSelectProposal}
                    />
                    <TitleFeedbackRemarksCard comments={project.titleProposalComments} />
                    <ProposalTab
                      project={project}
                      selectedProposalIndex={selectedProposalIndex}
                      onRefresh={() => refetch()}
                    />
                  </TabsContent>

                  {/* Tab 2: Capstone 1 — Minimalist Collapsible Workspace */}
                  <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none">
                    <Capstone1CollapsibleSections
                      project={project}
                      isStudent
                      user={user}
                      onTabChange={handleTabChange}
                      onRefresh={() => refetch()}
                    />
                  </TabsContent>

                  {/* Tab 3: Capstone 2 — Interactive Gantt Chart Maker */}
                  <TabsContent
                    value="capstone_2"
                    className="mt-0 focus-visible:outline-none space-y-4"
                  >
                    <InteractiveGanttChart project={project} isReadOnly={false} />
                  </TabsContent>

                  {/* Tab 4: Capstone 3 — Results, Final Defense & Archival */}
                  <TabsContent
                    value="capstone_3"
                    className="mt-0 focus-visible:outline-none space-y-6"
                  >
                    {/* Contextual Submissions Link Callout */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                          <Send className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Chapters 4–5 &amp; Final Manuscript Submissions
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submit Chapters 4 &amp; 5, compile your complete 5-chapter manuscript,
                            and upload publishable journal articles on the dedicated Submissions
                            Page.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/project/submissions')}
                        className="gap-1.5 text-xs shrink-0 border-violet-500/40 hover:bg-violet-500/10 font-medium"
                      >
                        <span>Go to Submissions</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-violet-500/40 bg-violet-500/10 text-violet-400 font-mono text-[10px] uppercase font-semibold"
                              >
                                Phase 3
                              </Badge>
                              <h3 className="text-lg font-bold tracking-tight text-foreground">
                                Capstone 3: System Results, Final Defense &amp; Archival
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Complete system prototype demonstration, full manuscript evaluation,
                              final defense verdict, and institutional archival.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Results &amp; Findings
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              Chapter 4 implementation results &amp; system testing analysis.
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Conclusions &amp; Recommendations
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              Chapter 5 conclusion, future work, and policy contributions.
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Oral Defense Hearing
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              Final defense oral presentation and rubric scoring evaluation.
                            </p>
                          </div>
                        </div>

                        {/* ADM Revisions Callout */}
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Final defense revisions, panel compliance endorsements, and dean
                              sign-offs are managed in the Action Done Matrix.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTabChange('adm')}
                            className="text-xs font-medium text-primary hover:underline h-7 px-2"
                          >
                            View ADM Revisions &rarr;
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <EvaluationPanel projectId={project._id} defenseType="final" />
                  </TabsContent>

                  {/* Tab 5: Dedicated Full-Width Action Done Matrix (ADM) */}
                  <TabsContent value="adm" className="mt-0 focus-visible:outline-none space-y-6">
                    <ActionDoneMatrixTab
                      project={project}
                      isStudent
                      user={user}
                      onRefresh={() => refetch()}
                    />
                  </TabsContent>

                  {/* Tab 5: Consultations */}
                  <TabsContent value="consultation" className="mt-0 focus-visible:outline-none">
                    <ConsultationLogWidget project={project} isStudent user={user} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky Sidebar (Right - 30% / xl:col-span-4) */}
              <div className="xl:col-span-4 space-y-6 sticky top-24">
                <ProjectInformationSidebar
                  project={project}
                  canManage={false}
                  canManageArchive={false}
                  isArchived={isArchivedProject}
                  onRefresh={() => refetch()}
                />
              </div>
            </div>
          )}

        {/* Dedicated Project Details & Approval Modal Dialog */}
        <ProjectDetailsModal
          open={isProjectDetailsOpen}
          onOpenChange={setIsProjectDetailsOpen}
          project={project}
        />
      </div>
    </DashboardLayout>
  );
}
