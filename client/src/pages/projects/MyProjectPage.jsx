import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import PrototypeUploadForm from '@/components/projects/PrototypeUploadForm';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import {
  useMyProject,
  useUpdateTitle,
  useSubmitTitle,
  useReviseAndResubmit,
  useRequestTitleModification,
} from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { TITLE_STATUSES, CAPSTONE_PHASES, SUBMISSION_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import { toast } from 'sonner';
import {
  FileText,
  Send,
  Edit3,
  PenLine,
  AlertTriangle,
  Loader2,
  User,
  Users,
  Calendar,
  X,
  XCircle,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  BookOpen,
  ClipboardList,
} from 'lucide-react';

/**
 * MyProjectPage — Student project dashboard.
 *
 * Displays the current project info, title status, adviser/panelists,
 * and provides contextual actions based on title workflow state:
 *   DRAFT          → Edit title / Submit for approval
 *   SUBMITTED      → Waiting for review (read-only)
 *   APPROVED       → Request title modification
 *   REVISION_REQUIRED → Revise and resubmit
 *   PENDING_MODIFICATION → Waiting for admin resolution
 */

/* ────────── Sub-components ────────── */

function EmptyProjectState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
      <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No project yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create a new project to start your capstone journey.
      </p>
      <Button className="mt-6" onClick={() => navigate('/project/create')}>
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>
    </div>
  );
}

/**
 * RejectedProjectState — shown when the team's project has been rejected.
 * Displays rejection info and a prominent "Create Another Project" action.
 */
function RejectedProjectState({ project }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Your project <span className="font-semibold">&ldquo;{project.title}&rdquo;</span> has been rejected.
          {project.rejectionReason && (
            <span className="mt-1 block text-sm">
              <span className="font-medium">Reason:</span> {project.rejectionReason}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="flex flex-col items-center py-10 text-center">
          <XCircle className="mb-4 h-12 w-12 text-destructive/60" />
          <h3 className="text-lg font-semibold">Project Rejected</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Your previous project was not approved. You can create a new project with a different
            topic and start the process again.
          </p>
          <Button className="mt-6" onClick={() => navigate('/project/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Another Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectInfoCard({ project }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{project.title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <TitleStatusBadge status={project.titleStatus} />
              <ProjectStatusBadge status={project.projectStatus} />
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abstract */}
        {project.abstract && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Abstract</p>
            <p className="mt-1 text-sm">{project.abstract}</p>
          </div>
        )}

        {/* Keywords */}
        {project.keywords?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Keywords</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {project.keywords.map((kw) => (
                <Badge key={kw} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Meta info grid */}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Academic Year: {project.academicYear}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Phase: Capstone {project.capstonePhase}</span>
          </div>
          {project.adviserId && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Adviser: {project.adviserId?.fullName || project.adviserId}</span>
            </div>
          )}
          {project.panelistIds?.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Panelists: {project.panelistIds.length}</span>
            </div>
          )}
        </div>

        {/* Rejection reason */}
        {project.rejectionReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{project.rejectionReason}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function EditTitleForm({ project }) {
  const updateTitle = useUpdateTitle({
    onSuccess: () => toast.success('Changes saved.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to save.'),
  });
  const submitTitle = useSubmitTitle({
    onSuccess: () => toast.success('Title submitted for approval!'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to submit title.'),
  });

  const [title, setTitle] = useState(project.title);
  const [abstract, setAbstract] = useState(project.abstract || '');
  const [keywordList, setKeywordList] = useState(project.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [editing, setEditing] = useState(false);

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywordList.includes(kw) && keywordList.length < 10) {
      setKeywordList((prev) => [...prev, kw]);
      setKeywordInput('');
    }
  };

  const handleSave = () => {
    updateTitle.mutate(
      { projectId: project._id, title, abstract: abstract || undefined, keywords: keywordList },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleSubmitForApproval = () => {
    submitTitle.mutate(project._id);
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title Actions</CardTitle>
          <CardDescription>Your title is in draft. Edit it or submit for review.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
          <Button onClick={handleSubmitForApproval} disabled={submitTitle.isPending}>
            {submitTitle.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit for Approval
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={10}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-abstract">Abstract</Label>
          <Textarea
            id="edit-abstract"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Keywords</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {keywordList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {keywordList.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => setKeywordList((prev) => prev.filter((k) => k !== kw))}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTitle.isPending}>
            {updateTitle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
        {updateTitle.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {updateTitle.error?.response?.data?.error?.message || 'Failed to save'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function ReviseAndResubmitForm({ project }) {
  const revise = useReviseAndResubmit({
    onSuccess: () => toast.success('Title resubmitted for review!'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Resubmission failed.'),
  });
  const [title, setTitle] = useState(project.title);
  const [abstract, setAbstract] = useState(project.abstract || '');

  const handleRevise = () => {
    revise.mutate({ projectId: project._id, title, abstract: abstract || undefined });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="text-base">Revisions Required</CardTitle>
        <CardDescription>Your title needs changes. Update and resubmit below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="revise-title">Title</Label>
          <Input
            id="revise-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={10}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="revise-abstract">Abstract</Label>
          <Textarea
            id="revise-abstract"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleRevise} disabled={revise.isPending}>
            {revise.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Resubmit Title
          </Button>
        </div>
        {revise.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {revise.error?.response?.data?.error?.message || 'Resubmission failed'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function RequestModificationForm({ project }) {
  const requestMod = useRequestTitleModification({
    onSuccess: () => toast.success('Modification request submitted!'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Request failed.'),
  });
  const [proposedTitle, setProposedTitle] = useState('');
  const [justification, setJustification] = useState('');
  const [show, setShow] = useState(false);

  const handleSubmit = () => {
    requestMod.mutate(
      { projectId: project._id, proposedTitle, justification },
      { onSuccess: () => setShow(false) },
    );
  };

  if (!show) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title Approved</CardTitle>
          <CardDescription>
            Your title has been approved. You can request a modification if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setShow(true)}>
            <PenLine className="mr-2 h-4 w-4" />
            Request Title Modification
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request Title Modification</CardTitle>
        <CardDescription>
          This requires instructor approval. Provide a justification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mod-title">Proposed New Title</Label>
          <Input
            id="mod-title"
            value={proposedTitle}
            onChange={(e) => setProposedTitle(e.target.value)}
            minLength={10}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mod-justification">Justification</Label>
          <Textarea
            id="mod-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain why you need to change the title"
            minLength={20}
            maxLength={1000}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={requestMod.isPending}>
            {requestMod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </div>
        {requestMod.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {requestMod.error?.response?.data?.error?.message || 'Request failed'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function PendingModificationCard({ project }) {
  const mod = project.titleModificationRequest;
  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="text-base">Title Modification Pending</CardTitle>
        <CardDescription>Waiting for instructor approval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Proposed Title:</span> {mod?.proposedTitle}
        </div>
        <div>
          <span className="font-medium">Justification:</span> {mod?.justification}
        </div>
      </CardContent>
    </Card>
  );
}

function SubmittedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Under Review</CardTitle>
        <CardDescription>
          Your title has been submitted and is awaiting instructor review.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/* ────────── Actions section selector ────────── */

function TitleActionsSection({ project }) {
  switch (project.titleStatus) {
    case TITLE_STATUSES.DRAFT:
      return <EditTitleForm project={project} />;
    case TITLE_STATUSES.SUBMITTED:
      return <SubmittedCard />;
    case TITLE_STATUSES.APPROVED:
      return <RequestModificationForm project={project} />;
    case TITLE_STATUSES.REVISION_REQUIRED:
      return <ReviseAndResubmitForm project={project} />;
    case TITLE_STATUSES.PENDING_MODIFICATION:
      return <PendingModificationCard project={project} />;
    default:
      return null;
  }
}

/* ────────── Chapter Progress Section ────────── */

const CHAPTER_LABELS = {
  1: 'Chapter 1',
  2: 'Chapter 2',
  3: 'Chapter 3',
  4: 'Chapter 4',
  5: 'Chapter 5',
};

/**
 * Map submission status to a visual badge.
 */
function chapterStatusBadge(status) {
  const map = {
    [SUBMISSION_STATUSES.PENDING]: { label: 'Pending', variant: 'secondary' },
    [SUBMISSION_STATUSES.UNDER_REVIEW]: { label: 'Under Review', variant: 'outline' },
    [SUBMISSION_STATUSES.APPROVED]: { label: 'Approved', variant: 'default' },
    [SUBMISSION_STATUSES.REVISIONS_REQUIRED]: { label: 'Needs Revision', variant: 'destructive' },
    [SUBMISSION_STATUSES.LOCKED]: { label: 'Locked', variant: 'default' },
    [SUBMISSION_STATUSES.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  };
  return map[status] || { label: 'Not Started', variant: 'outline' };
}

function chapterStatusIcon(status) {
  switch (status) {
    case SUBMISSION_STATUSES.LOCKED:
      return <Lock className="h-4 w-4 text-primary" />;
    case SUBMISSION_STATUSES.APPROVED:
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case SUBMISSION_STATUSES.UNDER_REVIEW:
    case SUBMISSION_STATUSES.PENDING:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case SUBMISSION_STATUSES.REVISIONS_REQUIRED:
    case SUBMISSION_STATUSES.REJECTED:
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * ChapterProgressSection — Shows chapters 1-3 (or 1-5 for later phases)
 * with their current submission status, providing at-a-glance workflow progress.
 */
function ChapterProgressSection({ project, submissions }) {
  const navigate = useNavigate();
  const maxChapter = project.capstonePhase >= CAPSTONE_PHASES.PHASE_2 ? 5 : 3;

  // Build a map of latest submission per chapter from the submissions list
  const chapterMap = {};
  if (submissions?.submissions) {
    for (const sub of submissions.submissions) {
      const existing = chapterMap[sub.chapter];
      if (!existing || new Date(sub.uploadedAt) > new Date(existing.uploadedAt)) {
        chapterMap[sub.chapter] = sub;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Chapter Progress</CardTitle>
            <CardDescription>
              Track the status of each chapter submission.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/project/submissions')}>
            <ClipboardList className="mr-2 h-4 w-4" />
            All Submissions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: maxChapter }, (_, i) => i + 1).map((chapter) => {
            const sub = chapterMap[chapter];
            const { label, variant } = sub
              ? chapterStatusBadge(sub.status)
              : { label: 'Not Started', variant: 'outline' };

            return (
              <div
                key={chapter}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {sub ? chapterStatusIcon(sub.status) : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">{CHAPTER_LABELS[chapter]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={variant}>{label}</Badge>
                  {sub?.version > 1 && (
                    <span className="text-xs text-muted-foreground">v{sub.version}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload chapter button */}
        {project.titleStatus === TITLE_STATUSES.APPROVED && (
          <div className="mt-4">
            <Button onClick={() => navigate('/project/submissions/upload')} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Chapter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────── Next Step Guidance Card ────────── */

/**
 * Determines the current workflow step and returns contextual guidance.
 */
function getNextStep(project, submissions) {
  if (!project) return null;

  const { titleStatus } = project;

  // Step 1: Title workflow
  if (titleStatus === TITLE_STATUSES.DRAFT) {
    return {
      title: 'Submit Your Title',
      description: 'Your project title is still in draft. Edit it and submit it for instructor approval to proceed.',
      action: null, // actions are in TitleActionsSection
      icon: Edit3,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }

  if (titleStatus === TITLE_STATUSES.SUBMITTED) {
    return {
      title: 'Awaiting Title Review',
      description: 'Your title is under review by the instructor. You\'ll be notified once a decision is made.',
      action: null,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
    return {
      title: 'Revise Your Title',
      description: 'The instructor requested changes on your title. Revise and resubmit below.',
      action: null,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION) {
    return {
      title: 'Title Modification Pending',
      description: 'Your title change request is pending instructor approval.',
      action: null,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }

  // Title is approved — now check chapter progress
  if (titleStatus === TITLE_STATUSES.APPROVED) {
    // Gather chapter statuses
    const chapterMap = {};
    if (submissions?.submissions) {
      for (const sub of submissions.submissions) {
        const existing = chapterMap[sub.chapter];
        if (!existing || new Date(sub.uploadedAt) > new Date(existing.uploadedAt)) {
          chapterMap[sub.chapter] = sub;
        }
      }
    }

    // Check if any chapter needs revision
    for (let ch = 1; ch <= 3; ch++) {
      const sub = chapterMap[ch];
      if (sub?.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
        return {
          title: `Revise ${CHAPTER_LABELS[ch]}`,
          description: `Your adviser requested revisions on ${CHAPTER_LABELS[ch]}. Upload a new version.`,
          action: { label: 'Upload Revision', path: '/project/submissions/upload' },
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
    }

    // Check if chapters 1-3 are done (locked or approved)
    const allChaptersReady = [1, 2, 3].every((ch) => {
      const sub = chapterMap[ch];
      return sub && (sub.status === SUBMISSION_STATUSES.LOCKED || sub.status === SUBMISSION_STATUSES.APPROVED);
    });

    if (allChaptersReady) {
      // Check if proposal has been compiled
      const hasProposal = submissions?.submissions?.some((s) => s.type === 'proposal');
      if (!hasProposal) {
        return {
          title: 'Compile Your Proposal',
          description: 'All chapters 1–3 are approved/locked. Compile and submit your full proposal.',
          action: { label: 'Compile Proposal', path: '/project/proposal' },
          icon: BookOpen,
          color: 'text-green-600 dark:text-green-400',
        };
      }
      return {
        title: 'Proposal Submitted',
        description: 'Your full proposal has been compiled. Await adviser and panelist review.',
        action: { label: 'View Submissions', path: '/project/submissions' },
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
      };
    }

    // Find next chapter to upload
    for (let ch = 1; ch <= 3; ch++) {
      const sub = chapterMap[ch];
      if (!sub) {
        return {
          title: `Upload ${CHAPTER_LABELS[ch]}`,
          description: `Start by uploading your ${CHAPTER_LABELS[ch]} draft for adviser review.`,
          action: { label: `Upload ${CHAPTER_LABELS[ch]}`, path: '/project/submissions/upload' },
          icon: Upload,
          color: 'text-blue-600 dark:text-blue-400',
        };
      }
      if (sub.status === SUBMISSION_STATUSES.PENDING || sub.status === SUBMISSION_STATUSES.UNDER_REVIEW) {
        return {
          title: `${CHAPTER_LABELS[ch]} Under Review`,
          description: `Your ${CHAPTER_LABELS[ch]} is being reviewed. Wait for adviser feedback.`,
          action: { label: 'View Submissions', path: '/project/submissions' },
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
    }
  }

  return null;
}

function NextStepCard({ project, submissions }) {
  const navigate = useNavigate();
  const step = getNextStep(project, submissions);

  if (!step) return null;

  const IconComponent = step.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-4 pt-6">
        <div className={`mt-0.5 ${step.color}`}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        {step.action && (
          <Button size="sm" onClick={() => navigate(step.action.path)}>
            {step.action.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────── Main Page ────────── */

export default function MyProjectPage() {
  const { user, fetchUser } = useAuthStore();
  const { data: project, isLoading, error } = useMyProject();

  // Fetch submissions when a project exists (used by ChapterProgressSection & NextStepCard)
  const { data: submissions } = useProjectSubmissions(
    project?._id,
    { limit: 50 },
    { enabled: !!project?._id },
  );

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">My Project</h3>
          <p className="text-muted-foreground">
            Track your capstone project progress and manage your submissions.
          </p>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && !isLoading && error.response?.status === 404 && <EmptyProjectState />}

        {error && !isLoading && error.response?.status !== 404 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load project'}
            </AlertDescription>
          </Alert>
        )}

        {project && !isLoading && project.projectStatus === PROJECT_STATUSES.REJECTED && (
          <RejectedProjectState project={project} />
        )}

        {project && !isLoading && project.projectStatus !== PROJECT_STATUSES.REJECTED && (
          <>
            {/* Workflow phase stepper — always visible at top */}
            <WorkflowPhaseTracker project={project} />

            {/* Contextual next-step guidance card */}
            <NextStepCard project={project} submissions={submissions} />

            {/* Deadline warnings — compact inline alert for urgent deadlines */}
            {project.deadlines && (
              <DeadlineWarning deadlines={project.deadlines} compact />
            )}

            {/* Project info & title management */}
            <ProjectInfoCard project={project} />
            <TitleActionsSection project={project} />

            {/* Chapter progress — visible once title is approved */}
            {project.titleStatus === TITLE_STATUSES.APPROVED && (
              <ChapterProgressSection project={project} submissions={submissions} />
            )}

            {/* Full deadline overview — visible once title is approved and deadlines exist */}
            {project.titleStatus === TITLE_STATUSES.APPROVED && project.deadlines && (
              <DeadlineWarning deadlines={project.deadlines} />
            )}

            {/* Prototype showcasing — visible from Capstone 2 onwards */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_2 && (
              <>
                <PrototypeUploadForm projectId={project._id} />
                <PrototypeGallery projectId={project._id} canDelete />
              </>
            )}

            {/* Evaluation panel — proposal defense */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_1 && (
              <EvaluationPanel projectId={project._id} defenseType="proposal" />
            )}

            {/* Evaluation panel — final defense (Capstone 4) */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 && (
              <EvaluationPanel projectId={project._id} defenseType="final" />
            )}

            {/* Final paper upload — Capstone 4 */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 && (
              <FinalPaperUpload projectId={project._id} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
