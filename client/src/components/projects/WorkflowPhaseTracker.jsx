import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

/**
 * Workflow phases for the Capstone lifecycle.
 * Each phase has a key, label, and a function to determine if it is complete / active.
 */
const PHASES = [
  {
    key: 'team',
    label: 'Team Formation',
    isComplete: (project) => !!project?.team,
  },
  {
    key: 'title',
    label: 'Title Approval',
    isComplete: (project) => project?.titleStatus === TITLE_STATUSES.APPROVED,
  },
  {
    key: 'chapters',
    label: 'Chapters 1–3',
    isComplete: (project) =>
      project?.status === PROJECT_STATUSES.PROPOSAL_SUBMITTED ||
      project?.status === PROJECT_STATUSES.PROPOSAL_APPROVED,
  },
  {
    key: 'proposal',
    label: 'Full Proposal',
    isComplete: (project) => project?.status === PROJECT_STATUSES.PROPOSAL_APPROVED,
  },
  {
    key: 'development',
    label: 'Development',
    isComplete: () => false, // Capstone 2 & 3 — future sprints
  },
  {
    key: 'defense',
    label: 'Final Defense',
    isComplete: () => false, // Capstone 4 — future sprints
  },
];

/**
 * Determine which phase index is currently active based on the first incomplete phase.
 */
function getActivePhaseIndex(project) {
  if (!project) return 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (!PHASES[i].isComplete(project)) return i;
  }
  return PHASES.length; // all complete
}

/**
 * WorkflowPhaseTracker — A horizontal stepper showing capstone lifecycle phases.
 *
 * Highlights completed phases with a check icon and the current phase as active.
 * Works in both light and dark modes using CSS variables.
 *
 * @param {{ project: Object }} props
 */
export default function WorkflowPhaseTracker({ project }) {
  const activeIndex = getActivePhaseIndex(project);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-max items-center gap-1 py-2">
        {PHASES.map((phase, idx) => {
          const isComplete = idx < activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div key={phase.key} className="flex items-center">
              {/* Phase node */}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isComplete
                    ? 'bg-primary/15 text-primary'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="whitespace-nowrap">{phase.label}</span>
              </div>

              {/* Connector arrow (not after last phase) */}
              {idx < PHASES.length - 1 && (
                <ArrowRight
                  className={`mx-1 h-3.5 w-3.5 shrink-0 ${
                    idx < activeIndex ? 'text-primary' : 'text-muted-foreground/40'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
