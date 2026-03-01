import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import {
  useProject,
  useApproveTitle,
  useRejectTitle,
  useResolveTitleModification,
  useAssignAdviser,
  useAssignPanelist,
  useRemovePanelist,
  useSetDeadlines,
  useRejectProject,
  useAdvancePhase,
} from '@/hooks/useProjects';
import { userService } from '@/services/authService';
import { useQuery } from '@tanstack/react-query';
import { TITLE_STATUSES, ROLES, CAPSTONE_PHASES } from '@cms/shared';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
  Clock,
  ShieldAlert,
  FileText,
  ArrowUpCircle,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * ProjectDetailPage — Faculty project detail view.
 *
 * Shows full project information and provides contextual admin actions:
 *   - Approve / Reject title  (when titleStatus is SUBMITTED)
 *   - Resolve modification request (when PENDING_MODIFICATION)
 *   - Assign adviser / panelists (instructor only)
 *   - Set deadlines (instructor / adviser)
 *   - Reject entire project (instructor only)
 */

/* ────────── Helpers ────────── */

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ────────── Sub-components ────────── */

/**
 * Reusable project info panel — title, badges, abstract, keywords, meta.
 */
function ProjectInfoPanel({ project }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">{project.title}</CardTitle>
            <CardDescription>
              {project.academicYear} · Capstone {project.capstonePhase}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TitleStatusBadge status={project.titleStatus} />
            <ProjectStatusBadge status={project.projectStatus} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abstract */}
        {project.abstract && (
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Abstract</p>
            <p className="text-sm leading-relaxed">{project.abstract}</p>
          </div>
        )}

        {/* Keywords */}
        {project.keywords?.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {project.keywords.map((kw, i) => (
                <Badge key={i} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Team:</span>
            <span className="font-medium">{project.teamId?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Adviser:</span>
            <span className="font-medium">
              {project.adviserId?.firstName
                ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                : 'Not assigned'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Panelists:</span>
            <span className="font-medium">{project.panelistIds?.length || 0} / 3</span>
          </div>
        </div>

        {/* Panelist names */}
        {project.panelistIds?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.panelistIds.map((p) => (
              <Badge key={p._id || p} variant="outline">
                {p.firstName ? `${p.firstName} ${p.lastName}` : p._id || p}
              </Badge>
            ))}
          </div>
        )}

        {/* Rejection reason */}
        {project.rejectionReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{project.rejectionReason}</AlertDescription>
          </Alert>
        )}

        {/* Modification request */}
        {project.titleModificationRequest?.proposedTitle && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
              Pending Title Modification Request
            </p>
            <p className="text-sm">
              <strong>Proposed:</strong> {project.titleModificationRequest.proposedTitle}
            </p>
            <p className="text-sm">
              <strong>Justification:</strong> {project.titleModificationRequest.justification}
            </p>
          </div>
        )}

        {/* Deadlines */}
        {project.deadlines && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Deadlines</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['chapter1', 'chapter2', 'chapter3', 'proposal', 'chapter4', 'chapter5', 'defense'].map((key) =>
                project.deadlines[key] ? (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{key.replace(/(\d)/, ' $1')}:</span>
                    <span className="font-medium">{formatDate(project.deadlines[key])}</span>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Approve / Reject title card — shown when titleStatus === SUBMITTED
 */
function TitleReviewCard({ project }) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const approve = useApproveTitle({
    onSuccess: () => toast.success('Title approved!'),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to approve title.'),
  });
  const reject = useRejectTitle({
    onSuccess: () => toast.success('Title rejected.'),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to reject title.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Title Review
        </CardTitle>
        <CardDescription>The team has submitted their title for approval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button onClick={() => approve.mutate(project._id)} disabled={approve.isPending}>
            {approve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Title
          </Button>
          <Button variant="destructive" onClick={() => setShowReject(!showReject)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject Title
          </Button>
        </div>

        {showReject && (
          <div className="space-y-3 rounded-lg border p-4">
            <Label htmlFor="rejectReason">Rejection Reason</Label>
            <Textarea
              id="rejectReason"
              placeholder="Explain why the title is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={!reason.trim() || reject.isPending}
              onClick={() => reject.mutate({ projectId: project._id, reason: reason.trim() })}
            >
              {reject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Resolve a pending title modification request card.
 */
function ModificationReviewCard({ project }) {
  const [reviewNote, setReviewNote] = useState('');

  const resolve = useResolveTitleModification({
    onSuccess: () => toast.success('Modification resolved.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to resolve modification.'),
  });

  const modReq = project.titleModificationRequest;
  if (!modReq?.proposedTitle) return null;

  const handleResolve = (decision) => {
    resolve.mutate({
      projectId: project._id,
      decision,
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          Title Modification Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <p>
            <strong>Current Title:</strong> {project.title}
          </p>
          <p>
            <strong>Proposed Title:</strong> {modReq.proposedTitle}
          </p>
          <p>
            <strong>Justification:</strong> {modReq.justification}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewNote">Review Note (optional)</Label>
          <Textarea
            id="reviewNote"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Add a note for the team…"
            rows={2}
          />
        </div>

        <div className="flex gap-3">
          <Button disabled={resolve.isPending} onClick={() => handleResolve('approved')}>
            {resolve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Modification
          </Button>
          <Button
            variant="destructive"
            disabled={resolve.isPending}
            onClick={() => handleResolve('denied')}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Deny Modification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Assign adviser card — instructor only.
 */
function AssignAdviserCard({ project }) {
  const [adviserId, setAdviserId] = useState('');

  // Fetch available advisers
  const { data: advisers = [] } = useQuery({
    queryKey: ['users', 'advisers'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'adviser' });
      return data.data?.users || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const assign = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned!');
      setAdviserId('');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Assign Adviser
        </CardTitle>
        <CardDescription>
          {project.adviserId
            ? `Currently: ${project.adviserId.firstName || ''} ${project.adviserId.lastName || ''}`.trim() ||
              'Assigned'
            : 'No adviser assigned yet.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="adviser">Select Adviser</Label>
            <select
              id="adviser"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={adviserId}
              onChange={(e) => setAdviserId(e.target.value)}
            >
              <option value="">Choose an adviser…</option>
              {advisers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={!adviserId || assign.isPending}
            onClick={() => assign.mutate({ projectId: project._id, adviserId })}
          >
            {assign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Manage panelists card — instructor only.
 */
function ManagePanelistsCard({ project }) {
  const [panelistId, setPanelistId] = useState('');

  // Fetch available panelists
  const { data: panelists = [] } = useQuery({
    queryKey: ['users', 'panelists'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'panelist' });
      return data.data?.users || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const assign = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist added!');
      setPanelistId('');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign panelist.'),
  });

  const remove = useRemovePanelist({
    onSuccess: () => toast.success('Panelist removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const currentPanelists = project.panelistIds || [];
  const assignedIds = new Set(currentPanelists.map((p) => p._id || p));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Panelists ({currentPanelists.length} / 3)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current panelists */}
        {currentPanelists.length > 0 && (
          <div className="space-y-2">
            {currentPanelists.map((p) => {
              const id = p._id || p;
              const name = p.firstName ? `${p.firstName} ${p.lastName}` : id;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ projectId: project._id, panelistId: id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add panelist */}
        {currentPanelists.length < 3 && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="panelist">Add Panelist</Label>
              <select
                id="panelist"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={panelistId}
                onChange={(e) => setPanelistId(e.target.value)}
              >
                <option value="">Choose a panelist…</option>
                {panelists
                  .filter((u) => !assignedIds.has(u._id))
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
              </select>
            </div>
            <Button
              disabled={!panelistId || assign.isPending}
              onClick={() => assign.mutate({ projectId: project._id, panelistId })}
            >
              {assign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Set deadlines card — instructor / adviser.
 */
function DeadlinesCard({ project }) {
  const [deadlines, setDeadlines] = useState({
    chapter1: project.deadlines?.chapter1?.split('T')[0] || '',
    chapter2: project.deadlines?.chapter2?.split('T')[0] || '',
    chapter3: project.deadlines?.chapter3?.split('T')[0] || '',
    proposal: project.deadlines?.proposal?.split('T')[0] || '',
    chapter4: project.deadlines?.chapter4?.split('T')[0] || '',
    chapter5: project.deadlines?.chapter5?.split('T')[0] || '',
    defense: project.deadlines?.defense?.split('T')[0] || '',
  });

  const setDl = useSetDeadlines({
    onSuccess: () => toast.success('Deadlines saved!'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to save deadlines.'),
  });

  const handleSave = () => {
    const payload = { projectId: project._id };
    Object.entries(deadlines).forEach(([key, val]) => {
      if (val) payload[key] = val;
    });
    setDl.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {['chapter1', 'chapter2', 'chapter3', 'proposal', 'chapter4', 'chapter5', 'defense'].map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`dl-${key}`} className="capitalize">
                {key.replace(/(\d)/, ' $1')}
              </Label>
              <Input
                id={`dl-${key}`}
                type="date"
                value={deadlines[key]}
                onChange={(e) => setDeadlines((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button disabled={setDl.isPending} onClick={handleSave}>
          {setDl.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          Save Deadlines
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Advance capstone phase card — instructor only.
 */
function AdvancePhaseCard({ project }) {
  const advance = useAdvancePhase({
    onSuccess: () => toast.success('Phase advanced!'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to advance phase.'),
  });

  const currentPhase = project.capstonePhase || CAPSTONE_PHASES.PHASE_1;
  const isMaxPhase = currentPhase >= CAPSTONE_PHASES.PHASE_4;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpCircle className="h-5 w-5" />
          Capstone Phase
        </CardTitle>
        <CardDescription>
          Currently in <strong>Capstone {currentPhase}</strong>.
          {isMaxPhase ? ' This project is at the final phase.' : ' Advance when the team is ready.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          disabled={isMaxPhase || advance.isPending}
          onClick={() => advance.mutate(project._id)}
        >
          {advance.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowUpCircle className="mr-2 h-4 w-4" />
          )}
          {isMaxPhase ? 'Final Phase Reached' : `Advance to Capstone ${currentPhase + 1}`}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Reject entire project card — instructor only, destructive action.
 */
function RejectProjectCard({ project }) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);

  const reject = useRejectProject({
    onSuccess: () => toast.success('Project rejected.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to reject project.'),
  });

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Reject Project
        </CardTitle>
        <CardDescription>
          This action marks the entire project as rejected. The team will need to create a new
          project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!confirm ? (
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject This Project…
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
            <Label htmlFor="projectRejectReason">Reason for Rejection</Label>
            <Textarea
              id="projectRejectReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for rejecting this project…"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={!reason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate({
                    projectId: project._id,
                    reason: reason.trim(),
                  })
                }
              >
                {reject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Rejection
              </Button>
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────── Main Page ────────── */

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: project, isLoading, error } = useProject(id);

  const isInstructor = user?.role === ROLES.INSTRUCTOR;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load project'}
            </AlertDescription>
          </Alert>
        )}

        {/* Project content */}
        {project && (
          <>
            {/* Info panel */}
            <ProjectInfoPanel project={project} />

            {/* Title review — only when submitted */}
            {project.titleStatus === TITLE_STATUSES.SUBMITTED && isInstructor && (
              <TitleReviewCard project={project} />
            )}

            {/* Modification review — only when pending */}
            {project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION && isInstructor && (
              <ModificationReviewCard project={project} />
            )}

            {/* Assign adviser — instructor only */}
            {isInstructor && <AssignAdviserCard project={project} />}

            {/* Panelists — instructor only */}
            {isInstructor && <ManagePanelistsCard project={project} />}

            {/* Deadlines — instructor or adviser */}
            {(isInstructor || user?.role === ROLES.ADVISER) && <DeadlinesCard project={project} />}

            {/* Advance phase — instructor only */}
            {isInstructor && project.projectStatus !== 'rejected' && (
              <AdvancePhaseCard project={project} />
            )}

            {/* Prototype showcase — visible to all faculty */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_2 && (
              <PrototypeGallery projectId={project._id} canDelete={false} />
            )}

            {/* Evaluation panels — proposal defense */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_1 && (
              <EvaluationPanel projectId={project._id} defenseType="proposal" />
            )}

            {/* Evaluation panels — final defense (Capstone 4) */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 && (
              <EvaluationPanel projectId={project._id} defenseType="final" />
            )}

            {/* Final paper upload — Capstone 4 */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 &&
              (user?.role === ROLES.STUDENT || isInstructor) && (
                <FinalPaperUpload projectId={project._id} />
              )}

            {/* Certificate link — Capstone 4 */}
            {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Completion Certificate
                  </CardTitle>
                  <CardDescription>
                    View or manage the completion certificate for this project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/projects/${project._id}/certificate`)}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Go to Certificate
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reject project — instructor only */}
            {isInstructor && project.projectStatus !== 'rejected' && (
              <RejectProjectCard project={project} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
