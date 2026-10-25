import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  FileText,
  Users,
  Layers,
  ExternalLink,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Globe,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

/**
 * SimilarProjectModal — interactive preview modal for archived capstone projects
 * and existing candidate proposal titles.
 *
 * Provides immediate context (stage, proposal pitch fields or abstract, scope/beneficiary,
 * tech stack, disciplines/SDGs, and divergence recommendations) so proponents understand
 * why a title overlaps with their pitch and how to differentiate it.
 *
 * @param {Object} props
 * @param {Object|null} props.project - The matched project metadata object.
 * @param {Function} props.onClose - Callback to close the preview modal.
 * @param {boolean} [props.portal=true] - Render via React portal (false for tests).
 */
export default function SimilarProjectModal({ project, onClose, portal = true }) {
  const stageInfo = useMemo(() => {
    if (!project) {
      return {
        label: 'Capstone Record',
        badgeVariant: 'secondary',
        isArchived: false,
        isProposal: false,
      };
    }

    if (
      project.projectStatus === 'archived' ||
      project.status === 'ARCHIVED' ||
      project.isArchived
    ) {
      return {
        label: 'Archived Manuscript',
        badgeVariant: 'info',
        isArchived: true,
        isProposal: false,
      };
    }

    const phase = Number(project.capstonePhase);
    if (phase === 4) {
      return {
        label: 'Final Capstone (Oral Defense)',
        badgeVariant: 'success',
        isArchived: false,
        isProposal: false,
      };
    }
    if (phase === 3) {
      return {
        label: 'Capstone 3: Progress Defense',
        badgeVariant: 'info',
        isArchived: false,
        isProposal: false,
      };
    }
    if (phase === 2) {
      return {
        label: 'Capstone 2: Midterm Defense',
        badgeVariant: 'warning',
        isArchived: false,
        isProposal: false,
      };
    }
    if (phase === 1) {
      return {
        label: 'Capstone 1: Proposal Stage',
        badgeVariant: 'info',
        isArchived: false,
        isProposal: true,
      };
    }

    // Default tiebreakers when capstonePhase is null, 0, or unexpected:
    // If project has formal abstract or techStack, it represents an archived/completed manuscript
    if (project.abstract || (Array.isArray(project.techStack) && project.techStack.length > 0)) {
      return {
        label: 'Archived Manuscript',
        badgeVariant: 'info',
        isArchived: true,
        isProposal: false,
      };
    }

    // Fallback safe default: Capstone 1 Proposal Stage
    return {
      label: 'Capstone 1: Proposal Stage',
      badgeVariant: 'info',
      isArchived: false,
      isProposal: true,
    };
  }, [project]);

  if (!project) return null;

  const scorePct =
    project.similarityScore ??
    (typeof project.score === 'number' ? Math.round(project.score * 100) : 0);

  const pitchDeck = project.pitchDeck || {};
  const hasPitchDeck =
    Boolean(
      project.pitchDeck &&
      Object.values(project.pitchDeck).some((v) => typeof v === 'string' && v.trim().length > 0),
    ) || Boolean(project.problemStatement || project.proposedSolution);

  // Unambiguous content precedence:
  // 1. Capstone 1 Proposal (stageInfo.isProposal) -> 6-Section BukSU Pitch Deck view wins.
  // 2. Capstone 2–4 or Archived Manuscript -> Formal Academic Abstract view wins.
  // 3. Fallback when both or neither exist -> Pitch deck wins if pitch fields exist, else Abstract.
  const isProposalMode = stageInfo.isProposal
    ? true
    : stageInfo.isArchived || Number(project.capstonePhase) >= 2
      ? false
      : hasPitchDeck;

  const problemStatement =
    project.problemStatement ||
    pitchDeck.problemStatement ||
    (isProposalMode ? project.abstract || '' : '');
  const proposedSolution = project.proposedSolution || pitchDeck.proposedSolution || '';
  const uniqueContribution = project.uniqueContribution || pitchDeck.uniqueContribution || '';
  const targetUsers =
    project.targetUsers || project.targetBeneficiary || pitchDeck.targetUsers || '';
  const expectedImpact = project.expectedImpact || pitchDeck.expectedImpact || '';

  const capstoneTypes =
    Array.isArray(project.capstoneType) && project.capstoneType.length > 0
      ? project.capstoneType
      : [];
  const sdgTags =
    Array.isArray(project.sdgTags) && project.sdgTags.length > 0 ? project.sdgTags : [];

  const handleNavigateToProjectOrArchive = () => {
    onClose?.();
    if (typeof window === 'undefined') return;
    if (stageInfo.isArchived) {
      const archiveUrl = `/archive?q=${encodeURIComponent(project.title || '')}`;
      window.open(archiveUrl, '_blank', 'noopener,noreferrer');
    } else {
      const targetId = project.id || project.projectId || project._id;
      if (targetId) {
        window.open(`/projects/${targetId}`, '_blank', 'noopener,noreferrer');
      } else {
        window.open(
          `/archive?q=${encodeURIComponent(project.title || '')}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    }
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose?.()}>
      {project && (
        <DialogContent
          portal={portal}
          className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
          showClose={false}
          data-testid="similar-project-modal"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 p-4 sm:p-5">
            <DialogHeader className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning" className="font-semibold">
                  {scorePct}% Title Match
                </Badge>
                <Badge variant={stageInfo.badgeVariant} data-testid="similar-project-stage-badge">
                  {stageInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  Academic Year {project.academicYear || '2023–2024'}
                </span>
              </div>
              <DialogTitle className="break-words text-base leading-snug">
                {project.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {scorePct}% title similarity preview for {stageInfo.label}.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Content Body */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs sm:p-5 sm:text-sm">
            {/* Proposal Stage Pitch Deck Sections (Rendered if Proposal Stage or No Abstract) */}
            {isProposalMode ? (
              <div className="space-y-3.5" data-testid="proposal-stage-fields">
                {/* Problem Statement & Literature Gap */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Problem Statement & Literature Gap
                  </h4>
                  <p className="text-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/60 text-xs sm:text-sm">
                    {problemStatement ||
                      project.abstract ||
                      'No problem statement or abstract indexed for this proposal.'}
                  </p>
                </div>

                {/* Proposed Solution & Technical Framework */}
                {proposedSolution && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      Proposed Solution & Technical Framework
                    </h4>
                    <p className="text-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/60 text-xs sm:text-sm">
                      {proposedSolution}
                    </p>
                  </div>
                )}

                {/* Unique Technical Innovation */}
                {uniqueContribution && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Unique Technical Innovation
                    </h4>
                    <p className="text-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/60 text-xs sm:text-sm">
                      {uniqueContribution}
                    </p>
                  </div>
                )}

                {/* Target Beneficiaries & Expected Impact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      Target Users / Beneficiaries
                    </h4>
                    <p className="text-foreground font-medium text-xs sm:text-sm">
                      {targetUsers || 'BukSU University Library / Academic Community'}
                    </p>
                  </div>

                  <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      Expected Value / Impact
                    </h4>
                    <p className="text-foreground font-medium text-xs sm:text-sm">
                      {expectedImpact || 'Academic workflow acceleration and integrity assurance.'}
                    </p>
                  </div>
                </div>

                {/* Discipline & SDG Alignments */}
                {(capstoneTypes.length > 0 || sdgTags.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {capstoneTypes.length > 0 && (
                      <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-primary" />
                          IT Field of Discipline
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {capstoneTypes.map((type, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {sdgTags.length > 0 && (
                      <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          SDG Alignment
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {sdgTags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(project.techStack) && project.techStack.length > 0 && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Proposed Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Traditional Abstract / Scope Display for Archived Manuscripts */
              <>
                {/* Abstract / Summary */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Abstract / Project Summary
                  </h4>
                  <p className="text-foreground leading-relaxed bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs sm:text-sm">
                    {project.abstract || 'No abstract summary indexed for this archive entry.'}
                  </p>
                </div>

                {/* Scope and Tech Stack Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/20 p-3.5 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Target Beneficiary / Scope
                    </h4>
                    <p className="text-foreground font-medium mt-0.5">
                      {project.targetBeneficiary ||
                        project.targetUsers ||
                        'BukSU University Library / Academic Community'}
                    </p>
                  </div>

                  <div className="bg-muted/20 p-3.5 rounded-lg border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Implemented Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.isArray(project.techStack) && project.techStack.length > 0 ? (
                        project.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-muted text-foreground rounded border border-border font-medium"
                          >
                            {tech}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Institutional Divergence Recommendation */}
            <Alert variant="warning" className="text-xs">
              <AlertTitle>Divergence Recommendation:</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed">
                To pass title defense and proposal clearance, adjust your problem scope, target
                agency, or architectural approach so it does not duplicate this{' '}
                {stageInfo.isArchived ? 'archived work' : 'existing proposal'}.
              </AlertDescription>
            </Alert>
          </div>

          {/* Footer */}
          <DialogFooter className="flex flex-col gap-3 border-t border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Status: {stageInfo.label}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-medium"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleNavigateToProjectOrArchive}
                className="gap-1.5 text-xs font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {stageInfo.isArchived ? 'View in Archive' : 'View Project'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

SimilarProjectModal.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    similarityScore: PropTypes.number,
    score: PropTypes.number,
    academicYear: PropTypes.string,
    abstract: PropTypes.string,
    description: PropTypes.string,
    targetBeneficiary: PropTypes.string,
    targetUsers: PropTypes.string,
    techStack: PropTypes.arrayOf(PropTypes.string),
    capstonePhase: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectStatus: PropTypes.string,
    status: PropTypes.string,
    titleStatus: PropTypes.string,
    isArchived: PropTypes.bool,
    capstoneType: PropTypes.arrayOf(PropTypes.string),
    sdgTags: PropTypes.arrayOf(PropTypes.string),
    problemStatement: PropTypes.string,
    proposedSolution: PropTypes.string,
    uniqueContribution: PropTypes.string,
    expectedImpact: PropTypes.string,
    pitchDeck: PropTypes.object,
  }),
  onClose: PropTypes.func.isRequired,
  portal: PropTypes.bool,
};
