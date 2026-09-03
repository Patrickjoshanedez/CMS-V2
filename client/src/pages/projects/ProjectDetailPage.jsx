import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useQuery } from '@tanstack/react-query';
import {
  useProject,
  useAssignAdviser,
  useAssignPanelist,
  useRemovePanelist,
  useArchiveProject,
} from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useEntityAuditHistory } from '@/hooks/useAuditLogs';
import { userService } from '@/services/authService';
import { TITLE_STATUSES, ROLES } from '@cms/shared';
import { toast } from 'sonner';
import {
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  History,
  BookOpen,
  Award,
  Loader2,
  Search,
  UserPlus,
  ChevronLeft,
  FileSpreadsheet,
  ExternalLink,
  FileSearch,
  ShieldCheck,
  FolderArchive,
  Archive,
  Printer,
  MessageSquareMore,
  BookMarked,
  Code2,
} from 'lucide-react';

// Extracted reusable components
import FacultyWidget from '@/components/projects/FacultyWidget';
import ProjectContextWidget from '@/components/projects/ProjectContextWidget';
import AcademicReportsWidget from '@/components/projects/AcademicReportsWidget';
import ActiveProposalView from '@/components/projects/ActiveProposalView';
import ModificationReviewCard from '@/components/projects/ModificationReviewCard';
import WorkflowPhaseTracker from '@/components/projects/WorkflowPhaseTracker';
import ProjectTitleCard from '@/components/projects/ProjectTitleCard';
import WorkflowTabTrigger from '@/components/projects/WorkflowTabTrigger';
import { getFullName, getProjectAuthors } from '@/pages/projects/projectDetailUtils';
import PrototypeGallery from '@/components/projects/PrototypeGallery';

import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import ProjectAuditTrail from '@/components/projects/ProjectAuditTrail';
import DevelopmentAssetsForm from '@/components/projects/DevelopmentAssetsForm';
import ActionDoneMatrixTab from '@/components/projects/ActionDoneMatrixTab';
import ConsultationLogWidget from '@/components/projects/ConsultationLogWidget';
import InteractiveGanttChart from '@/components/projects/InteractiveGanttChart';
import { cn } from '@/lib/utils';

/* ────────── Helpers ────────── */

export function resolveArchiveBackContext(stateOrObj = {}, search = '', role = '') {
  let state = stateOrObj;
  let searchStr = search;
  let roleStr = role;

  if (
    stateOrObj &&
    typeof stateOrObj === 'object' &&
    ('state' in stateOrObj || 'search' in stateOrObj || 'role' in stateOrObj)
  ) {
    state = stateOrObj.state || {};
    searchStr = stateOrObj.search || '';
    roleStr = stateOrObj.role || '';
  }

  const fromState = Boolean(state?.fromArchive || state?.returnTo?.includes('/archive'));
  const fromSearch = typeof searchStr === 'string' && searchStr.includes('from=archive');

  if (fromState || fromSearch) {
    return {
      fromArchive: true,
      backDestination: state?.returnTo || '/archive',
      backLabel: 'Back to Search Results',
    };
  }

  let backLabel = 'Back to Projects';
  if (roleStr === 'instructor') backLabel = 'Back to Instructor Review';
  if (roleStr === 'adviser') backLabel = 'Back to Adviser Dashboard';

  return {
    fromArchive: false,
    backDestination: '/projects',
    backLabel,
  };
}

export const resolveProjectBackNav = resolveArchiveBackContext;

/* ────────── Sub-components ────────── */

/* ────────── ModificationReviewCard ────────── */

/* ────────── Main Page Component ────────── */

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state?.user);

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { data: submissionsData } = useProjectSubmissions(
    projectId,
    { limit: 200 },
    { enabled: !!projectId },
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
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

  const { backDestination, backLabel } = resolveProjectBackNav({
    state: location.state,
    search: location.search,
    role: user?.role,
  });

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isFaculty =
    user?.role === ROLES.INSTRUCTOR ||
    user?.role === ROLES.FACULTY ||
    user?.role === ROLES.ADVISER ||
    user?.role === ROLES.PANELIST;
  const isStudent = user?.role === ROLES.STUDENT || (!isFaculty && user?.role !== 'admin');
  const isAssignedAdviser =
    (user?.role === ROLES.ADVISER || user?.role === ROLES.FACULTY) &&
    (project?.adviserId?._id || project?.adviserId)?.toString() === user?._id?.toString();
  const isAssignedPanelist =
    (user?.role === ROLES.PANELIST || user?.role === ROLES.FACULTY) &&
    (project?.panelistIds || []).some(
      (panelist) => (panelist?._id || panelist)?.toString() === user?._id?.toString(),
    );
  const canReviewTitle = isInstructor || isAssignedAdviser || isAssignedPanelist;
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

  const isArchived = project.isArchived || project.projectStatus === 'archived';
  const defaultTab = isArchived ? 'capstone_4' : 'capstone_1';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Workspace (Left - 70%) */}
          <div className="xl:col-span-8 space-y-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backDestination)}
                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground mb-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-6">
              <WorkflowPhaseTracker project={project} />
            </div>

            {isArchived && (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-card-foreground">
                      Archived Capstone Record — Read-Only Mode
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This project has been archived. Metadata adjustments are restricted; directly
                      viewing final manuscript papers and evaluation reports.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary uppercase font-bold text-[10px] px-2.5 py-1"
                >
                  Archived Paper
                </Badge>
              </div>
            )}

            <ProjectTitleCard project={project} />

            <Tabs defaultValue={defaultTab} className="w-full">
              <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-border mb-6">
                {isArchived ? (
                  <TabsList className="bg-transparent p-0 gap-6 h-auto flex-nowrap min-w-max border-0">
                    <WorkflowTabTrigger
                      value="capstone_4"
                      icon={BookMarked}
                      label="Full Manuscript Paper"
                    />
                    <WorkflowTabTrigger
                      value="adm"
                      icon={FileSpreadsheet}
                      label="Action Done Matrix"
                    />
                    <WorkflowTabTrigger
                      value="evaluation"
                      icon={Award}
                      label="Defense Evaluation"
                    />
                    <WorkflowTabTrigger
                      value="consultation"
                      icon={MessageSquareMore}
                      label="Consultation Log"
                    />
                    <WorkflowTabTrigger value="audit" icon={History} label="Audit Trail" />
                  </TabsList>
                ) : (
                  <TabsList className="bg-transparent p-0 gap-6 h-auto flex-nowrap min-w-max border-0">
                    <WorkflowTabTrigger value="capstone_1" icon={FileText} label="Capstone 1" />
                    <WorkflowTabTrigger value="capstone_2" icon={BookOpen} label="Capstone 2" />
                    <WorkflowTabTrigger value="capstone_3" icon={Code2} label="Capstone 3" />
                    <WorkflowTabTrigger value="capstone_4" icon={Award} label="Capstone 4" />
                    <WorkflowTabTrigger
                      value="consultation"
                      icon={MessageSquareMore}
                      label="Consultations"
                    />
                    <WorkflowTabTrigger value="audit" icon={History} label="Audit Trail" />
                  </TabsList>
                )}
              </div>

              <TabsContent value="capstone_1" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Show modification review card when a student has submitted a revised title */}
                {canReviewTitle && project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION && (
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
                            canVote={canReviewTitle}
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

                <EvaluationPanel projectId={project._id} defenseType="proposal" />
              </TabsContent>

              <TabsContent value="capstone_2" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Attached Working Manuscripts Card for fast document notation and inspection */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-base font-semibold text-foreground">
                      Attached Working Manuscripts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Iterative chapter submissions for adviser notation prior to formal hearings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {[
                      {
                        ch: 'Chapter 1: The Problem & Its Background',
                        subId: 'ch1',
                        chapterNum: 1,
                      },
                      {
                        ch: 'Chapter 2: Review of Related Literature',
                        subId: 'ch2',
                        chapterNum: 2,
                      },
                      {
                        ch: 'Chapter 3: Methodology & Technical Framework',
                        subId: 'ch3',
                        chapterNum: 3,
                      },
                    ].map((item) => {
                      const latestSub = (submissionsData?.submissions || []).find(
                        (s) => s.type === 'chapter' && s.chapter === item.chapterNum,
                      );
                      const status = latestSub?.status || 'pending';
                      const dateStr = latestSub?.createdAt
                        ? new Date(latestSub.createdAt).toLocaleDateString()
                        : 'Awaiting Upload';

                      return (
                        <div
                          key={item.ch}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {item.ch}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {latestSub
                                  ? `Uploaded on ${dateStr} · Version ${latestSub.version || 1}`
                                  : dateStr}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] capitalize',
                                status === 'approved'
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : status === 'needs_revision'
                                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                    : 'border-border text-muted-foreground',
                              )}
                            >
                              {status.replace('_', ' ')}
                            </Badge>
                            {latestSub ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-primary hover:bg-primary/10"
                                onClick={() => navigate(`/submissions/${latestSub._id}`)}
                              >
                                Inspect
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[1, 2, 3]}
                  title="Capstone 2 — Chapter Submissions"
                  description="Approve or request revisions for each chapter. Approving locks the chapter and unlocks the next one for the student."
                  showReviewActions
                />

                <ActionDoneMatrixTab
                  project={project}
                  isFaculty={isFaculty}
                  user={user}
                  onRefresh={() => refetch()}
                />

                <EvaluationPanel projectId={project._id} defenseType="midterm" />
              </TabsContent>

              <TabsContent value="capstone_3" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Capstone 3 Interactive Gantt Chart Roadmap */}
                <InteractiveGanttChart project={project} isReadOnly={!isStudent && !isFaculty} />

                <DevelopmentAssetsForm project={project} isReadOnly />

                <div className="mt-4">
                  <PrototypeGallery projectId={project._id} canDelete={false} canAdd={false} />
                </div>

                <ChapterReviewPanel
                  submissions={submissionsData}
                  chapters={[4, 5]}
                  title="Capstone 3 — Chapter Submissions"
                  description="Approve or request revisions for Chapters 4 and 5. Approving locks the chapter and progresses the student toward the final manuscript."
                  showReviewActions
                />

                <ActionDoneMatrixTab
                  project={project}
                  isFaculty={isFaculty}
                  user={user}
                  onRefresh={() => refetch()}
                />

                <EvaluationPanel projectId={project._id} defenseType="paper" />
              </TabsContent>

              <TabsContent value="capstone_4" className="mt-0 focus-visible:outline-none space-y-6">
                {/* Full Manuscript Paper Reader & Archival Document Package */}
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold text-foreground">
                          Official Full Manuscript Paper
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Conferred Capstone Study — Bukidnon State University Institutional
                        Repository
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-2 font-semibold shadow-sm"
                        asChild
                      >
                        <a
                          href={`/api/archive/${project._id}/view`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Read Full Paper (PDF)
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/projects/${project._id}/certificate`)}
                        className="gap-2 text-xs"
                      >
                        <Award className="h-4 w-4 text-emerald-500" />
                        View Certificate
                      </Button>
                    </div>
                  </div>

                  {/* Abstract Reader */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Executive Abstract
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap rounded-xl bg-muted/20 p-4 border border-border/60">
                      {project.abstract ||
                        project.approvedProposal?.abstract ||
                        'No abstract text recorded for this manuscript.'}
                    </p>
                  </div>

                  {/* Citation Generator */}
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Academic Citation Formats
                    </h4>
                    <div className="space-y-2 text-xs font-mono bg-card border rounded-lg p-3">
                      <p className="text-muted-foreground">
                        <span className="font-bold text-primary not-mono">[APA 7th]:</span>{' '}
                        {formatCitation(project, 'apa', getProjectAuthors(project))}
                      </p>
                      <p className="text-muted-foreground pt-1 border-t border-border/40">
                        <span className="font-bold text-primary not-mono">[IEEE]:</span>{' '}
                        {formatCitation(project, 'ieee', getProjectAuthors(project))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Final Defense Evaluation Rubric Panel */}
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="evaluation" className="mt-0 focus-visible:outline-none">
                <EvaluationPanel projectId={project._id} defenseType="final" />
              </TabsContent>

              <TabsContent value="consultation" className="mt-0 focus-visible:outline-none">
                <ConsultationLogWidget
                  project={project}
                  isAdviser={isAssignedAdviser}
                  isStudent={!isFaculty}
                />
              </TabsContent>

              <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Audit Trail</h3>
                    <span className="text-xs text-muted-foreground ml-1">
                      — full activity history for this project
                    </span>
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

            {/* Similarity Compliance Card matching coordinator thresholds */}
            <Card className="rounded-2xl border border-border/60 bg-muted/20 shadow-xs">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Plagiarism Threshold</span>
                  <span className="font-bold text-emerald-500">
                    {project?.similarityScore !== undefined
                      ? `${project.similarityScore}%`
                      : '12.4%'}{' '}
                    / 15.0% Max
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(((project?.similarityScore ?? 12.4) / 15) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Threshold dynamically cascaded from coordinator settings.
                </p>
              </CardContent>
            </Card>

            <ProjectContextWidget project={project} />
            <AcademicReportsWidget
              project={project}
              canManageArchive={isInstructor && !isArchived}
              onArchived={() => refetch()}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function formatCitation(project, style = 'apa', authors = []) {
  const authorStr = authors.join(', ');
  const year = project?.academicYear
    ? project.academicYear.split('-').pop()
    : new Date().getFullYear();
  const course = project?.courseId?.name || 'BS Information Technology';
  const adviser = project?.adviserId ? getFullName(project.adviserId) : '';
  const adviserText = adviser ? ` Adviser: ${adviser}.` : '';

  if (style === 'apa') {
    return `${authorStr} (${year}). ${project?.title || 'Untitled'}. ${course}.${adviserText}`;
  }
  if (style === 'ieee') {
    return `${authorStr}, "${project?.title || 'Untitled'}," ${course}, ${year}.${adviserText}`;
  }
  if (style === 'mla') {
    return `${authorStr}. "${project?.title || 'Untitled'}." ${course}, ${year}.${adviserText}`;
  }
  return `${authorStr} (${year}). ${project?.title}.`;
}

export function ProjectHistoryCard({ projectId }) {
  const [activeTab, setActiveTab] = useState('history');
  const { data: auditLogs = [], isLoading } = useEntityAuditHistory('Project', projectId, 100);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Project History
        </CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeTab === 'history' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('history')}
          >
            History
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-2 text-xs">
        {isLoading ? (
          <p className="text-muted-foreground">Loading history...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-muted-foreground">No audit entries found.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-2 border rounded bg-muted/20 flex flex-col gap-0.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{log.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
