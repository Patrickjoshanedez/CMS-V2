import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList } from '@/components/ui/Tabs';
import { useQuery } from '@tanstack/react-query';
import {
  useProject,
  useAddTitleComment,
  useApproveTitle,
  useRejectTitle,
  useAssignAdviser,
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
} from 'lucide-react';

// Extracted reusable components
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';
import ChapterProgressWithRounds from '@/components/submissions/ChapterProgressWithRounds';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import EvaluationPanel from '@/components/projects/EvaluationPanel';

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

  const { data: advisers = [] } = useQuery({
    queryKey: ['users', 'advisers'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'adviser' });
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

  const authors = getProjectAuthors(project);
  const currentAdviser = project.adviserId ? getFullName(project.adviserId) : 'Not assigned';
  const currentPanelists = project.panelistIds || [];

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
                  className="flex items-center gap-2 text-sm text-card-foreground bg-muted p-2 rounded-md"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {getFullName(p)}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No panelists assigned</p>
            )}
          </div>
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
      } else if (vote === 'Revision' || vote === 'Reject') {
        await rejectMutation.mutateAsync({
          projectId: project._id,
          reason: `Decision: ${vote}. ${remarks.trim()}`,
        });
        toast.success(`Title sent back for ${vote.toLowerCase()}.`);
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
  const submissions = submissionsData?.submissions || [];

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
                {proposals.length > 0 ? (
                  <Tabs defaultValue="0" className="w-full">
                    <TabsList className="bg-card border border-border rounded-xl p-1 mb-6 inline-flex">
                      {proposals.map((_, idx) => (
                        <WorkflowTabTrigger
                          key={idx}
                          value={String(idx)}
                          label={`Proposal ${idx + 1}`}
                        />
                      ))}
                    </TabsList>
                    {proposals.map((proposal, idx) => (
                      <TabsContent
                        key={idx}
                        value={String(idx)}
                        className="mt-0 focus-visible:outline-none"
                      >
                        <Card className="rounded-2xl border-border bg-card shadow-lg p-6">
                          <h2 className="text-xl font-bold text-card-foreground mb-6">
                            {typeof proposal === 'string' ? proposal : proposal.title}
                          </h2>
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

              <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none">
                <ChapterProgressWithRounds
                  project={project}
                  submissions={submissions}
                  chapters={[1, 2, 3]}
                  showUploadButton={false}
                />
                <EvaluationPanel projectId={project._id} defenseType="proposal" />
              </TabsContent>

              <TabsContent value="capstone_2" className="mt-0 focus-visible:outline-none">
                <div className="mb-8">
                  <PrototypeGallery projectId={project._id} canDelete={false} />
                </div>
                <div>
                  <EvaluationPanel projectId={project._id} defenseType="midterm" />
                </div>
              </TabsContent>

              <TabsContent value="capstone_3" className="mt-0 focus-visible:outline-none">
                <ChapterProgressWithRounds
                  project={project}
                  submissions={submissions}
                  chapters={[4, 5]}
                  showUploadButton={false}
                />
                <EvaluationPanel projectId={project._id} defenseType="paper" />
              </TabsContent>

              <TabsContent value="final" className="mt-0 focus-visible:outline-none">
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                <Card className="rounded-2xl border-border bg-card shadow-lg p-6">
                  <p className="text-muted-foreground text-sm">
                    Audit trail integration goes here.
                  </p>
                </Card>
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
