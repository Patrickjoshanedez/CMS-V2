# Lesson: Faculty Chapter Review, Concurrent Review Collision Prevention, and Functional Alignment

**Date:** 2026-09-10  
**Status:** Passed & Verified  
**Task:** Resolve faculty chapter viewing and moderation authorization flaw (403 Forbidden), add concurrent review collision prevention, time-in-queue indicators, student team notification hooks, in-app document preview, and submission status history audit trail.

---

## 1. Context & Architectural Root Cause
- **RBAC vs ABAC Disconnect:** BukSU faculty members hold global account role `user.role === 'faculty'`. However, `submission.service.js` previously evaluated permissions strictly against `user.role === ROLES.ADVISER` or `user.role === ROLES.PANELIST`. Because faculty users had role `faculty`, all requests were rejected with `403 Forbidden` (`FORBIDDEN_MODERATE` / `FORBIDDEN_VIEW`), preventing advisers from seeing or reviewing uploaded chapter submissions on the Capstone 2 Project Details page.
- **Concurrent Committee Collisions:** In capstone defense workflows, multiple panelists and an adviser may open the same submission simultaneously. Without optimistic locking, one reviewer's revision request could silently overwrite another's approval verdict.
- **Dashboard Review Opacity:** Faculty dashboard pending reviews lacked queue age indicators, complicating prioritization, and omitted interactive navigation.
- **Missing In-App Document Reading:** Faculty were forced to download binary DOCX files rather than inspecting manuscripts in an integrated viewer.

---

## 2. Key Lessons Learned
- **Lesson Learned (ABAC over static RBAC):** In academic management systems, permissions to review, moderate, or inspect milestone artifacts must never rely solely on a user's global role. They must evaluate contextual project appointments (`project.adviserId`, `project.panelistIds`, `project.secretaryId`).
- **Lesson Learned (ObjectId Safety):** Mongoose ObjectIds must always be safely coerced to strings (`String(project.adviserId) === String(userId)`) before comparison to prevent silent identity failures.
- **Lesson Learned (Optimistic Concurrency Control):** Providing an `expectedUpdatedAt` field on review submissions prevents race conditions and data clobbering among concurrent committee evaluators.

---

## 3. Prevention Rules
1. **Prevention Rule:** Never assert permissions directly against `user.role === 'adviser'` or `user.role === 'panelist'` in service layers. Always verify committee membership via `_isProjectCommitteeMember(project, userId, allowedRoles)`.
2. **Prevention Rule:** Guard multi-evaluator review mutations with optimistic concurrency checks (`expectedUpdatedAt`). If stale, abort with 409 `CONCURRENT_REVIEW_CONFLICT`.
3. **Prevention Rule:** Always dispatch review status change notifications to all project proponents (`project.memberIds`), not just the submitter.

---

## 4. Runbook & Implementation Checklist
- [x] **Checklist 1:** Implement `_isProjectCommitteeMember` in `submission.service.js` safely comparing string-coerced IDs.
- [x] **Checklist 2:** Update `_assertCanViewSubmission`, `_assertCanModerateSubmission`, and `reviewSubmission` to accept `ROLES.FACULTY` matching project appointments.
- [x] **Checklist 3:** Add `expectedUpdatedAt` concurrency check throwing 409 `CONCURRENT_REVIEW_CONFLICT` if outdated.
- [x] **Checklist 4:** Add `statusHistory` array to `Submission` schema logging status transitions, reviewer, notes, and timestamps.
- [x] **Checklist 5:** Dispatch notifications to all team members (`project.memberIds`) on review submission.
- [x] **Checklist 6:** Expose `projectId` on `pendingReviews` and dual `assignedProjects` / `adviserProjects` in `dashboard.service.js`.
- [x] **Checklist 7:** Implement time-in-queue badge indicators and interactive quick-action buttons on `FacultyDashboard.jsx`.
- [x] **Checklist 8:** Integrate `SophisticatedDocumentViewer` modal in `ChapterReviewPanel.jsx` for in-app DOCX manuscript reading.
- [x] **Checklist 9:** Add previous round revision notes callout for easy verification in subsequent submission rounds.

---

## 5. Verification Evidence & Test Battery Passed
- **Server Unit Tests:** 3/3 tests passed in `submission.review-flow.test.js` (faculty viewing, faculty moderation, concurrency rejection).
- **Client Unit Tests:** 8/8 tests passed across `ChapterReviewPanel.test.jsx` and `FacultyDashboard.test.jsx`.
- **System Governance:** 60/60 agentic validation checks passed (`npm run validate:agentic`).
- **Endpoint Parity:** `SERVER_ENDPOINT_COUNT=201, CLIENT_ENDPOINT_COUNT=179, UNMATCHED_COUNT=0` passed (`npm run check:endpoints`).
- **Workspace Cleanliness:** Pristine workspace verified via `python scripts/workspace_guardrail.py`.
- **Playwright Visual Feedback:** 4-way visual audit passed across desktop (1440x900) and mobile (390x844) in light and dark themes verifying live database mutation with Steven Joe Bautista and Megumi Fushiguro.
