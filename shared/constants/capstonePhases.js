/** Overall institutional workflow phases; Phase 0 is team formation before project creation. */
export const CAPSTONE_PHASES = Object.freeze({
  PHASE_0: 0,
  PHASE_1: 1, // Title proposals, similarity pre-scan, review, and committee setup
  PHASE_2: 2, // Capstone 1: Chapters 1–3, proposal defense, ADM v1
  PHASE_3: 3, // Capstone 2: system development, Gantt, prototype defense, ADM v2
  PHASE_4: 4, // Capstone 3: Chapters 4–5, final defense, ADM v3, and archival
});

export const CAPSTONE_PHASE_VALUES = Object.freeze([1, 2, 3, 4]);

/** Legacy course counter retained for persisted `capstonePhase` fields and older API clients. */
export const CAPSTONE_COURSES = Object.freeze({
  CAPSTONE_1: 1,
  CAPSTONE_2: 2,
  CAPSTONE_3: 3,
});

export const CAPSTONE_COURSE_VALUES = Object.freeze(Object.values(CAPSTONE_COURSES));

/** Course and pre-course stages. `final` remains accepted for legacy archived records. */
export const CAPSTONE_STAGES = Object.freeze({
  PROPOSAL: 'proposal',
  CAPSTONE_1: 'capstone_1',
  CAPSTONE_2: 'capstone_2',
  CAPSTONE_3: 'capstone_3',
  FINAL: 'final',
});

export const CAPSTONE_STAGE_VALUES = Object.freeze(Object.values(CAPSTONE_STAGES));

const APPROVED_TITLE_STATUSES = new Set(['approved', 'title_approved']);
const APPROVED_PROPOSAL_PROJECT_STATUSES = new Set(['proposal_approved', 'approved_for_defense']);
const ARCHIVED_PROJECT_STATUSES = new Set(['final_approved', 'archived']);

/** Resolve the overall Phase 1–4 position without reinterpreting legacy course numbers. */
export function resolveWorkflowPhase(project) {
  if (!project) return CAPSTONE_PHASES.PHASE_0;

  const explicitPhase = Number(project.workflowPhase);
  if (CAPSTONE_PHASE_VALUES.includes(explicitPhase)) return explicitPhase;

  const stage = String(project.stage || '').toLowerCase();
  const projectStatus = String(project.projectStatus || project.status || '').toLowerCase();
  if (
    stage === CAPSTONE_STAGES.CAPSTONE_3 ||
    stage === CAPSTONE_STAGES.FINAL ||
    project.isArchived === true ||
    ARCHIVED_PROJECT_STATUSES.has(projectStatus)
  ) {
    return CAPSTONE_PHASES.PHASE_4;
  }
  if (stage === CAPSTONE_STAGES.CAPSTONE_2) return CAPSTONE_PHASES.PHASE_3;

  const titleStatus = String(project.titleStatus || '').toLowerCase();
  const titleApproved = APPROVED_TITLE_STATUSES.has(titleStatus);
  if (stage === CAPSTONE_STAGES.CAPSTONE_1) {
    return titleApproved ? CAPSTONE_PHASES.PHASE_2 : CAPSTONE_PHASES.PHASE_1;
  }
  if (stage === CAPSTONE_STAGES.PROPOSAL) return CAPSTONE_PHASES.PHASE_1;

  // Legacy rows store the course number (1–3) in capstonePhase, not workflowPhase.
  const legacyCourse = Number(project.capstonePhase);
  if (legacyCourse >= CAPSTONE_COURSES.CAPSTONE_3) return CAPSTONE_PHASES.PHASE_4;
  if (legacyCourse === CAPSTONE_COURSES.CAPSTONE_2) return CAPSTONE_PHASES.PHASE_3;
  if (legacyCourse === CAPSTONE_COURSES.CAPSTONE_1) {
    return titleApproved ? CAPSTONE_PHASES.PHASE_2 : CAPSTONE_PHASES.PHASE_1;
  }

  const phase = Number(project.phase);
  if (CAPSTONE_PHASE_VALUES.includes(phase)) return phase;
  if (titleApproved || APPROVED_PROPOSAL_PROJECT_STATUSES.has(projectStatus)) {
    return CAPSTONE_PHASES.PHASE_2;
  }

  const hasTitleProposal =
    (Array.isArray(project.titleProposals) && project.titleProposals.length > 0) ||
    (Array.isArray(project.titleProposalMetadata) && project.titleProposalMetadata.length > 0) ||
    Boolean(String(project.title || '').trim());
  if (titleStatus || hasTitleProposal) return CAPSTONE_PHASES.PHASE_1;

  return CAPSTONE_PHASES.PHASE_0;
}

/**
 * BukSU IT Department Semester Duration Mapping:
 * Each Capstone stage corresponds strictly to 1 Academic Semester.
 */
export const CAPSTONE_SEMESTER_MAP = Object.freeze({
  [CAPSTONE_STAGES.PROPOSAL]: {
    phase: CAPSTONE_PHASES.PHASE_1,
    semester: null,
    semesterLabel: 'Pre-Capstone',
    academicCourse: 'Title Proposal & Committee Assignment',
  },
  [CAPSTONE_STAGES.CAPSTONE_1]: {
    semester: 1,
    semesterLabel: '1st Semester',
    academicCourse: 'Capstone 1 (Chapters 1–3 & Proposal Defense)',
  },
  [CAPSTONE_STAGES.CAPSTONE_2]: {
    semester: 2,
    semesterLabel: '2nd Semester',
    academicCourse: 'Capstone 2 (System Development & Prototype)',
  },
  [CAPSTONE_STAGES.CAPSTONE_3]: {
    semester: 3,
    semesterLabel: '3rd Semester',
    academicCourse: 'Capstone 3 (Results, Final Defense & Archival)',
  },
  [CAPSTONE_STAGES.FINAL]: {
    semester: 3,
    semesterLabel: '3rd Semester',
    academicCourse: 'Capstone 3 (Final Archival & Certification)',
  },
});

/**
 * Deliverables mapped to the three Capstone courses.
 */
export const DELIVERABLE_TYPES = Object.freeze({
  // Phase 1 — title proposal review
  TITLE_PROPOSAL: 'title_proposal',
  // Capstone 1
  CHAPTER_1: 'chapter_1',
  CHAPTER_2: 'chapter_2',
  CHAPTER_3: 'chapter_3',
  CAPSTONE_1_PROPOSAL: 'capstone_1_proposal',
  ADM_V1: 'adm_v1',
  // Capstone 2
  GANTT_CHART: 'gantt_chart',
  ADM_V2: 'adm_v2',
  // Capstone 3
  SYSTEM_PROTOTYPE: 'system_prototype',
  CHAPTER_4: 'chapter_4',
  CHAPTER_5: 'chapter_5',
  CAPSTONE_3_MANUSCRIPT: 'capstone_3_manuscript',
  ADM_V3: 'adm_v3',
  // Final
  FINAL_APPROVED_PAPER: 'final_approved_paper',
  // Final-course papers are required before the final defense.
  FULL_ACADEMIC_PAPER: 'full_academic_paper',
  CONDENSED_JOURNAL_PAPER: 'condensed_journal_paper',
});

export const DELIVERABLE_TYPE_VALUES = Object.freeze(Object.values(DELIVERABLE_TYPES));

export const POST_APPROVAL_DELIVERABLES = Object.freeze([DELIVERABLE_TYPES.FINAL_APPROVED_PAPER]);

/**
 * Canonical Stage-to-Deliverables Map
 */
export const STAGE_DELIVERABLE_MAP = Object.freeze({
  [CAPSTONE_STAGES.PROPOSAL]: [
    {
      id: DELIVERABLE_TYPES.TITLE_PROPOSAL,
      label: 'Title Proposals (1–10) & Similarity Pre-Scan',
      category: 'proposal',
    },
  ],
  [CAPSTONE_STAGES.CAPSTONE_1]: [
    {
      id: DELIVERABLE_TYPES.CHAPTER_1,
      label: 'Chapter 1: Problem & Background',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.CHAPTER_2,
      label: 'Chapter 2: Review of Related Literature',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.CHAPTER_3,
      label: 'Chapter 3: Technical Design & Methodology',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.CAPSTONE_1_PROPOSAL,
      label: 'Capstone 1 Proposal Manuscript (Ch. 1–3)',
      category: 'manuscript',
    },
    { id: DELIVERABLE_TYPES.ADM_V1, label: 'Action Done Matrix (ADM v1)', category: 'adm' },
  ],
  [CAPSTONE_STAGES.CAPSTONE_2]: [
    {
      id: DELIVERABLE_TYPES.GANTT_CHART,
      label: 'Sprint Plan & Gantt Chart',
      category: 'prototype',
    },
    {
      id: DELIVERABLE_TYPES.SYSTEM_PROTOTYPE,
      label: 'System Prototype, GitHub Repository & Media Gallery',
      category: 'prototype',
    },
    { id: DELIVERABLE_TYPES.ADM_V2, label: 'Sprint Review Matrix (ADM v2)', category: 'adm' },
  ],
  [CAPSTONE_STAGES.CAPSTONE_3]: [
    {
      id: DELIVERABLE_TYPES.CHAPTER_4,
      label: 'Chapter 4: Results and Discussions',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.CHAPTER_5,
      label: 'Chapter 5: Summary, Conclusions & Recommendations',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.CAPSTONE_3_MANUSCRIPT,
      label: 'Capstone 3 Manuscript (Ch. 1–5)',
      category: 'manuscript',
    },
    {
      id: DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER,
      label: 'Full Academic Paper (Institutional Archive Format)',
      category: 'final_paper',
    },
    {
      id: DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER,
      label: 'Condensed Academic Journal Paper (IEEE/FRINS6 Format)',
      category: 'final_paper',
    },
    { id: DELIVERABLE_TYPES.ADM_V3, label: 'Action Done Matrix (ADM v3)', category: 'adm' },
  ],
  [CAPSTONE_STAGES.FINAL]: [
    {
      id: DELIVERABLE_TYPES.FINAL_APPROVED_PAPER,
      label: 'Final Approved Capstone Paper',
      category: 'final_paper',
      postApprovalGated: true,
    },
  ],
});

export const DELIVERABLE_CATEGORY_MAP = Object.freeze({
  [DELIVERABLE_TYPES.TITLE_PROPOSAL]: 'proposal',
  [DELIVERABLE_TYPES.CHAPTER_1]: 'manuscript',
  [DELIVERABLE_TYPES.CHAPTER_2]: 'manuscript',
  [DELIVERABLE_TYPES.CHAPTER_3]: 'manuscript',
  [DELIVERABLE_TYPES.CAPSTONE_1_PROPOSAL]: 'manuscript',
  [DELIVERABLE_TYPES.CHAPTER_4]: 'manuscript',
  [DELIVERABLE_TYPES.CHAPTER_5]: 'manuscript',
  [DELIVERABLE_TYPES.CAPSTONE_3_MANUSCRIPT]: 'manuscript',
  [DELIVERABLE_TYPES.ADM_V1]: 'adm',
  [DELIVERABLE_TYPES.ADM_V2]: 'adm',
  [DELIVERABLE_TYPES.ADM_V3]: 'adm',
  [DELIVERABLE_TYPES.GANTT_CHART]: 'prototype',
  [DELIVERABLE_TYPES.SYSTEM_PROTOTYPE]: 'prototype',
  [DELIVERABLE_TYPES.FINAL_APPROVED_PAPER]: 'final_paper',
  [DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER]: 'final_paper',
  [DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER]: 'final_paper',
});
