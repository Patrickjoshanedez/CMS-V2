import React from 'react';
import PropTypes from 'prop-types';
import { Users, FileText, BookOpen, Code2, ShieldCheck } from 'lucide-react';
import { PROJECT_STATUSES, CAPSTONE_PHASES } from '@cms/shared';
import CapstoneWorkflowStepper, {
  resolveCurrentStep,
  isADMApproved,
  CAPSTONE_STEPS,
} from './CapstoneWorkflowStepper';

export { CAPSTONE_STEPS, resolveCurrentStep, isADMApproved };

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
    label: 'Capstone 1 (Proposal & Ch 1–3)',
    icon: FileText,
    isComplete: (project) =>
      Number(project?.capstonePhase ?? project?.phase ?? 0) >= CAPSTONE_PHASES.PHASE_2,
  },
  {
    key: 'capstone_2',
    label: 'Capstone 2 (System Dev & Gantt)',
    icon: Code2,
    isComplete: (project) =>
      Number(project?.capstonePhase ?? project?.phase ?? 0) >= CAPSTONE_PHASES.PHASE_3 &&
      isADMApproved(project),
  },
  {
    key: 'capstone_3',
    label: 'Capstone 3 (Final Manuscript, Journal & Archival)',
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
export default function WorkflowPhaseTracker({
  project,
  currentStep,
  onStepClick,
  onSelectProposal,
  className,
}) {
  return (
    <CapstoneWorkflowStepper
      project={project}
      currentStep={currentStep}
      onStepClick={onStepClick}
      onSelectProposal={onSelectProposal}
      className={className}
    />
  );
}

WorkflowPhaseTracker.propTypes = {
  project: PropTypes.object,
  currentStep: PropTypes.number,
  onStepClick: PropTypes.func,
  onSelectProposal: PropTypes.func,
  className: PropTypes.string,
};
