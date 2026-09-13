# Lesson Runbook: Proposal Manuscript Naming, Defense Preparedness Notifications, and Student Revision Flow

**Date:** 2026-09-12  
**Session ID:** `2026-09-12_proposal-manuscript-naming-and-student-revision-flow`  
**Keywords:** `lesson`, `learned`, `prevention`, `runbook`, `checklist`, `evidence`, `passed`

---

## 1. Problem Context & Incident Analysis
In the Capstone 2 Proposal stage:
1. **False Panel Flag**: `submission.service.js:_validateProposalCompleteness` enforced a strict manual abstract check (`!metadata.abstract || metadata.abstract.length < 50`) on compiled proposal uploads, causing completed proposals to be falsely flagged with `Flagged for Panel Review: Incomplete Institutional Metadata - Missing proposal abstract or abstract is under 50 characters.`, even though students compile proposals directly from Chapters 1–3.
2. **"Chapter null" Display Disconnect**: Because proposal submissions have `submission.type = 'proposal'` and `chapter = null`, UI components throughout `SubmissionDetailPage` rendered raw strings like `Chapter null` or generic `proposal`.
3. **Missing Defense Preparedness Trigger**: Submitting the compiled proposal manuscript represents the milestone where the team is ready for proposal defense, but no automated notification was dispatched to the appointed Defense Committee (Adviser, Panelists, Secretary) and Instructors.
4. **Student Self-Correction Void**: If students accidentally uploaded an incorrect file or draft on any submission, there was no direct "Revise Submission" button on `SubmissionDetailPage` to upload a replacement before panel sign-off, and backend re-uploading threw `REVISION_NOT_REQUESTED` on pending submissions.

---

## 2. Technical Decisions & CST Patches

### A. Abstract Gating Removal & Metadata Cleanliness
In `server/modules/submissions/submission.service.js`:
- Removed abstract presence and length checks from `_validateProposalCompleteness`.
- Added `SUBMISSION_STATUSES.PENDING` to `allowedReuploadStatuses` in `uploadChapter`, enabling students to correct pending submissions immediately without requiring an adviser reject cycle.

### B. Defense Preparedness Notification Dispatch
In `server/modules/submissions/submission.service.js`:
- Added `_notifyProposalDefensePreparedness({ project, submission, user, version })`.
- Collects recipients: Project Adviser (`project.adviser._id`), Appointed Committee (`project.committee.panelists`, `project.committee.secretary`), and Course Instructors (`User.find({ role: 'instructor' })`).
- Dispatches in-app `Notification.create`, real-time WebSocket events (`emitToUser(userId, 'proposal:compiled', payload)`), and enqueues institutional emails (`emailQueue.add('sendEmail', ...)`).

### C. Canonical Manuscript Naming Helper
In `client/src/utils/submissionUtils.js`:
- Created `getSubmissionDocumentTitle(sub)` and `CHAPTER_LABELS`.
- Isolated from React components to keep Vite Fast Refresh HMR pristine.
- Outputs `"Chapter 1–3 Manuscript"` for `proposal` or null chapters, and `"Chapter N Manuscript"` for individual chapters.

### D. "Revise Submission" Dialog on SubmissionDetailPage
In `client/src/pages/submissions/SubmissionDetailPage.jsx`:
- Added `ReviseSubmissionModal` with drag-and-drop dropzone, file validation (Word `.docx`, PDF, max 25MB), remarks textarea, upload progress bar, and intelligent mutation routing based on `submission.type`.
- Added "Revise Submission" button to both header bar and `FileInfoCard` action toolbar for students when submission is not locked or archived.

---

## 3. Evidence Checklist & Prevention Rules

- [x] `evidence`: Target tests passed for client (`SubmissionDetailPage.test.jsx`, 8/8; `ProposalCompilationPage.test.jsx`, 4/4).
- [x] `evidence`: Target tests passed for server (`submission.review-flow.test.js`, 3/3).
- [x] `passed`: `npm run check:endpoints` (204 server / 182 client, 0 unmatched).
- [x] `passed`: `npm run validate:agentic` (60/60 checks passed).
- [x] `passed`: Playwright visual feedback loop verified across Desktop (1440x900 Light/Dark) and Mobile (390x844 Light/Dark) viewports.

### Prevention Runbook
1. **Rule**: Never export helper functions or non-component constants from component files with `.jsx` extension if imported elsewhere; place in `@/utils/` to maintain React Fast Refresh HMR stability.
2. **Rule**: When adding submission re-upload actions, ensure the backend allows re-uploading while status is `pending` as well as `revisions_required`.
3. **Rule**: All proposal titles rendered on screen must use `getSubmissionDocumentTitle(submission)` to ensure consistent `"Chapter 1–3 Manuscript"` institutional labeling.
