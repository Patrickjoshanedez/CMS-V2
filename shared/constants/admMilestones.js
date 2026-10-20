/**
 * Canonical Action Done Matrix phase labels.
 *
 * `unisonKey` is a legacy storage slot; `officialVersion` follows the
 * institutional capstone workflow and must not be inferred from that slot.
 */
export const ADM_MILESTONES = Object.freeze({
  CAPSTONE_1: Object.freeze({
    id: 'CAPSTONE_1',
    shortLabel: 'Cap 1',
    longLabel: 'Capstone 1',
    title: 'Capstone 1 Proposal Defense',
    pillLabel: 'Cap 1 (Proposal Defense · ADM v1)',
    caption: 'Chapters 1–3 proposal defense remarks and required revisions',
    unisonKey: 'v1',
    officialVersion: 'ADM v1',
    versionLabel: 'Capstone 1 (Chapters 1–3 Proposal Defense)',
    order: 1,
  }),
  CAPSTONE_2: Object.freeze({
    id: 'CAPSTONE_2',
    shortLabel: 'Cap 2',
    longLabel: 'Capstone 2',
    title: 'Capstone 2 System Defense',
    pillLabel: 'Cap 2 (System Defense · ADM v2)',
    caption: 'System development and prototype defense remarks and required revisions',
    unisonKey: 'v2',
    officialVersion: 'ADM v2',
    versionLabel: 'Capstone 2 (System Development & Prototype Defense)',
    order: 2,
  }),
  CAPSTONE_3: Object.freeze({
    id: 'CAPSTONE_3',
    shortLabel: 'Cap 3',
    longLabel: 'Capstone 3',
    title: 'Capstone 3 Final Defense',
    pillLabel: 'Cap 3 (Final Defense · ADM v3)',
    caption: 'Final defense remarks and required manuscript revisions',
    unisonKey: 'v3',
    officialVersion: 'ADM v3',
    versionLabel: 'Capstone 3 (Chapters 4–5 & Final Defense)',
    order: 3,
  }),
});
