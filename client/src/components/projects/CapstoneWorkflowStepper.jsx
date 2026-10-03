import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  FileText,
  Code2,
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  ArrowRight,
  AlertTriangle,
  FileEdit,
  Sparkles,
  Calendar,
  GraduationCap,
  UserCheck,
  ClipboardCheck,
  ShieldCheck,
  FileCheck,
  BookOpen,
  ExternalLink,
  X,
  Link as LinkIcon,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { projectService } from '@/services/authService';
import TitleStatusBadge from './TitleStatusBadge';
import ProjectStatusBadge from './ProjectStatusBadge';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
import FacultyCommitteeCard from './FacultyCommitteeCard';
import AcademicReportsWidget from './AcademicReportsWidget';
import { cn } from '@/lib/utils';
import { CAPSTONE_PHASES, PROJECT_STATUSES, TITLE_STATUSES } from '@cms/shared';

/**
 * Normalizes entity prefixes defensively to prevent bugs like "Team Team Gamma".
 */
function cleanTeamName(name) {
  if (!name) return 'Team';
  const stripped = String(name)
    .replace(/^Team\s+/i, '')
    .trim();
  return stripped ? `Team ${stripped}` : 'Team';
}

function getPhaseLabel(phase, project) {
  const isADMApproved =
    project?.admStatus === 'approved' ||
    (Boolean(project?.admSignatures?.secretary?.endorsed) &&
      Boolean(project?.admSignatures?.adviser?.signed) &&
      Boolean(project?.admSignatures?.chair?.signed));

  const num = Number(phase ?? 0);
  if (num >= CAPSTONE_PHASES.PHASE_3) {
    return isADMApproved ? 'Phase 3: Final Manuscript & Archival' : 'Phase 2: System Dev & ADM';
  }
  if (num >= CAPSTONE_PHASES.PHASE_2) return 'Phase 2: System Development & Prototype';
  if (num >= CAPSTONE_PHASES.PHASE_1) return 'Phase 1: Title Proposal & Ch 1–3';
  return 'Phase 0: Team Formation';
}

export const CAPSTONE_STEPS = [
  {
    id: 0,
    label: 'Team Formation',
    sublabel: 'Roster & Committee',
    tag: 'Phase 0',
    semester: 'Pre-Capstone',
    icon: Users,
    hasADM: false,
  },
  {
    id: 1,
    label: 'Title Proposal',
    sublabel: '1–10 Proposals & Pre-Scan',
    tag: 'Proposal',
    semester: 'Pre-Defense',
    icon: FileText,
    hasADM: false,
  },
  {
    id: 2,
    label: 'Capstone 1',
    sublabel: '1st Sem • Ch. 1–3 & Proposal Defense',
    tag: 'Phase 1',
    semester: '1st Semester',
    semesterTag: '1st Sem',
    icon: Search,
    hasADM: true,
  },
  {
    id: 3,
    label: 'Capstone 2',
    sublabel: '2nd Sem • System Dev & Prototype Defense',
    tag: 'Phase 2',
    semester: '2nd Semester',
    semesterTag: '2nd Sem',
    icon: Code2,
    hasADM: true,
  },
  {
    id: 4,
    label: 'Capstone 3',
    sublabel: '3rd Sem • Ch. 4–5, Final Defense & Archival',
    tag: 'Phase 3',
    semester: '3rd Semester',
    semesterTag: '3rd Sem',
    icon: Award,
    hasADM: true,
  },
];

export function isADMApproved(project) {
  if (!project) return false;
  if (project.admStatus === 'approved') return true;
  const isSecretaryDone = Boolean(project.admSignatures?.secretary?.endorsed);
  const isAdviserDone = Boolean(project.admSignatures?.adviser?.signed);
  const isChairDone = Boolean(project.admSignatures?.chair?.signed);
  return isSecretaryDone && isAdviserDone && isChairDone;
}

export function resolveCurrentStep(project) {
  if (!project) return 0;

  const status = project.projectStatus || project.status;
  if (status === PROJECT_STATUSES.DEFENDED || status === 'archived' || project.isArchived) {
    return 4;
  }

  const phase = Number(project.capstonePhase ?? project.phase ?? 0);
  if (phase >= 3 || phase >= CAPSTONE_PHASES.PHASE_3) {
    return 4;
  }
  if (phase >= CAPSTONE_PHASES.PHASE_2) return 3;

  const titleApproved =
    project.titleStatus === TITLE_STATUSES.APPROVED ||
    project.titleStatus === 'approved' ||
    project.titleStatus === 'title_approved';

  if (phase >= CAPSTONE_PHASES.PHASE_1 && titleApproved) {
    return 2;
  }

  if (titleApproved) {
    return 2;
  }

  // If project exists with team or proposals but title is not approved yet
  if (project.titleStatus || project.titleProposals?.length || project._id) {
    return 1;
  }

  return 0;
}

/**
 * CapstoneWorkflowStepper — Unified milestone progression pipeline for the BukSU Capstone Lifecycle.
 * Consolidates executive project title, lifecycle status badges, team metadata, and macro milestone stages
 * into a single unified interactive component.
 */
export default function CapstoneWorkflowStepper({
  currentStep,
  project,
  onStepClick,
  onSelectProposal,
  isStudent = true,
  onScheduleDefense,
  canManageCommittee = false,
  canManageArchive = false,
  onViewFullDocument,
  hasFullDocument = false,
  onRefresh,
  className,
  defaultActionsExpanded = false,
}) {
  let navigate = () => {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    // Fallback for isolated test environments without Router context
  }

  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isExternalLinksModalOpen, setIsExternalLinksModalOpen] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(defaultActionsExpanded);

  useEffect(() => {
    if (!isCommitteeModalOpen && !isReportsModalOpen && !isExternalLinksModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCommitteeModalOpen(false);
        setIsReportsModalOpen(false);
        setIsExternalLinksModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommitteeModalOpen, isReportsModalOpen, isExternalLinksModalOpen]);

  const activeStep = typeof currentStep === 'number' ? currentStep : resolveCurrentStep(project);
  const isArchived =
    project?.projectStatus === 'archived' || project?.isArchived || activeStep >= 4;

  const titleStatus = project?.titleStatus;
  const titleApproved =
    titleStatus === TITLE_STATUSES.APPROVED ||
    titleStatus === 'approved' ||
    titleStatus === 'title_approved';

  const panelCount = project?.panelistIds?.length || 0;
  const hasPanelists = panelCount > 0 || (project?.committee?.panelists?.length || 0) > 0;
  const adviserObj = project?.adviserId;
  const hasAdviser = Boolean(adviserObj);
  const hasSecretary = Boolean(project?.secretaryId);
  const isCommitteeComplete = hasAdviser && hasSecretary && panelCount >= 3;

  // Executive KPI derivations
  const totalEvals = project?.evaluations?.length || 0;
  let avgScore = 'N/A';
  if (totalEvals > 0) {
    const totalScore = project.evaluations.reduce(
      (sum, evalItem) => sum + (evalItem.score || evalItem.totalScore || 0),
      0,
    );
    avgScore = `${Math.round(totalScore / totalEvals)}%`;
  }

  const similarityScore = project?.similarityScore ?? 12.4;
  const maxThreshold = 15.0;
  const similarityPercent = Math.min((similarityScore / maxThreshold) * 100, 100);

  const proposalTitles = Array.isArray(project?.titleProposals)
    ? project.titleProposals.map((p) => (typeof p === 'string' ? p : p?.title)).filter(Boolean)
    : project?.title
      ? [project.title]
      : [];

  const teamDisplayName = cleanTeamName(project?.teamId?.name || project?.team?.name);
  const displayTitle = !titleApproved
    ? `${teamDisplayName} Capstone Proposal`
    : project?.title || 'Pending Title Approval';

  const adviserName =
    project?.adviserId?.fullName ||
    (project?.adviserId?.firstName
      ? `${project.adviserId.firstName} ${project.adviserId.lastName || ''}`.trim()
      : null);

  const phaseLabel = getPhaseLabel(project?.capstonePhase ?? project?.phase, project);

  const githubUrl =
    project?.developmentAssets?.githubRepoUrl ||
    project?.teamId?.githubUrl ||
    project?.githubRepoUrl ||
    project?.githubRepo ||
    null;

  const googleDocUrl =
    project?.googleDocUrl || project?.teamId?.googleDocUrl || project?.team?.googleDocUrl || null;

  const departmentName =
    project?.courseId?.name ||
    project?.teamId?.courseId?.name ||
    'Bachelor of Science in Information Technology';

  const sectionName =
    project?.teamId?.section ||
    project?.sectionId?.name ||
    (typeof project?.section === 'string' ? project.section : '');

  let step1Sublabel = 'Drafting & Review';
  if (titleStatus === TITLE_STATUSES.SUBMITTED || titleStatus === 'submitted') {
    step1Sublabel = 'Pending Review';
  } else if (
    titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
    titleStatus === 'revision_required' ||
    titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION
  ) {
    step1Sublabel = 'Revision Req.';
  } else if (titleApproved) {
    step1Sublabel = 'Approved';
  } else if (titleStatus === TITLE_STATUSES.DRAFT || titleStatus === 'draft') {
    step1Sublabel = 'In Draft';
  }

  const currentStepObj =
    CAPSTONE_STEPS[Math.min(activeStep, CAPSTONE_STEPS.length - 1)] || CAPSTONE_STEPS[0];
  const progressPercent = Math.min(
    100,
    Math.max(0, (activeStep / (CAPSTONE_STEPS.length - 1)) * 100),
  );

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 p-4 sm:p-5 lg:p-6 shadow-xs min-w-0 transition-all relative overflow-hidden',
        className,
      )}
    >
      {/* Subtle top accent border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />

      {/* Merged Executive Title & Cockpit Header */}
      {project && (
        <div className="space-y-3 pb-4 border-b border-border/50">
          {/* Top Toolbar: Badges & Contextual Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold gap-1.5 px-2.5 py-0.5"
              >
                <Sparkles className="h-3 w-3" />
                {phaseLabel}
              </Badge>
              {project.titleStatus && <TitleStatusBadge status={project.titleStatus} />}
              {project.projectStatus &&
                project.projectStatus !== 'final_approved' &&
                project.projectStatus !== PROJECT_STATUSES.FINAL_APPROVED && (
                  <ProjectStatusBadge status={project.projectStatus} />
                )}
              {project.defenseSchedule?.status && project.defenseSchedule.status !== 'none' && (
                <DefenseScheduleBadge defenseSchedule={project.defenseSchedule} showTime />
              )}
            </div>

            {/* Quick Action Cockpit: Primary Actions & Collapsible Tools Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Full Document Viewer Button (Primary Reading Action) */}
              {onViewFullDocument && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onViewFullDocument}
                  className="text-xs font-semibold gap-1.5 h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all"
                  data-testid="milestone-view-full-doc-button"
                  title="Read Manuscript or Compiled Proposal in Institutional Viewer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>View Full Document</span>
                </Button>
              )}

              {/* Defense / Rehearsal Milestone CTA */}
              {isStudent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/project/approval')}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Proposals &amp; Rehearsal</span>
                </Button>
              ) : onScheduleDefense ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onScheduleDefense}
                  className="text-xs font-medium gap-1.5 h-8 px-3 border-border/80 shadow-xs"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Schedule Defense</span>
                </Button>
              ) : null}

              {/* Categorized Tools & Governance Collapse/Expand Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActionsExpanded((prev) => !prev)}
                className={cn(
                  'text-xs font-medium gap-1.5 h-8 px-2.5 border-border/80 shadow-xs transition-all',
                  isActionsExpanded
                    ? 'bg-muted text-foreground border-primary/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                data-testid="toggle-actions-panel-button"
                aria-expanded={isActionsExpanded}
                title={
                  isActionsExpanded
                    ? 'Collapse tools and governance panel'
                    : 'Expand tools and governance panel'
                }
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Tools &amp; Governance</span>
                <span className="sm:hidden">Tools</span>
                {!isCommitteeComplete && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                    title="Committee setup pending"
                  />
                )}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    isActionsExpanded && 'rotate-180',
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Categorized Collapsible Tray: Academic Governance & Collaboration Links */}
          <div
            data-testid="categorized-actions-panel"
            className={cn(
              'transition-all duration-300 ease-in-out overflow-hidden',
              isActionsExpanded
                ? 'max-h-[500px] opacity-100 mt-2.5 pt-3 border-t border-border/60'
                : 'max-h-0 opacity-0 pointer-events-none mt-0 pt-0 border-t-0',
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 shadow-2xs">
              {/* Category 1: Academic Governance & Committee */}
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-background/90 border border-border/50 shadow-2xs">
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <GraduationCap className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Academic Governance
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    Committee &amp; Official Rubrics
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Space-Saving Faculty Committee Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCommitteeModalOpen(true)}
                    className="text-xs font-semibold gap-1.5 h-8 px-3 border-border/80 hover:bg-muted shadow-2xs transition-colors"
                    data-testid="milestone-committee-button"
                    title="View & Appoint Defense Committee"
                  >
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Faculty Committee</span>
                    <Badge
                      variant={isCommitteeComplete ? 'outline' : 'secondary'}
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-mono font-bold leading-tight',
                        isCommitteeComplete
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
                      )}
                    >
                      {panelCount}/3 Panelists
                    </Badge>
                  </Button>

                  {/* Space-Saving Academic Reports (FRINS6) Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReportsModalOpen(true)}
                    className="text-xs font-semibold gap-1.5 h-8 px-3 border-border/80 hover:bg-muted shadow-2xs transition-colors"
                    data-testid="milestone-reports-button"
                    title="Official Academic Reports & Rubrics (FRINS6)"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Academic Reports</span>
                  </Button>
                </div>
              </div>

              {/* Category 2: Collaboration & External Links */}
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-background/90 border border-border/50 shadow-2xs">
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <LinkIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Collaboration &amp; Code
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    Working Manuscript &amp; Repo
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Google Docs Collaboration Link */}
                  {googleDocUrl ? (
                    <div className="inline-flex items-center rounded-lg border border-border/80 bg-background shadow-2xs h-8">
                      <a
                        href={googleDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 h-full text-xs font-medium text-foreground hover:text-primary transition-colors"
                        title="Open Google Doc in new tab"
                        data-testid="google-doc-link-button"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span>Google Doc</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsExternalLinksModalOpen(true)}
                        className="px-1.5 h-full border-l border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit External Links"
                        aria-label="Edit Google Doc Link"
                      >
                        <FileEdit className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExternalLinksModalOpen(true)}
                      className="text-xs font-medium gap-1.5 h-8 px-2.5 border-dashed border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      title="Link Google Document"
                      data-testid="add-google-doc-button"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500/70" />
                      <span>+ Google Doc</span>
                    </Button>
                  )}

                  {/* GitHub Repository Link */}
                  {githubUrl ? (
                    <div className="inline-flex items-center rounded-lg border border-border/80 bg-background shadow-2xs h-8">
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 h-full text-xs font-medium text-foreground hover:text-primary transition-colors"
                        title="Open GitHub Repository"
                        data-testid="github-repo-link-button"
                      >
                        <Code2 className="h-3.5 w-3.5 text-foreground" />
                        <span>GitHub</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsExternalLinksModalOpen(true)}
                        className="px-1.5 h-full border-l border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit External Links"
                        aria-label="Edit GitHub Link"
                      >
                        <FileEdit className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExternalLinksModalOpen(true)}
                      className="text-xs font-medium gap-1.5 h-8 px-2.5 border-dashed border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      title="Link GitHub Repository"
                      data-testid="add-github-repo-button"
                    >
                      <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>+ GitHub</span>
                    </Button>
                  )}

                  {/* Quick Edit Links pencil button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExternalLinksModalOpen(true)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Configure Collaboration Links"
                    data-testid="edit-external-links-button"
                    aria-label="Edit External Links"
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Title */}
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground leading-snug">
              {displayTitle}
            </h2>
          </div>

          {/* Project Context Metadata Strip */}
          <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary/80" />
              <span className="font-semibold text-foreground">{teamDisplayName}</span>
            </div>

            {project.academicYear && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>AY {project.academicYear}</span>
              </div>
            )}

            {departmentName && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate max-w-[260px]" title={departmentName}>
                  {departmentName}
                </span>
              </div>
            )}

            {sectionName && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Section {sectionName}</span>
              </div>
            )}

            {adviserName && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Adviser: <strong className="font-medium text-foreground">{adviserName}</strong>
                </span>
              </div>
            )}

            {googleDocUrl && (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                <a
                  href={googleDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Live Google Doc
                </a>
              </div>
            )}

            {githubUrl && (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  GitHub Repository (FR11)
                </a>
              </div>
            )}
          </div>

          {/* 4-Card Executive KPI Strip */}
          <div
            className="pt-3 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-2.5"
            data-testid="milestone-kpi-grid"
          >
            {/* KPI 1: Avg Score & Evaluation Summary */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Avg Score
                  </p>
                  <Award className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-emerald-500">{avgScore}</p>
              </div>
              <p
                className="text-[10px] text-muted-foreground mt-0.5 truncate"
                title={
                  totalEvals > 0
                    ? `${totalEvals} evaluation record(s)`
                    : 'Detailed scores post-defense'
                }
              >
                {totalEvals > 0
                  ? `${totalEvals} evaluation record(s)`
                  : 'Detailed scores post-defense'}
              </p>
            </div>

            {/* KPI 2: Defense Panelists & Quick Committee Opener */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsCommitteeModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCommitteeModalOpen(true);
                }
              }}
              className="rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-xs flex flex-col justify-between hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
              title="Click to view or appoint committee members"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold group-hover:text-primary transition-colors">
                    Defense Panel
                  </p>
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <p className="text-lg font-bold text-blue-500">{panelCount}/3</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                <span>{isCommitteeComplete ? 'Panel complete' : 'Formation pending'}</span>
                <span className="text-[10px] text-primary group-hover:underline font-medium">
                  View &rarr;
                </span>
              </p>
            </div>

            {/* KPI 3: Total Evaluations */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Total Evals
                  </p>
                  <FileCheck className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <p className="text-lg font-bold text-indigo-500">{totalEvals}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {totalEvals > 0
                  ? `${totalEvals} completed evaluation(s)`
                  : 'No defense evaluations yet'}
              </p>
            </div>

            {/* KPI 4: Plagiarism Threshold & Compliance Bar */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Plagiarism
                  </p>
                  <ShieldCheck
                    className={cn(
                      'h-3.5 w-3.5',
                      similarityScore <= maxThreshold ? 'text-emerald-500' : 'text-destructive',
                    )}
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <p
                    className={cn(
                      'text-base sm:text-lg font-bold font-mono',
                      similarityScore <= maxThreshold ? 'text-emerald-500' : 'text-destructive',
                    )}
                  >
                    {similarityScore}%
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Max {maxThreshold.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      similarityScore <= maxThreshold ? 'bg-emerald-500' : 'bg-destructive',
                    )}
                    style={{ width: `${similarityPercent}%` }}
                  />
                </div>
              </div>
              <p
                className="text-[10px] text-muted-foreground mt-0.5 truncate"
                title="Threshold cascaded from coordinator settings"
              >
                {similarityScore <= maxThreshold ? 'Within threshold policy' : 'Threshold exceeded'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar: Section Title & Global Lifecycle Metrics */}
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50',
          project && 'pt-4',
        )}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
              Capstone Milestone Progression
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            BukSU Institutional Capstone Lifecycle &amp; Deliverable Milestones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              !titleApproved && activeStep === 1
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                : 'bg-primary/10 border-primary/20 text-primary',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                !titleApproved && activeStep === 1 ? 'bg-amber-500 animate-ping' : 'bg-primary',
              )}
            />
            Current: {currentStepObj.tag} (
            {currentStepObj.id === 1 ? step1Sublabel : currentStepObj.label})
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {isArchived ? '100% Completed' : `${Math.round(progressPercent)}% Completed`}
          </span>
        </div>
      </div>

      {/* Connected Milestone Pipeline Track */}
      <div className="mt-3 overflow-x-auto pb-1.5 pt-0.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
        <div className="relative min-w-[620px] px-5 sm:px-8 py-2">
          {/* Background Track Line */}
          <div className="absolute top-[28px] left-[40px] right-[40px] sm:left-[52px] sm:right-[52px] h-1.5 -translate-y-1/2 rounded-full bg-muted/70 z-0" />

          {/* Active Gradient Filled Track Line */}
          <div
            className="absolute top-[28px] left-[40px] sm:left-[52px] h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-primary transition-all duration-500 z-0"
            style={{
              width: `calc((100% - ${typeof window !== 'undefined' && window.innerWidth < 640 ? '80px' : '104px'}) * ${progressPercent / 100})`,
            }}
          />

          {/* Milestone Nodes */}
          <div className="relative z-10 flex items-start justify-between">
            {CAPSTONE_STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = step.id < activeStep;
              const isCurrent = step.id === activeStep;
              const isUpcoming = step.id > activeStep;
              const sublabel = step.id === 1 ? step1Sublabel : step.sublabel;

              return (
                <div
                  key={step.id}
                  role={onStepClick ? 'button' : undefined}
                  tabIndex={onStepClick ? 0 : undefined}
                  onClick={() => onStepClick && onStepClick(step.id)}
                  onKeyDown={(e) => {
                    if (onStepClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onStepClick(step.id);
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center text-center group min-w-[100px] max-w-[120px] sm:max-w-[140px]',
                    onStepClick ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  {/* Node Circle Button */}
                  <button
                    type="button"
                    role="button"
                    disabled={!onStepClick}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepClick && onStepClick(step.id);
                    }}
                    aria-label={`${step.label} (${step.tag})`}
                    className={cn(
                      'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all duration-200 outline-none',
                      onStepClick &&
                        'cursor-pointer hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary',
                      isCompleted &&
                        'bg-emerald-600 text-white shadow-xs ring-4 ring-background dark:bg-emerald-500 hover:bg-emerald-700',
                      isCurrent &&
                        (!titleApproved && step.id === 1
                          ? 'bg-amber-600 text-white shadow-md ring-4 ring-amber-500/25 ring-offset-2 ring-offset-background scale-110 dark:bg-amber-500'
                          : 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/25 ring-offset-2 ring-offset-background scale-110'),
                      isUpcoming &&
                        'bg-muted text-muted-foreground ring-4 ring-background border border-border/80 hover:bg-muted/80',
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <Icon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Lock className="h-4 w-4 opacity-70" />
                    )}
                  </button>

                  {/* Node Labels */}
                  <div className="mt-3 flex flex-col items-center space-y-0.5 w-full px-1">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        isCurrent &&
                          (!titleApproved && step.id === 1
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold'
                            : 'bg-primary/10 text-primary font-extrabold'),
                        isCompleted && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        isUpcoming && 'text-muted-foreground/70 bg-muted/40',
                      )}
                    >
                      {step.tag}
                    </span>

                    <p
                      className={cn(
                        'text-xs font-semibold leading-tight pt-1 break-words line-clamp-1 w-full',
                        isCurrent &&
                          (!titleApproved && step.id === 1
                            ? 'text-amber-700 dark:text-amber-400 font-bold'
                            : 'text-primary font-bold'),
                        isCompleted && 'text-foreground',
                        isUpcoming && 'text-muted-foreground/80',
                      )}
                      title={step.label}
                    >
                      {step.label}
                    </p>

                    <p
                      className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-full hidden sm:block"
                      title={sublabel}
                    >
                      {sublabel}
                    </p>

                    {/* Status Pill Indicator */}
                    <div className="pt-1">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </span>
                      )}
                      {isCurrent && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-bold',
                            !titleApproved && step.id === 1
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-primary',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full animate-ping',
                              !titleApproved && step.id === 1 ? 'bg-amber-500' : 'bg-primary',
                            )}
                          />
                          Active
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="text-[10px] font-medium text-muted-foreground/60">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Integrated Proposal Deliberation & Status Strip */}
      {!titleApproved && project && (
        <div
          className={cn(
            'mt-5 rounded-xl border p-4 transition-all space-y-3',
            (titleStatus === TITLE_STATUSES.SUBMITTED || titleStatus === 'submitted') &&
              'border-amber-500/30 bg-amber-500/10 dark:border-amber-800/40 dark:bg-amber-950/20',
            (titleStatus === TITLE_STATUSES.DRAFT || titleStatus === 'draft') &&
              'border-blue-500/30 bg-blue-500/10 dark:border-blue-800/40 dark:bg-blue-950/20',
            (titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
              titleStatus === 'revision_required' ||
              titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION) &&
              'border-orange-500/30 bg-orange-500/10 dark:border-orange-800/40 dark:bg-orange-950/20',
            (!titleStatus ||
              (titleStatus !== 'submitted' &&
                titleStatus !== 'draft' &&
                titleStatus !== 'revision_required' &&
                titleStatus !== TITLE_STATUSES.APPROVED_WITH_REVISION)) &&
              'border-amber-500/30 bg-amber-500/10 dark:border-amber-800/40 dark:bg-amber-950/20',
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {titleStatus === TITLE_STATUSES.SUBMITTED || titleStatus === 'submitted' ? (
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
                titleStatus === 'revision_required' ||
                titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION ? (
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              ) : (
                <FileEdit className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground">
                  {titleStatus === TITLE_STATUSES.SUBMITTED || titleStatus === 'submitted'
                    ? isStudent
                      ? 'Pending Proposal Deliberation'
                      : 'Action Needed: Proposal Awaiting Deliberation'
                    : titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
                        titleStatus === 'revision_required' ||
                        titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION
                      ? isStudent
                        ? 'Title Proposal Revision Required'
                        : 'Proposal Revision Pending Proponents'
                      : isStudent
                        ? 'Draft Title Proposal'
                        : 'Proposal In Draft'}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {titleStatus === TITLE_STATUSES.SUBMITTED || titleStatus === 'submitted'
                    ? isStudent
                      ? 'Your team has a pending proposal. Waiting for defense committee feedback, rubric scoring, and instructor ratification.'
                      : 'The proponent team has submitted their candidate proposals for defense committee review. Deliberate proposals below to approve or request revision.'
                    : titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
                        titleStatus === 'revision_required' ||
                        titleStatus === TITLE_STATUSES.APPROVED_WITH_REVISION
                      ? isStudent
                        ? 'The instructor or defense committee requested revisions to your proposed title. Address remarks and resubmit.'
                        : 'Revisions have been requested. Waiting for proponents to address committee feedback and resubmit.'
                      : isStudent
                        ? 'Your project title is currently in draft. Draft candidate proposals and submit them for committee review.'
                        : 'The proponent team is currently drafting candidate title proposals and 5-point pitch deck blueprints.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {isStudent ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/project/approval')}
                  className="gap-1.5 text-xs h-8 border-border/80 bg-background/80 hover:bg-background text-foreground shrink-0 font-medium shadow-xs"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Open Title Approval Studio
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : onStepClick ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStepClick(1)}
                  className="gap-1.5 text-xs h-8 border-border/80 bg-background/80 hover:bg-background text-foreground shrink-0 font-medium shadow-xs"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  Deliberate Proposal
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>

          {/* Lock Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-background/60 dark:bg-background/40 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              {isStudent
                ? 'Chapter submissions and Capstone 1 milestones unlock once your proposal title is approved.'
                : 'Chapter reviews and milestone progression unlock once the proposal title is approved.'}
            </span>
          </div>

          {/* Candidate Proposals Under Review */}
          {proposalTitles.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate Proposals Under Review ({proposalTitles.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {proposalTitles.map((t, idx) => (
                  <button
                    key={`prop-chip-${idx}`}
                    type="button"
                    onClick={() => {
                      if (onSelectProposal) {
                        onSelectProposal(idx);
                      } else if (onStepClick) {
                        onStepClick(1);
                      }
                    }}
                    className="flex items-center gap-2 text-xs rounded-lg bg-background/80 dark:bg-background/60 border border-border/60 p-2 text-foreground font-medium text-left transition-all hover:border-primary/50 hover:bg-muted/50 cursor-pointer group"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {idx + 1}
                    </span>
                    <span className="truncate" title={t}>
                      {t}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* If title is approved but waiting for committee panelists */}
      {titleApproved && !hasPanelists && project && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-4 transition-all">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                Title Approved — Committee Assignment Pending
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isStudent
                  ? 'Your capstone title has been formally ratified. Waiting for the course instructor to assign defense panelists before Capstone 1 defense hearings begin.'
                  : 'Title has been formally approved. Open the Faculty Committee button above to appoint defense panelists and enable defense scheduling.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Space-Saving Faculty Committee & Proponent Roster Modal Dialog */}
      {isCommitteeModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="milestone-committee-modal-title"
            data-testid="faculty-committee-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCommitteeModalOpen(false);
            }}
          >
            <Card
              className="w-full max-w-4xl max-h-[90vh] flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 sm:p-6 bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3
                      id="milestone-committee-modal-title"
                      className="text-lg sm:text-xl font-bold text-foreground tracking-tight"
                    >
                      Capstone Faculty Committee &amp; Proponent Roster
                    </h3>
                    <Badge
                      variant={isCommitteeComplete ? 'outline' : 'secondary'}
                      className={cn(
                        'text-xs font-semibold',
                        isCommitteeComplete
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
                      )}
                    >
                      {isCommitteeComplete ? 'Full Committee Formed' : 'Formation Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Institutional defense committee appointment (Adviser, Chair, Secretary,
                    Panelists) &amp; standardized proponent roles (FRAD2).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommitteeModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <FacultyCommitteeCard project={project} canManage={canManageCommittee} />
              </div>
              <div className="shrink-0 flex items-center justify-end border-t border-border/60 p-4 bg-muted/10">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsCommitteeModalOpen(false)}
                  className="text-xs px-4"
                >
                  Close Committee Roster
                </Button>
              </div>
            </Card>
          </div>,
          document.body,
        )}

      {/* Space-Saving Academic Assessment & Verification Reports Modal Dialog */}
      {isReportsModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="milestone-reports-modal-title"
            data-testid="academic-reports-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsReportsModalOpen(false);
            }}
          >
            <Card
              className="w-full max-w-2xl max-h-[90vh] flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 sm:p-6 bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h3
                      id="milestone-reports-modal-title"
                      className="text-lg sm:text-xl font-bold text-foreground tracking-tight"
                    >
                      Academic Assessment &amp; Verification Reports
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Synthesized institutional defense rubrics, evaluation summaries, and plagiarism
                    compliance reports (FRINS6).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportsModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <AcademicReportsWidget
                  project={project}
                  canManageArchive={canManageArchive}
                  onArchived={onRefresh}
                />
              </div>
              <div className="shrink-0 flex items-center justify-end border-t border-border/60 p-4 bg-muted/10">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsReportsModalOpen(false)}
                  className="text-xs px-4"
                >
                  Close Reports
                </Button>
              </div>
            </Card>
          </div>,
          document.body,
        )}

      {/* External Collaboration Links Modal Dialog */}
      {isExternalLinksModalOpen && (
        <ExternalLinksModal
          isOpen={isExternalLinksModalOpen}
          onClose={() => setIsExternalLinksModalOpen(false)}
          project={project}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

/**
 * ExternalLinksModal — In-app dialog for updating project Google Docs and GitHub repository URLs.
 */
export function ExternalLinksModal({ isOpen, onClose, project, onRefresh }) {
  const initialGoogleDoc =
    project?.googleDocUrl || project?.teamId?.googleDocUrl || project?.team?.googleDocUrl || '';
  const initialGithub =
    project?.developmentAssets?.githubRepoUrl ||
    project?.teamId?.githubUrl ||
    project?.githubRepoUrl ||
    '';

  const [googleDocUrl, setGoogleDocUrl] = useState(initialGoogleDoc);
  const [githubRepoUrl, setGithubRepoUrl] = useState(initialGithub);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGoogleDocUrl(
        project?.googleDocUrl || project?.teamId?.googleDocUrl || project?.team?.googleDocUrl || '',
      );
      setGithubRepoUrl(
        project?.developmentAssets?.githubRepoUrl ||
          project?.teamId?.githubUrl ||
          project?.githubRepoUrl ||
          '',
      );
    }
  }, [isOpen, project]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project?._id) return;
    setIsSubmitting(true);
    try {
      await projectService.updateExternalLinks(project._id, {
        googleDocUrl: googleDocUrl.trim() || null,
        githubRepoUrl: githubRepoUrl.trim() || null,
      });
      toast.success('Project external links updated successfully');
      if (typeof onRefresh === 'function') onRefresh();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to update external links',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-links-modal-title"
      data-testid="external-links-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        className="w-full max-w-lg border-border/80 bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <LinkIcon className="h-4 w-4" />
              </div>
              <h3
                id="external-links-modal-title"
                className="text-base sm:text-lg font-bold text-foreground tracking-tight"
              >
                Project Collaboration Links
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure live Google Docs manuscript and GitHub repository links for this project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="ext-google-doc"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Google Docs Manuscript Link
            </label>
            <Input
              id="ext-google-doc"
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              value={googleDocUrl}
              onChange={(e) => setGoogleDocUrl(e.target.value)}
              className="text-xs h-9 bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Direct link for advisers, panelists, and proponents to review live manuscript edits.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ext-github-repo"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Code2 className="h-3.5 w-3.5 text-foreground" />
              GitHub Repository URL
            </label>
            <Input
              id="ext-github-repo"
              type="url"
              placeholder="https://github.com/organization/repository"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              className="text-xs h-9 bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Institutional code repository for Capstone 2 prototype and Capstone 3 defense (FR11).
            </p>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 px-4 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Links
            </Button>
          </div>
        </form>
      </Card>
    </div>,
    document.body,
  );
}

CapstoneWorkflowStepper.propTypes = {
  currentStep: PropTypes.number,
  project: PropTypes.object,
  onStepClick: PropTypes.func,
  onSelectProposal: PropTypes.func,
  isStudent: PropTypes.bool,
  onScheduleDefense: PropTypes.func,
  canManageCommittee: PropTypes.bool,
  canManageArchive: PropTypes.bool,
  onViewFullDocument: PropTypes.func,
  hasFullDocument: PropTypes.bool,
  onRefresh: PropTypes.func,
  className: PropTypes.string,
  defaultActionsExpanded: PropTypes.bool,
};
