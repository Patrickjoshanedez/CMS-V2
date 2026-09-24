import React from 'react';
import PropTypes from 'prop-types';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import TitleStatusBadge from './TitleStatusBadge';
import ProjectStatusBadge from './ProjectStatusBadge';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
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
    icon: Users,
    hasADM: false,
  },
  {
    id: 1,
    label: 'Title Proposal',
    sublabel: 'Drafting & Review',
    tag: 'Proposal',
    icon: FileText,
    hasADM: false,
  },
  {
    id: 2,
    label: 'Capstone 1',
    sublabel: 'Proposal & Ch. 1–3 (ADM v1)',
    tag: 'Phase 1',
    icon: Search,
    hasADM: true,
  },
  {
    id: 3,
    label: 'Capstone 2',
    sublabel: 'System Dev & Demo (ADM v2)',
    tag: 'Phase 2',
    icon: Code2,
    hasADM: true,
  },
  {
    id: 4,
    label: 'Capstone 3',
    sublabel: 'Final Defense & Archival',
    tag: 'Phase 3',
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
  className,
}) {
  let navigate = () => {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    // Fallback for isolated test environments without Router context
  }

  const activeStep = typeof currentStep === 'number' ? currentStep : resolveCurrentStep(project);
  const isArchived =
    project?.projectStatus === 'archived' || project?.isArchived || activeStep >= 4;

  const titleStatus = project?.titleStatus;
  const titleApproved =
    titleStatus === TITLE_STATUSES.APPROVED ||
    titleStatus === 'approved' ||
    titleStatus === 'title_approved';

  const hasPanelists =
    (project?.panelistIds?.length || 0) > 0 || (project?.committee?.panelists?.length || 0) > 0;

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
        'w-full rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 p-5 sm:p-7 shadow-xs min-w-0 transition-all relative overflow-hidden',
        className,
      )}
    >
      {/* Subtle top accent border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />

      {/* Merged Executive Title Header (Image 2) */}
      {project && (
        <div className="space-y-4 pb-6 border-b border-border/50">
          {/* Top Badges & Context Row */}
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
              {project.projectStatus && <ProjectStatusBadge status={project.projectStatus} />}
              {project.defenseSchedule?.status && project.defenseSchedule.status !== 'none' && (
                <DefenseScheduleBadge defenseSchedule={project.defenseSchedule} showTime />
              )}
            </div>

            {isStudent ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/project/approval')}
                className="text-xs font-medium text-secondary hover:text-foreground gap-1.5 h-8 px-3"
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
          </div>

          {/* Executive Title */}
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {displayTitle}
            </h2>
          </div>

          {/* Bottom Metadata Pills */}
          <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-secondary">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary/80" />
              <span className="font-semibold text-foreground">{teamDisplayName}</span>
            </div>

            {project.academicYear && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-secondary" />
                <span>AY {project.academicYear}</span>
              </div>
            )}

            {project.teamId?.section && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                <span>Section {project.teamId.section}</span>
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
          </div>
        </div>
      )}

      {/* Header Bar: Section Title & Global Lifecycle Metrics */}
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50',
          project && 'pt-5',
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
      <div className="mt-6 overflow-x-auto pb-2 pt-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
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
                  : 'Title has been formally approved. Assign defense committee panelists in the right sidebar to enable defense scheduling.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CapstoneWorkflowStepper.propTypes = {
  currentStep: PropTypes.number,
  project: PropTypes.object,
  onStepClick: PropTypes.func,
  onSelectProposal: PropTypes.func,
  isStudent: PropTypes.bool,
  onScheduleDefense: PropTypes.func,
  className: PropTypes.string,
};
