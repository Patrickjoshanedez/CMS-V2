import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import { useMyProject } from '@/hooks/useProjects';
import { useProjectSubmissions, useCompileProposal } from '@/hooks/useSubmissions';
import { PROJECT_STATUSES, ROLES, SUBMISSION_STATUSES, TITLE_STATUSES } from '@cms/shared';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
  BookOpen,
  Upload,
  FileText,
  X,
  Clock,
  ShieldCheck,
  Target,
  Layers,
  Sparkles,
} from 'lucide-react';

const READY_SUBMISSION_STATUSES = new Set([
  SUBMISSION_STATUSES.APPROVED,
  SUBMISSION_STATUSES.ACCEPTED,
  SUBMISSION_STATUSES.LOCKED,
]);

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc'];
const ACCEPT_STRING =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const CHAPTER_INFO = [
  { chapter: 1, title: 'Introduction', description: 'Problem Formulation & Objectives' },
  {
    chapter: 2,
    title: 'Review of Related Literature',
    description: 'State of the Art & Framework',
  },
  {
    chapter: 3,
    title: 'Technical Methodology',
    description: 'Architecture, System Design & Methods',
  },
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getLatestChapterSubmissions(submissions = []) {
  const latestByChapter = new Map();

  for (const submission of submissions) {
    if (submission?.type !== 'chapter' || !submission?.chapter) {
      continue;
    }

    const current = latestByChapter.get(submission.chapter);
    const subVersion = Number(submission.version || 1);
    const currentVersion = Number(current?.version || 0);
    const createdAt = new Date(submission.updatedAt || submission.createdAt || 0).getTime();
    const currentCreatedAt = current
      ? new Date(current.updatedAt || current.createdAt || 0).getTime()
      : 0;

    if (
      !current ||
      subVersion > currentVersion ||
      (subVersion === currentVersion && createdAt > currentCreatedAt)
    ) {
      latestByChapter.set(submission.chapter, submission);
    }
  }

  return latestByChapter;
}

function isChapterReady(submission) {
  return Boolean(submission && READY_SUBMISSION_STATUSES.has(submission.status));
}

function validateSelectedFile(selectedFile) {
  if (!selectedFile) return 'Please select a proposal file to upload.';
  const extension = '.' + selectedFile.name.split('.').pop().toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Invalid file format. Please upload a PDF (.pdf) or Word (.docx, .doc) document.';
  }
  if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds maximum limit of ${MAX_FILE_SIZE_MB} MB (${formatBytes(selectedFile.size)}).`;
  }
  return '';
}

export default function ProposalCompilationPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile) {
      const err = validateSelectedFile(selectedFile);
      if (err) {
        setFileError(err);
        setFile(null);
        toast.error(err);
      } else {
        setFileError('');
        setFile(selectedFile);
        setWorkflowState('idle');
        setFeedbackMessage('');
      }
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      const err = validateSelectedFile(droppedFile);
      if (err) {
        setFileError(err);
        setFile(null);
        toast.error(err);
      } else {
        setFileError('');
        setFile(droppedFile);
        setWorkflowState('idle');
        setFeedbackMessage('');
      }
    }
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setFileError('');
    setWorkflowState('idle');
    setFeedbackMessage('');
    setProgress(0);
  };

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

  const capstoneRaw = project?.capstoneType || project?.projectType;
  const capstoneTypeOrPhase = Array.isArray(capstoneRaw)
    ? capstoneRaw.join(', ')
    : capstoneRaw || `Capstone ${project?.capstonePhase || 2}`;

  const projectUnavailable =
    project?.projectStatus === PROJECT_STATUSES.REJECTED ||
    project?.projectStatus === PROJECT_STATUSES.ARCHIVED;
  const canCompile = Boolean(project && titleApproved && chapterReady && !projectUnavailable);

  const teamName = project?.team?.name || project?.teamName || '';
  const cleanTeamName = teamName ? teamName.replace(/^Team\s+/i, '').trim() : '';

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!project || !file || !canCompile || compileProposal.isPending) {
      return;
    }

    const fileValidationError = validateSelectedFile(file);
    if (fileValidationError) {
      setFileError(fileValidationError);
      toast.error(fileValidationError);
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
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) {
          return;
        }

        const nextProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
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
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/project/submissions')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to submissions
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Proposal Compilation
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Compile the approved chapter set into a single proposal submission for review.
              </p>
            </div>
            <Badge
              variant="outline"
              className="self-start sm:self-center font-medium border-primary/30 bg-primary/5 text-primary text-xs px-3 py-1"
            >
              Capstone 2 Proposal
            </Badge>
          </div>
        </div>

        {/* Project Context & Status Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-semibold text-xs">
                {project.academicYear || 'A.Y. 2025-2026'}
              </Badge>
              <TitleStatusBadge status={project.titleStatus} />
              <ProjectStatusBadge status={project.projectStatus} />
              <Badge variant="secondary" className="font-medium text-xs">
                {capstoneTypeOrPhase}
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-bold leading-snug text-foreground">
                {project.title}
              </CardTitle>
              <CardDescription className="text-sm">
                Chapters 1-3 must be approved or locked before you can submit the compiled proposal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Metadata Summary Box */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Proposal Summary
                </span>
                {cleanTeamName && (
                  <span className="text-xs font-medium text-foreground">Team {cleanTeamName}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {project.abstract || 'No overview provided yet.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  SDG Tags
                </p>
                {project.sdgTags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {project.sdgTags.map((tag, idx) => (
                      <Badge
                        key={`${tag}-${idx}`}
                        variant="outline"
                        className="bg-background/80 text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No SDG tags added.</p>
                )}
              </div>

              <div className="space-y-1 pt-1 border-t border-border/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Capstone Type/Phase
                </p>
                <p className="text-sm font-medium text-foreground">{capstoneTypeOrPhase}</p>
              </div>
            </div>

            {/* Prerequisites Checklist Grid */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compilation Eligibility Check
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      project?.teamId || project?.team
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {project?.teamId || project?.team ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Team Roster</p>
                    <p className="text-sm font-semibold truncate text-foreground">
                      {project?.teamId || project?.team ? 'Roster Locked' : 'Pending Roster'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      titleApproved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {titleApproved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Title Status</p>
                    <p className="text-sm font-semibold truncate text-foreground">
                      {titleApproved ? 'Title Approved' : 'Pending Approval'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      chapterReady
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {chapterReady ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Chapters 1-3</p>
                    <p className="text-sm font-semibold truncate text-foreground">
                      {chapterReady ? 'Chapters 1-3 Ready' : 'Review Incomplete'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      !projectUnavailable
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {!projectUnavailable ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Project State</p>
                    <p className="text-sm font-semibold truncate text-foreground">
                      {!projectUnavailable ? 'Project Active' : 'Inactive / Blocked'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter-by-Chapter Readiness Strip */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Required Manuscript Chapters (1–3)
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {CHAPTER_INFO.map((info) => {
                  const sub = chapterSubmissions.get(info.chapter);
                  const ready = isChapterReady(sub);
                  return (
                    <div
                      key={info.chapter}
                      className={`rounded-xl border p-3.5 transition-all ${
                        ready
                          ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                          : 'border-border/60 bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Chapter {info.chapter}
                        </span>
                        {ready ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                        {info.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {info.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-muted-foreground">
                          {sub?.version ? `Round v${sub.version}` : 'No file'}
                        </span>
                        {sub ? (
                          <SubmissionStatusBadge status={sub.status} />
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Missing
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* Upload Proposal Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Upload Proposal</CardTitle>
            <CardDescription>
              Upload the compiled file and include any remarks that should travel with the
              submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Interactive File Dropzone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Compiled proposal file
                </Label>

                {!file ? (
                  <label
                    htmlFor="proposal-file"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                      isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                    }`}
                  >
                    <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary transition-transform group-hover:scale-105">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Click to browse or drag and drop your compiled proposal document
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, DOCX, or DOC up to {MAX_FILE_SIZE_MB} MB
                    </p>
                    <input
                      id="proposal-file"
                      type="file"
                      accept={ACCEPT_STRING}
                      onChange={handleFileChange}
                      disabled={!canCompile || compileProposal.isPending}
                      className="sr-only"
                    />
                  </label>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatBytes(file.size)}</span>
                          <span>&bull;</span>
                          <span>
                            {file.name.toLowerCase().endsWith('.pdf')
                              ? 'PDF Manuscript'
                              : 'Word Document'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Ready to Compile
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={compileProposal.isPending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                )}

                {fileError && <p className="text-xs font-medium text-destructive">{fileError}</p>}
                <p className="text-xs text-muted-foreground">
                  Upload the merged proposal document for chapters 1-3.
                </p>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="proposal-remarks"
                    className="text-sm font-semibold text-foreground"
                  >
                    Remarks
                  </Label>
                  <span className="text-xs text-muted-foreground">Visible to reviewers</span>
                </div>
                <Textarea
                  id="proposal-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  placeholder="Add notes about the compilation, late submission context, or other remarks."
                  className="resize-y"
                />
              </div>

              {/* Upload Progress */}
              {workflowState === 'uploading' && (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2 text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      {feedbackMessage || 'Uploading proposal...'}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {workflowState === 'success' && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription>{feedbackMessage}</AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {workflowState === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{feedbackMessage}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={
                    !file || !canCompile || compileProposal.isPending || workflowState === 'success'
                  }
                  className="gap-2 font-semibold shadow-xs"
                >
                  {compileProposal.isPending || workflowState === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compiling Proposal...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      Compile Proposal
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/project/submissions')}
                  disabled={compileProposal.isPending || workflowState === 'uploading'}
                >
                  Cancel
                </Button>
              </div>

              {/* Institutional Guidelines */}
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.02] p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Before you submit
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
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
