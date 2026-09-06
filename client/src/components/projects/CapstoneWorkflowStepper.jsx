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
 * CapstoneWorkflowStepper — Modern milestone progress pipeline for the 5-phase capstone lifecycle.
 * Features a continuous connected progress track, animated completion line, distinct milestone nodes,
 * and interactive tab switching.
 */
export default function CapstoneWorkflowStepper({ currentStep, project, onStepClick, className }) {
  const activeStep = typeof currentStep === 'number' ? currentStep : resolveCurrentStep(project);
  const isArchived =
    project?.projectStatus === 'archived' || project?.isArchived || activeStep >= 4;
  const currentStepObj =
    CAPSTONE_STEPS[Math.min(activeStep, CAPSTONE_STEPS.length - 1)] || CAPSTONE_STEPS[0];
  const progressPercent = Math.min(
    100,
    Math.max(0, (activeStep / (CAPSTONE_STEPS.length - 1)) * 100),
  );

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs min-w-0 transition-all',
        className,
      )}
    >
      {/* Header Bar: Section Title & Global Lifecycle Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
              Capstone Milestone Progression
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            BukSU Institutional 4-Phase Capstone Lifecycle & Deliverable Milestones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Current: {currentStepObj.tag} ({currentStepObj.label})
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {isArchived ? '100% Completed' : `${Math.round(progressPercent)}% Completed`}
          </span>
        </div>
      </div>

      {/* Connected Milestone Pipeline Track */}
      <div className="mt-6 overflow-x-auto pb-2 pt-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
        <div className="relative min-w-[580px] px-5 sm:px-8 py-2">
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
                        'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/25 ring-offset-2 ring-offset-background scale-110',
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
                        isCurrent && 'bg-primary/10 text-primary font-extrabold',
                        isCompleted && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        isUpcoming && 'text-muted-foreground/70 bg-muted/40',
                      )}
                    >
                      {step.tag}
                    </span>

                    <p
                      className={cn(
                        'text-xs font-semibold leading-tight pt-1 break-words line-clamp-1 w-full',
                        isCurrent && 'text-primary font-bold',
                        isCompleted && 'text-foreground',
                        isUpcoming && 'text-muted-foreground/80',
                      )}
                      title={step.label}
                    >
                      {step.label}
                    </p>

                    <p
                      className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-full hidden sm:block"
                      title={step.sublabel}
                    >
                      {step.sublabel}
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
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
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
    </div>
  );
}

CapstoneWorkflowStepper.propTypes = {
  currentStep: PropTypes.number,
  project: PropTypes.object,
  onStepClick: PropTypes.func,
  className: PropTypes.string,
};
