import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import ChapterCard from '@/components/submissions/ChapterCard';
import UploadChapterModal from '@/components/submissions/UploadChapterModal';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import PrototypeShowcaseAndDemo from '@/components/projects/PrototypeShowcaseAndDemo';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import ActionDoneMatrixSection from '@/components/projects/ActionDoneMatrixSection';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import { useMyProject, useProject } from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useProjectMilestoneDeadlines } from '@/hooks/useProjectMilestoneDeadlines';
import { resolveProjectSubmissionDeadlines } from '@/utils/milestoneDeadlines';
import { useAuthStore } from '@/stores/authStore';
import { DOCUMENT_TYPES, ROLES, SUBMISSION_STATUSES, TITLE_STATUSES } from '@cms/shared';
import {
  FileText,
  Upload,
  BookOpen,
  AlertTriangle,
  LineChart,
  FileSpreadsheet,
  Lock,
  X,
} from 'lucide-react';

/* ────────── Progress Bar ────────── */

function ChapterProgress({ latestChapterSubmissions }) {
  const total = 5;
  let completed = 0;
  for (let i = 1; i <= total; i++) {
    const sub = latestChapterSubmissions.get(i);
    if (sub && ['approved', 'accepted', 'locked'].includes(sub.status)) {
      completed++;
    }
  }
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Chapter Progress</span>
        <span className="text-muted-foreground">
          {completed}/{total} approved
        </span>
      </div>
      <Progress value={pct} aria-label="Approved chapter progress" />
    </div>
  );
}

/* ────────── Proposal Card ────────── */

function ProposalSection({ submissions, canCompile, isReadOnly, searchSuffix }) {
  const navigate = useNavigate();
  const proposalSubs = submissions.filter((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
  const latestProposal = proposalSubs.sort((a, b) => (b.version || 0) - (a.version || 0))[0];

  return (
    <Card className={latestProposal ? 'border-primary/20 bg-primary/[0.02]' : 'border-dashed'}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Proposal Document</p>
            {latestProposal ? (
              <div className="flex items-center gap-2 mt-0.5">
                <SubmissionStatusBadge status={latestProposal.status} />
                <span className="text-[11px] text-muted-foreground">v{latestProposal.version}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {canCompile ? 'Ready to compile' : 'Chapters 1-3 must be approved first'}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {latestProposal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project/submissions/${latestProposal._id}${searchSuffix}`)}
            >
              View
            </Button>
          )}
          {canCompile && !isReadOnly && (
            <Button size="sm" onClick={() => navigate('/project/proposal')}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Compile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Empty State ────────── */

function EmptySubmissionsState({ canUpload, canCompileProposal }) {
  const navigate = useNavigate();

  const actions = [
    canCompileProposal && {
      label: 'Compile Proposal',
      onClick: () => navigate('/project/proposal'),
      variant: 'default',
    },
    canUpload && {
      label: 'Upload Chapter',
      onClick: () => navigate('/project/submissions/upload'),
      variant: canCompileProposal ? 'outline' : 'default',
    },
  ].filter(Boolean);

  return (
    <EmptyState
      icon={FileText}
      title="No submissions yet"
      compact
      description={
        canCompileProposal
          ? 'Your chapter requirements are complete. Compile and submit your proposal.'
          : canUpload
            ? 'Upload your first chapter to get started.'
            : 'No documents have been uploaded for this project.'
      }
      actions={actions}
    />
  );
}

/* ────────── Main Page ────────── */

export default function ProjectSubmissionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === ROLES.STUDENT;
  const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
    user?.role,
  );
  const mode = searchParams.get('mode');
  const targetProjectId = searchParams.get('projectId') || '';
  const isReadOnlyMode = mode === 'view' && Boolean(targetProjectId);
  const hasTeam = Boolean(user?.teamId);
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [openAdmMilestone, setOpenAdmMilestone] = useState(null);
  const [uploadModalConfig, setUploadModalConfig] = useState({
    isOpen: false,
    chapter: 1,
    isLocked: false,
    submission: null,
  });

  const handleGeneralUpload = () => {
    if (isProjectArchived) return;
    setUploadModalConfig({
      isOpen: true,
      chapter: 1,
      isLocked: false,
      submission: null,
    });
  };

  const handleCardUpload = (chapterNumber, sub) => {
    if (isProjectArchived) return;
    setUploadModalConfig({
      isOpen: true,
      chapter: chapterNumber,
      isLocked: Boolean(sub),
      submission: sub || null,
    });
  };

  const handleCardRevise = (chapterNumber, sub) => {
    if (isProjectArchived) return;
    setUploadModalConfig({
      isOpen: true,
      chapter: chapterNumber,
      isLocked: true,
      submission: sub || null,
    });
  };

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useMyProject({ enabled: isStudent });

  const {
    data: targetProject,
    isLoading: targetProjectLoading,
    error: targetProjectError,
    refetch: refetchTargetProject,
  } = useProject(targetProjectId, {
    enabled: isReadOnlyMode && isFaculty,
  });

  const activeProject = isReadOnlyMode ? targetProject : project;
  const isProjectArchived =
    activeProject?.isArchived === true || activeProject?.projectStatus === 'archived';
  const isArchivedReadOnly = isReadOnlyMode || isProjectArchived;
  const { data: milestoneDeadlineRecords = [] } = useProjectMilestoneDeadlines(activeProject);
  const { deadlines, policies: deadlinePolicies } = useMemo(
    () => resolveProjectSubmissionDeadlines(activeProject, milestoneDeadlineRecords),
    [activeProject, milestoneDeadlineRecords],
  );

  const {
    data: submissionsData,
    isLoading: subsLoading,
    error: subsError,
    refetch: refetchSubs,
  } = useProjectSubmissions(
    activeProject?._id,
    { limit: 100 },
    {
      enabled: !!activeProject?._id,
    },
  );

  const submissions = submissionsData?.submissions || [];
  const isLoading = (isReadOnlyMode ? targetProjectLoading : projectLoading) || subsLoading;
  const error = (isReadOnlyMode ? targetProjectError : projectError) || subsError;

  const latestChapterSubmissions = submissions.reduce((map, submission) => {
    if (submission?.type !== 'chapter' || !submission?.chapter) return map;
    const existing = map.get(submission.chapter);
    const subVersion = Number(submission.version || 1);
    const existingVersion = Number(existing?.version || 0);
    const currentTs = new Date(submission.updatedAt || submission.createdAt || 0).getTime();
    const existingTs = existing
      ? new Date(existing.updatedAt || existing.createdAt || 0).getTime()
      : 0;
    if (
      !existing ||
      subVersion > existingVersion ||
      (subVersion === existingVersion && currentTs > existingTs)
    ) {
      map.set(submission.chapter, submission);
    }
    return map;
  }, new Map());

  const titleApproved = activeProject?.titleStatus === TITLE_STATUSES.APPROVED;
  const numericPhase = Number(activeProject?.capstonePhase ?? activeProject?.phase ?? 0);
  const activeAdmMilestone =
    numericPhase >= 3 ? 'CAPSTONE_3' : numericPhase === 2 ? 'CAPSTONE_2' : 'CAPSTONE_1';
  const hasProposal = submissions.some((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
  const canUpload = isStudent && !isArchivedReadOnly && titleApproved;
  const chaptersReadyForProposal = [1, 2, 3].every((ch) => {
    const sub = latestChapterSubmissions.get(ch);
    return sub && ['approved', 'accepted', 'locked'].includes(sub.status);
  });
  const canCompileProposal =
    isStudent && !isArchivedReadOnly && titleApproved && chaptersReadyForProposal && !hasProposal;

  const isCap1ADMApproved = numericPhase >= 2;
  const isCap2ADMApproved = numericPhase >= 3;

  const canEditDevelopmentAssets =
    isStudent && !isArchivedReadOnly && titleApproved && isCap1ADMApproved;

  const all5ChaptersApproved = [1, 2, 3, 4, 5].every((ch) => {
    const sub = latestChapterSubmissions.get(ch);
    return (
      sub &&
      [
        SUBMISSION_STATUSES.LOCKED,
        SUBMISSION_STATUSES.APPROVED,
        SUBMISSION_STATUSES.ACCEPTED,
      ].includes(sub.status)
    );
  });

  const canUploadFinalManuscripts = Boolean(
    isStudent && !isArchivedReadOnly && titleApproved && all5ChaptersApproved && isCap2ADMApproved,
  );

  const finalPaperLockMessage = !isCap2ADMApproved
    ? 'Final manuscripts unlock after Capstone 2 system defense, grade release, and ADM v2 sign-off.'
    : !all5ChaptersApproved
      ? 'Final manuscripts unlock after Chapters 1–5 are approved by the adviser.'
      : 'The full academic manuscript and journal paper are ready for adviser review and plagiarism checks.';

  const searchSuffix = isReadOnlyMode
    ? `?mode=view&projectId=${encodeURIComponent(activeProject?._id || '')}`
    : '';

  /* ────── Loading ────── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  /* ────── Non-Student Redirect ────── */
  if (!isStudent && !isReadOnlyMode) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={FileText}
          title="Access Submissions via Projects"
          description="As a faculty member, you can view submissions by selecting a project from the Projects page."
          actionLabel="Go to Projects"
          onAction={() => navigate('/projects')}
        />
      </DashboardLayout>
    );
  }

  /* ────── Error ────── */
  if (error || !activeProject) {
    if (isReadOnlyMode && isFaculty && !activeProject) {
      return (
        <DashboardLayout>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Could not load student project submissions.</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                refetchTargetProject();
                refetchSubs();
              }}
            >
              Retry
            </Button>
          </Alert>
        </DashboardLayout>
      );
    }

    const errorCode = projectError?.response?.data?.error?.code;
    const isNoTeam = errorCode === 'NO_TEAM' || (!hasTeam && !projectError);
    const isNoProject =
      errorCode === 'PROJECT_NOT_FOUND' || (hasTeam && !activeProject && !projectError);

    if (isNoTeam) {
      return (
        <DashboardLayout>
          <EmptyState
            icon={AlertTriangle}
            title="No Team Yet"
            description="You need to join or create a team before you can view submissions."
            actionLabel="Go to Dashboard"
            onAction={() => navigate('/dashboard')}
          />
        </DashboardLayout>
      );
    }

    if (isNoProject) {
      return (
        <DashboardLayout>
          <EmptyState
            icon={FileText}
            title="Proceed to My Capstone to Create Proposal"
            description="Your team does not have an approved capstone proposal yet. Proceed to My Capstone to create and submit your proposal."
            actionLabel="Proceed to My Capstone"
            onAction={() => navigate('/project')}
          />
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error?.message || 'Could not load project data.'}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => {
              refetchProject();
              refetchSubs();
            }}
          >
            Retry
          </Button>
        </Alert>
      </DashboardLayout>
    );
  }

  /* ────── Deadline map ────── */
  const chapterDeadlineMap = {
    1: deadlines.chapter1,
    2: deadlines.chapter2,
    3: deadlines.chapter3,
    4: deadlines.chapter4,
    5: deadlines.chapter5,
  };

  /* ────── Can-upload per chapter ────── */
  function canUploadChapter(chapterNum) {
    if (!canUpload) return false;
    if (chapterNum >= 4 && !isCap2ADMApproved) return false;
    if (chapterNum > 1) {
      const prev = latestChapterSubmissions.get(chapterNum - 1);
      const isApprovedOrLocked =
        prev &&
        [
          SUBMISSION_STATUSES.LOCKED,
          SUBMISSION_STATUSES.APPROVED,
          SUBMISSION_STATUSES.ACCEPTED,
        ].includes(prev.status);
      if (!isApprovedOrLocked) return false;
    }
    const current = latestChapterSubmissions.get(chapterNum);
    if (!current) return true;
    return current.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED;
  }

  /* ────── Main Render ────── */
  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 lg:space-y-8 [&_button]:min-h-[45px]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Document submissions for&nbsp;
              <span className="break-words font-medium [overflow-wrap:anywhere]">
                {activeProject.title}
              </span>
            </p>
            {isReadOnlyMode && (
              <p className="mt-1 text-xs text-muted-foreground">
                Faculty review mode — click any chapter to view submission details and leave
                feedback.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAdmMilestone(activeAdmMilestone)}
              className="gap-1.5 text-xs border-border/60 hover:bg-muted font-medium"
              data-testid="toolbar-open-adm-btn"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>Action Done Matrix</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGanttModal(true)}
              className="gap-1.5 text-xs border-border/60 hover:bg-muted"
            >
              <LineChart className="h-4 w-4 text-primary" />
              <span>Academic Gantt</span>
            </Button>
            {isStudent && !isArchivedReadOnly && (
              <>
                {canCompileProposal && (
                  <Button size="sm" onClick={() => navigate('/project/proposal')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Compile Proposal
                  </Button>
                )}
                {canUpload && (
                  <Button
                    size="sm"
                    variant={canCompileProposal ? 'outline' : 'default'}
                    onClick={handleGeneralUpload}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Chapter
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isProjectArchived && (
          <Alert className="border-border/70 bg-muted/40" data-testid="archived-project-readonly">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <AlertDescription>
              This project is archived. Its submissions, development records, and Action Done
              Matrices are available for review only.
            </AlertDescription>
          </Alert>
        )}

        {/* Deadline warnings */}
        {Object.keys(deadlines).length > 0 && (
          <DeadlineWarning
            deadlines={deadlines}
            defenseSchedule={activeProject.defenseSchedule}
            compact
          />
        )}

        {/* Progress bar */}
        <ChapterProgress latestChapterSubmissions={latestChapterSubmissions} />

        {/* Empty state — shown when no submissions exist yet */}
        {submissions.length === 0 && (
          <EmptySubmissionsState canUpload={canUpload} canCompileProposal={canCompileProposal} />
        )}

        {/* Phase 2: Capstone 1 — Proposal & Manuscript Chapters 1–3 */}
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Badge
                  variant="outline"
                  className="shrink-0 whitespace-nowrap border-primary/40 bg-primary/10 text-primary font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 2
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 1: Chapters 1–3 Manuscript &amp; Proposal Defense
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload Chapters 1–3 for adviser review, plagiarism screening (&lt; 25%), and
                compilation into the official Proposal Document.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenAdmMilestone('CAPSTONE_1')}
                className="gap-1.5 text-xs border-border/60 hover:bg-muted font-medium"
                data-testid="capstone1-open-adm-btn"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <span>Open Action Done Matrix</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((ch) => (
              <ChapterCard
                key={ch}
                chapterNumber={ch}
                submission={latestChapterSubmissions.get(ch)}
                deadline={chapterDeadlineMap[ch]}
                allowLateSubmission={deadlinePolicies[`chapter${ch}`]?.allowLateSubmission ?? true}
                isLocked={latestChapterSubmissions.get(ch)?.status === SUBMISSION_STATUSES.LOCKED}
                canUpload={canUploadChapter(ch)}
                isStudent={isStudent}
                isReadOnly={isArchivedReadOnly}
                projectId={activeProject._id}
                searchSuffix={searchSuffix}
                onUpload={handleCardUpload}
                onRevise={handleCardRevise}
              />
            ))}
          </div>

          {/* Proposal Document Compilation */}
          <ProposalSection
            submissions={submissions}
            canCompile={canCompileProposal}
            isReadOnly={isArchivedReadOnly}
            searchSuffix={searchSuffix}
          />

          {/* Action Done Matrix (ADM) Card — shared single ADM interface */}
          <ActionDoneMatrixSection
            project={activeProject}
            milestone="CAPSTONE_1"
            isStudent={isStudent}
            isFaculty={isFaculty}
            user={user}
            isReadOnly={isProjectArchived}
            isModalOpen={openAdmMilestone === 'CAPSTONE_1'}
            onModalOpenChange={(isOpen) => setOpenAdmMilestone(isOpen ? 'CAPSTONE_1' : null)}
            onRefresh={() => {
              refetchProject?.();
              refetchSubs?.();
            }}
          />
        </div>

        {/* Phase 3: Capstone 2 — System Development, Gantt & Prototype Defense */}
        <div className="space-y-5 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Badge
                  variant="outline"
                  className="shrink-0 whitespace-nowrap border-success/40 bg-success/10 text-success font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 3
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 2: System Development &amp; Prototype Defense
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manage development assets (Interactive Gantt Chart &amp; Demo Video), track
                milestone progress, and submit Chapters 4 &amp; 5.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGanttModal(true)}
                className="gap-1.5 text-xs border-border/60 hover:bg-muted"
              >
                <LineChart className="h-3.5 w-3.5 text-primary" />
                <span>Open Academic Gantt</span>
              </Button>
            </div>
          </div>

          {isStudent && !canEditDevelopmentAssets && !isArchivedReadOnly && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription>
                Capstone 2 development assets unlock after your Capstone 1 Action Done Matrix is
                approved and signed. You can still review any existing links below.
              </AlertDescription>
            </Alert>
          )}

          <PrototypeShowcaseAndDemo
            project={activeProject}
            isReadOnly={!canEditDevelopmentAssets}
            isArchived={isProjectArchived}
            canAdd={canEditDevelopmentAssets}
            canDelete={canEditDevelopmentAssets}
          />

          <div>
            <div className="flex items-center justify-between mb-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                System Results &amp; Conclusions (Chapters 4–5)
              </h3>
            </div>

            {!isCap2ADMApproved && isStudent && !isArchivedReadOnly && (
              <Alert
                className="mb-3 border-warning/30 bg-warning/10 text-warning-foreground"
                data-testid="capstone3-prerequisite-alert"
              >
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <AlertDescription>
                  Capstone 3 chapter uploads (Chapters 4 &amp; 5) unlock after your Capstone 2
                  Action Done Matrix (ADM v2) is approved and the grades are released.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {[4, 5].map((ch) => (
                <ChapterCard
                  key={ch}
                  chapterNumber={ch}
                  submission={latestChapterSubmissions.get(ch)}
                  deadline={chapterDeadlineMap[ch]}
                  allowLateSubmission={
                    deadlinePolicies[`chapter${ch}`]?.allowLateSubmission ?? true
                  }
                  isLocked={
                    latestChapterSubmissions.get(ch)?.status === SUBMISSION_STATUSES.LOCKED ||
                    (ch >= 4 && !isCap2ADMApproved)
                  }
                  canUpload={canUploadChapter(ch)}
                  isStudent={isStudent}
                  isReadOnly={isArchivedReadOnly}
                  projectId={activeProject._id}
                  searchSuffix={searchSuffix}
                  onUpload={handleCardUpload}
                  onRevise={handleCardRevise}
                />
              ))}
            </div>
          </div>
          <ActionDoneMatrixSection
            project={activeProject}
            milestone="CAPSTONE_2"
            isStudent={isStudent}
            isFaculty={isFaculty}
            user={user}
            isReadOnly={isProjectArchived}
            isModalOpen={openAdmMilestone === 'CAPSTONE_2'}
            onModalOpenChange={(isOpen) => setOpenAdmMilestone(isOpen ? 'CAPSTONE_2' : null)}
            onRefresh={() => {
              refetchProject?.();
              refetchSubs?.();
            }}
          />
        </div>

        {/* Phase 4: Capstone 3 — Final Defense, Multi-Tier ADM Sign-Off & Archival */}
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Badge
                  variant="outline"
                  className="shrink-0 whitespace-nowrap border-primary/40 bg-primary/10 text-primary font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 4
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 3: Final Defense &amp; Manuscript Archival
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Submit the complete 5-chapter Academic Manuscript and Publishable Journal Article
                for final defense hearing and institutional digital archiving.
              </p>
            </div>
          </div>

          {!canUploadFinalManuscripts && isStudent && !isArchivedReadOnly && (
            <Alert
              className="border-border/70 bg-muted/40"
              data-testid="capstone3-final-prerequisite-alert"
            >
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <AlertDescription className="text-xs text-muted-foreground font-medium">
                {finalPaperLockMessage}
              </AlertDescription>
            </Alert>
          )}

          <FinalPaperUpload
            projectId={activeProject._id}
            isLocked={!canUploadFinalManuscripts}
            lockMessage={finalPaperLockMessage}
            deadlines={deadlines}
            deadlinePolicies={deadlinePolicies}
          />
          <ActionDoneMatrixSection
            project={activeProject}
            milestone="CAPSTONE_3"
            isStudent={isStudent}
            isFaculty={isFaculty}
            user={user}
            isReadOnly={isProjectArchived}
            isModalOpen={openAdmMilestone === 'CAPSTONE_3'}
            onModalOpenChange={(isOpen) => setOpenAdmMilestone(isOpen ? 'CAPSTONE_3' : null)}
            onRefresh={() => {
              refetchProject?.();
              refetchSubs?.();
            }}
          />
        </div>

        {/* Full Interactive Academic Gantt Chart Dialog */}
        <Dialog open={showGanttModal} onOpenChange={setShowGanttModal}>
          <DialogContent
            showClose={false}
            className="flex max-h-[92dvh] w-[calc(100vw_-_1.5rem)] max-w-7xl flex-col overflow-hidden p-4 sm:p-6"
          >
            <DialogHeader className="flex shrink-0 flex-row items-start justify-between border-b border-border/60 pb-3 text-left sm:space-y-0">
              <div className="flex min-w-0 items-center gap-2.5 pr-10">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LineChart className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle
                    id="academic-gantt-dialog-title"
                    className="text-base font-bold leading-snug"
                  >
                    Capstone 2: Interactive Academic Gantt Chart
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs">
                    Live BukSU Gantt Chart with Academic Excel View, Sprint Progress, and Instant
                    Excel (.xls) Export.
                  </DialogDescription>
                </div>
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 size-9 text-muted-foreground hover:text-foreground sm:size-8"
                  aria-label="Close Gantt Dialog"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <InteractiveGanttChart
                project={activeProject}
                isReadOnly={isProjectArchived || (!isFaculty && !canEditDevelopmentAssets)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload & Revision Modal */}
        <UploadChapterModal
          isOpen={uploadModalConfig.isOpen}
          onClose={() => setUploadModalConfig((prev) => ({ ...prev, isOpen: false }))}
          initialChapter={uploadModalConfig.chapter}
          isLocked={uploadModalConfig.isLocked || isProjectArchived}
          projectId={activeProject._id}
          latestSubmission={uploadModalConfig.submission}
          deadlines={deadlines}
          deadlinePolicies={deadlinePolicies}
          isCap2ADMApproved={isCap2ADMApproved}
          onUploadSuccess={() => {
            refetchSubs();
            refetchProject?.();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
