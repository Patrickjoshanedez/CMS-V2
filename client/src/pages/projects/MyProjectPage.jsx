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
import {
  useMyProject,
  useUpdateTitle,
  useSubmitTitle,
  useReviseAndResubmit,
  useRequestTitleModification,
} from '@/hooks/useProjects';
import { TITLE_STATUSES } from '@cms/shared';
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
  Plus,
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

/* ────────── Main Page ────────── */

export default function MyProjectPage() {
  const { user, fetchUser } = useAuthStore();
  const { data: project, isLoading, error } = useMyProject();

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
            Track your capstone project progress and manage your title.
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

        {project && !isLoading && (
          <>
            <ProjectInfoCard project={project} />
            <TitleActionsSection project={project} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
