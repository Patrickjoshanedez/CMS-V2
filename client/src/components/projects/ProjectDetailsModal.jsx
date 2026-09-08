import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import TitleStatusBadge from './TitleStatusBadge';
import ProjectStatusBadge from './ProjectStatusBadge';
import { TITLE_STATUSES, CAPSTONE_PHASES } from '@cms/shared';
import {
  X,
  BookOpen,
  Users,
  User,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  FileText,
  AlertTriangle,
  Globe,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

function cleanTeamName(name) {
  if (!name) return 'Team';
  const stripped = String(name)
    .replace(/^Team\s+/i, '')
    .trim();
  return stripped ? `Team ${stripped}` : 'Team';
}

function getPhaseLabel(phase) {
  const num = Number(phase ?? 0);
  if (num >= CAPSTONE_PHASES.PHASE_4) return 'Phase 4: Final Defense & Archival';
  if (num >= CAPSTONE_PHASES.PHASE_3) return 'Phase 3: System Dev & Progress';
  if (num >= CAPSTONE_PHASES.PHASE_2) return 'Phase 2: Chapters 1–3 Manuscript';
  if (num >= CAPSTONE_PHASES.PHASE_1) return 'Phase 1: Title Defense';
  return 'Phase 0: Team Formation';
}

/**
 * ProjectDetailsModal — Modal dialog presenting complete project metadata,
 * proponent team roster with standardized capstone roles, assigned defense committee,
 * research alignments (SDGs/Keywords), external collaboration links, and approval status.
 */
export default function ProjectDetailsModal({ open, onOpenChange, project }) {
  const navigate = useNavigate();

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || !project) return null;

  const teamDisplayName = cleanTeamName(project.teamId?.name);
  const isApproved = project.titleStatus === TITLE_STATUSES.APPROVED;
  const phaseLabel = getPhaseLabel(project.capstonePhase ?? project.phase);
  const members = Array.isArray(project.teamId?.members) ? project.teamId.members : [];
  const panelistCount = Array.isArray(project.panelistIds) ? project.panelistIds.length : 0;

  const displayTitle = !isApproved
    ? `${teamDisplayName} Capstone Proposal`
    : project.title || 'Conferred Capstone Study';

  const adviserName =
    project.adviserId?.fullName ||
    (project.adviserId?.firstName
      ? `${project.adviserId.firstName} ${project.adviserId.lastName || ''}`.trim()
      : null);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-details-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-border/60 p-5 sm:p-6 bg-muted/20">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3
                id="project-details-modal-title"
                className="text-lg sm:text-xl font-bold text-foreground tracking-tight"
              >
                Project Details &amp; Approval
              </h3>
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold gap-1 py-0.5 px-2"
              >
                <Sparkles className="h-3 w-3" />
                {phaseLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              BukSU Information Technology Institutional Capstone Repository Record
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Executive Title & Context */}
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {project.titleStatus && <TitleStatusBadge status={project.titleStatus} />}
                {project.projectStatus && <ProjectStatusBadge status={project.projectStatus} />}
              </div>
              {project.academicYear && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Academic Year: {project.academicYear}</span>
                </div>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {displayTitle}
            </h2>

            {(project.abstract || project.approvedProposal?.abstract) && (
              <div className="space-y-1 pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Abstract Summary
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">
                  {project.abstract || project.approvedProposal?.abstract}
                </p>
              </div>
            )}
          </div>

          {/* Defense & Approval Status Card */}
          <div className="rounded-xl border border-border/60 p-4 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Title Defense &amp; Approval Status
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/project/approval');
                }}
                className="h-7 text-xs text-primary hover:text-primary/90 gap-1 px-2"
              >
                <span>View Full Defense Portal</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {isApproved ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Your capstone proposal was defended and approved by the panel committee.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Title proposals submitted. Defense committee review and deliberation active.
                  </span>
                </div>
              )}
            </div>

            {project.rejectionReason && (
              <Alert className="bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs">
                  <strong className="block mb-0.5">Instructor Revision Notes:</strong>
                  {project.rejectionReason}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Defense Committee Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Assigned Defense Committee
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Capstone Adviser
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {adviserName || 'Adviser Pending Appointment'}
                </p>
                {project.adviserId?.email && (
                  <p className="text-xs text-muted-foreground">{project.adviserId.email}</p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Defense Panelists
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {panelistCount > 0 ? `${panelistCount} Faculty Panelists` : 'Pending Appointment'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {panelistCount >= 3
                    ? 'REC / Chair, Panel Member 1, Panel Member 2'
                    : 'Awaiting institutional committee appointment'}
                </p>
              </div>
            </div>
          </div>

          {/* Team Roster Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Team Roster ({teamDisplayName})
              </h4>
              {project.teamId?.section && (
                <Badge variant="outline" className="text-[10px] gap-1 py-0 px-2">
                  <GraduationCap className="h-3 w-3" />
                  Section {project.teamId.section}
                </Badge>
              )}
            </div>

            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member, idx) => {
                  const memberUser = member.userId || member;
                  const memberName = memberUser.firstName
                    ? `${memberUser.firstName} ${memberUser.lastName || ''}`.trim()
                    : memberUser.fullName || memberUser.email || `Member ${idx + 1}`;
                  const isLeader =
                    (member.role === 'leader' ||
                      project.teamId?.leaderId === (memberUser._id || memberUser)) &&
                    true;
                  const proponentRole =
                    member.proponentRole || member.capstoneRole || 'Proponent Member';

                  return (
                    <div
                      key={member._id || idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/25 border border-border/50 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {memberName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{memberName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {proponentRole}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLeader && (
                          <Badge variant="default" className="h-4 px-1.5 text-[9px] font-bold">
                            Leader
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px] text-muted-foreground"
                        >
                          Member
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No team roster data recorded.</p>
            )}
          </div>

          {/* Research Alignments (SDGs & Keywords) */}
          {((project.sdgTags && project.sdgTags.length > 0) ||
            (project.keywords && project.keywords.length > 0)) && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Institutional Research Alignments
              </h4>

              {project.sdgTags?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    UN Sustainable Development Goals (SDGs):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.sdgTags.map((tag, idx) => (
                      <Badge
                        key={`${tag}-${idx}`}
                        variant="outline"
                        className="bg-muted/40 text-xs py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {project.keywords?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <Tag className="h-3 w-3" /> IT Disciplines &amp; Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs py-0.5">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* External Assets & Collaboration Links */}
          {(project.teamId?.googleDocUrl ||
            project.teamId?.githubUrl ||
            project.developmentAssets?.githubRepoUrl ||
            project.githubRepo) && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                External Assets &amp; Collaboration
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.teamId?.googleDocUrl && (
                  <Button type="button" variant="secondary" size="sm" asChild className="text-xs">
                    <a href={project.teamId.googleDocUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Team Google Doc
                    </a>
                  </Button>
                )}
                {(project.teamId?.githubUrl ||
                  project.developmentAssets?.githubRepoUrl ||
                  project.githubRepo) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-xs"
                    asChild
                  >
                    <a
                      href={
                        project.developmentAssets?.githubRepoUrl ||
                        project.teamId?.githubUrl ||
                        project.githubRepo
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      GitHub Repository
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border/60 p-4 sm:p-5 bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate('/project/approval');
            }}
            className="text-xs gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Title Proposals &amp; Approval Portal</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs px-4"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

ProjectDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  project: PropTypes.object,
};
