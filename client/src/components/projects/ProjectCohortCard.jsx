import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
import { usePrefetchProject } from '@/hooks/useProjects';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * Resolves the institutional phase badge metadata.
 */
function getPhaseBadgeConfig(numericPhase, isProposalPhase) {
  if (isProposalPhase) {
    return {
      label: 'Phase 1: Topic Proposals',
      icon: Sparkles,
      variant: 'warning',
    };
  }
  if (numericPhase === 1) {
    return {
      label: 'Capstone 1: Proposal Manuscript',
      icon: BookOpen,
      variant: 'info',
    };
  }
  if (numericPhase === 2) {
    return {
      label: 'Capstone 2: System Development',
      icon: Layers,
      variant: 'info',
    };
  }
  if (numericPhase >= 3) {
    return {
      label: 'Capstone 3: Final Manuscript & Defense',
      icon: GraduationCap,
      variant: 'success',
    };
  }
  return {
    label: 'Capstone 1: Proposal Manuscript',
    icon: BookOpen,
    variant: 'info',
  };
}

/**
 * Resolves contextual action button label based on capstone phase.
 */
function getActionLabel(numericPhase, isProposalPhase) {
  if (isProposalPhase) return 'Review Title Proposals';
  if (numericPhase === 1) return 'Review Chapters & ADM';
  if (numericPhase === 2) return 'Inspect Prototype & Gantt';
  return 'Review Final Defense & Archive';
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
  const prefetchProject = usePrefetchProject();

  if (!project) return null;

  const isArchived =
    Boolean(project.isArchived) || project.projectStatus === PROJECT_STATUSES.ARCHIVED;
  const numericPhase = Number(project.capstonePhase ?? 1);
  const isProposalPhase = !isArchived && project.titleStatus !== TITLE_STATUSES.APPROVED;

  // Defensive Entity Prefix Normalization (AGENTS.md Rule 14)
  const rawTeamName = project.teamId?.name || 'Team';
  const cleanTeamName = rawTeamName.replace(/^(?:Team\s+)+/i, '').trim();
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
      <Badge
        variant="warning"
        role="status"
        className="w-fit max-w-full items-start gap-1.5 whitespace-normal rounded-md border px-2.5 py-1 text-left text-xs leading-5"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>
            {proposalCount} candidate proposal{proposalCount !== 1 ? 's' : ''} submitted
          </strong>{' '}
          — Awaiting instructor deliberation & rubric evaluation.
        </span>
      </Badge>
    );
  } else if (project.titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
    calloutBanner = (
      <Badge
        variant="destructive"
        role="status"
        className="w-fit max-w-full items-start gap-1.5 whitespace-normal rounded-md border px-2.5 py-1 text-left text-xs leading-5"
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Title Revision Required</strong> — Awaiting updated title submission from
          proponents.
        </span>
      </Badge>
    );
  } else if (project.titleStatus === TITLE_STATUSES.APPROVED) {
    calloutBanner = (
      <Badge
        variant="success"
        role="status"
        className="w-fit max-w-full items-start gap-1.5 whitespace-normal rounded-md border px-2.5 py-1 text-left text-xs leading-5"
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Title Approved</strong> — Project unlocked for manuscript, prototype, and defense
          workflow.
        </span>
      </Badge>
    );
  }

  const handleCardClick = () => {
    onNavigate?.(project._id);
  };

  const handleCardKeyDown = (event) => {
    if (event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const handleWarmup = () => {
    prefetchRoute(`/projects/${project._id}`);
    prefetchProject(project._id);
  };

  return (
    <Card
      ref={isHighlighted ? highlightedRef : undefined}
      role="link"
      tabIndex={0}
      aria-label={`Open project: ${displayTitle}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={handleWarmup}
      onFocus={handleWarmup}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer',
        isActionNeeded && 'border-warning/60 ring-1 ring-warning/20 bg-warning/5',
        isHighlighted && 'ring-2 ring-primary/40 bg-primary/5',
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
        {/* 1. Top Badges & Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
            {/* Phase Pill */}
            <Badge
              variant={phaseConfig.variant}
              className="gap-1 rounded-full border px-2.5 py-0.5 text-[11px] shadow-2xs"
            >
              <PhaseIcon className="h-3 w-3 shrink-0" />
              <span>{phaseConfig.label}</span>
            </Badge>

            {/* Academic Year & Section */}
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-border/60 bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-normal text-muted-foreground"
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{project.academicYear || '2024-2025'}</span>
              {project.sectionId?.name && <span>• {project.sectionId.name}</span>}
            </Badge>

            {/* Team Name */}
            <Badge
              variant="outline"
              className="min-w-0 max-w-full gap-1 rounded-full border-border/60 bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <Users className="h-3 w-3 shrink-0" />
              <span className="min-w-0 break-all">Team {cleanTeamName}</span>
            </Badge>
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
            <h3 className="break-words text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
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
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-1">
            {/* Members */}
            <div className="flex min-w-0 max-w-full items-center gap-1.5 break-all">
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
            <div className="flex min-w-0 max-w-full items-center gap-1.5 break-all">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              {adviserName ? (
                <span>
                  Adviser: <strong className="text-foreground">{adviserName}</strong>
                </span>
              ) : (
                <span className="text-warning-foreground font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> Adviser Unassigned
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="min-h-11 h-auto max-w-full whitespace-normal px-3 py-2 text-sm font-semibold gap-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
          >
            <span data-slot="project-card-cta">
              <span>{actionLabel}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
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
