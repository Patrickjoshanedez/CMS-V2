import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { X, FileText, Users, Layers, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/**
 * SimilarProjectModal — interactive preview modal for archived capstone projects.
 *
 * Provides immediate context (abstract, scope/beneficiary, tech stack,
 * and divergence recommendations) so proponents understand why a title
 * overlaps with their pitch and how to differentiate it.
 *
 * @param {Object} props
 * @param {Object|null} props.project - The matched project metadata object.
 * @param {Function} props.onClose - Callback to close the preview modal.
 * @param {boolean} [props.portal=true] - Render via React portal (false for tests).
 */
export default function SimilarProjectModal({ project, onClose, portal = true }) {
  useEffect(() => {
    if (!project) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const scorePct =
    project.similarityScore ??
    (typeof project.score === 'number' ? Math.round(project.score * 100) : 0);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="similar-project-modal-title"
      data-testid="similar-project-modal"
    >
      <div
        className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-muted/30">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-md">
                {scorePct}% Title Match
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Academic Year {project.academicYear || '2023–2024'}
              </span>
            </div>
            <h3
              id="similar-project-modal-title"
              className="text-base font-semibold text-foreground leading-snug"
            >
              {project.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/80 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
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

          {/* Institutional Divergence Recommendation */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block mb-0.5 text-amber-900 dark:text-amber-300">
                Divergence Recommendation:
              </span>
              To pass title defense and proposal clearance, adjust your problem scope, target
              agency, or architectural approach so it does not duplicate this archived work.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Archived Institutional Capstone Record
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
          </div>
        </div>
      </div>
    </div>
  );

  if (!portal || typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}

SimilarProjectModal.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    similarityScore: PropTypes.number,
    score: PropTypes.number,
    academicYear: PropTypes.string,
    abstract: PropTypes.string,
    targetBeneficiary: PropTypes.string,
    targetUsers: PropTypes.string,
    techStack: PropTypes.arrayOf(PropTypes.string),
  }),
  onClose: PropTypes.func.isRequired,
  portal: PropTypes.bool,
};
