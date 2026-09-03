import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
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
} from 'lucide-react';

// Extracted reusable components
import EmptyProjectState from '@/components/projects/EmptyProjectState';
import RejectedProjectState from '@/components/projects/RejectedProjectState';
import ProjectSidebarInfo from '@/components/projects/ProjectSidebarInfo';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import NextStepCard from '@/components/projects/NextStepCard';
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
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import ChapterProgressWithRounds from '@/components/submissions/ChapterProgressWithRounds';
import PageSkeleton from '@/components/ui/PageSkeleton';

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
  const { user, fetchUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Capstone 1 (Proposal) is always accessible.
  const capstone1Unlocked = true;
  // Capstone 2 (Ch 1-3) is unlocked once title is fully approved
  const capstone2Unlocked = titleApproved || project?.capstonePhase >= CAPSTONE_PHASES.PHASE_2;
  // Capstone 3 (Ch 4-5) requires Phase 3
  const capstone3Unlocked = project?.capstonePhase >= CAPSTONE_PHASES.PHASE_3;
  // Capstone 4 (Final) requires Phase 4
  const capstone4Unlocked = project?.capstonePhase >= CAPSTONE_PHASES.PHASE_4;

  const isArchivedProject =
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED || Boolean(project?.isArchived);

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
    requestedTab,
    unlockedTabs,
    workflowTabs: WORKFLOW_TABS,
    defaultTab,
  });

  useEffect(() => {
    if (!shouldNormalizeRequestedTab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', activeTab);
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams, shouldNormalizeRequestedTab]);

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
              <ProjectSidebarInfo project={project} />
            </>
          )}

        {project &&
          !isLoading &&
          !error &&
          project.projectStatus !== PROJECT_STATUSES.REJECTED &&
          !isArchivedProject && (
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mt-2">
              {/* Main Workspace (Left - 70%) */}
              <div className="xl:col-span-8 space-y-6">
                <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-6">
                  <WorkflowPhaseTracker project={project} />
                </div>

                <ProjectTitleCard project={project} />

                {/* Tabbed workflow */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-border mb-6">
                    <TabsList className="bg-transparent p-0 gap-6 h-auto flex-nowrap min-w-max border-0">
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
                      />
                    </TabsList>
                  </div>

                  <TabsContent
                    value="capstone_1"
                    className="mt-0 focus-visible:outline-none space-y-6"
                  >
                    <TitleActionsSection project={project} />
                    <ProposalTab project={project} />
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
                    <ActionDoneMatrixTab
                      project={project}
                      isStudent
                      user={user}
                      onRefresh={() => refetch()}
                    />
                    <EvaluationPanel projectId={project._id} defenseType="midterm" />
                  </TabsContent>

                  <TabsContent
                    value="capstone_3"
                    className="mt-0 focus-visible:outline-none space-y-6"
                  >
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
                    <EvaluationPanel projectId={project._id} defenseType="final" />
                  </TabsContent>

                  <TabsContent value="consultation" className="mt-0 focus-visible:outline-none">
                    <ConsultationLogWidget project={project} isStudent user={user} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky Sidebar (Right - 30%) */}
              <div className="xl:col-span-4 space-y-6 sticky top-24">
                <NextStepCard project={project} submissions={submissions} />
                {project.deadlines && <DeadlineWarning deadlines={project.deadlines} compact />}
                {!titleApproved && <WorkflowPrerequisiteBanner titleStatus={titleStatus} />}
                {titleStatus && titleStatus !== TITLE_STATUSES.APPROVED && (
                  <TitlePendingCard titleStatus={titleStatus} />
                )}
                {titleApproved && !hasPanelists && <PanelistsPendingCard />}
                <ProjectSidebarInfo project={project} />
              </div>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
}
