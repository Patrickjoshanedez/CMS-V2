import React from 'react';
import { Users, FileText, BookOpen, Code2, PenTool, ShieldCheck, Check } from 'lucide-react';
import { TITLE_STATUSES, PROJECT_STATUSES, CAPSTONE_PHASES } from '@cms/shared';

/**
 * Workflow phases for the Capstone lifecycle with corresponding icons.
 */
const PHASES = [
  {
    key: 'team',
    label: 'Team Formation',
    icon: Users,
    isComplete: (project) => Boolean(getTeamValue(project)),
  },
  {
    key: 'title',
    label: 'Title Proposal',
    icon: FileText,
    isComplete: (project) => project?.titleStatus === TITLE_STATUSES.APPROVED,
  },
  {
    key: 'capstone_1',
    label: 'Capstone 1 (Ch 1-3)',
    icon: BookOpen,
    isComplete: (project) => getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_2,
  },
  {
    key: 'capstone_2',
    label: 'Capstone 2 (Development)',
    icon: Code2,
    isComplete: (project) => getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_3,
  },
  {
    key: 'capstone_3',
    label: 'Capstone 3 (Ch 4-5)',
    icon: PenTool,
    isComplete: (project) => getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_4,
  },
  {
    key: 'defense',
    label: 'Final Defense',
    icon: ShieldCheck,
    isComplete: (project) => getProjectStatus(project) === PROJECT_STATUSES.DEFENDED,
  },
];

function getTeamValue(project) {
  return project?.teamId ?? project?.team ?? null;
}

function getProjectStatus(project) {
  return project?.projectStatus ?? project?.status ?? null;
}

function getCapstonePhase(project) {
  return Number(project?.capstonePhase ?? project?.phase ?? 0) || 0;
}

function getActivePhaseIndex(project) {
  if (!project) return 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (!PHASES[i].isComplete(project)) return i;
  }
  return PHASES.length;
}

/**
 * WorkflowPhaseTracker — A sleek, glowing horizontal stepper.
 */
export default function WorkflowPhaseTracker({ project }) {
  const activeIndex = getActivePhaseIndex(project);
  const totalPhases = PHASES.length;

  // Calculate progress percentage for the glowing line
  // If activeIndex is totalPhases (all done), it's 100%.
  // Otherwise, it reaches the current active node.
  const progressPercentage = (activeIndex / (totalPhases - 1)) * 100;

  return (
    <div className="w-full py-8 px-4">
      <div className="relative flex justify-between items-center max-w-4xl mx-auto">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted/30 -translate-y-1/2 z-0" />

        {/* Progress Line (Glowing) */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary transition-all duration-1000 ease-in-out -translate-y-1/2 z-0"
          style={{
            width: `${Math.min(progressPercentage, 100)}%`,
            boxShadow: '0 0 15px var(--primary), 0 0 5px var(--primary)',
          }}
        />

        {PHASES.map((phase, idx) => {
          const isComplete = idx < activeIndex;
          const isActive = idx === activeIndex;
          const Icon = phase.icon;

          return (
            <div key={phase.key} className="relative z-10 flex flex-col items-center group">
              {/* Node Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  isComplete
                    ? 'bg-primary border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'
                    : isActive
                      ? 'bg-background border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)] animate-pulse'
                      : 'bg-background border-muted text-muted-foreground'
                }`}
              >
                {isComplete ? (
                  <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-colors duration-500 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="absolute -bottom-10 flex flex-col items-center w-32">
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold text-center transition-colors duration-500 ${
                    isActive || isComplete ? 'text-foreground' : 'text-muted-foreground/60'
                  }`}
                >
                  {phase.label}
                </span>
                {isActive && (
                  <span className="text-[9px] text-primary font-medium animate-bounce mt-0.5">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Spacer for labels */}
      <div className="h-10" />
    </div>
  );
}
