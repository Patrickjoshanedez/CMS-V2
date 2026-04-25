import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useQuery } from '@tanstack/react-query';
import {
  useProject,
  useAddTitleComment,
  useApproveTitle,
  useRejectTitle,
  useAssignAdviser,
  useAssignPanelist,
  useRemovePanelist,
  useResolveTitleModification,
} from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { userService } from '@/services/authService';
import { TITLE_STATUSES, ROLES } from '@cms/shared';
import { toast } from 'sonner';
import {
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  History,
  Award,
  BookOpen,
  Loader2,
  Settings,
  ShieldAlert,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';

// Extracted reusable components
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';

import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProjectAuditTrail from '@/components/projects/ProjectAuditTrail';
import Capstone2SupportingDocs from '@/components/submissions/Capstone2SupportingDocs';

/* ────────── Helpers ────────── */

function getFullName(person) {
  if (!person) return null;
  if (typeof person === 'string') return person;
  const parts = [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .map((part) => String(part).trim());
  return parts.length ? parts.join(' ') : person.email || null;
}

function getProjectAuthors(project) {
  const assignmentAuthors = (project?.memberRoleAssignments || [])
    .map((assignment) => assignment?.userId)
    .map(getFullName)
    .filter(Boolean);
  if (assignmentAuthors.length > 0) return assignmentAuthors;
  const teamName = project?.teamId?.name;
  return teamName ? [teamName] : [];
}

function parseProposalMetadata(metadata, abstract) {
  return {
    problemStatement: metadata?.description || abstract || 'Problem statement not provided.',
    proposedSolution:
      'Detailed solution architecture and approach will be evaluated during defense.',
    uniqueInnovation: 'Key innovations and contributions to the field.',
    targetBeneficiaries: 'Primary users and stakeholders impacted by this research.',
  };
}

/* ────────── Sub-components ────────── */

function FacultyWidget({ project, canManage }) {
  const [adviserId, setAdviserId] = useState('');
  const [panelistQuery, setPanelistQuery] = useState('');
  const [debouncedPanelistQuery, setDebouncedPanelistQuery] = useState('');
  const [showPanelistResults, setShowPanelistResults] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPanelistQuery(panelistQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [panelistQuery]);

  const { data: advisers = [] } = useQuery({
    queryKey: ['users', 'advisers'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'adviser' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPanelists = [] } = useQuery({
    queryKey: ['users', 'panelists'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'panelist' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned!');
      setAdviserId('');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist assigned!');
      setPanelistQuery('');
      setDebouncedPanelistQuery('');
      setShowPanelistResults(false);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => toast.success('Panelist removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const authors = getProjectAuthors(project);
  const currentAdviser = project.adviserId ? getFullName(project.adviserId) : 'Not assigned';
  const currentPanelists = project.panelistIds || [];
  const assignedIds = new Set(currentPanelists.map((p) => p._id || p));

  // Filter panelists by search query and exclude already-assigned
  const filteredPanelists = allPanelists.filter((u) => {
    if (assignedIds.has(u._id)) return false;
    if (!debouncedPanelistQuery) return true;
    const q = debouncedPanelistQuery.toLowerCase();
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return name.includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Users className="h-4 w-4 text-blue-500" />
          Faculty Committee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Authors
          </p>
          <div className="flex flex-wrap gap-2">
            {authors.length > 0 ? (
              authors.map((author, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-secondary text-secondary-foreground border-none"
                >
                  {author}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No authors assigned</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Adviser
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-card-foreground font-medium">{currentAdviser}</span>
          </div>
          {canManage && (
            <div className="mt-3 flex items-center gap-2">
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
              >
                <option value="">Assign new adviser...</option>
                {advisers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!adviserId || assignAdviser.isPending}
                onClick={() => assignAdviser.mutate({ projectId: project._id, adviserId })}
              >
                {assignAdviser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Panelists ({currentPanelists.length}/3)
          </p>
          <div className="space-y-2">
            {currentPanelists.length > 0 ? (
              currentPanelists.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm text-card-foreground bg-muted p-2 rounded-md group"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {getFullName(p)}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={() => removePanelist.mutate({ projectId: project._id, panelistId: p._id || p })}
                      disabled={removePanelist.isPending}
                      title="Remove panelist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No panelists assigned</p>
            )}
          </div>

          {/* Searchable panelist assignment dropdown */}
          {canManage && currentPanelists.length < 3 && (
            <div className="mt-3 relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search panelist by name or email..."
                  className="pl-8 h-9 text-sm"
                  value={panelistQuery}
                  onChange={(e) => {
                    setPanelistQuery(e.target.value);
                    setShowPanelistResults(true);
                  }}
                  onFocus={() => setShowPanelistResults(true)}
                  onBlur={() => window.setTimeout(() => setShowPanelistResults(false), 150)}
                  autoComplete="off"
                />
              </div>
              {showPanelistResults && panelistQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-10 z-30 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {filteredPanelists.length > 0 ? (
                    <ul className="py-1">
                      {filteredPanelists.map((u) => (
                        <li key={u._id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              assignPanelist.mutate({ projectId: project._id, panelistId: u._id });
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {u.firstName} {u.lastName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {u.email}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No matching panelists found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectContextWidget({ project }) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          Project Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Academic Year</span>
          <span className="font-medium text-card-foreground">
            {project.academicYear || '\u2014'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Phase</span>
          <Badge
            variant="outline"
            className="border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-500/10"
          >
            {project.titleStatus !== TITLE_STATUSES.APPROVED
              ? 'Proposal'
              : `Capstone ${project.capstonePhase || 1}`}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-muted-foreground">Program / Department</span>
          <span className="font-medium text-card-foreground">
            {project.courseId?.name || 'Not specified'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveProposalView({ project, proposal, index, canVote }) {
  const [vote, setVote] = useState('');
  const [remarks, setRemarks] = useState('');

  const commentMutation = useAddTitleComment();
  const approveMutation = useApproveTitle();
  const rejectMutation = useRejectTitle();

  const isSubmitting =
    commentMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  const metadata = project.titleProposalMetadata?.find((m) => m.title === proposal.title);
  const content = parseProposalMetadata(metadata, project.abstract);

  const handleSubmitVote = async () => {
    if (!vote) {
      toast.error('Please select a decision (Approve, Revision, or Reject).');
      return;
    }
    try {
      if (remarks.trim()) {
        await commentMutation.mutateAsync({
          projectId: project._id,
          proposalId: String(index),
          text: `Vote: ${vote}\nRemarks: ${remarks.trim()}`,
        });
      }
      if (vote === 'Approve') {
        if (window.confirm('Set this proposal as the officially approved title?')) {
          await approveMutation.mutateAsync({ projectId: project._id, proposalId: index });
          toast.success('Title has been officially approved!');
        }
      } else if (vote === 'Revision') {
        // "Approved With Revision" — project advances but Capstone 1 stays locked
        // until the team submits a revised title and the instructor accepts it.
        if (
          window.confirm(
            'Approve with revision? The project will advance but Capstone 1 stays locked until the team submits a revised title.',
          )
        ) {
          await approveMutation.mutateAsync({
            projectId: project._id,
            proposalId: index,
            approveWithRevision: true,
          });
          toast.success('Title approved with revision. Team must update the title to proceed.');
        }
      } else if (vote === 'Reject') {
        await rejectMutation.mutateAsync({
          projectId: project._id,
          reason: `Decision: ${vote}. ${remarks.trim()}`,
        });
        toast.success('Title sent back for revision.');
      }
    } catch {
      toast.error('An error occurred while submitting the decision.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-6 text-card-foreground">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 border-b border-border pb-2">
            Problem Statement
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.problemStatement}
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 border-b border-border pb-2">
            Proposed Solution
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.proposedSolution}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
              Unique Innovation
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {content.uniqueInnovation}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-amber-600 dark:text-amber-400">
              Target Beneficiaries
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {content.targetBeneficiaries}
            </p>
          </div>
        </div>
      </div>

      {canVote && project.titleStatus === TITLE_STATUSES.SUBMITTED && (
        <Card className="rounded-xl border-border bg-muted/50 p-5 mt-8 shadow-inner">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" /> Cast Your Vote
            </h4>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className={`flex-1 rounded-lg border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-300 ${vote === 'Approve' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500' : 'text-muted-foreground bg-card'}`}
                onClick={() => setVote('Approve')}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                className={`flex-1 rounded-lg border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-300 ${vote === 'Revision' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-2 ring-amber-500' : 'text-muted-foreground bg-card'}`}
                onClick={() => setVote('Revision')}
              >
                <Settings className="mr-2 h-4 w-4" /> Revision
              </Button>
              <Button
                variant="outline"
                className={`flex-1 rounded-lg border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-300 ${vote === 'Reject' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 ring-2 ring-rose-500' : 'text-muted-foreground bg-card'}`}
                onClick={() => setVote('Reject')}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </div>
            <Textarea
              placeholder="Enter your remarks and feedback here (Optional)..."
              className="bg-card border-border text-foreground resize-none rounded-lg focus:ring-primary"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmitVote}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Decision
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ────────── ModificationReviewCard ────────── */

/**
 * Shown to instructors when a student has submitted a revised title
 * (titleStatus === PENDING_MODIFICATION). Allows the instructor to
 * approve (updating the title) or deny the change request.
 */
function ModificationReviewCard({ project }) {
  const [reviewNote, setReviewNote] = useState('');

  const resolve = useResolveTitleModification({
    onSuccess: () => toast.success('Title modification resolved.'),
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to resolve modification.'),
  });

  const modReq = project.titleModificationRequest;
  if (!modReq || modReq.status !== 'pending' || !modReq.proposedTitle) return null;

  const handleResolve = (action) => {
    resolve.mutate({
      projectId: project._id,
      action,
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  return (
    <Card className="rounded-xl border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 shadow-lg p-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Revised Title Pending Your Approval
        </h4>
        <div className="grid gap-2 text-sm">
          <p>
            <span className="font-medium text-muted-foreground">Current Title:</span>{' '}
            {project.title}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">Proposed Revised Title:</span>{' '}
            <span className="font-semibold text-card-foreground">{modReq.proposedTitle}</span>
          </p>
          {modReq.justification && (
            <p>
              <span className="font-medium text-muted-foreground">Justification:</span>{' '}
              {modReq.justification}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            placeholder="Add a review note for the team (optional)…"
            className="bg-card border-border text-foreground resize-none rounded-lg focus:ring-primary"
            rows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleResolve('approved')}
            disabled={resolve.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {resolve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Revised Title
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleResolve('denied')}
            disabled={resolve.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" /> Deny
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ────────── Main Page Component ────────── */

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const { user } = useAuthStore();

  const { data: project, isLoading, error } = useProject(projectId);
  const { data: submissionsData } = useProjectSubmissions(
    projectId,
    { limit: 200 },
    { enabled: !!projectId },
  );


  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-destructive">Project not found or failed to load.</div>
      </DashboardLayout>
    );
  }

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const proposals = project.titleProposals || [];

  const totalEvals = project.evaluations?.length || 0;
  const panelCount = project.panelistIds?.length || 0;

  let avgScore = 'N/A';
  if (totalEvals > 0) {
    const totalScore = project.evaluations.reduce(
      (sum, evalItem) => sum + (evalItem.score || 0),
      0,
    );
    avgScore = `${Math.round(totalScore / totalEvals)}%`;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Workspace (Left - 70%) */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-6">
              <WorkflowPhaseTracker project={project} />
            </div>

            <ProjectTitleCard project={project} />

            <Tabs defaultValue="proposal" className="w-full">
              <div className="border-b border-border mb-6">
                <TabsList className="bg-transparent p-0 gap-6 h-auto">
                  <WorkflowTabTrigger value="proposal" icon={FileText} label="Proposals" />
                  <WorkflowTabTrigger value="capstone_1" icon={BookOpen} label="Capstone 1" />
                  <WorkflowTabTrigger value="capstone_2" icon={BookOpen} label="Capstone 2" />
                  <WorkflowTabTrigger value="capstone_3" icon={BookOpen} label="Capstone 3" />
                  <WorkflowTabTrigger value="final" icon={Award} label="Final Defense" />
                  <WorkflowTabTrigger value="audit" icon={History} label="Audit Trail" />
                </TabsList>
              </div>

              <TabsContent value="proposal" className="mt-0 focus-visible:outline-none">
                {/* Show modification review card when a student has submitted a revised title */}
                {isInstructor &&
                  project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION && (
                    <div className="mb-6">
                      <ModificationReviewCard project={project} />
                    </div>
                  )}

                {proposals.length > 0 ? (
                  <Tabs defaultValue="0" className="w-full">
                    {/* Styled proposal selector bar */}
                    <TabsList className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-muted/40 p-2 h-auto">
                      {proposals.map((_, idx) => (
                        <TabsTrigger
                          key={idx}
                          value={String(idx)}
                          className="flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            {idx + 1}
                          </span>
                          Proposal {idx + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {proposals.map((proposal, idx) => (
                      <TabsContent
                        key={idx}
                        value={String(idx)}
                        className="mt-0 focus-visible:outline-none"
                      >
                        {/* Proposal header strip */}
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <h2 className="text-base font-semibold text-card-foreground line-clamp-1">
                            {typeof proposal === 'string' ? proposal : proposal.title}
                          </h2>
                        </div>

                        <Card className="rounded-2xl border-border bg-card shadow-lg p-6">
                          <ActiveProposalView
                            project={project}
                            proposal={typeof proposal === 'string' ? { title: proposal } : proposal}
                            index={idx}
                            canVote={isInstructor}
                          />
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <Card className="rounded-2xl border border-dashed border-border bg-transparent shadow-none p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No proposals submitted yet.</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Chapter 1 → 2 → 3 review with inline approve/revise per round */}
                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[1, 2, 3]}
                  title="Capstone 1 — Chapter Submissions"
                  description="Approve or request revisions for each chapter. Approving locks the chapter and unlocks the next one for the student."
                  showReviewActions
                />
                <EvaluationPanel projectId={project._id} defenseType="proposal" />
              </TabsContent>

              <TabsContent value="capstone_2" className="mt-0 focus-visible:outline-none">
                {/* Mirror the student System Development Phase heading */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold tracking-tight text-primary mb-1">System Development Phase</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the team&apos;s Gantt Chart, System Design document, Prototype Gallery, and midterm evaluation.
                  </p>
                </div>

                {/* Supporting Documents: System Design + Gantt Chart */}
                <Capstone2SupportingDocs projectId={project._id} />

                {/* Prototype Gallery — read-only for faculty */}
                <div className="mt-6">
                  <PrototypeGallery projectId={project._id} canDelete={false} />
                </div>

                {/* Midterm Evaluation */}
                <div className="mt-6">
                  <EvaluationPanel projectId={project._id} defenseType="midterm" />
                </div>
              </TabsContent>

              <TabsContent value="capstone_3" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Chapter 4 → 5 review with inline approve/revise per round */}
                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[4, 5]}
                  title="Capstone 3 — Chapter Submissions"
                  description="Approve or request revisions for Chapters 4 and 5. Approving locks the chapter and progresses the student toward the final manuscript."
                  showReviewActions
                />
                <EvaluationPanel projectId={project._id} defenseType="paper" />
              </TabsContent>

              <TabsContent value="final" className="mt-0 focus-visible:outline-none">
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Audit Trail</h3>
                    <span className="text-xs text-muted-foreground ml-1">— full activity history for this project</span>
                  </div>
                  <ProjectAuditTrail projectId={project._id} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky Sidebar (Right - 30%) */}
          <div className="xl:col-span-4 space-y-6 sticky top-24">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Avg Score
                </p>
                <p className="text-xl font-bold text-emerald-500">{avgScore}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Panelists
                </p>
                <p className="text-xl font-bold text-blue-500">{panelCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Total Evals
                </p>
                <p className="text-xl font-bold text-indigo-500">{totalEvals}</p>
              </div>
            </div>

            <Card className="rounded-2xl border-border bg-card shadow-lg">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                  <Award className="h-4 w-4 text-emerald-500" /> Evaluation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-center p-6 border border-dashed border-input rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Detailed scores will appear after defense.
                  </p>
                </div>
              </CardContent>
            </Card>

            <FacultyWidget project={project} canManage={isInstructor} />
            <ProjectContextWidget project={project} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
