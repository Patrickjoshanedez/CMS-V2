# Lesson: Capstone Phase Progression Alignment & Faculty Dashboard Hydration

## Context
When a project's title is approved (`titleStatus === 'approved'`), Capstone 1 (Title Defense & Cosine Similarity Pre-scan) is officially completed. The project actively enters **Phase 2 (Capstone 2: Chapters 1–3 Manuscript & Midterm Defense)**. However, because `project.capstonePhase` in MongoDB records previously remained at `1` after title approval, the Adviser Handled Teams view displayed an inconsistent badge `REVIEW: CAPSTONE 1` while the Submissions page showed Phase 2 (Chapter 1 Accepted, Chapter 2 Pending Review). Furthermore, the faculty dashboard returned sparse projections lacking populated student names, proponent roles, and chapter progress summaries.

## Prevention Rule & Root Cause Learned
1. **Canonical Progression Invariant:** When `titleStatus === TITLE_STATUSES.APPROVED`, effective `capstonePhase` MUST be at least 2 (`Math.max(2, rawPhase)`). Any chapter review in Chapters 1–3 belongs to Capstone 2.
2. **Backend Aggregation Hydration Pipeline:** The dashboard service (`_hydrateAssignedProjects`) now calculates chapter progression across all 5 chapters, resolves effective `capstonePhase`, auto-heals outdated database records in the background (`Project.updateOne`), and deeply populates team members (`fullName`, `email`, `role`, `isLeader`, `githubUrl`, `googleDocUrl`).
3. **Frontend Hydration & Zero-Flash Skeleton:** `FacultyDashboard.jsx` now guards against unhydrated rendering via a pulse skeleton during initial query resolution, displays `REVIEW: CAPSTONE 2`, shows chapter progress chips (`1/5 approved`, `Ch. 2 in review`), provides direct Google Doc and GitHub links, and hydrates the right-hand team roster sidebar with a 5-chapter progress bar, member roles, lead badges, and a direct "View Submissions & Progress" action.

## Checklist
- [x] Backend: `_hydrateAssignedProjects` resolves `effectivePhase >= 2` when title is approved and calculates `approvedChaptersCount` and `pendingChapter`.
- [x] Backend: Populates `submittedBy` in `pendingReviews` with student full name.
- [x] Frontend: `ProjectDetailedStatus` maps `effectivePhase` ensuring `Review: Capstone 2` is rendered.
- [x] Frontend: Team cards display `chapterProgressSummary`, `pendingChapter` chip, and working document links.
- [x] Frontend: Team roster sidebar includes 5-segment chapter progression bar, proponent roles, lead badges, and submissions navigation.
- [x] Quality Gates: All client unit tests passed (5/5), server integration tests passed (15/15), route parity passed (UNMATCHED_COUNT=0), agentic validation passed (60/60).

## Evidence & Verification
- `npm test --workspace=client -- src/pages/dashboard/FacultyDashboard.test.jsx`: 5 passed.
- `npm test --workspace=server -- tests/integration/dashboard.test.js`: 15 passed.
- `npm run check:endpoints`: 201 server / 179 client, UNMATCHED_COUNT = 0.
- `npm run validate:agentic`: 60/60 checks passed.
- Playwright Visual Audit: Verified across Desktop (1440x900) and Mobile (390x844) in both Light and Dark modes. Output screenshots saved to artifacts.
