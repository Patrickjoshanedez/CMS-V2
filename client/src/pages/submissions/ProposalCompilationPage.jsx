import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useMyProject } from '@/hooks/useProjects';
import { useProjectSubmissions, useCompileProposal } from '@/hooks/useSubmissions';
import { PROJECT_STATUSES, ROLES, SUBMISSION_STATUSES, TITLE_STATUSES } from '@cms/shared';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileUp, Loader2, BookOpen } from 'lucide-react';

const READY_SUBMISSION_STATUSES = new Set([
  SUBMISSION_STATUSES.APPROVED,
  SUBMISSION_STATUSES.ACCEPTED,
  SUBMISSION_STATUSES.LOCKED,
]);

function getLatestChapterSubmissions(submissions = []) {
  const latestByChapter = new Map();

  for (const submission of submissions) {
    if (submission?.type !== 'chapter' || !submission?.chapter) {
      continue;
    }

    const createdAt = new Date(submission.updatedAt || submission.createdAt || 0).getTime();
    const current = latestByChapter.get(submission.chapter);
    const currentCreatedAt = current
      ? new Date(current.updatedAt || current.createdAt || 0).getTime()
      : 0;

    if (!current || createdAt >= currentCreatedAt) {
      latestByChapter.set(submission.chapter, submission);
    }
  }

  return latestByChapter;
}

function isChapterReady(submission) {
  return Boolean(submission && READY_SUBMISSION_STATUSES.has(submission.status));
}

function prerequisiteLabel(ok, label) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

export default function ProposalCompilationPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [progress, setProgress] = useState(0);
  const [workflowState, setWorkflowState] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const { data: project, isLoading: projectLoading, error: projectError } = useMyProject();
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useProjectSubmissions(project?._id, { limit: 200 }, { enabled: Boolean(project?._id) });

  const compileProposal = useCompileProposal({
    onSuccess: () => {
      setWorkflowState('success');
      setFeedbackMessage('Proposal compiled successfully. Redirecting to submissions...');
      setProgress(100);
      toast.success('Proposal compiled successfully.');
    },
    onError: (error) => {
      const message = error?.response?.data?.error?.message || 'Failed to compile proposal.';
      setWorkflowState('error');
      setFeedbackMessage(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  useEffect(() => {
    if (workflowState !== 'success') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      navigate('/project/submissions');
    }, 1200);

    return () => clearTimeout(timeout);
  }, [workflowState, navigate]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (user.role !== ROLES.STUDENT) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-6 py-12">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Proposal Compilation</CardTitle>
              <CardDescription>Available to students only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This screen is intended for the student team that owns the active project.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => navigate('/project/submissions')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to submissions
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const submissions = submissionsData?.submissions || [];
  const chapterSubmissions = getLatestChapterSubmissions(submissions);
  const titleApproved = project?.titleStatus === TITLE_STATUSES.APPROVED;
  const chapterReady = [1, 2, 3].every((chapter) =>
    isChapterReady(chapterSubmissions.get(chapter)),
  );
  const capstoneTypeOrPhase =
    project?.capstoneType || project?.projectType || `Capstone ${project?.capstonePhase}`;
  const projectUnavailable =
    project?.projectStatus === PROJECT_STATUSES.REJECTED ||
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED;
  const canCompile = Boolean(project && titleApproved && chapterReady && !projectUnavailable);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setWorkflowState('idle');
    setFeedbackMessage('');
    setProgress(0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!project || !file || !canCompile || compileProposal.isPending) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (remarks.trim()) {
      formData.append('remarks', remarks.trim());
    }

    setWorkflowState('uploading');
    setFeedbackMessage('Uploading proposal...');
    setProgress(0);

    compileProposal.mutate({
      projectId: project._id,
      formData,
      onUploadProgress: (event) => {
        if (!event.total) {
          return;
        }

        const nextProgress = Math.round((event.loaded * 100) / event.total);
        setProgress(nextProgress);
        setFeedbackMessage(`Uploading proposal... ${nextProgress}%`);
      },
    });
  };

  if (projectLoading || submissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (projectError || submissionsError) {
    const message =
      projectError?.response?.data?.error?.message ||
      submissionsError?.response?.data?.error?.message ||
      'Failed to load proposal compilation data.';

    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-6 py-12">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Proposal Compilation</CardTitle>
              <CardDescription>We could not load the current project data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/project/submissions')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to submissions
                </Button>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-6 py-12">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Proposal Compilation</CardTitle>
              <CardDescription>Start here once your project is ready.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No active project was found for your account.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => navigate('/project/submissions')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to submissions
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Proposal Compilation</h1>
          <p className="text-muted-foreground">
            Compile the approved chapter set into a single proposal submission for review.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{project.academicYear}</Badge>
              <Badge variant={titleApproved ? 'default' : 'secondary'}>
                Title {project.titleStatus}
              </Badge>
              <Badge variant="outline">Project {project.projectStatus}</Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">{project.title}</CardTitle>
              <CardDescription>
                Chapters 1-3 must be approved or locked before you can submit the compiled proposal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold">Proposal Summary</p>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overview
                </p>
                <p className="text-sm">{project.abstract || 'No overview provided yet.'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  SDG Tags
                </p>
                {project.sdgTags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {project.sdgTags.map((tag, idx) => (
                      <Badge key={`${tag}-${idx}`} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No SDG tags added.</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Capstone Type/Phase
                </p>
                <p className="text-sm">{capstoneTypeOrPhase}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {prerequisiteLabel(
                Boolean(project?.teamId || project?.team),
                'Team formation complete',
              )}
              {prerequisiteLabel(titleApproved, 'Title approved')}
              {prerequisiteLabel(chapterReady, 'Chapters 1-3 are ready')}
              {prerequisiteLabel(!projectUnavailable, 'Project is active')}
            </div>

            {!canCompile && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to finish the prerequisites above before compiling the proposal.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Proposal</CardTitle>
            <CardDescription>
              Upload the compiled file and include any remarks that should travel with the
              submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="proposal-file">Compiled proposal file</Label>
                <Input
                  id="proposal-file"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Upload the merged proposal document for chapters 1-3.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposal-remarks">Remarks</Label>
                <Textarea
                  id="proposal-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  placeholder="Add notes about the compilation, late submission context, or other remarks."
                />
              </div>

              {workflowState === 'uploading' && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {feedbackMessage || 'Uploading proposal...'}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Progress: {progress}%</p>
                </div>
              )}

              {workflowState === 'success' && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription>{feedbackMessage}</AlertDescription>
                </Alert>
              )}

              {workflowState === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{feedbackMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={
                    !file || !canCompile || compileProposal.isPending || workflowState === 'success'
                  }
                >
                  {compileProposal.isPending || workflowState === 'uploading' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="mr-2 h-4 w-4" />
                  )}
                  Compile Proposal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/project/submissions')}
                >
                  Cancel
                </Button>
              </div>

              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <BookOpen className="h-4 w-4" />
                  Before you submit
                </div>
                <p className="mt-2">
                  Make sure the uploaded file is the final compiled version of your proposal and
                  that the remarks field includes any context the reviewers should see.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
