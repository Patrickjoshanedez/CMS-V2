# Lesson Learned: Proposal Pitch Deck Cover Slide Content Isolation & Proposed Solution Leak Prevention

## Incident & Root Cause Summary
- **Symptom**: On Slide 01 (`SLIDE 01 · Title Pitch & Proponents` / Cover Slide) of the Capstone Proposal Defense rehearsal deck, the entire technical description paragraph for `Proposed Solution & Technical Framework` was rendered directly beneath the golden amber title, crowding the cover canvas and duplicating Slide 03.
- **Root Cause**: In `TitleApprovalPage.jsx` (`renderSlides`) and `CreateProjectPage.jsx` (`deckSlides`), the `subtitle` property for Slide 1 was populated using `pitch.proposedSolution || proposalItem.description || ...`. Consequently, whenever proponents authored or generated a technical proposed solution, it leaked onto the cover screen instead of remaining isolated on Slide 03 (`SLIDE 03 · Proposed Solution & Technical Framework`).

## Prevention Rules & Institutional Invariants
1. **Title Cover Slide Integrity (Slide 01)**: Slide 01 is strictly reserved for the Proposal Title (in golden amber `#FFA726`), Category tag (`Title Pitch & Proponents`), and institutional footer banner (BukSU COT logos, proponents, and academic year). It must never receive technical framework, problem statement, or general description paragraphs.
2. **Dedicated Technical Framework Slide (Slide 03)**: `pitch.proposedSolution` belongs exclusively to Slide 03 (`SLIDE 03 · Proposed Solution & Technical Framework`).
3. **Defensive Component Inoculation**: In `ProposalSlideCanvas.jsx`, cover slide rendering checks `effectiveSubtitle`, defensively suppressing `subtitle` if it contains or matches `proposedSolution` or `content`, preventing accidental leaks even from legacy draft states or un-migrated database records.

## Checklist & Runbook for Pitch Deck Slides
- [x] **Checklist**: Ensure Slide 01 in slide generators sets `subtitle: pitch.subtitle || ''` (never falling back to `proposedSolution` or `description`).
- [x] **Checklist**: Confirm Slide 03 remains the exclusive presenter of `pitch.proposedSolution`.
- [x] **Runbook**: Test cover slides with targeted client unit tests: `npm test --workspace=client -- src/components/projects/ProposalSlideCanvas.test.jsx`.
- [x] **Runbook**: Execute Playwright visual audit across light and dark modes in desktop and mobile viewports to inspect cover slide typography and vertical centering.
