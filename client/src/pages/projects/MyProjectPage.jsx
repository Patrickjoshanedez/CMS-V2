import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsContent } from '@/components/ui/Tabs';
import { Loader2, AlertTriangle, Info, FileText, BookOpen, Award, Lock } from 'lucide-react';

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
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import ChapterProgressWithRounds from '@/components/submissions/ChapterProgressWithRounds';
import Capstone2SupportingDocs from '@/components/submissions/Capstone2SupportingDocs';

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
  const { data: project, isLoading, error } = useMyProject();
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
  // Capstone 1 is only accessible once the title is fully approved (not pending revision).
  // APPROVED_WITH_REVISION and PENDING_MODIFICATION both keep it locked.
  const capstone1Unlocked = titleApproved;
  const capstone2Unlocked = project?.capstonePhase >= CAPSTONE_PHASES.PHASE_2;
  const capstone3Unlocked = project?.capstonePhase >= CAPSTONE_PHASES.PHASE_3;
  const finalUnlocked = project?.capstonePhase >= CAPSTONE_PHASES.PHASE_4;
  const isArchivedProject =
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED || Boolean(project?.isArchived);

  const unlockedTabs = ['proposal'];
  if (capstone1Unlocked) unlockedTabs.push('capstone_1');
  if (capstone2Unlocked) unlockedTabs.push('capstone_2');
  if (capstone3Unlocked) unlockedTabs.push('capstone_3');
  if (finalUnlocked) unlockedTabs.push('final');

  function getDefaultTab() {
    if (!project) return 'proposal';
    if (finalUnlocked) return 'final';
    if (capstone3Unlocked) return 'capstone_3';
    if (capstone2Unlocked) return 'capstone_2';
    if (capstone1Unlocked) return 'capstone_1';
    return 'proposal';
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
    if (tabName === 'capstone_1' && !titleApproved) {
      if (titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION)
        return 'Your title was approved with revision. Submit a revised title for instructor approval to unlock Capstone 1.';
      if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION)
        return 'Your revised title is pending instructor approval. Capstone 1 will unlock once it is accepted.';
      return 'Your title must be approved before you can access Capstone 1.';
    }
    if (tabName === 'capstone_2') return 'Complete Capstone 1 to unlock Capstone 2.';
    if (tabName === 'capstone_3') return 'Complete Capstone 2 to unlock Capstone 3.';
    if (tabName === 'final') return 'Complete Capstone 3 to unlock Final Defense.';
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
            <h3 className="text-2xl font-bold tracking-tight">My Capstone</h3>
            <p className="text-muted-foreground">
              Track your capstone project progress and manage your submissions.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

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
                  <div className="border-b border-border mb-6">
                    <TabsList className="bg-transparent p-0 gap-6 h-auto">
                      <WorkflowTabTrigger value="proposal" icon={FileText} label="Proposal" />
                      <WorkflowTabTrigger
                        value="capstone_1"
                        icon={BookOpen}
                        label="Capstone 1"
                        locked={!capstone1Unlocked}
                        lockedReason={getLockedReason('capstone_1')}
                        onLockedClick={() => handleLockedTabClick('capstone_1')}
                      />
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
                        icon={BookOpen}
                        label="Capstone 3"
                        locked={!capstone3Unlocked}
                        lockedReason={getLockedReason('capstone_3')}
                        onLockedClick={() => handleLockedTabClick('capstone_3')}
                      />
                      <WorkflowTabTrigger
                        value="final"
                        icon={Award}
                        label="Final Defense"
                        locked={!finalUnlocked}
                        lockedReason={getLockedReason('final')}
                        onLockedClick={() => handleLockedTabClick('final')}
                      />
                    </TabsList>
                  </div>

                  <TabsContent value="proposal" className="mt-0 focus-visible:outline-none">
                    <TitleActionsSection project={project} />
                    <ProposalTab project={project} />
                  </TabsContent>

                  <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none">
                    <ChapterProgressWithRounds
                      project={project}
                      submissions={submissions}
                      chapters={[1, 2, 3]}
                      showUploadButton={titleApproved}
                    />
                    <EvaluationPanel projectId={project._id} defenseType="proposal" />
                  </TabsContent>

                  <TabsContent value="capstone_2" className="mt-0 focus-visible:outline-none">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold tracking-tight text-primary mb-2">
                        System Development Phase
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upload your project&apos;s Gantt Chart, connect your GitHub repository, and
                        share your Prototype Video for midterm review.
                      </p>
                    </div>
                    <DevelopmentAssetsForm project={project} />
                    <div className="mt-6">
                      <Capstone2SupportingDocs projectId={project._id} canUpload />
                    </div>
                    <div className="mt-8">
                      <PrototypeGallery projectId={project._id} canDelete canAdd />
                    </div>
                    <div className="mt-8">
                      <EvaluationPanel projectId={project._id} defenseType="midterm" />
                    </div>
                  </TabsContent>

                  <TabsContent value="capstone_3" className="mt-0 focus-visible:outline-none">
                    <ChapterProgressWithRounds
                      project={project}
                      submissions={submissions}
                      chapters={[4, 5]}
                      showUploadButton={titleApproved}
                    />
                    <EvaluationPanel projectId={project._id} defenseType="paper" />
                  </TabsContent>

                  <TabsContent value="final" className="mt-0 focus-visible:outline-none">
                    <FinalPaperUpload projectId={project._id} />
                    <EvaluationPanel projectId={project._id} defenseType="final" />
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
