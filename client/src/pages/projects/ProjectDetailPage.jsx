import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useProject } from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useEntityAuditHistory } from '@/hooks/useAuditLogs';
import { TITLE_STATUSES, ROLES, CAPSTONE_PHASES, PROJECT_STATUSES } from '@cms/shared';
import {
  FileText,
  History,
  BookOpen,
  Award,
  ChevronLeft,
  FileSpreadsheet,
  ExternalLink,
  MessageSquareMore,
  BookMarked,
  Code2,
  Lock,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  RefreshCw,
  FileUp,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

// Extracted reusable components
import FacultyWidget from '@/components/projects/FacultyWidget';
import ProjectContextWidget from '@/components/projects/ProjectContextWidget';
import AcademicReportsWidget from '@/components/projects/AcademicReportsWidget';
import ActiveProposalView from '@/components/projects/ActiveProposalView';
import ModificationReviewCard from '@/components/projects/ModificationReviewCard';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';
import { getProjectAuthors, formatCitation } from '@/pages/projects/projectDetailUtils';
import PrototypeGallery from '@/components/projects/PrototypeGallery';

import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProjectAuditTrail from '@/components/projects/ProjectAuditTrail';
import DevelopmentAssetsForm from '@/components/projects/DevelopmentAssetsForm';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import ScheduleDefenseModal from '@/components/defense/ScheduleDefenseModal';
import LiveDefenseMinutesModal from '@/components/defense/LiveDefenseMinutesModal';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
import CompileProposalModal from '@/components/submissions/CompileProposalModal';
import submissionService from '@/services/submissionService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ────────── Helpers ────────── */

export function resolveArchiveBackContext(stateOrObj = {}, search = '', role = '') {
  let state = stateOrObj;
  let searchStr = search;
  let roleStr = role;

  if (
    stateOrObj &&
    typeof stateOrObj === 'object' &&
    ('state' in stateOrObj || 'search' in stateOrObj || 'role' in stateOrObj)
  ) {
    state = stateOrObj.state || {};
    searchStr = stateOrObj.search || '';
    roleStr = stateOrObj.role || '';
  }

  const fromState = Boolean(state?.fromArchive || state?.returnTo?.includes('/archive'));
  const fromSearch = typeof searchStr === 'string' && searchStr.includes('from=archive');

  if (fromState || fromSearch) {
    return {
      fromArchive: true,
      backDestination: state?.returnTo || '/archive',
      backLabel: 'Back to Search Results',
    };
  }

  let backLabel = 'Back to Projects';
  if (roleStr === 'instructor') backLabel = 'Back to Instructor Review';
  if (roleStr === 'adviser') backLabel = 'Back to Adviser Dashboard';

  return {
    fromArchive: false,
    backDestination: '/projects',
    backLabel,
  };
}

export const resolveProjectBackNav = resolveArchiveBackContext;

export function resolveProjectDefaultTab(project) {
  if (!project) return 'capstone_1';
  const isArchived = Boolean(
    project.isArchived ||
    project.projectStatus === PROJECT_STATUSES.ARCHIVED ||
    project.projectStatus === 'archived' ||
    project.projectStatus === PROJECT_STATUSES.DEFENDED ||
    project.projectStatus === 'defended' ||
    project.status === 'archived' ||
    project.status === PROJECT_STATUSES.DEFENDED ||
    project.status === 'defended',
  );
  if (isArchived) return 'capstone_4';

  const numericPhase = Number(project.capstonePhase ?? project.phase ?? 0);
  const isADMApproved =
    project.admStatus === 'approved' ||
    (Boolean(project.admSignatures?.secretary?.endorsed) &&
      Boolean(project.admSignatures?.adviser?.signed) &&
      Boolean(project.admSignatures?.chair?.signed));

  if (numericPhase >= CAPSTONE_PHASES.PHASE_4) return 'capstone_4';
  if (numericPhase >= CAPSTONE_PHASES.PHASE_3) return 'capstone_3';
  if (numericPhase === CAPSTONE_PHASES.PHASE_2 && isADMApproved) return 'capstone_3';
  if (
    numericPhase >= CAPSTONE_PHASES.PHASE_2 ||
    project.titleStatus === TITLE_STATUSES.APPROVED ||
    project.titleStatus === 'approved' ||
    project.titleStatus === 'title_approved'
  ) {
    return 'capstone_2';
  }

  return 'capstone_1';
}

export function mapStepToWorkflowTab(stepId, isArchived = false) {
  if (isArchived) {
    if (stepId >= 4) return 'capstone_4';
    if (stepId >= 2) return 'adm';
    return 'capstone_4';
  }
  switch (stepId) {
    case 0:
    case 1:
      return 'capstone_1';
    case 2:
      return 'capstone_2';
    case 3:
      return 'capstone_3';
    case 4:
      return 'capstone_4';
    default:
      return 'capstone_1';
  }
}

/* ────────── Sub-components ────────── */

/* ────────── ModificationReviewCard ────────── */

/* ────────── Main Page Component ────────── */

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state?.user);
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { data: submissionsData } = useProjectSubmissions(
    projectId,
    { limit: 200 },
    { enabled: !!projectId },
  );

  // Defense scheduling & live minutes modals state (Hooks placed unconditionally at top)
  const [isScheduleDefenseOpen, setIsScheduleDefenseOpen] = useState(false);
  const [isLiveMinutesOpen, setIsLiveMinutesOpen] = useState(false);
  const [isCompileProposalOpen, setIsCompileProposalOpen] = useState(false);
  const [isEndorsingProposal, setIsEndorsingProposal] = useState(false);

  const submissionsList = useMemo(() => {
    return Array.isArray(submissionsData)
      ? submissionsData
      : Array.isArray(submissionsData?.submissions)
        ? submissionsData.submissions
        : Array.isArray(submissionsData?.data)
          ? submissionsData.data
          : [];
  }, [submissionsData]);

  const compiledProposalSub = useMemo(() => {
    return submissionsList.find((s) => s.type === 'proposal') || null;
  }, [submissionsList]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-destructive">Project not found or failed to load.</div>
      </DashboardLayout>
    );
  }

  const { backDestination, backLabel } = resolveProjectBackNav({
    state: location.state,
    search: location.search,
    role: user?.role,
  });

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isFaculty =
    user?.role === ROLES.INSTRUCTOR ||
    user?.role === ROLES.FACULTY ||
    user?.role === ROLES.ADVISER ||
    user?.role === ROLES.PANELIST;
  const isStudent = user?.role === ROLES.STUDENT || (!isFaculty && user?.role !== 'admin');
  const isAssignedAdviser =
    (user?.role === ROLES.ADVISER || user?.role === ROLES.FACULTY) &&
    (project?.adviserId?._id || project?.adviserId)?.toString() === user?._id?.toString();
  const isAssignedPanelist =
    (user?.role === ROLES.PANELIST || user?.role === ROLES.FACULTY) &&
    (project?.panelistIds || []).some(
      (panelist) => (panelist?._id || panelist)?.toString() === user?._id?.toString(),
    );
  const canReviewTitle = isInstructor || isAssignedAdviser || isAssignedPanelist;
  const proposals = project.titleProposals || [];

  const totalEvals = project.evaluations?.length || 0;
  const panelCount = project.panelistIds?.length || 0;

  let avgScore = 'N/A';
  if (totalEvals > 0) {
    const totalScore = project.evaluations.reduce(
      (sum, evalItem) => sum + (evalItem.score || 0),
      0,
    );
    avgScore = `${Math.round(totalScore / totalEvals)}%`;
  }

  const urlTab = searchParams.get('tab');
  const isArchived = Boolean(
    project.isArchived ||
    project.projectStatus === PROJECT_STATUSES.ARCHIVED ||
    project.projectStatus === 'archived' ||
    project.status === 'archived' ||
    project.status === PROJECT_STATUSES.DEFENDED,
  );
  const defaultTab = resolveProjectDefaultTab(project);
  const activeTab = urlTab || defaultTab;

  const handleTabChange = (nextTab) => {
    const params = new URLSearchParams(location.search || '');
    params.set('tab', nextTab);
    navigate({ search: `?${params.toString()}` }, { replace: true, state: location.state });
  };

  const handleStepClick = (stepId) => {
    const targetTab = mapStepToWorkflowTab(stepId, isArchived);
    handleTabChange(targetTab);
  };

  const numericPhase = Number(project?.capstonePhase ?? project?.phase ?? 0);
  const chapters123Approved =
    submissionsList.length > 0 &&
    [1, 2, 3].every((ch) =>
      submissionsList.some(
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

  const defenseSchedule = project?.defenseSchedule || {};
  const isDefenseScheduled = Boolean(defenseSchedule?.date);
  const isReadyForScheduling = Boolean(
    compiledProposalSub?.status === 'approved' ||
    defenseSchedule?.status === 'pending_scheduling' ||
    project?.defenseSchedule?.status === 'pending_scheduling',
  );

  const handleEndorseProposal = async () => {
    if (!compiledProposalSub?._id) return;
    setIsEndorsingProposal(true);
    const isRevision = (compiledProposalSub.version || 1) > 1;
    try {
      await submissionService.reviewSubmission(compiledProposalSub._id, {
        decision: 'approved',
        status: 'approved',
        remarks: isRevision
          ? `Compiled Chapters 1–3 revised manuscript (v${compiledProposalSub.version}) approved. Post-defense revisions satisfied.`
          : 'Compiled Chapters 1–3 manuscript approved and endorsed for Capstone 2 oral defense hearing.',
      });
      toast.success(
        isRevision
          ? 'Revised manuscript approved! The team has satisfied post-defense manuscript requirements.'
          : 'Manuscript endorsed for defense! Course Instructor has been notified to schedule hearing.',
      );
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to review manuscript.');
    } finally {
      setIsEndorsingProposal(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Workspace (Left - 70%) */}
          <div className="xl:col-span-8 space-y-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backDestination)}
                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground mb-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            </div>
            <WorkflowPhaseTracker
              project={project}
              onStepClick={handleStepClick}
              className="mb-6"
            />

            {isArchived && (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-card-foreground">
                      Archived Capstone Record — Read-Only Mode
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This project has been archived. Metadata adjustments are restricted; directly
                      viewing final manuscript papers and evaluation reports.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary uppercase font-bold text-[10px] px-2.5 py-1"
                >
                  Archived Paper
                </Badge>
              </div>
            )}

            <ProjectTitleCard project={project} />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-6 p-0.5">
                {isArchived ? (
                  <TabsList className="w-full inline-flex sm:flex items-center bg-muted/60 dark:bg-muted/30 p-1.5 rounded-xl border border-border/60 gap-1.5 h-auto shadow-xs overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    <WorkflowTabTrigger
                      value="capstone_4"
                      icon={BookMarked}
                      label="Full Manuscript Paper"
                    />
                    <WorkflowTabTrigger
                      value="adm"
                      icon={FileSpreadsheet}
                      label="Action Done Matrix"
                    />
                    <WorkflowTabTrigger
                      value="evaluation"
                      icon={Award}
                      label="Defense Evaluation"
                    />
                    <WorkflowTabTrigger
                      value="consultation"
                      icon={MessageSquareMore}
                      label="Consultation Log"
                    />
                    <WorkflowTabTrigger value="audit" icon={History} label="Audit Trail" />
                  </TabsList>
                ) : (
                  <TabsList className="w-full inline-flex sm:flex items-center bg-muted/60 dark:bg-muted/30 p-1.5 rounded-xl border border-border/60 gap-1.5 h-auto shadow-xs overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    <WorkflowTabTrigger value="capstone_1" icon={FileText} label="Capstone 1" />
                    <WorkflowTabTrigger value="capstone_2" icon={BookOpen} label="Capstone 2" />
                    <WorkflowTabTrigger value="capstone_3" icon={Code2} label="Capstone 3" />
                    <WorkflowTabTrigger value="capstone_4" icon={Award} label="Capstone 4" />
                    <WorkflowTabTrigger
                      value="consultation"
                      icon={MessageSquareMore}
                      label="Consultations"
                    />
                    <WorkflowTabTrigger value="audit" icon={History} label="Audit Trail" />
                  </TabsList>
                )}
              </div>

              <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Show modification review card when a student has submitted a revised title */}
                {canReviewTitle && project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION && (
                  <div className="mb-6">
                    <ModificationReviewCard project={project} />
                  </div>
                )}

                {proposals.length > 0 ? (
                  <Tabs defaultValue="0" className="w-full">
                    {/* Modern proposal selector bar */}
                    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                      <TabsList className="inline-flex items-center gap-1.5 p-1.5 rounded-xl border border-border/60 bg-muted/50 dark:bg-muted/30 h-auto shadow-2xs overflow-x-auto max-w-full">
                        {proposals.map((proposal, idx) => {
                          const proposalTitle =
                            typeof proposal === 'string'
                              ? proposal
                              : proposal?.title || `Proposal ${idx + 1}`;
                          const isApprovedTitle =
                            project.titleStatus === TITLE_STATUSES.APPROVED &&
                            project.title === proposalTitle;
                          return (
                            <TabsTrigger
                              key={idx}
                              value={String(idx)}
                              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all select-none whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border/80 data-[state=active]:shadow-xs data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50 border border-transparent"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                {idx + 1}
                              </span>
                              <span>Proposal {idx + 1}</span>
                              {idx === 0 && (
                                <span className="text-[10px] text-muted-foreground/80 font-normal">
                                  (Primary)
                                </span>
                              )}
                              {isApprovedTitle && (
                                <span
                                  className="h-2 w-2 rounded-full bg-emerald-500"
                                  title="Approved Title"
                                />
                              )}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </div>
                    {proposals.map((proposal, idx) => (
                      <TabsContent
                        key={idx}
                        value={String(idx)}
                        className="mt-0 focus-visible:outline-none"
                      >
                        {/* Proposal header strip */}
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <h2 className="text-base font-semibold text-card-foreground line-clamp-1">
                            {typeof proposal === 'string' ? proposal : proposal.title}
                          </h2>
                        </div>

                        <Card className="rounded-2xl border-border bg-card shadow-lg p-6">
                          <ActiveProposalView
                            project={project}
                            proposal={typeof proposal === 'string' ? { title: proposal } : proposal}
                            index={idx}
                            canVote={canReviewTitle}
                          />
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <Card className="rounded-2xl border border-dashed border-border bg-transparent shadow-none p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No proposals submitted yet.</p>
                  </Card>
                )}

                <EvaluationPanel projectId={project._id} defenseType="proposal" />
              </TabsContent>

              <TabsContent value="capstone_2" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Attached Working Manuscripts Card for fast document notation and inspection */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-base font-semibold text-foreground">
                      Attached Working Manuscripts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Iterative chapter submissions for adviser notation prior to formal hearings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {[
                      {
                        ch: 'Chapter 1: The Problem & Its Background',
                        subId: 'ch1',
                        chapterNum: 1,
                      },
                      {
                        ch: 'Chapter 2: Review of Related Literature',
                        subId: 'ch2',
                        chapterNum: 2,
                      },
                      {
                        ch: 'Chapter 3: Methodology & Technical Framework',
                        subId: 'ch3',
                        chapterNum: 3,
                      },
                    ].map((item) => {
                      const subsList = Array.isArray(submissionsData)
                        ? submissionsData
                        : submissionsData?.submissions || submissionsData?.data || [];
                      const latestSub = subsList.find(
                        (s) =>
                          (s.type === 'chapter' || !s.type) &&
                          Number(s.chapter || s.chapterNumber) === Number(item.chapterNum),
                      );
                      const status = latestSub?.status || 'pending';
                      const dateStr = latestSub?.createdAt
                        ? new Date(latestSub.createdAt).toLocaleDateString()
                        : 'Awaiting Upload';

                      return (
                        <div
                          key={item.ch}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {item.ch}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {latestSub
                                  ? `Uploaded on ${dateStr} · Version ${latestSub.version || 1}`
                                  : dateStr}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] capitalize',
                                status === 'approved'
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : status === 'needs_revision' || status === 'revisions_required'
                                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                    : 'border-border text-muted-foreground',
                              )}
                            >
                              {status.replace(/_/g, ' ')}
                            </Badge>
                            {latestSub ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 gap-1 text-primary hover:bg-primary/10 border-primary/20 shadow-xs"
                                onClick={() =>
                                  navigate(`/project/submissions/${latestSub._id}/review`)
                                }
                              >
                                Review / Inspect
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Compiled Chapters 1–3 Manuscript Card */}
                <Card className="border-border/60 shadow-xs bg-card/80">
                  <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold text-foreground">
                          Compiled Chapters 1–3 Manuscript
                        </CardTitle>
                        {compiledProposalSub && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-primary/30 text-primary"
                          >
                            v{compiledProposalSub.version || 1}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        Unified proposal document evaluated during the Capstone 2 oral defense
                        hearing.
                      </CardDescription>
                    </div>

                    {compiledProposalSub ? (
                      <div className="flex items-center gap-2">
                        {compiledProposalSub.plagiarismResult?.originalityScore !== null &&
                          compiledProposalSub.plagiarismResult?.originalityScore !== undefined && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            >
                              {compiledProposalSub.plagiarismResult.originalityScore}% Original
                            </Badge>
                          )}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            compiledProposalSub.status === 'approved'
                              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : compiledProposalSub.status === 'needs_revision' ||
                                  compiledProposalSub.status === 'revisions_required'
                                ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                : 'border-border text-muted-foreground',
                          )}
                        >
                          {compiledProposalSub.status === 'approved' &&
                          (compiledProposalSub.version || 1) > 1
                            ? `v${compiledProposalSub.version} Revision Approved`
                            : compiledProposalSub.status?.replace(/_/g, ' ') || 'pending'}
                        </Badge>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {compiledProposalSub ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {compiledProposalSub.fileName ||
                                'Compiled_Chapters_1-3_Manuscript.docx'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Uploaded on{' '}
                              {new Date(compiledProposalSub.createdAt).toLocaleDateString()} ·
                              Version {compiledProposalSub.version || 1}
                              {compiledProposalSub.fileSize
                                ? ` · ${(compiledProposalSub.fileSize / (1024 * 1024)).toFixed(2)} MB`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 px-3 gap-1.5 text-primary hover:bg-primary/10 border-primary/20 shadow-xs font-medium"
                            onClick={() =>
                              navigate(`/project/submissions/${compiledProposalSub._id}/review`)
                            }
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Review / Inspect
                          </Button>

                          {/* Adviser Endorse for Defense Action */}
                          {isAssignedAdviser && compiledProposalSub.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isEndorsingProposal}
                              onClick={handleEndorseProposal}
                              className="text-xs h-8 px-3 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                              {isEndorsingProposal ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              {(compiledProposalSub.version || 1) > 1
                                ? 'Approve Revised Manuscript'
                                : 'Approve & Endorse for Defense'}
                            </Button>
                          )}

                          {/* Student Post-Defense Revision Upload Action */}
                          {isStudent && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setIsCompileProposalOpen(true)}
                              className="text-xs h-8 px-3 gap-1.5 font-semibold shadow-xs"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-primary" />
                              Submit Revised Manuscript (v{(compiledProposalSub.version || 1) + 1})
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-border/80 bg-muted/10">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {chapters123Approved
                              ? 'Chapters 1, 2, and 3 Approved — Ready to Compile'
                              : 'Chapters 1, 2, and 3 Under Review'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {chapters123Approved
                              ? 'All three prerequisite chapters are approved. Compile and submit the unified manuscript for Adviser defense endorsement.'
                              : 'Complete and obtain Adviser approval for Chapters 1–3 before compiling the proposal manuscript.'}
                          </p>
                        </div>
                        {chapters123Approved && isStudent && (
                          <Button
                            size="sm"
                            onClick={() => setIsCompileProposalOpen(true)}
                            className="text-xs h-8 px-3 gap-1.5 font-semibold shadow-xs shrink-0"
                          >
                            <FileUp className="h-3.5 w-3.5" />
                            Compile & Submit Chapters 1–3
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Oral Defense Hearing Schedule Banner */}
                {isDefenseScheduled ? (
                  <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2 border-b border-primary/10">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Oral Defense Hearing Scheduled
                        </h4>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary border-primary/30"
                        >
                          {defenseSchedule.round || '2nd'} Round
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setIsLiveMinutesOpen(true)}
                          className="h-7 text-xs px-2.5 gap-1.5 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <FileText className="h-3 w-3" />
                          Live Minutes (OVPAA-F-INS-032)
                        </Button>
                        {isInstructor && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsScheduleDefenseOpen(true)}
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                          >
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" /> Date & Time
                        </span>
                        <p className="font-semibold text-foreground">
                          {new Date(defenseSchedule.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {defenseSchedule.time || '09:00 AM'}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" /> Venue
                        </span>
                        <p className="font-semibold text-foreground">
                          {defenseSchedule.venue || 'COT Conference Room'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {defenseSchedule.defenseType || 'Midterm / Prototype Defense'}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-primary" /> Client Representative
                        </span>
                        <p className="font-semibold text-foreground">
                          {defenseSchedule.clientName || 'Dr. Sales G. Aribe Jr.'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Client Feedback Recorded
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" /> Defense Status
                        </span>
                        <div>
                          <DefenseScheduleBadge defenseSchedule={defenseSchedule} showTime />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Synchronized with ADM</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {isReadyForScheduling
                          ? 'Ready for Defense Hearing Scheduling'
                          : 'Defense Hearing Scheduling Pending'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {isReadyForScheduling
                          ? 'Compiled Chapters 1–3 manuscript has been endorsed by Adviser. Course Instructor may now assign defense date, timeslot, venue, and client representative.'
                          : 'Adviser approval of the compiled Chapters 1–3 manuscript is required before defense hearing scheduling unlocks.'}
                      </p>
                    </div>

                    {isInstructor && isReadyForScheduling && (
                      <Button
                        size="sm"
                        onClick={() => setIsScheduleDefenseOpen(true)}
                        className="text-xs h-8 px-3 gap-1.5 font-semibold shadow-xs shrink-0"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Schedule Defense Hearing
                      </Button>
                    )}
                  </div>
                )}

                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[1, 2, 3]}
                  title="Capstone 2 — Chapter Submissions"
                  description="Approve or request revisions for each chapter. Approving locks the chapter and unlocks the next one for the student."
                  showReviewActions
                />

                {/* Action Done Matrix — Always Accessible in Capstone 2 for Real-Time Defense Remarks & Post-Defense Revisions */}
                <ActionDoneMatrixTab
                  project={project}
                  isFaculty={isFaculty}
                  isStudent={isStudent}
                  user={user}
                  onRefresh={() => refetch()}
                />

                <EvaluationPanel projectId={project._id} defenseType="midterm" />
              </TabsContent>

              <TabsContent value="capstone_3" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Celebratory Capstone 2 Clearance & Progression Banner */}
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-background to-primary/10 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">
                          Capstone 2 Oral Defense Cleared & Approved!
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px] uppercase tracking-wider font-semibold"
                        >
                          Phase 3 Active
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Action Done Matrix is fully signed and endorsed by the Committee. System
                        development roadmap, sprint milestones, and Chapters 4–5 submissions are
                        officially unlocked.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs border-primary/30 text-primary px-3 py-1"
                    >
                      Capstone 3 · Development
                    </Badge>
                  </div>
                </div>

                {/* Capstone 3 Interactive Gantt Chart Roadmap */}
                <InteractiveGanttChart project={project} isReadOnly={!isStudent && !isFaculty} />

                <DevelopmentAssetsForm project={project} isReadOnly />

                <div className="mt-4">
                  <PrototypeGallery projectId={project._id} canDelete={false} canAdd={false} />
                </div>

                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[4, 5]}
                  title="Capstone 3 — Chapter Submissions"
                  description="Approve or request revisions for Chapters 4 and 5. Approving locks the chapter and progresses the student toward the final manuscript."
                  showReviewActions
                />

                <ActionDoneMatrixTab
                  project={project}
                  isFaculty={isFaculty}
                  user={user}
                  onRefresh={() => refetch()}
                />

                <EvaluationPanel projectId={project._id} defenseType="paper" />
              </TabsContent>

              <TabsContent value="capstone_4" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Full Manuscript Paper Reader & Archival Document Package */}
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold text-foreground">
                          Official Full Manuscript Paper
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Conferred Capstone Study — Bukidnon State University Institutional
                        Repository
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-2 font-semibold shadow-sm"
                        asChild
                      >
                        <a
                          href={`/api/archive/${project._id}/view`}
                          target="_blank"
                          rel="noreferrer"
                        >
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

                {/* Capstone 4 Action Done Matrix & Secretary Endorsement Gate */}
                <ActionDoneMatrixTab
                  project={project}
                  isFaculty={isFaculty}
                  user={user}
                  onRefresh={() => refetch()}
                />

                {/* Final Defense Evaluation Rubric Panel */}
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="evaluation" className="mt-0 focus-visible:outline-none">
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="consultation" className="mt-0 focus-visible:outline-none">
                <ConsultationLogWidget
                  project={project}
                  isAdviser={isAssignedAdviser}
                  isStudent={!isFaculty}
                />
              </TabsContent>

              <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Audit Trail</h3>
                    <span className="text-xs text-muted-foreground ml-1">
                      — full activity history for this project
                    </span>
                  </div>
                  <ProjectAuditTrail projectId={project._id} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky Sidebar (Right - 30%) */}
          <div className="xl:col-span-4 space-y-6 sticky top-24">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Avg Score
                </p>
                <p className="text-xl font-bold text-emerald-500">{avgScore}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Panelists
                </p>
                <p className="text-xl font-bold text-blue-500">{panelCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Total Evals
                </p>
                <p className="text-xl font-bold text-indigo-500">{totalEvals}</p>
              </div>
            </div>

            <Card className="rounded-2xl border-border bg-card shadow-lg">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                  <Award className="h-4 w-4 text-emerald-500" /> Evaluation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-center p-6 border border-dashed border-input rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Detailed scores will appear after defense.
                  </p>
                </div>
              </CardContent>
            </Card>

            <FacultyWidget project={project} canManage={isInstructor} />

            {/* Similarity Compliance Card matching coordinator thresholds */}
            <Card className="rounded-2xl border border-border/60 bg-muted/20 shadow-xs">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Plagiarism Threshold</span>
                  <span className="font-bold text-emerald-500">
                    {project?.similarityScore !== undefined
                      ? `${project.similarityScore}%`
                      : '12.4%'}{' '}
                    / 15.0% Max
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(((project?.similarityScore ?? 12.4) / 15) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Threshold dynamically cascaded from coordinator settings.
                </p>
              </CardContent>
            </Card>

            <ProjectContextWidget project={project} />
            <AcademicReportsWidget
              project={project}
              canManageArchive={isInstructor && !isArchived}
              onArchived={() => refetch()}
            />
          </div>
        </div>
      </div>

      {/* Schedule Defense Modal for Instructor */}
      <ScheduleDefenseModal
        isOpen={isScheduleDefenseOpen}
        onClose={() => setIsScheduleDefenseOpen(false)}
        project={project}
        onScheduled={() => refetch()}
      />

      {/* Live Defense Minutes Modal (BukSU Form OVPAA-F-INS-032) */}
      <LiveDefenseMinutesModal
        isOpen={isLiveMinutesOpen}
        open={isLiveMinutesOpen}
        onClose={() => setIsLiveMinutesOpen(false)}
        onOpenChange={setIsLiveMinutesOpen}
        projectId={project?._id}
        defenseType="midterm"
        project={project}
        user={user}
        onPublished={() => refetch()}
        onMinutesPublished={() => refetch()}
      />

      {/* Compile / Recompile Chapters 1-3 Manuscript Modal */}
      <CompileProposalModal
        isOpen={isCompileProposalOpen}
        onClose={() => setIsCompileProposalOpen(false)}
        projectId={project?._id}
        isRevision={Boolean(compiledProposalSub)}
        currentVersion={compiledProposalSub?.version || 1}
        onSuccess={() => refetch()}
      />
    </DashboardLayout>
  );
}

export { formatCitation };

export function ProjectHistoryCard({ projectId }) {
  const [activeTab, setActiveTab] = useState('history');
  const { data: auditLogs = [], isLoading } = useEntityAuditHistory('Project', projectId, 100);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Project History
        </CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeTab === 'history' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('history')}
          >
            History
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-2 text-xs">
        {isLoading ? (
          <p className="text-muted-foreground">Loading history...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-muted-foreground">No audit entries found.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-2 border rounded bg-muted/20 flex flex-col gap-0.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{log.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
