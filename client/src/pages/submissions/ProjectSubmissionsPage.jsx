import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import ChapterCard from '@/components/submissions/ChapterCard';
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
  ArrowLeft,
  Code,
  TestTube,
  CheckCircle2,
  Paintbrush,
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
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
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

function EmptyState({ canUpload, canCompileProposal }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-gradient-to-b from-muted/30 to-muted/60 py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold">No submissions yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {canCompileProposal
          ? 'Your chapter requirements are complete. Compile and submit your proposal.'
          : canUpload
            ? 'Upload your first chapter to get started.'
            : 'No documents have been uploaded for this project.'}
      </p>
      {(canUpload || canCompileProposal) && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {canCompileProposal && (
            <Button onClick={() => navigate('/project/proposal')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Compile Proposal
            </Button>
          )}
          {canUpload && (
            <Button
              variant={canCompileProposal ? 'outline' : 'default'}
              onClick={() => navigate('/project/submissions/upload')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Chapter
            </Button>
          )}
        </div>
      )}
    </div>
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
    const currentTs = new Date(submission.updatedAt || submission.createdAt || 0).getTime();
    const existingTs = existing
      ? new Date(existing.updatedAt || existing.createdAt || 0).getTime()
      : 0;
    if (!existing || currentTs >= existingTs) map.set(submission.chapter, submission);
    return map;
  }, new Map());

  const titleApproved = activeProject?.titleStatus === TITLE_STATUSES.APPROVED;
  const hasProposal = submissions.some((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
  const canUpload = isStudent && !isReadOnlyMode && titleApproved;
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  /* ────── Non-Student Redirect ────── */
  if (!isStudent && !isReadOnlyMode) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Submissions via Projects</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            As a faculty member, you can view submissions by selecting a project from the Projects
            page.
          </p>
          <Button className="mt-6" onClick={() => navigate('/projects')}>
            Go to Projects
          </Button>
        </div>
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 py-16 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Team Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              You need to join or create a team before you can view submissions.
            </p>
            <Button className="mt-6" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </DashboardLayout>
      );
    }

    if (isNoProject) {
      return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Project Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your team does not have a project yet. Create a project to start submitting documents.
            </p>
            <Button className="mt-6" onClick={() => navigate('/project/create')}>
              Create Project
            </Button>
          </div>
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
      if (!prev || prev.status !== SUBMISSION_STATUSES.LOCKED) return false;
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
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground"
              onClick={() => {
                if (isReadOnlyMode) {
                  navigate(`/projects/${activeProject?._id}`);
                  return;
                }
                navigate('/project');
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {isReadOnlyMode ? 'Back to Project Detail' : 'Back to Project'}
            </Button>
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
          {isStudent && !isReadOnlyMode && (
            <div className="flex flex-wrap items-center gap-2">
              {canCompileProposal && (
                <Button onClick={() => navigate('/project/proposal')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Compile Proposal
                </Button>
              )}
              {canUpload && (
                <Button
                  variant={canCompileProposal ? 'outline' : 'default'}
                  onClick={() => navigate('/project/submissions/upload')}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Chapter
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Deadline warnings */}
        {activeProject.deadlines && <DeadlineWarning deadlines={activeProject.deadlines} compact />}

        {/* Progress bar */}
        <ChapterProgress latestChapterSubmissions={latestChapterSubmissions} />

        {/* Chapter Grid — Pre-proposal (Ch 1-3) */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pre-Defense Chapters
          </h2>
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
              />
            ))}
          </div>
        </div>

        {/* Proposal */}
        <ProposalSection
          submissions={submissions}
          canCompile={canCompileProposal}
          isReadOnly={isReadOnlyMode}
          searchSuffix={searchSuffix}
        />

        {/* Post-Defense Chapters (Ch 4-5) */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Post-Defense Chapters
          </h2>
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
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
