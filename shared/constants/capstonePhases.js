/**
 * Capstone project phases.
 * A project progresses through these institutional phases sequentially:
 * 1 (Capstone 1) → 2 (Capstone 2) → 3 (Capstone 3: Final Defense & Archival).
 */
export const CAPSTONE_PHASES = Object.freeze({
  PHASE_1: 1, // Capstone 1: Proposal & Chapters 1–3 Manuscript
  PHASE_2: 2, // Capstone 2: System Development & Prototype
  PHASE_3: 3, // Capstone 3: Chapters 4–5, Academic Journal, Final Defense & Archival
  // Backward compatibility alias:
  PHASE_4: 3,
});

export const CAPSTONE_PHASE_VALUES = [1, 2, 3];

/**
 * Four-Stage Capstone Lifecycle (strictly capstone_1, capstone_2, capstone_3, final).
 * Capstone 4 terminology is strictly prohibited across the platform.
 */
export const CAPSTONE_STAGES = Object.freeze({
  CAPSTONE_1: 'capstone_1',
  CAPSTONE_2: 'capstone_2',
  CAPSTONE_3: 'capstone_3',
  FINAL: 'final',
});

export const CAPSTONE_STAGE_VALUES = Object.freeze(Object.values(CAPSTONE_STAGES));

/**
 * Deliverables mapped to the 4-phase capstone progression.
 */
export const DELIVERABLE_TYPES = Object.freeze({
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
  // Final (Post-Approval Hard Gated)
  FULL_ACADEMIC_PAPER: 'full_academic_paper',
  CONDENSED_JOURNAL_PAPER: 'condensed_journal_paper',
});

export const DELIVERABLE_TYPE_VALUES = Object.freeze(Object.values(DELIVERABLE_TYPES));

export const POST_APPROVAL_DELIVERABLES = Object.freeze([
  DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER,
  DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER,
]);

/**
 * Canonical Stage-to-Deliverables Map
 */
export const STAGE_DELIVERABLE_MAP = Object.freeze({
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
    { id: DELIVERABLE_TYPES.ADM_V2, label: 'Sprint Review Matrix (ADM v2)', category: 'adm' },
  ],
  [CAPSTONE_STAGES.CAPSTONE_3]: [
    {
      id: DELIVERABLE_TYPES.SYSTEM_PROTOTYPE,
      label: 'System Prototype & Repository',
      category: 'prototype',
    },
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
    { id: DELIVERABLE_TYPES.ADM_V3, label: 'Action Done Matrix (ADM v3)', category: 'adm' },
  ],
  [CAPSTONE_STAGES.FINAL]: [
    {
      id: DELIVERABLE_TYPES.FINAL_APPROVED_PAPER,
      label: 'Final Approved Capstone Paper',
      category: 'final_paper',
    },
    {
      id: DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER,
      label: 'Full Academic Paper (Institutional Archive Format)',
      category: 'final_paper',
      postApprovalGated: true,
    },
    {
      id: DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER,
      label: 'Condensed Academic Journal Paper (IEEE/FRINS6 Format)',
      category: 'final_paper',
      postApprovalGated: true,
    },
  ],
});

export const DELIVERABLE_CATEGORY_MAP = Object.freeze({
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
