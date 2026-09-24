import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import {
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { PROJECT_STATUSES, TITLE_STATUSES } from '@cms/shared';
import { cn } from '@/lib/utils';

/**
 * Resolves the institutional phase badge metadata.
 */
function getPhaseBadgeConfig(numericPhase, isProposalPhase) {
  if (numericPhase === 1 || isProposalPhase) {
    return {
      label: 'Phase 1: Title Defense',
      icon: Sparkles,
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    };
  }
  if (numericPhase === 2) {
    return {
      label: 'Phase 2: Manuscripts',
      icon: BookOpen,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    };
  }
  if (numericPhase === 3) {
    return {
      label: 'Phase 3: System Dev',
      icon: Layers,
      className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    };
  }
  return {
    label: 'Phase 4: Final Defense',
    icon: GraduationCap,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  };
}

/**
 * Resolves contextual action button label based on capstone phase.
 */
function getActionLabel(numericPhase, isProposalPhase) {
  if (isProposalPhase || numericPhase === 1) return 'Deliberate Proposals';
  if (numericPhase === 2) return 'Review Manuscript & ADM';
  if (numericPhase === 3) return 'Inspect Prototype & Gantt';
  return 'Review Final Defense';
}

/**
 * ProjectCohortCard — High-performance memoized card for cohort project listings.
 *
 * Prevents unnecessary re-renders when parent page states (search filter, pagination) mutate.
 */
const ProjectCohortCard = memo(function ProjectCohortCard({
  project,
  isHighlighted = false,
  highlightedRef = null,
  onNavigate,
}) {
  if (!project) return null;

  const isArchived =
    Boolean(project.isArchived) || project.projectStatus === PROJECT_STATUSES.ARCHIVED;
  const numericPhase = Number(project.capstonePhase ?? 1);
  const isProposalPhase = !isArchived && project.titleStatus !== TITLE_STATUSES.APPROVED;

  // Defensive Entity Prefix Normalization (AGENTS.md Rule 14)
  const rawTeamName = project.teamId?.name || 'Team';
  const cleanTeamName = rawTeamName.replace(/^Team\s+/i, '').trim();
  const proposalCount = Array.isArray(project.titleProposals) ? project.titleProposals.length : 0;

  const displayTitle = isArchived
    ? project.title
    : isProposalPhase
      ? `Team ${cleanTeamName} Title Proposal`
      : project.title;

  const isActionNeeded =
    project.titleStatus === TITLE_STATUSES.SUBMITTED ||
    project.titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
    project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION;

  const phaseConfig = getPhaseBadgeConfig(numericPhase, isProposalPhase);
  const PhaseIcon = phaseConfig.icon;
  const actionLabel = getActionLabel(numericPhase, isProposalPhase);

  // Proponents & Committee
  const members = project.teamId?.members || [];
  const leader = members.find((m) => m._id === project.teamId?.leaderId) || members[0];
  const leaderName = leader ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim() : '';
  const memberCount = members.length;

  const adviser = project.adviserId;
  const adviserName = adviser ? `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim() : '';

  // Contextual Review Callout
  let calloutBanner = null;
  if (project.titleStatus === TITLE_STATUSES.SUBMITTED) {
    calloutBanner = (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-xs">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>
            {proposalCount} candidate proposal{proposalCount !== 1 ? 's' : ''} submitted
          </strong>{' '}
          — Awaiting instructor deliberation & rubric evaluation.
        </span>
      </div>
    );
  } else if (project.titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
    calloutBanner = (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Title Revision Required</strong> — Awaiting updated title submission from
          proponents.
        </span>
      </div>
    );
  } else if (project.titleStatus === TITLE_STATUSES.APPROVED) {
    calloutBanner = (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Title Approved</strong> — Project unlocked for manuscript, prototype, and defense
          workflow.
        </span>
      </div>
    );
  }

  const handleCardClick = () => {
    onNavigate?.(project._id);
  };

  return (
    <Card
      ref={isHighlighted ? highlightedRef : undefined}
      onClick={handleCardClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer',
        isActionNeeded && 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
        isHighlighted && 'ring-2 ring-primary/40 bg-primary/5',
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
        {/* 1. Top Badges & Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Phase Pill */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs',
                phaseConfig.className,
              )}
            >
              <PhaseIcon className="h-3 w-3 shrink-0" />
              <span>{phaseConfig.label}</span>
            </span>

            {/* Academic Year & Section */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/80 text-muted-foreground border border-border/50 font-mono">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{project.academicYear || '2024-2025'}</span>
              {project.sectionId?.name && <span>• {project.sectionId.name}</span>}
            </span>

            {/* Team Name */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/80 text-muted-foreground border border-border/50 font-medium">
              <Users className="h-3 w-3 shrink-0" />
              <span>Team {cleanTeamName}</span>
            </span>
          </div>

          {/* Right: Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isArchived && <TitleStatusBadge status={project.titleStatus} />}
            <ProjectStatusBadge status={project.projectStatus} />
          </div>
        </div>

        {/* 2. Main Title & Review Banner */}
        <div className="space-y-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {displayTitle}
            </h3>
            {isProposalPhase && project.title && project.title !== displayTitle && (
              <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                Candidate Focus: {project.title}
              </p>
            )}
          </div>

          {/* Review Context Callout Banner */}
          {calloutBanner}
        </div>

        {/* 3. Bottom Roster, Adviser & Action Trigger Row */}
        <div className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-muted-foreground">
          {/* Roster & Adviser Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Members */}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span>
                {leaderName ? (
                  <strong className="text-foreground">{leaderName} (Lead)</strong>
                ) : (
                  'Team'
                )}
                {memberCount > 1 && (
                  <span>
                    {' '}
                    + {memberCount - 1} member{memberCount > 2 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>

            {/* Adviser */}
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              {adviserName ? (
                <span>
                  Adviser: <strong className="text-foreground">{adviserName}</strong>
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> Adviser Unassigned
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-semibold gap-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 self-end sm:self-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.(project._id);
            }}
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ProjectCohortCard.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    titleStatus: PropTypes.string,
    projectStatus: PropTypes.string,
    capstonePhase: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    academicYear: PropTypes.string,
    isArchived: PropTypes.bool,
    titleProposals: PropTypes.array,
    teamId: PropTypes.shape({
      name: PropTypes.string,
      leaderId: PropTypes.string,
      members: PropTypes.array,
      section: PropTypes.string,
    }),
    sectionId: PropTypes.shape({
      name: PropTypes.string,
    }),
    adviserId: PropTypes.shape({
      _id: PropTypes.string,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      fullName: PropTypes.string,
    }),
  }).isRequired,
  isHighlighted: PropTypes.bool,
  highlightedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  onNavigate: PropTypes.func.isRequired,
};

export default ProjectCohortCard;
