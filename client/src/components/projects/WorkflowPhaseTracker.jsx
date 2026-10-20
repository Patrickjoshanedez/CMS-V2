import React from 'react';
import PropTypes from 'prop-types';
import { Users, FileText, Code2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_STATUSES,
  CAPSTONE_PHASES,
  resolveWorkflowPhase,
} from '@cms/shared';
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
    key: 'title_proposal',
    label: 'Title Proposals & Committee',
    icon: FileText,
    isComplete: (project) => resolveWorkflowPhase(project) >= CAPSTONE_PHASES.PHASE_2,
  },
  {
    key: 'capstone_1',
    label: 'Capstone 1 (Chapters 1–3 & Proposal Defense)',
    icon: FileText,
    isComplete: (project) => resolveWorkflowPhase(project) >= CAPSTONE_PHASES.PHASE_3,
  },
  {
    key: 'capstone_2',
    label: 'Capstone 2 (System Dev & Gantt)',
    icon: Code2,
    isComplete: (project) => resolveWorkflowPhase(project) >= CAPSTONE_PHASES.PHASE_4,
  },
  {
    key: 'capstone_3',
    label: 'Capstone 3 (Final Manuscript, Defense & Archival)',
    icon: ShieldCheck,
    isComplete: (project) =>
      resolveWorkflowPhase(project) === CAPSTONE_PHASES.PHASE_4 &&
      ((project?.projectStatus ?? project?.status) === PROJECT_STATUSES.DEFENDED ||
        (project?.projectStatus ?? project?.status) === 'archived'),
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
  evaluationCount,
  currentStep,
  onStepClick,
  onSelectProposal,
  isStudent = true,
  onScheduleDefense,
  canManageCommittee = false,
  canManageArchive = false,
  onViewFullDocument,
  hasFullDocument = false,
  onRefresh,
  className,
}) {
  return (
    <CapstoneWorkflowStepper
      project={project}
      evaluationCount={evaluationCount}
      currentStep={currentStep}
      onStepClick={onStepClick}
      onSelectProposal={onSelectProposal}
      isStudent={isStudent}
      onScheduleDefense={onScheduleDefense}
      canManageCommittee={canManageCommittee}
      canManageArchive={canManageArchive}
      onViewFullDocument={onViewFullDocument}
      hasFullDocument={hasFullDocument}
      onRefresh={onRefresh}
      className={cn('workflow-phase-tracker no-print', className)}
    />
  );
}

WorkflowPhaseTracker.propTypes = {
  project: PropTypes.object,
  evaluationCount: PropTypes.number,
  currentStep: PropTypes.number,
  onStepClick: PropTypes.func,
  onSelectProposal: PropTypes.func,
  isStudent: PropTypes.bool,
  onScheduleDefense: PropTypes.func,
  canManageCommittee: PropTypes.bool,
  canManageArchive: PropTypes.bool,
  onViewFullDocument: PropTypes.func,
  hasFullDocument: PropTypes.bool,
  onRefresh: PropTypes.func,
  className: PropTypes.string,
};
