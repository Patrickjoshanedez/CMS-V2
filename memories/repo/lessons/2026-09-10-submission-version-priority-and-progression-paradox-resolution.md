# Lesson & Runbook: Chapter Submission Version Priority & Progression Paradox Resolution

## Incident Context
- **Date**: 2026-09-10
- **Symptoms**: An adviser reviewed and accepted a revision round (Chapter 1 v2, `status: 'accepted'`). When the student viewed the submission, the dashboard displayed Chapter 1 as `Revisions Required` (pointing to v1), and attempting to upload Chapter 2 was blocked with error `Chapter 1 must be approved before you can submit Chapter 2` (`CHAPTER1_NOT_APPROVED`).

## Root Cause Analysis
1. **Timestamp Collision Overwrite in Version Derivation**:
   - In `ProjectSubmissionsPage.jsx` and `ProposalCompilationPage.jsx`, latest chapter submissions were derived using:
     ```javascript
     if (!existing || currentTs >= existingTs) map.set(submission.chapter, submission);
     ```
   - When an adviser accepted v2, `markSubmissionAccepted` executed `Submission.updateMany` setting `reviewClosed: true` on all submissions of that chapter, assigning both v1 and v2 identical `updatedAt` timestamps (`2026-09-10T07:17:21.514Z`).
   - Because the API returns submissions sorted `{ chapter: 1, version: -1 }` (v2 first, then v1), when v1 was evaluated, `currentTs >= existingTs` was true, causing **v1 to overwrite v2** in the latest map.
2. **Overly Strict Status Gating (`status === LOCKED`)**:
   - Both backend (`submission.service.js:uploadChapter`, `compileProposal`) and frontend (`ChapterUploadPage.jsx`, `canUploadChapter`) strictly checked `status === SUBMISSION_STATUSES.LOCKED`.
   - Accepting a review round sets `status = 'accepted'` (or `'approved'`). Because the query was restricted strictly to `locked`, valid accepted chapters were rejected.
3. **Missing Version Context on Detail Page**:
   - `SubmissionDetailPage.jsx` rendered a single submission without version history or indicators that a newer version was available.

## Prevention Rules & Institutional Runbook
1. **Version Number Priority First**:
   - Whenever reducing or selecting the "latest" document submission, **always** compare `submission.version` first before timestamps (`subVersion > existingVersion || (subVersion === existingVersion && currentTs > existingTs)`).
2. **Acceptance Progression Rule**:
   - Sequential chapter uploads and proposal compilation must accept any valid approved state: `[SUBMISSION_STATUSES.LOCKED, SUBMISSION_STATUSES.APPROVED, SUBMISSION_STATUSES.ACCEPTED]`.
3. **Outdated Version Banner Standard**:
   - Detail pages displaying an earlier revision must query chapter history and render an institutional alert banner informing the user that a newer revision exists, accompanied by revision pills and a direct link to the latest revision.

## Verification & Validation Evidence
- **Checklist Passed**:
  - `npm test --workspace=client -- src/pages/submissions/`: 17/17 tests passed (including `ProjectSubmissionsPage.test.jsx`, `SubmissionDetailPage.test.jsx`).
  - `npm test --workspace=server -- tests/integration/submissions.test.js -t "should allow chapter 2 upload when chapter 1 is accepted"`: passed.
  - `npm run check:endpoints`: passed (UNMATCHED_COUNT=0).
  - `npm run validate:agentic`: passed (60/60 checks).
  - `npm run validate:governance`: passed (0 errors, 0 warnings).
  - **Playwright Visual Feedback Audit**: 10 screenshots captured across light/dark desktop (1440x900) and mobile (390x844), proving:
    - Chapter 1 renders as `Accepted` (v2).
    - Chapter 2 upload button is active and unlocked.
    - Viewing v1 displays the "Viewing Earlier Revision (v1)" alert banner with revision switcher pills.
    - Clicking "View Latest Revision (v2)" transitions smoothly to v2.
    - Chapter 2 is selectable in ChapterUploadPage dropdown without disabled restrictions.
