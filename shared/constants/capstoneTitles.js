/**
 * Standardized professional capstone titles and their fixed role mappings.
 */
export const CAPSTONE_TITLES = Object.freeze({
  LEAD_DEVELOPER: 'Lead Developer',
  TECHNICAL_LEAD_ANALYST: 'Technical Lead / Analyst',
  PROJECT_MANAGER_QA: 'Project Manager / QA',
  UI_UX_DESIGNER_RESEARCHER: 'UI/UX Designer & Researcher',
});

export const CAPSTONE_TITLE_VALUES = Object.values(CAPSTONE_TITLES);

export const CAPSTONE_TITLE_MAPPING = Object.freeze({
  [CAPSTONE_TITLES.LEAD_DEVELOPER]: Object.freeze({
    traditionalRole: 'Programmer',
    responsibilities: 'System Logic, Database, and Deployment.',
  }),
  [CAPSTONE_TITLES.TECHNICAL_LEAD_ANALYST]: Object.freeze({
    traditionalRole: 'Documentor',
    responsibilities: 'Research, Documentation, and Plagiarism Checks.',
  }),
  [CAPSTONE_TITLES.PROJECT_MANAGER_QA]: Object.freeze({
    traditionalRole: 'Pitcher',
    responsibilities: 'Presentation, Testing, and Team Coordination.',
  }),
  [CAPSTONE_TITLES.UI_UX_DESIGNER_RESEARCHER]: Object.freeze({
    traditionalRole: 'All-Around',
    responsibilities: 'Frontend Design, Graphics, and Manual/User Guide.',
  }),
});
