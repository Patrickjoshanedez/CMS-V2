import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import { ADM_MILESTONES, resolveAdmStatus } from './adm/admWorkflow';

const STATUS_BADGE_STYLES = {
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  review: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  muted: 'bg-transparent text-muted-foreground border-border/60',
};

function StatusIcon({ tone }) {
  if (tone === 'success') return <CheckCircle2 className="h-3 w-3" />;
  if (tone === 'info') return <ShieldCheck className="h-3 w-3" />;
  if (tone === 'muted') return null;
  return <Clock className="h-3 w-3" />;
}

StatusIcon.propTypes = { tone: PropTypes.string.isRequired };

/**
 * The one Action Done Matrix entry point for every role and every workspace.
 * Shows the milestone summary card, an inline expansion and a full-screen dialog,
 * all backed by the canonical ActionDoneMatrixTab document.
 */
export default function ActionDoneMatrixSection({
  project,
  milestone,
  isStudent = false,
  isFaculty = false,
  user,
  onRefresh,
  initialView,
  defaultInlineOpen = false,
  isModalOpen: controlledModalOpen,
  onModalOpenChange,
  className,
}) {
  const [isInlineOpen, setIsInlineOpen] = useState(defaultInlineOpen);
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const isModalControlled = typeof controlledModalOpen === 'boolean';
  const isModalOpen = isModalControlled ? controlledModalOpen : localModalOpen;
  const setModalOpen = (next) => {
    if (!isModalControlled) setLocalModalOpen(next);
    onModalOpenChange?.(next);
  };

  const meta = ADM_MILESTONES[milestone] || ADM_MILESTONES.CAPSTONE_2;
  const status = resolveAdmStatus(project, meta.id);

  const summary =
    status.total > 0
      ? `${status.total} panel remark${status.total === 1 ? '' : 's'} recorded • ${status.addressed}/${status.total} addressed • ${status.verified}/${status.total} verified by committee`
      : `Official BukSU Form RU-F-033 — ${meta.caption}, action taken citations, and committee sign-off.`;

  const tab = (
    <ActionDoneMatrixTab
      project={project}
      isStudent={isStudent}
      isFaculty={isFaculty}
      user={user}
      onRefresh={onRefresh}
      initialMilestone={meta.id}
      initialView={initialView}
    />
  );

  return (
    <Card
      className={cn(
        'transition-colors duration-200 print:border-none print:shadow-none print:bg-transparent',
        status.total > 0 || status.key === 'approved'
          ? 'border-primary/20 bg-primary/[0.02]'
          : 'border-border/70 bg-card/40',
        className,
      )}
      data-testid="adm-section-card"
      data-milestone={meta.id}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Action Done Matrix (ADM)</p>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  {meta.pillLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('gap-1 text-[10px] font-medium', STATUS_BADGE_STYLES[status.tone])}
                  data-testid="adm-status-badge"
                >
                  <StatusIcon tone={status.tone} />
                  {status.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInlineOpen((prev) => !prev)}
              className="gap-1.5 text-xs border-border/60 hover:bg-muted"
              data-testid="toggle-adm-inline-btn"
              aria-expanded={isInlineOpen}
              aria-label={isInlineOpen ? 'Collapse ADM Matrix' : 'Expand ADM Matrix'}
            >
              {isInlineOpen ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Expand Inline</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-1.5 text-xs border-border/60 hover:bg-muted font-medium"
              data-testid="view-adm-btn"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              <span>View ADM</span>
            </Button>
          </div>
        </div>

        {isInlineOpen && !isModalOpen && (
          <div
            className="pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200 print:border-none print:pt-0"
            data-testid="adm-inline-container"
          >
            {tab}
          </div>
        )}
      </CardContent>

      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-viewer-dialog-title"
          >
            <div className="relative flex flex-col w-full max-w-7xl max-h-[92vh] rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0 no-print">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="adm-viewer-dialog-title"
                      className="text-base font-bold text-foreground"
                    >
                      {meta.longLabel}: Action Done Matrix (ADM)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Official BukSU Form RU-F-033 — Panel Recommendations, Action Taken, and
                      Committee Digital Signatures.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close ADM Dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pt-4 min-h-0">{tab}</div>
            </div>
          </div>,
          document.body,
        )}
    </Card>
  );
}

ActionDoneMatrixSection.propTypes = {
  project: PropTypes.object,
  milestone: PropTypes.oneOf(Object.keys(ADM_MILESTONES)).isRequired,
  isStudent: PropTypes.bool,
  isFaculty: PropTypes.bool,
  user: PropTypes.object,
  onRefresh: PropTypes.func,
  initialView: PropTypes.oneOf(['adm', 'minutes']),
  defaultInlineOpen: PropTypes.bool,
  isModalOpen: PropTypes.bool,
  onModalOpenChange: PropTypes.func,
  className: PropTypes.string,
};
