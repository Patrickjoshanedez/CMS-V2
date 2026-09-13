# Defense Schedule Display & Oral Defense-to-ADM Revision Workflow

## Overview
This **lesson** documents the institutional BukSU capstone defense workflow progression from oral defense hearing minutes capture to Action Done Matrix (ADM) comment generation, manuscript revisions (v2+), panel fulfillment verification, committee sign-off, and progression into Capstone 3. It also details the engineering and placement of the top-right color-coded `DefenseScheduleBadge` component.

## Key Learnings (`learned`)
1. **Defense Schedule State Resolution**:
   - The defense schedule is tracked on the Project document (`project.defenseSchedule`).
   - The schedule indicator must clearly communicate urgency and status via three deterministic semantic color categories:
     - **Orange (`amber`)**: When defense scheduling is pending (`pending_scheduling` or `pending`).
     - **Green (`emerald`)**: When the hearing is scheduled for a future/current date (`scheduled` with formatted date and time quantum).
     - **Red (`rose`)**: When the scheduled date has passed without hearing conclusion (`overdue`) or when the defense verdict was `redefense` or `rejected`.
2. **Top-Right Placement Parity**:
   - The badge must appear at prominent top-right anchors:
     - On the Submission Detail page: inside the top navigation header strip (next to the action button) and in the header of the Adviser Defense Readiness Card.
     - On the Team Management page: in the top-right header strip of the student team details card.
     - On Project Details and Project Title Card: within the executive badge ribbon.
3. **Defense-to-ADM Revision Lifecycle**:
   - **Step 1: Hearing & Minutes**: During the oral defense hearing, the Committee Secretary logs remarks and panel comments using the live minutes modal (`LiveDefenseMinutesModal`, BukSU Form OVPAA-F-INS-032).
   - **Step 2: Publishing to ADM**: Remarks are published to the project's Action Done Matrix (`publishToADM`), converting panel comments and client remarks into discrete actionable rows with pending fulfillment status.
   - **Step 3: Consensus Verdict**: The committee records the consensus verdict (`approved_with_minor_revisions`, `approved_with_major_revisions`, or `redefense`).
   - **Step 4: Student Revision Rounds**: The student team accesses the ADM tab, addresses each comment by entering the specific "Action Taken" and "Page Number(s)", and submits a revised manuscript (e.g. `v2`) via `ReviseSubmissionModal`.
   - **Step 5: Panel Verification**: Panelists inspect the revision against the ADM and toggle `[✓] Fulfilled & Verified by Panel` (`status = 'verified'`).
   - **Step 6: Secretary Compliance Endorsement**: The Secretary endorses that all panel revisions have been satisfied (`project.admSignatures.secretary.endorsed = true`).
   - **Step 7: Committee Digital Sign-Off**: Adviser and panelists apply digital cryptographic sign-offs, advancing the team directly into Capstone 3 (System Development & Gantt Chart).

## Prevention Protocol (`prevention`)
1. **Never Show Plain Text "Schedule: scheduled"**:
   - Always resolve through `DefenseScheduleBadge` so students and faculty immediately see the exact calendar date (`Sep 25, 2026`) and time window (`09:00 AM - 10:00 AM`) with visual calendar iconography.
2. **Never Allow Unbound Loading Screen Captures**:
   - In automated visual audits, avoid bare arbitrary `waitForTimeout` calls after navigation. Always await semantic hydration (`await page.waitForSelector(...)`) before capturing visual evidence to ensure client store state and theme styles are fully mounted.

## Operational Verification Runbook (`runbook` & `checklist`)
- [x] Create modular `DefenseScheduleBadge.jsx` with date formatting, state resolver, and accessible semantic colors.
- [x] Verify unit tests with `npm test --workspace=client -- src/components/defense/DefenseScheduleBadge.test.jsx` (**evidence**: 8/8 passed).
- [x] Verify submission details integration with `npm test --workspace=client -- src/pages/submissions/SubmissionDetailPage.test.jsx` (**evidence**: 14/14 passed).
- [x] Verify backend review flow with `npm test --workspace=server -- tests/unit/submission.review-flow.test.js` (**evidence**: 6/6 passed).
- [x] Verify API endpoint parity with `npm run check:endpoints` (**evidence**: 204 server / 182 client, 0 unmatched).
- [x] Verify agentic governance with `npm run validate:agentic` (**evidence**: 60/60 checks passed).
- [x] Verify governance pipeline with `npm run validate:governance` (**evidence**: 0 errors, 0 warnings).
- [x] Verify workspace cleanliness with `python scripts/workspace_guardrail.py` (**evidence**: workspace is pristine).
- [x] Execute Playwright visual audit across Desktop Light/Dark and Mobile Light/Dark (**evidence**: 6 visual screenshots captured).
