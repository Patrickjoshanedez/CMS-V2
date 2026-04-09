import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import { useMyProject } from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, SUBMISSION_STATUSES, TITLE_STATUSES } from '@cms/shared';
import {
  FileText,
  Upload,
  BookOpen,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronRight,
  Filter,
  ArrowLeft,
} from 'lucide-react';

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

/**
 * Format an ISO date string to a localised short format.
 */
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

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/* ────────── Sub-components ────────── */

function EmptyState({ canUpload, canCompileProposal }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
      <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No submissions yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
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

function SubmissionRow({ submission }) {
  return (
    <Link
      to={`/project/submissions/${submission._id}`}
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition hover:bg-accent/50"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {CHAPTER_LABELS[submission.chapter - 1] || `Chapter ${submission.chapter}`}
            </span>
            <Badge variant="outline" className="text-xs">
              v{submission.version}
            </Badge>
            <SubmissionStatusBadge status={submission.status} />
            {submission.isLate && (
              <Badge variant="warning" className="text-xs">
                Late
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(submission.createdAt)}
            </span>
            <span>{submission.fileName}</span>
            <span>{formatBytes(submission.fileSize)}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/* ────────── Main Page ────────── */

/**
 * ProjectSubmissionsPage — lists all submissions for the student's current project.
 *
 * Faculty members viewing via project detail page use a different route
 * (ProjectDetailPage already links here through `/projects/:id/submissions`).
 */
export default function ProjectSubmissionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === ROLES.STUDENT;

  const [chapterFilter, setChapterFilter] = useState('');

  useEffect(() => {
    const chapterParam = searchParams.get('chapter') || '';
    const normalizedChapter = CHAPTER_LABELS[Number(chapterParam) - 1] ? chapterParam : '';
    setChapterFilter(normalizedChapter);
  }, [searchParams]);

  // Non-students (advisers, instructors, panelists) should access submissions
  // through the Projects page, not this student-specific route.
  // We check this early and return before calling useMyProject() which would fail for them.
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useMyProject({ enabled: isStudent });

  const filters = {};
  if (chapterFilter) filters.chapter = chapterFilter;

  const {
    data: submissionsData,
    isLoading: subsLoading,
    error: subsError,
    refetch: refetchSubs,
  } = useProjectSubmissions(project?._id, filters, {
    enabled: !!project?._id,
  });

  const { data: allSubmissionsData } = useProjectSubmissions(
    project?._id,
    { limit: 100 },
    {
      enabled: !!project?._id,
    },
  );

  const submissions = submissionsData?.submissions || [];
  const allSubmissions = allSubmissionsData?.submissions || submissions;
  const isLoading = projectLoading || subsLoading;
  const error = projectError || subsError;
  const lateCount = submissions.filter((item) => item.isLate).length;
  const lockedCount = submissions.filter((item) => item.status === 'LOCKED').length;

  const latestChapterSubmissions = allSubmissions.reduce((map, submission) => {
    if (submission?.type !== 'chapter' || !submission?.chapter) {
      return map;
    }

    const existing = map.get(submission.chapter);
    const currentTimestamp = new Date(submission.updatedAt || submission.createdAt || 0).getTime();
    const existingTimestamp = existing
      ? new Date(existing.updatedAt || existing.createdAt || 0).getTime()
      : 0;

    if (!existing || currentTimestamp >= existingTimestamp) {
      map.set(submission.chapter, submission);
    }

    return map;
  }, new Map());

  const canUpload = isStudent && project?.titleStatus === TITLE_STATUSES.APPROVED;
  const chaptersReadyForProposal = [1, 2, 3].every((chapter) => {
    const chapterSubmission = latestChapterSubmissions.get(chapter);
    return (
      chapterSubmission &&
      [
        SUBMISSION_STATUSES.APPROVED,
        SUBMISSION_STATUSES.ACCEPTED,
        SUBMISSION_STATUSES.LOCKED,
      ].includes(chapterSubmission.status)
    );
  });
  const hasProposal = allSubmissions.some((submission) => submission.type === 'proposal');
  const canCompileProposal = canUpload && chaptersReadyForProposal && !hasProposal;

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
  // Advisers, instructors, and panelists should view submissions via the Projects page
  if (!isStudent) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
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
  if (error || !project) {
    // Distinguish between "no team/project" (expected for new students) vs actual errors
    const errorCode = projectError?.response?.data?.error?.code;
    const isNoTeam = errorCode === 'NO_TEAM';
    const isNoProject = errorCode === 'PROJECT_NOT_FOUND';

    if (isNoTeam) {
      return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Team Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              You need to join or create a team before you can view submissions.
            </p>
            <Button className="mt-6" onClick={() => navigate('/teams')}>
              Go to Teams
            </Button>
          </div>
        </DashboardLayout>
      );
    }

    if (isNoProject) {
      return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
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
              onClick={() => navigate('/project')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Project
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Document submissions for&nbsp;
              <span className="font-medium">{project.title}</span>
            </p>
          </div>
          {isStudent && (
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

        {/* Deadline alerts — compact warnings for approaching/overdue deadlines */}
        {project.deadlines && <DeadlineWarning deadlines={project.deadlines} compact />}

        {/* Quick summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total Submissions
              </p>
              <p className="mt-1 text-2xl font-semibold">{submissions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Approved And Locked
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">{lockedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Late Submissions
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-600">{lateCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Filter</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Focus submissions by chapter number.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={chapterFilter === '' ? 'default' : 'outline'}
                onClick={() => setChapterFilter('')}
              >
                All
              </Button>
              {CHAPTER_LABELS.map((label, idx) => (
                <Button
                  key={idx + 1}
                  size="sm"
                  variant={chapterFilter === String(idx + 1) ? 'default' : 'outline'}
                  onClick={() => setChapterFilter(String(idx + 1))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submissions list */}
        {submissions.length === 0 ? (
          <EmptyState canUpload={canUpload} canCompileProposal={canCompileProposal} />
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <SubmissionRow key={sub._id} submission={sub} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
