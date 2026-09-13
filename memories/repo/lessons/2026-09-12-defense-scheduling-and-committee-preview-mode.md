# Lesson Learned: Defense Readiness Endorsement Authority, Committee Preview Mode & Dedicated Instructor Defense Scheduling Command Center

**Date:** 2026-09-12  
**Keywords:** `lesson`, `learned`, `prevention`, `runbook`, `checklist`, `evidence`, `passed`  
**Area:** Committee Role Boundaries, Proposal Endorsement Authority, Instructor Defense Scheduling

---

## 1. Context & Objective
BukSU CMS-V2 Capstone 2 progression requires a strict separation of concerns between advisory endorsement, defense committee preview, and course instructor scheduling authority:
- Only the assigned Capstone Adviser and Course Instructor hold institutional authority to endorse the Chapters 1–3 proposal manuscript as "Ready for Defense".
- Defense Panelists and Committee Secretary must only be able to view/inspect the manuscript prior to the defense hearing, with all endorsement and review buttons hidden.
- Course Instructors require a dedicated Command Center at `/defense-schedule` to monitor defense readiness KPIs across all teams, filter by readiness status, and schedule hearings with 1-click execution.

---

## 2. Key Lessons Learned
1. **Defense Readiness Endorsement Authority**:
   - Proposal manuscripts (`submission.type === 'proposal'`) represent a milestone endorsement rather than standard chapter grading.
   - Restricting review actions to `isAssignedAdviser || isInstructor` in both client UI and backend REST controllers prevents premature panel grading before the oral defense hearing.
2. **Committee Preview Mode**:
   - Defense panelists inspecting submissions prior to the defense hearing should be greeted with an informative "Preview Mode" banner confirming that rubric scoring unlocks upon official defense scheduling.
3. **Controlled Input Dispatch in Vitest/JSDOM**:
   - In React 18 controlled inputs, standard `input.value = 'x'` does not trigger React's synthetic descriptor. Always dispatch via `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'val')` followed by an `input` event.
4. **Fast-Path Targeted Verification**:
   - Executing fast-path targeted tests (`npm test --workspace=client -- <file>`) allowed 1–5 second verification feedback cycles without hitting 120s test timeouts.

---

## 3. Prevention Runbook & Checklist
When implementing or modifying committee review and defense scheduling workflows:
- [ ] **Backend Authorization**: Ensure `submission.service.js:reviewSubmission` checks `submission.type === 'proposal'` and asserts `isAssignedAdviser || isInstructor`, returning 403 `ENDORSEMENT_FORBIDDEN_ROLE` if unauthorized.
- [ ] **Client UI Gating**: Ensure `canEndorse = !isArchived && (isAssignedAdviser || isInstructor)`. Render `AdviserDefenseReadinessCard` with:
  - `Adviser Authority` badge and action buttons for Adviser.
  - `Instructor Authority` badge and action buttons for Instructor.
  - `Preview Mode` banner with zero decision buttons for Panelists and Secretary.
  - `Awaiting Adviser Defense Endorsement` card for Student proponents.
- [ ] **Instructor Navigation**: Ensure sidebar includes `/defense-schedule` with `CalendarClock` icon under instructor items.
- [ ] **Playwright Visual Verification**: Verify Desktop Light/Dark (1440×900) and Mobile Light/Dark (390×844) viewports.
- [ ] **Automated Testing**: Run targeted client and server suites before executing the full quality battery.

---

## 4. Evidence of Passed Verification
- **Client Tests**:
  - `DefenseSchedulingPage.test.jsx`: 5/5 passed.
  - `SubmissionDetailPage.test.jsx`: 14/14 passed.
- **Server Tests**:
  - `submission.review-flow.test.js`: 6/6 passed.
- **Route Parity**: `check:endpoints` passed with 204 server, 182 client, 0 unmatched.
- **Agentic Governance**: `validate:agentic` passed with 60/60 checks.
- **Visual Evidence**: 14 Playwright screenshots captured and verified in artifacts directory.
