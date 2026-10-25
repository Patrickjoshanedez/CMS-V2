import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
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
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Info,
  Eye,
  ArrowRight,
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
          <CardTitle className="text-base">Title Editor</CardTitle>
          <CardDescription>
            Your title is in draft. Edit your project details below before submitting for review.
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setKeywordList((prev) => prev.filter((k) => k !== kw))}
                    aria-label={`Remove keyword ${kw}`}
                    className="size-6 min-h-6 min-w-6 rounded-full p-0 hover:bg-primary/20"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </Button>
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
            {submitTitle.isPending && <Spinner className="mr-2 h-4 w-4" />}
            Submit for Review
          </Button>
          <Button onClick={handleSave} disabled={updateTitle.isPending}>
            {updateTitle.isPending && <Spinner className="mr-2 h-4 w-4" />}
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
    <Card className="border-warning/30 bg-warning/5">
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
              <Spinner className="mr-2 h-4 w-4" />
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
    <Card
      className={isRevisionRequired ? 'border-warning/40 bg-warning/5' : 'border-border/60 bg-card'}
    >
      <CardHeader>
        <CardTitle className="text-base">
          {isRevisionRequired
            ? 'Revision Required — Update Your Title'
            : 'Request Title Modification'}
        </CardTitle>
        <CardDescription>
          {isRevisionRequired
            ? 'The instructor has approved your project concept but requires an updated title before proceeding. Submit your revised title for instructor review.'
            : 'If your project direction has evolved, propose a modified title and justification for committee review.'}
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
            {requestMod.isPending && <Spinner className="mr-2 h-4 w-4" />}
            {isRevisionRequired ? 'Submit Revised Title' : 'Submit Modification Request'}
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

/* ── ApprovedTitleCard ── */
function ApprovedTitleCard({ project }) {
  const [showModificationForm, setShowModificationForm] = useState(false);

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success shrink-0" />
            <CardTitle className="text-base text-success-foreground">
              Title Formally Approved
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModificationForm((prev) => !prev)}
            className="text-xs border-success/30 text-success-foreground hover:bg-success/10"
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
            {showModificationForm ? 'Hide Modification Form' : 'Request Title Modification'}
          </Button>
        </div>
        <CardDescription className="text-success-foreground/90">
          Your proposed capstone title has been formally ratified by your defense committee and
          instructor.
        </CardDescription>
      </CardHeader>
      {showModificationForm && (
        <CardContent className="mt-2 border-t border-success/20 pt-2">
          <RequestModificationForm project={project} />
        </CardContent>
      )}
    </Card>
  );
}

/* ── PendingModificationCard ── */
function PendingModificationCard({ project }) {
  const mod = project.titleModificationRequest;
  return (
    <Card className="border-warning/30 bg-warning/5">
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
function SubmittedCard({ project, onSelectProposal }) {
  const navigate = useNavigate();
  const proposalTitles = Array.isArray(project?.titleProposals)
    ? project.titleProposals.map((p) => (typeof p === 'string' ? p : p?.title)).filter(Boolean)
    : [];

  return (
    <Card className="border-success/30 bg-success/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success shrink-0" />
            <CardTitle className="text-base text-success-foreground">
              Proposals Submitted Successfully
            </CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/project/approval')}
            variant="outline"
            className="gap-1.5 text-xs border-success/30 text-success-foreground hover:bg-success/10"
          >
            <Eye className="h-3.5 w-3.5" />
            Reveal Titles & Defense Blueprint
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardDescription className="text-success-foreground/90 text-xs">
          Your candidate capstone titles have been submitted. Deliberation and defense evaluation by
          the committee is in progress.
        </CardDescription>
      </CardHeader>
      {proposalTitles.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2.5 rounded-lg border border-success/20 bg-background/60 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-success-foreground">
              Candidate Proposals Under Review ({proposalTitles.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {proposalTitles.map((title, idx) => (
                <Button
                  key={`submitted-${idx}`}
                  type="button"
                  onClick={() => onSelectProposal?.(idx)}
                  aria-label={`Proposal ${idx + 1}: ${title}`}
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-11 max-w-full justify-start gap-2 border-success/25 px-3.5 py-2 text-left text-xs font-medium shadow-none"
                >
                  <Badge
                    variant="success"
                    className="size-5 shrink-0 justify-center rounded-full p-0 text-[10px]"
                  >
                    {idx + 1}
                  </Badge>
                  <span
                    className="font-semibold truncate max-w-[200px] sm:max-w-[280px]"
                    title={title}
                  >
                    {title}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ── PanelistsPendingCard ── */
export function PanelistsPendingCard() {
  return (
    <Card className="border-success/30 bg-success/10">
      <CardContent className="flex items-start gap-3 pt-6">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-semibold text-success-foreground">Title Approved</p>
          <p className="mt-1 text-sm text-success-foreground/90">
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
  const navigate = useNavigate();
  const configs = {
    [TITLE_STATUSES.DRAFT]: {
      icon: Edit3,
      title: 'Submit Your Title for Review',
      description:
        'Your project title is currently in draft. Edit your title details and submit it for instructor approval to unlock the chapter submission workflow.',
      bgClass: 'border-info/30 bg-info/5',
      iconClass: 'text-info',
      textClass: 'text-info-foreground',
      descClass: 'text-info-foreground/90',
    },
    [TITLE_STATUSES.SUBMITTED]: {
      icon: Clock,
      title: 'Pending Proposal',
      description: 'Your team has a pending proposal. Waiting for panel and instructor feedback.',
      bgClass: 'border-warning/30 bg-warning/5',
      iconClass: 'text-warning-foreground',
      textClass: 'text-warning-foreground',
      descClass: 'text-warning-foreground/90',
    },
    [TITLE_STATUSES.REVISION_REQUIRED]: {
      icon: AlertTriangle,
      title: 'Title Revision Required',
      description:
        'The instructor has requested changes to your title. Please address the feedback and resubmit your revised title below.',
      bgClass: 'border-destructive/30 bg-destructive/5',
      iconClass: 'text-destructive-text',
      textClass: 'text-destructive-text',
      descClass: 'text-destructive-text/90',
    },
    [TITLE_STATUSES.APPROVED_WITH_REVISION]: {
      icon: AlertTriangle,
      title: 'Approved — Title Revision Required',
      description:
        'Your project concept is approved, but the instructor requires a title change before you can proceed to Capstone 1. Submit a proposed new title below.',
      bgClass: 'border-warning/30 bg-warning/5',
      iconClass: 'text-warning-foreground',
      textClass: 'text-warning-foreground',
      descClass: 'text-warning-foreground/90',
    },
    [TITLE_STATUSES.PENDING_MODIFICATION]: {
      icon: Clock,
      title: 'Modification Request Pending',
      description:
        'Your title modification request is being reviewed by the instructor. Please wait for approval.',
      bgClass: 'border-warning/30 bg-warning/5',
      iconClass: 'text-warning-foreground',
      textClass: 'text-warning-foreground',
      descClass: 'text-warning-foreground/90',
    },
  };

  const config = configs[titleStatus];
  if (!config) return null;
  const IconComponent = config.icon;

  return (
    <Card className={config.bgClass}>
      <CardContent className="flex items-start gap-3 pt-6">
        <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} />
        <div className="space-y-2 flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.textClass}`}>{config.title}</p>
          <p className={`text-sm ${config.descClass}`}>{config.description}</p>
          {titleStatus !== TITLE_STATUSES.APPROVED && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 p-2.5">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Chapter submissions are locked until your title is approved.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/project/approval')}
                className="gap-1.5 text-xs h-7 border-border/80 bg-background/80 hover:bg-background shrink-0 font-medium"
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                Open Title Approval Studio
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
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
        <div className="mb-4 flex items-center gap-2">
          <Info aria-hidden="true" className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-primary">Complete These Steps to Unlock Chapters</h4>
        </div>
        <div className="flex items-center gap-0 max-w-xs mx-auto">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    step.completed
                      ? 'bg-success text-success-foreground'
                      : currentStep === step.num
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    step.completed
                      ? 'text-success-foreground'
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
                  className={`mx-3 h-0.5 flex-1 min-w-[40px] rounded-full ${step.completed ? 'bg-success' : 'bg-border'}`}
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
export default function TitleActionsSection({ project, onSelectProposal }) {
  switch (project.titleStatus) {
    case TITLE_STATUSES.DRAFT:
      return <EditTitleForm project={project} />;
    case TITLE_STATUSES.SUBMITTED:
      return <SubmittedCard project={project} onSelectProposal={onSelectProposal} />;
    case TITLE_STATUSES.APPROVED:
      return <ApprovedTitleCard project={project} />;
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
