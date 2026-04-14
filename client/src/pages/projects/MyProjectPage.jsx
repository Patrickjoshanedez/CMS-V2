import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import PrototypeUploadForm from '@/components/projects/PrototypeUploadForm';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProposalTab from '@/components/projects/ProposalTab';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import ChapterProgressWithRounds from '@/components/submissions/ChapterProgressWithRounds';
import {
  useMyProject,
  useUpdateTitle,
  useReviseAndResubmit,
  useRequestTitleModification,
} from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { WORKFLOW_TABS, resolveActiveWorkflowTab } from './myProjectTabs';
import {
  TITLE_STATUSES,
  CAPSTONE_PHASES,
  DOCUMENT_TYPES,
  SUBMISSION_STATUSES,
  PROJECT_STATUSES,
} from '@cms/shared';
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
  ArrowRight,
  BookOpen,
  Lock,
  Info,
  ExternalLink,
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

function EmptyProjectState({ team }) {
  const navigate = useNavigate();
  const hasLockedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No project yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create a new project to start your capstone journey.
        </p>

        {!hasLockedTeam ? (
          <div className="mt-6 space-y-4 max-w-md">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Finalize and lock your team first before creating a project.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/dashboard')}>
              <Users className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <Button className="mt-6" onClick={() => navigate('/project/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>
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
          Your project <span className="font-semibold">&ldquo;{project.title}&rdquo;</span> has been
          rejected.
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
  const capstoneRaw = project.capstoneType || project.projectType;
  const capstoneTypeOrPhase = Array.isArray(capstoneRaw)
    ? capstoneRaw.join(', ')
    : capstoneRaw || `Capstone ${project.capstonePhase}`;

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
            <p className="text-sm font-medium text-muted-foreground">Overview</p>
            <p className="mt-1 text-sm">{project.abstract}</p>
          </div>
        )}

        {/* SDG tags */}
        {project.sdgTags?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">SDG Tags</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {project.sdgTags.map((tag, idx) => (
                <Badge key={`${tag}-${idx}`} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
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
            <span>Capstone Type/Phase: {capstoneTypeOrPhase}</span>
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

        {(project.teamId?.googleDocUrl || project.teamId?.githubUrl) && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {project.teamId?.googleDocUrl ? (
              <Button type="button" variant="secondary" size="sm" asChild>
                <a href={project.teamId.googleDocUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Team Google Doc
                </a>
              </Button>
            ) : null}
            {project.teamId?.githubUrl ? (
              <Button type="button" variant="secondary" size="sm" asChild>
                <a href={project.teamId.githubUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Team GitHub
                </a>
              </Button>
            ) : null}
          </div>
        )}

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

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title Actions</CardTitle>
          <CardDescription>
            Your title is in draft. Edit your project details below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Details
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

function PanelistsPendingCard() {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
      <CardContent className="flex items-start gap-3 pt-6">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">Title Approved</p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            Your title has been approved. Waiting for the instructor to assign panelists before you
            can proceed to Capstone 1.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TitlePendingCard — shows workflow status when title is not yet approved.
 * Displays different messages based on title status:
 * - DRAFT: "Submit your title for review"
 * - SUBMITTED: "Your title is under review. Please wait for approval."
 * - REVISION_REQUIRED: "Your title needs revision. Please address the feedback."
 */
function TitlePendingCard({ titleStatus }) {
  const configs = {
    [TITLE_STATUSES.DRAFT]: {
      icon: Edit3,
      title: 'Submit Your Title for Review',
      description:
        'Your project title is currently in draft. Edit your title details and submit it for instructor approval to unlock the chapter submission workflow.',
      bgClass: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
      textClass: 'text-blue-800 dark:text-blue-200',
      descClass: 'text-blue-700 dark:text-blue-300',
    },
    [TITLE_STATUSES.SUBMITTED]: {
      icon: Clock,
      title: 'Title Under Review',
      description:
        "Your title has been submitted and is awaiting instructor approval. You'll be notified once a decision is made. Chapter submissions will unlock after approval.",
      bgClass: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-800 dark:text-amber-200',
      descClass: 'text-amber-700 dark:text-amber-300',
    },
    [TITLE_STATUSES.REVISION_REQUIRED]: {
      icon: AlertTriangle,
      title: 'Title Revision Required',
      description:
        'The instructor has requested changes to your title. Please address the feedback and resubmit your revised title below.',
      bgClass: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
      iconClass: 'text-orange-600 dark:text-orange-400',
      textClass: 'text-orange-800 dark:text-orange-200',
      descClass: 'text-orange-700 dark:text-orange-300',
    },
    [TITLE_STATUSES.PENDING_MODIFICATION]: {
      icon: Clock,
      title: 'Modification Request Pending',
      description:
        'Your title modification request is being reviewed by the instructor. Please wait for approval.',
      bgClass: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-800 dark:text-amber-200',
      descClass: 'text-amber-700 dark:text-amber-300',
    },
  };

  const config = configs[titleStatus];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Card className={config.bgClass}>
      <CardContent className="flex items-start gap-3 pt-6">
        <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} />
        <div className="space-y-2">
          <p className={`text-sm font-semibold ${config.textClass}`}>{config.title}</p>
          <p className={`text-sm ${config.descClass}`}>{config.description}</p>
          {titleStatus !== TITLE_STATUSES.APPROVED && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-white/60 dark:bg-black/20 px-3 py-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Chapter submissions are locked until your title is approved.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * WorkflowPrerequisiteBanner — prominent banner explaining the workflow
 * until the title is approved.
 */
function WorkflowPrerequisiteBanner({ titleStatus }) {
  if (titleStatus === TITLE_STATUSES.APPROVED) return null;

  const getStep = () => {
    if (titleStatus === TITLE_STATUSES.DRAFT) return 1;
    if (titleStatus === TITLE_STATUSES.SUBMITTED) return 2;
    if (titleStatus === TITLE_STATUSES.REVISION_REQUIRED) return 1;
    return 1;
  };

  const currentStep = getStep();

  const steps = [
    {
      num: 1,
      label: 'Submit Title',
      completed:
        titleStatus !== TITLE_STATUSES.DRAFT && titleStatus !== TITLE_STATUSES.REVISION_REQUIRED,
    },
    { num: 2, label: 'Get Approved', completed: titleStatus === TITLE_STATUSES.APPROVED },
  ];

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-primary">Complete These Steps to Unlock Chapters</h4>
        </div>
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : currentStep === step.num
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    step.completed
                      ? 'text-green-600 dark:text-green-400'
                      : currentStep === step.num
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-16 sm:w-24 ${
                    step.completed ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
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
      description:
        'Your project title is still in draft. Edit it and submit it for instructor approval to proceed.',
      action: null, // actions are in TitleActionsSection
      icon: Edit3,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }

  if (titleStatus === TITLE_STATUSES.SUBMITTED) {
    return {
      title: 'Awaiting Title Review',
      description:
        "Your title is under review by the instructor. You'll be notified once a decision is made.",
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
          action: {
            label: 'Upload Revision',
            path: `/project/submissions/upload?chapter=${ch}`,
          },
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
    }

    // Check if chapters 1-3 are done (locked or approved)
    const allChaptersReady = [1, 2, 3].every((ch) => {
      const sub = chapterMap[ch];
      return (
        sub &&
        [
          SUBMISSION_STATUSES.LOCKED,
          SUBMISSION_STATUSES.APPROVED,
          SUBMISSION_STATUSES.ACCEPTED,
        ].includes(sub.status)
      );
    });

    if (allChaptersReady) {
      const hasProposal = submissions?.submissions?.some((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
      if (!hasProposal) {
        return {
          title: 'Compile Your Proposal',
          description: 'All chapters 1–3 are approved or locked. Submit your compiled proposal.',
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
          action: {
            label: `Upload ${CHAPTER_LABELS[ch]}`,
            path: `/project/submissions/upload?chapter=${ch}`,
          },
          icon: Upload,
          color: 'text-blue-600 dark:text-blue-400',
        };
      }
      if (
        sub.status === SUBMISSION_STATUSES.PENDING ||
        sub.status === SUBMISSION_STATUSES.UNDER_REVIEW
      ) {
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
  const navigate = useNavigate();
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

  // Get the reason why a tab is locked
  const getLockedReason = (tabName) => {
    if (tabName === 'capstone_1') {
      if (!titleApproved) {
        return 'Your title must be approved before you can access Capstone 1.';
      }
    }
    if (tabName === 'capstone_2') {
      return 'Complete Capstone 1 to unlock Capstone 2.';
    }
    if (tabName === 'capstone_3') {
      return 'Complete Capstone 2 to unlock Capstone 3.';
    }
    if (tabName === 'final') {
      return 'Complete Capstone 3 to unlock Final Defense.';
    }
    return 'This tab is currently locked.';
  };

  // Handle clicks on locked tabs
  const handleLockedTabClick = (tabName) => {
    const reason = getLockedReason(tabName);
    toast.info(reason, {
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
          {project?._id &&
            project.projectStatus !== PROJECT_STATUSES.REJECTED &&
            !isArchivedProject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/documents/manuscripts?projectId=${project._id}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Documents Workspace
              </Button>
            )}
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
              <ProjectInfoCard project={project} />
            </>
          )}

        {project &&
          !isLoading &&
          !error &&
          project.projectStatus !== PROJECT_STATUSES.REJECTED &&
          !isArchivedProject && (
            <>
              {/* Phase stepper — always visible above tabs */}
              <WorkflowPhaseTracker project={project} />

              {/* Tabbed workflow */}
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="proposal">Proposal</TabsTrigger>
                  <TabsTrigger
                    value="capstone_1"
                    locked={!capstone1Unlocked}
                    lockedReason={getLockedReason('capstone_1')}
                    onLockedClick={() => handleLockedTabClick('capstone_1')}
                  >
                    Capstone 1
                  </TabsTrigger>
                  <TabsTrigger
                    value="capstone_2"
                    locked={!capstone2Unlocked}
                    lockedReason={getLockedReason('capstone_2')}
                    onLockedClick={() => handleLockedTabClick('capstone_2')}
                  >
                    Capstone 2
                  </TabsTrigger>
                  <TabsTrigger
                    value="capstone_3"
                    locked={!capstone3Unlocked}
                    lockedReason={getLockedReason('capstone_3')}
                    onLockedClick={() => handleLockedTabClick('capstone_3')}
                  >
                    Capstone 3
                  </TabsTrigger>
                  <TabsTrigger
                    value="final"
                    locked={!finalUnlocked}
                    lockedReason={getLockedReason('final')}
                    onLockedClick={() => handleLockedTabClick('final')}
                  >
                    Final Defense
                  </TabsTrigger>
                </TabsList>

                {/* ── Proposal Tab ── */}
                <TabsContent value="proposal">
                  {project.deadlines && <DeadlineWarning deadlines={project.deadlines} compact />}

                  {/* Show workflow prerequisite banner until title approval */}
                  {!titleApproved && <WorkflowPrerequisiteBanner titleStatus={titleStatus} />}

                  {/* Show TitlePendingCard for non-approved title states (placed above ProjectInfoCard) */}
                  {titleStatus && titleStatus !== TITLE_STATUSES.APPROVED && (
                    <TitlePendingCard titleStatus={titleStatus} />
                  )}

                  <ProjectInfoCard project={project} />
                  <TitleActionsSection project={project} />
                  <ProposalTab project={project} />

                  {/* Show PanelistsPendingCard when title approved but no panelists */}
                  {titleApproved && !hasPanelists && <PanelistsPendingCard />}
                </TabsContent>

                {/* ── Capstone 1 Tab ── */}
                <TabsContent value="capstone_1">
                  <NextStepCard project={project} submissions={submissions} />
                  <ChapterProgressWithRounds
                    project={project}
                    submissions={submissions}
                    chapters={[1, 2, 3]}
                    showUploadButton={titleApproved}
                  />
                  {project.deadlines && <DeadlineWarning deadlines={project.deadlines} />}
                  <EvaluationPanel projectId={project._id} defenseType="proposal" />
                </TabsContent>

                {/* ── Capstone 2 Tab ── */}
                <TabsContent value="capstone_2">
                  <PrototypeUploadForm projectId={project._id} />
                  <PrototypeGallery projectId={project._id} canDelete />
                  <EvaluationPanel projectId={project._id} defenseType="midterm" />
                </TabsContent>

                {/* ── Capstone 3 Tab ── */}
                <TabsContent value="capstone_3">
                  <ChapterProgressWithRounds
                    project={project}
                    submissions={submissions}
                    chapters={[4, 5]}
                    showUploadButton={titleApproved}
                  />
                  <EvaluationPanel projectId={project._id} defenseType="paper" />
                </TabsContent>

                {/* ── Final Defense Tab ── */}
                <TabsContent value="final">
                  <FinalPaperUpload projectId={project._id} />
                  <EvaluationPanel projectId={project._id} defenseType="final" />
                </TabsContent>
              </Tabs>
            </>
          )}
      </div>
    </DashboardLayout>
  );
}
