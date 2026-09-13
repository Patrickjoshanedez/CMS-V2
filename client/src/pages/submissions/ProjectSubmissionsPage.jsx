import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import ChapterCard from '@/components/submissions/ChapterCard';
import UploadChapterModal from '@/components/submissions/UploadChapterModal';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import DevelopmentAssetsForm from '@/components/projects/DevelopmentAssetsForm';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import { useMyProject, useProject } from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useAuthStore } from '@/stores/authStore';
import { DOCUMENT_TYPES, ROLES, SUBMISSION_STATUSES, TITLE_STATUSES } from '@cms/shared';
import {
  FileText,
  Upload,
  BookOpen,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronRight,
  Code,
  TestTube,
  CheckCircle2,
  Paintbrush,
  LineChart,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
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
  const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST].includes(user?.role);
  const mode = searchParams.get('mode');
  const targetProjectId = searchParams.get('projectId') || '';
  const isReadOnlyMode = mode === 'view' && Boolean(targetProjectId);
  const hasTeam = Boolean(user?.teamId);
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [uploadModalConfig, setUploadModalConfig] = useState({
    isOpen: false,
    chapter: 1,
    isLocked: false,
    submission: null,
  });

  const handleGeneralUpload = () => {
    setUploadModalConfig({
      isOpen: true,
      chapter: 1,
      isLocked: false,
      submission: null,
    });
  };

  const handleCardUpload = (chapterNumber, sub) => {
    setUploadModalConfig({
      isOpen: true,
      chapter: chapterNumber,
      isLocked: true,
      submission: sub || null,
    });
  };

  const handleCardRevise = (chapterNumber, sub) => {
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
  const hasProposal = submissions.some((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
  const canUpload = isStudent && !isReadOnlyMode && titleApproved;
  const canEditDevelopmentAssets = isStudent && !isReadOnlyMode && titleApproved;
  const chaptersReadyForProposal = [1, 2, 3].every((ch) => {
    const sub = latestChapterSubmissions.get(ch);
    return sub && ['approved', 'accepted', 'locked'].includes(sub.status);
  });
  const canCompileProposal =
    isStudent && !isReadOnlyMode && titleApproved && chaptersReadyForProposal && !hasProposal;

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
          gradient={false}
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
            title="No Project Yet"
            description="Your team does not have a project yet. Create a project to start submitting documents."
            actionLabel="Create Project"
            onAction={() => navigate('/project/create')}
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
  const deadlines = activeProject.deadlines || {};
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Document submissions for&nbsp;
              <span className="font-medium">{activeProject.title}</span>
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
              onClick={() => setShowGanttModal(true)}
              className="gap-1.5 text-xs border-border/60 hover:bg-muted"
            >
              <LineChart className="h-4 w-4 text-primary" />
              <span>Academic Gantt</span>
            </Button>
            {isStudent && !isReadOnlyMode && (
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

        {/* Deadline warnings */}
        {activeProject.deadlines && <DeadlineWarning deadlines={activeProject.deadlines} compact />}

        {/* Progress bar */}
        <ChapterProgress latestChapterSubmissions={latestChapterSubmissions} />

        {/* Empty state — shown when no submissions exist yet */}
        {submissions.length === 0 && (
          <EmptySubmissionsState canUpload={canUpload} canCompileProposal={canCompileProposal} />
        )}

        {/* Phase 2: Capstone 2 — Proposal & Manuscript Chapters 1–3 */}
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 2
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 2: Chapters 1–3 Manuscript &amp; Midterm Defense
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload Chapters 1–3 for adviser review, plagiarism screening (&lt; 25%), and
                compilation into the official Proposal Document.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((ch) => (
              <ChapterCard
                key={ch}
                chapterNumber={ch}
                submission={latestChapterSubmissions.get(ch)}
                deadline={chapterDeadlineMap[ch]}
                isLocked={latestChapterSubmissions.get(ch)?.status === SUBMISSION_STATUSES.LOCKED}
                canUpload={canUploadChapter(ch)}
                isStudent={isStudent}
                isReadOnly={isReadOnlyMode}
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
            isReadOnly={isReadOnlyMode}
            searchSuffix={searchSuffix}
          />
        </div>

        {/* Phase 3: Capstone 3 — System Development, Interactive Gantt & Chapters 4–5 */}
        <div className="space-y-5 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 3
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 3: System Development &amp; Progress Defense
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

          {!canEditDevelopmentAssets && !isReadOnlyMode && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription>
                Capstone 3 assets unlock after your title is approved. You can still review any
                existing links below.
              </AlertDescription>
            </Alert>
          )}

          <DevelopmentAssetsForm
            project={activeProject}
            isReadOnly={!canEditDevelopmentAssets}
            onViewAcademicGantt={() => setShowGanttModal(true)}
          />

          <div>
            <div className="flex items-center justify-between mb-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                System Results &amp; Conclusions (Chapters 4–5)
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[4, 5].map((ch) => (
                <ChapterCard
                  key={ch}
                  chapterNumber={ch}
                  submission={latestChapterSubmissions.get(ch)}
                  deadline={chapterDeadlineMap[ch]}
                  isLocked={latestChapterSubmissions.get(ch)?.status === SUBMISSION_STATUSES.LOCKED}
                  canUpload={canUploadChapter(ch)}
                  isStudent={isStudent}
                  isReadOnly={isReadOnlyMode}
                  projectId={activeProject._id}
                  searchSuffix={searchSuffix}
                  onUpload={handleCardUpload}
                  onRevise={handleCardRevise}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Phase 4: Capstone 4 — Final Defense, Multi-Tier ADM Sign-Off & Archival */}
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-violet-500/40 bg-violet-500/10 text-violet-400 font-mono text-[10px] uppercase font-semibold"
                >
                  Phase 4
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Capstone 4: Final Defense &amp; Manuscript Archival
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Submit the complete 5-chapter Academic Manuscript and Publishable Journal Article
                for final defense hearing and institutional digital archiving.
              </p>
            </div>
          </div>

          <FinalPaperUpload projectId={activeProject._id} />
        </div>

        {/* Full Interactive Academic Gantt Chart Dialog */}
        {showGanttModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-gantt-dialog-title"
          >
            <div className="relative flex flex-col w-full max-w-7xl max-h-[92vh] rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="academic-gantt-dialog-title"
                      className="text-base font-bold text-foreground"
                    >
                      Capstone 3: Interactive Academic Gantt Chart
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Live BukSU Gantt Chart with Academic Excel View, Sprint Progress, and Instant
                      Excel (.xls) Export.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowGanttModal(false)}
                  aria-label="Close Gantt Dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pt-4 min-h-0">
                <InteractiveGanttChart
                  project={activeProject}
                  isReadOnly={!isStudent && !isFaculty}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload & Revision Modal */}
        <UploadChapterModal
          isOpen={uploadModalConfig.isOpen}
          onClose={() => setUploadModalConfig((prev) => ({ ...prev, isOpen: false }))}
          initialChapter={uploadModalConfig.chapter}
          isLocked={uploadModalConfig.isLocked}
          projectId={activeProject._id}
          latestSubmission={uploadModalConfig.submission}
          deadlines={activeProject.deadlines}
          onUploadSuccess={() => {
            refetchSubs();
            refetchProject?.();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
