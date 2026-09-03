import React from 'react';
import PropTypes from 'prop-types';
import { Users, Search, FileText, Code2, Award, CheckCircle2, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CAPSTONE_PHASES, PROJECT_STATUSES } from '@cms/shared';

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
    label: 'Capstone 1',
    sublabel: 'Title & Similarity Scan',
    tag: 'Phase 1',
    icon: Search,
    hasADM: false,
  },
  {
    id: 2,
    label: 'Capstone 2',
    sublabel: 'Chapters 1–3 & ADM (v1)',
    tag: 'Phase 2',
    icon: FileText,
    hasADM: true,
  },
  {
    id: 3,
    label: 'Capstone 3',
    sublabel: 'System Dev & ADM (v2)',
    tag: 'Phase 3',
    icon: Code2,
    hasADM: true,
  },
  {
    id: 4,
    label: 'Capstone 4',
    sublabel: 'Final Defense & Archive',
    tag: 'Phase 4',
    icon: Award,
    hasADM: true,
  },
];

export function resolveCurrentStep(project) {
  if (!project) return 0;

  const status = project.projectStatus || project.status;
  if (status === PROJECT_STATUSES.DEFENDED || status === 'archived' || project.isArchived) {
    return 4;
  }

  const phase = Number(project.capstonePhase ?? project.phase ?? 0);
  if (phase >= CAPSTONE_PHASES.PHASE_4) return 4;
  if (phase >= CAPSTONE_PHASES.PHASE_3) return 3;
  if (phase >= CAPSTONE_PHASES.PHASE_2) return 2;
  if (phase >= CAPSTONE_PHASES.PHASE_1) return 1;

  if (project.titleStatus === 'approved' || project.titleStatus === 'title_approved') {
    return 1;
  }

  return 0;
}

/**
 * CapstoneWorkflowStepper — Modern milestone card stepper for the 5-phase capstone lifecycle.
 * Replaces legacy giant dots with responsive, contextual cards.
 */
export default function CapstoneWorkflowStepper({ currentStep, project, onStepClick, className }) {
  const activeStep = typeof currentStep === 'number' ? currentStep : resolveCurrentStep(project);

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-border/60 bg-card p-4 shadow-xs min-w-0',
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {CAPSTONE_STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.id < activeStep;
          const isCurrent = step.id === activeStep;
          const isUpcoming = step.id > activeStep;

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
                'relative flex flex-col justify-between rounded-lg border p-3 transition-all min-w-0',
                onStepClick && 'cursor-pointer hover:border-primary/50',
                isCompleted && 'border-primary/30 bg-primary/5 dark:bg-primary/10',
                isCurrent && 'border-primary ring-1 ring-primary/80 bg-background shadow-xs',
                isUpcoming && 'border-border/40 bg-muted/20 opacity-65',
              )}
            >
              {/* Header: Tag + Status Indicator */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {step.tag}
                </span>
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden xl:inline">Completed</span>
                  </span>
                )}
                {isCurrent && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Clock className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                    <span className="hidden xl:inline">Active</span>
                  </span>
                )}
                {isUpcoming && <Lock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
              </div>

              {/* Body: Icon + Labels */}
              <div className="my-2.5 flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
                    isCompleted && 'border-primary/30 bg-primary/10 text-primary',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isUpcoming && 'border-border/60 bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{step.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{step.sublabel}</p>
                </div>
              </div>

              {/* Progress Line */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60 mt-1">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    isCompleted && 'w-full bg-emerald-500',
                    isCurrent && 'w-3/5 bg-primary',
                    isUpcoming && 'w-0',
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

CapstoneWorkflowStepper.propTypes = {
  currentStep: PropTypes.number,
  project: PropTypes.object,
  onStepClick: PropTypes.func,
  className: PropTypes.string,
};
