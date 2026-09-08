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
  Loader2,
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
} from 'lucide-react';

// Extracted reusable components
import EmptyProjectState from '@/components/projects/EmptyProjectState';
import RejectedProjectState from '@/components/projects/RejectedProjectState';
import ProjectSidebarInfo from '@/components/projects/ProjectSidebarInfo';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import ProjectDetailsModal from '@/components/projects/ProjectDetailsModal';
import TitleFeedbackRemarksCard from '@/components/projects/TitleFeedbackRemarksCard';
import TitleActionsSection, {
  PanelistsPendingCard,
  TitlePendingCard,
  WorkflowPrerequisiteBanner,
} from '@/components/projects/TitleWorkflowCards';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProposalTab from '@/components/projects/ProposalTab';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import DevelopmentAssetsForm from '@/components/projects/DevelopmentAssetsForm';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import ChapterProgressWithRounds from '@/components/submissions/ChapterProgressWithRounds';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { getProjectAuthors, formatCitation } from '@/pages/projects/projectDetailUtils';

// Hooks & constants
import { useMyProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
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
  const { data: project, isLoading, error, refetch } = useMyProject();
  const { data: team, isLoading: isTeamLoading } = useMyTeam(user?._id);

  const { data: submissions } = useProjectSubmissions(
    project?._id,
    { limit: 200 },
    { enabled: !!project?._id },
  );

  // Derived unlock conditions
  const titleStatus = project?.titleStatus;
  const titleApproved = titleStatus === TITLE_STATUSES.APPROVED;
  const hasPanelists = Array.isArray(project?.panelistIds) && project.panelistIds.length > 0;

  const numericPhase = Number(project?.capstonePhase ?? project?.phase ?? 0);

  // Capstone 1 (Proposal) is always accessible.
  const capstone1Unlocked = true;
  // Capstone 2 (Ch 1-3) is unlocked once title is fully approved
  const capstone2Unlocked = titleApproved || numericPhase >= CAPSTONE_PHASES.PHASE_2;
  // Capstone 3 (Ch 4-5) requires Phase 3
  const capstone3Unlocked = numericPhase >= CAPSTONE_PHASES.PHASE_3;
  // Capstone 4 (Final) requires Phase 4
  const capstone4Unlocked = numericPhase >= CAPSTONE_PHASES.PHASE_4;

  // Capstone 2 (Chapters 1-3 & Midterm Defense) completion gate for ADM
  const submissionList = Array.isArray(submissions)
    ? submissions
    : Array.isArray(submissions?.submissions)
      ? submissions.submissions
      : Array.isArray(submissions?.data)
        ? submissions.data
        : [];

  const chapters123Approved =
    submissionList.length > 0 &&
    [1, 2, 3].every((ch) =>
      submissionList.some(
        (s) =>
          (s.chapterNumber === ch || s.chapter === ch) &&
          (s.status === 'approved' || s.status === 'locked'),
      ),
    );

  const isCapstone2Done = Boolean(
    numericPhase >= CAPSTONE_PHASES.PHASE_3 ||
    project?.capstone2Completed ||
    (project?.actionDoneMatrix && project.actionDoneMatrix.length > 0) ||
    chapters123Approved,
  );

  const isArchivedProject =
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED || Boolean(project?.isArchived);

  // When proposals are submitted and awaiting committee/instructor approval,
  // guide proponents to the dedicated Title Approval Page.
  useEffect(() => {
    if (
      !isLoading &&
      project &&
      project.titleStatus !== TITLE_STATUSES.APPROVED &&
      project.projectStatus !== PROJECT_STATUSES.REJECTED &&
      !isArchivedProject
    ) {
      navigate('/project/approval', { replace: true });
    }
  }, [isLoading, project, isArchivedProject, navigate]);

  const unlockedTabs = ['capstone_1'];
  if (capstone2Unlocked) unlockedTabs.push('capstone_2');
  if (capstone3Unlocked) unlockedTabs.push('capstone_3');
  if (capstone4Unlocked) unlockedTabs.push('capstone_4');
  if (titleApproved) unlockedTabs.push('consultation');

  function getDefaultTab() {
    if (!project) return 'capstone_1';
    if (capstone4Unlocked) return 'capstone_4';
    if (capstone3Unlocked) return 'capstone_3';
    if (capstone2Unlocked) return 'capstone_2';
    return 'capstone_1';
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
    if (tabName === 'capstone_4') return 'Complete Capstone 3 to unlock Capstone 4.';
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

  const handleStepClick = (stepId) => {
    if (stepId === 0) {
      toast.info('Phase 0: Team Formation & Committee Appointed', {
        description:
          'Your capstone team roster is locked and defense committee has been appointed.',
      });
      return;
    }
    const tabMap = {
      1: 'capstone_1',
      2: 'capstone_2',
      3: 'capstone_3',
      4: 'capstone_4',
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
              Track your capstone project progress and manage your submissions.
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
              {titleApproved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/project/approval')}
                  className="gap-2 text-xs border-border/60 hover:bg-muted font-medium shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  View Title Proposals &amp; Approval
                </Button>
              )}
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
            <div className="max-w-[1600px] mx-auto space-y-6 mt-2">
              {/* Status & Prerequisite Alerts */}
              {project.deadlines && <DeadlineWarning deadlines={project.deadlines} compact />}
              {!titleApproved && <WorkflowPrerequisiteBanner titleStatus={titleStatus} />}
              {titleStatus && titleStatus !== TITLE_STATUSES.APPROVED && (
                <TitlePendingCard titleStatus={titleStatus} />
              )}
              {titleApproved && !hasPanelists && <PanelistsPendingCard />}

              <WorkflowPhaseTracker
                project={project}
                onStepClick={handleStepClick}
                className="mb-2"
              />

              <ProjectTitleCard project={project} />

              {/* Tabbed workflow */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="w-full mb-6 p-0.5">
                  <TabsList className="w-full grid grid-cols-2 sm:grid-cols-5 bg-muted/60 dark:bg-muted/30 p-1.5 rounded-xl border border-border/60 gap-1.5 h-auto shadow-xs">
                    <WorkflowTabTrigger value="capstone_1" icon={FileText} label="Capstone 1" />
                    <WorkflowTabTrigger
                      value="capstone_2"
                      icon={BookOpen}
                      label="Capstone 2"
                      locked={!capstone2Unlocked}
                      lockedReason={getLockedReason('capstone_2')}
                      onLockedClick={() => handleLockedTabClick('capstone_2')}
                    />
                    <WorkflowTabTrigger
                      value="capstone_3"
                      icon={Code2}
                      label="Capstone 3"
                      locked={!capstone3Unlocked}
                      lockedReason={getLockedReason('capstone_3')}
                      onLockedClick={() => handleLockedTabClick('capstone_3')}
                    />
                    <WorkflowTabTrigger
                      value="capstone_4"
                      icon={Award}
                      label="Capstone 4"
                      locked={!capstone4Unlocked}
                      lockedReason={getLockedReason('capstone_4')}
                      onLockedClick={() => handleLockedTabClick('capstone_4')}
                    />
                    <WorkflowTabTrigger
                      value="consultation"
                      icon={MessageSquareMore}
                      label="Consultations"
                      locked={!titleApproved}
                      lockedReason={getLockedReason('consultation')}
                      onLockedClick={() => handleLockedTabClick('consultation')}
                      className="col-span-2 sm:col-span-1"
                    />
                  </TabsList>
                </div>

                <TabsContent
                  value="capstone_1"
                  className="mt-0 focus-visible:outline-none space-y-6"
                >
                  <TitleActionsSection project={project} />
                  <TitleFeedbackRemarksCard comments={project.titleProposalComments} />
                  <ProposalTab project={project} onRefresh={() => refetch()} />
                  <EvaluationPanel projectId={project._id} defenseType="proposal" />
                </TabsContent>

                <TabsContent
                  value="capstone_2"
                  className="mt-0 focus-visible:outline-none space-y-6"
                >
                  <ChapterProgressWithRounds
                    project={project}
                    submissions={submissions}
                    chapters={[1, 2, 3]}
                    showUploadButton={titleApproved}
                  />
                  {isCapstone2Done ? (
                    <ActionDoneMatrixTab
                      project={project}
                      isStudent
                      user={user}
                      onRefresh={() => refetch()}
                    />
                  ) : (
                    <Card className="border border-border/70 bg-card/60 rounded-xl p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-foreground">
                            Action Done Matrix (ADM) Unlocks After Capstone 2 Completion
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            The Action Done Matrix will be accessible once Capstone 2 (Chapters 1–3
                            manuscript review and defense evaluation) is completed. Panel
                            recommendations and required revisions will appear here for
                            documentation and committee sign-off.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                  <EvaluationPanel projectId={project._id} defenseType="midterm" />
                </TabsContent>

                <TabsContent
                  value="capstone_3"
                  className="mt-0 focus-visible:outline-none space-y-6"
                >
                  {/* Capstone 3 Interactive Gantt Chart Roadmap */}
                  <InteractiveGanttChart project={project} isReadOnly={false} />

                  <DevelopmentAssetsForm project={project} />
                  <PrototypeGallery projectId={project._id} canDelete canAdd />
                  <ChapterProgressWithRounds
                    project={project}
                    submissions={submissions}
                    chapters={[4, 5]}
                    showUploadButton={titleApproved}
                  />
                  <ActionDoneMatrixTab
                    project={project}
                    isStudent
                    user={user}
                    onRefresh={() => refetch()}
                  />
                  <EvaluationPanel projectId={project._id} defenseType="paper" />
                </TabsContent>

                <TabsContent
                  value="capstone_4"
                  className="mt-0 focus-visible:outline-none space-y-6"
                >
                  <FinalPaperUpload projectId={project._id} />
                  {/* Capstone 4 Action Done Matrix & Secretary Endorsement Gate */}
                  <ActionDoneMatrixTab
                    project={project}
                    isStudent
                    user={user}
                    onRefresh={() => refetch()}
                  />
                  <EvaluationPanel projectId={project._id} defenseType="final" />
                </TabsContent>

                <TabsContent value="consultation" className="mt-0 focus-visible:outline-none">
                  <ConsultationLogWidget project={project} isStudent user={user} />
                </TabsContent>
              </Tabs>
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
