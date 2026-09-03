import React from 'react';
import PropTypes from 'prop-types';
import { Users, FileText, BookOpen, Code2, ShieldCheck } from 'lucide-react';
import { PROJECT_STATUSES, CAPSTONE_PHASES } from '@cms/shared';
import CapstoneWorkflowStepper, {
  resolveCurrentStep,
  CAPSTONE_STEPS,
} from './CapstoneWorkflowStepper';

export { CAPSTONE_STEPS, resolveCurrentStep };

/**
 * Legacy PHASES array preserved for backwards compatibility with any utility imports.
 */
export const PHASES = [
  {
    key: 'team',
    label: 'Team Formation',
    icon: Users,
    isComplete: (project) => Boolean(project?.teamId ?? project?.team ?? null),
  },
  {
    key: 'capstone_1',
    label: 'Capstone 1 (Proposal Defense)',
    icon: FileText,
    isComplete: (project) =>
      Number(project?.capstonePhase ?? project?.phase ?? 0) >= CAPSTONE_PHASES.PHASE_2,
  },
  {
    key: 'capstone_2',
    label: 'Capstone 2 (Ch 1-3 & ADM)',
    icon: BookOpen,
    isComplete: (project) =>
      Number(project?.capstonePhase ?? project?.phase ?? 0) >= CAPSTONE_PHASES.PHASE_3,
  },
  {
    key: 'capstone_3',
    label: 'Capstone 3 (System Dev & ADM)',
    icon: Code2,
    isComplete: (project) =>
      Number(project?.capstonePhase ?? project?.phase ?? 0) >= CAPSTONE_PHASES.PHASE_4,
  },
  {
    key: 'capstone_4',
    label: 'Capstone 4 (Paper, Journal & Archival)',
    icon: ShieldCheck,
    isComplete: (project) =>
      (project?.projectStatus ?? project?.status) === PROJECT_STATUSES.DEFENDED ||
      (project?.projectStatus ?? project?.status) === 'archived',
  },
];

export function getActivePhaseIndex(project) {
  return resolveCurrentStep(project);
}

/**
 * WorkflowPhaseTracker — Responsive 5-stage milestone card stepper for the Capstone workflow.
 * Renders modern milestone cards with live status badges, progress bars, and institutional phase tags.
 */
export default function WorkflowPhaseTracker({ project, currentStep, onStepClick, className }) {
  return (
    <CapstoneWorkflowStepper
      project={project}
      currentStep={currentStep}
      onStepClick={onStepClick}
      className={className}
    />
  );
}

WorkflowPhaseTracker.propTypes = {
  project: PropTypes.object,
  currentStep: PropTypes.number,
  onStepClick: PropTypes.func,
  className: PropTypes.string,
};
