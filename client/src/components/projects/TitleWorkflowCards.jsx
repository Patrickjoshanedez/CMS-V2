import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { TITLE_STATUSES } from '@cms/shared';
import {
  useUpdateTitle,
  useSubmitTitle,
  useReviseAndResubmit,
  useRequestTitleModification,
} from '@/hooks/useProjects';
import { toast } from 'sonner';
import {
  Edit3,
  Send,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Info,
} from 'lucide-react';

/* ── EditTitleForm ── */
function EditTitleForm({ project }) {
  const updateTitle = useUpdateTitle({
    onSuccess: () => toast.success('Changes saved.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Failed to save.'),
  });
  const submitTitle = useSubmitTitle({
    onSuccess: () => toast.success('Title submitted for review.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to submit title for review.'),
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
          <Button
            variant="secondary"
            onClick={() => submitTitle.mutate(project._id)}
            disabled={submitTitle.isPending}
          >
            {submitTitle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Review
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

/* ── ReviseAndResubmitForm ── */
function ReviseAndResubmitForm({ project }) {
  const revise = useReviseAndResubmit({
    onSuccess: () => toast.success('Title resubmitted for review!'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Resubmission failed.'),
  });
  const [title, setTitle] = useState(project.title);
  const [abstract, setAbstract] = useState(project.abstract || '');

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
          <Button
            onClick={() =>
              revise.mutate({ projectId: project._id, title, abstract: abstract || undefined })
            }
            disabled={revise.isPending}
          >
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

/* ── RequestModificationForm ── */
function RequestModificationForm({ project }) {
  const requestMod = useRequestTitleModification({
    onSuccess: () => toast.success('Revision submitted for instructor review.'),
    onError: (err) => toast.error(err?.response?.data?.error?.message || 'Request failed.'),
  });
  const [proposedTitle, setProposedTitle] = useState(project.title || '');
  const [justification, setJustification] = useState('');

  const isRevisionRequired = project.titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION;

  return (
    <Card className={isRevisionRequired ? 'border-amber-400 dark:border-amber-600' : undefined}>
      <CardHeader>
        <CardTitle className="text-base">
          {isRevisionRequired ? 'Revision Required — Update Your Title' : 'Approved With Revision'}
        </CardTitle>
        <CardDescription>
          {isRevisionRequired
            ? 'The instructor has approved your project but requires a title change. Submit a revised title to unlock Capstone 1.'
            : 'Edit the approved title and submit your revision for instructor review.'}
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
          <Button
            onClick={() =>
              requestMod.mutate({ projectId: project._id, proposedTitle, justification })
            }
            disabled={requestMod.isPending}
          >
            {requestMod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Revision
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

/* ── PendingModificationCard ── */
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

/* ── SubmittedCard ── */
function SubmittedCard({ project }) {
  const proposalTitles = Array.isArray(project?.titleProposals)
    ? project.titleProposals.map((p) => (typeof p === 'string' ? p : p?.title)).filter(Boolean)
    : [];

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          Proposals Submitted Successfully
        </CardTitle>
        <CardDescription className="text-green-700 dark:text-green-300">
          Your team has a pending proposal. Waiting for panel and instructor feedback.
        </CardDescription>
      </CardHeader>
      {proposalTitles.length > 0 && (
        <CardContent className="pt-0">
          <div className="rounded-md border border-green-300/50 bg-white/60 dark:border-green-700/50 dark:bg-black/20 p-3 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
              Proposals Under Review
            </p>
            {proposalTitles.map((title, idx) => (
              <div key={`submitted-${idx}`} className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-green-800 dark:text-green-200">{title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ── PanelistsPendingCard ── */
export function PanelistsPendingCard() {
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

/* ── TitlePendingCard ── */
export function TitlePendingCard({ titleStatus }) {
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
      title: 'Pending Proposal',
      description: 'Your team has a pending proposal. Waiting for panel and instructor feedback.',
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
    [TITLE_STATUSES.APPROVED_WITH_REVISION]: {
      icon: AlertTriangle,
      title: 'Approved — Title Revision Required',
      description:
        'Your project concept is approved, but the instructor requires a title change before you can proceed to Capstone 1. Submit a proposed new title below.',
      bgClass: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-800 dark:text-amber-200',
      descClass: 'text-amber-700 dark:text-amber-300',
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

/* ── WorkflowPrerequisiteBanner ── */
export function WorkflowPrerequisiteBanner({ titleStatus }) {
  // Banner only shows when Capstone 1 is still locked
  if (titleStatus === TITLE_STATUSES.APPROVED) return null;

  const getStep = () => {
    if (titleStatus === TITLE_STATUSES.DRAFT) return 1;
    if (titleStatus === TITLE_STATUSES.SUBMITTED) return 2;
    if (titleStatus === TITLE_STATUSES.REVISION_REQUIRED) return 1;
    // APPROVED_WITH_REVISION and PENDING_MODIFICATION: submitted but not yet fully approved
    if (titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION) return 2;
    if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION) return 2;
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
        <div className="flex items-center gap-0 max-w-xs mx-auto">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
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
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
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
                  className={`mx-3 h-0.5 flex-1 min-w-[40px] rounded-full ${step.completed ? 'bg-green-500' : 'bg-border'}`}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── TitleActionsSection (router) ── */
export default function TitleActionsSection({ project }) {
  switch (project.titleStatus) {
    case TITLE_STATUSES.DRAFT:
      return <EditTitleForm project={project} />;
    case TITLE_STATUSES.SUBMITTED:
      return <SubmittedCard project={project} />;
    case TITLE_STATUSES.APPROVED:
    case TITLE_STATUSES.APPROVED_WITH_REVISION:
      return <RequestModificationForm project={project} />;
    case TITLE_STATUSES.REVISION_REQUIRED:
      return <ReviseAndResubmitForm project={project} />;
    case TITLE_STATUSES.PENDING_MODIFICATION:
      return <PendingModificationCard project={project} />;
    default:
      return null;
  }
}
