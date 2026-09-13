import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import TitleStatusBadge from './TitleStatusBadge';
import ProjectStatusBadge from './ProjectStatusBadge';
import DefenseScheduleBadge from '@/components/defense/DefenseScheduleBadge';
import { TITLE_STATUSES, CAPSTONE_PHASES } from '@cms/shared';
import { Users, Calendar, GraduationCap, UserCheck, FileText, Sparkles } from 'lucide-react';

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
  if (num >= CAPSTONE_PHASES.PHASE_4) {
    return isADMApproved ? 'Phase 4: Final Defense & Archival' : 'Phase 2: Chapters 1–3 & ADM';
  }
  if (num >= CAPSTONE_PHASES.PHASE_3) {
    return isADMApproved ? 'Phase 3: System Dev & Progress' : 'Phase 2: Chapters 1–3 & ADM';
  }
  if (num >= CAPSTONE_PHASES.PHASE_2) return 'Phase 2: Chapters 1–3 Manuscript';
  if (num >= CAPSTONE_PHASES.PHASE_1) return 'Phase 1: Title Defense';
  return 'Phase 0: Team Formation';
}

/**
 * ProjectTitleCard — Executive hero title header card used by both
 * MyProjectPage (student) and ProjectDetailPage (instructor).
 */
export default function ProjectTitleCard({ project, showAction = true }) {
  const navigate = useNavigate();
  if (!project) return null;

  const teamDisplayName = cleanTeamName(project.teamId?.name);
  const isApproved = project.titleStatus === TITLE_STATUSES.APPROVED;

  const displayTitle = !isApproved
    ? `${teamDisplayName} Capstone Proposal`
    : project.title || 'Pending Title Approval';

  const adviserName =
    project.adviserId?.fullName ||
    (project.adviserId?.firstName
      ? `${project.adviserId.firstName} ${project.adviserId.lastName || ''}`.trim()
      : null);

  const phaseLabel = getPhaseLabel(project.capstonePhase ?? project.phase, project);

  return (
    <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 shadow-xs relative overflow-hidden">
      {/* Subtle top accent border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />

      <CardContent className="p-6 sm:p-7 space-y-4">
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

          {showAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/project/approval')}
              className="text-xs font-medium text-secondary hover:text-foreground gap-1.5 h-8 px-3"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Proposals & Rehearsal</span>
            </Button>
          )}
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
      </CardContent>
    </Card>
  );
}

ProjectTitleCard.propTypes = {
  project: PropTypes.object,
  showAction: PropTypes.bool,
};
