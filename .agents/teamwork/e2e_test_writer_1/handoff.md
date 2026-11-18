# Handoff Report — e2e_test_writer_1

**Date:** 2026-11-13T18:05:00Z  
**Role:** E2E Test Suite Designer (`teamwork_test_writer`)  
**Parent Conversation ID:** `1d510dcc-9499-4a34-9b6f-1193ae141e8b`  
**State Folder:** `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_test_writer_1\`  
**Deliverable:** `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_test_writer_1\test_suite_design.md`  

---

## 1. Observation

1. **User Request & Requirements**:
   - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md`: Lines 11–22 define 4 core requirements:
     - `R1. UI Redesign & Sizing Optimization`: "Redesign the system UI across all views to be clear, consistent, and compliant with modern web standards. Optimize component scaling, typography, and spacing across the interface so elements are not oversized..."
     - `R2. Full Functional Enhancement & Workflow Integrity`: "Ensure all system features and functions are fully working and enhanced as intended. Follow the actual workflow across all roles (Student, Instructor, and Faculty committee appointments including Adviser, Panelist, Secretary, and Chair)..."
     - `R3. Paper Deliverables & Printing Format`: "Ensure all paper requirements, deliverables, forms, and manuscript documents across the capstone lifecycle are fully functional and properly styled for printing formats."
     - `R4. Seed Account Testing & Real-Scenario Browser Verification`: "Create dedicated seed accounts for each role and execute realistic end-to-end scenario testing across all role workflows using browser navigation, ensuring all workflows across all roles complete without simulated finishes."

2. **Project Scope & Architecture**:
   - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md`: Lines 12–37 catalog 23 discrete features across 5 Milestones (M1 Paper Deliverables & Printing, M2 UI Sizing & Cognitive Ergonomics, M3 Workflow Integrity & Role Exclusions, M4 Dedicated Seed Accounts, M5 Final Milestone: 100% E2E Pass) and an E2E track (Features 17–21).
   - Lines 67–79 define 11 dedicated seed accounts: Student Lead & Members 2–4 (`student@student.buksu.edu.ph` through `student4@student.buksu.edu.ph`), Instructor (`instructor@student.buksu.edu.ph`), Adviser (`adviser@student.buksu.edu.ph`), Secretary (`secretary@student.buksu.edu.ph`), Panelists 1–3 (`panelchair@student.buksu.edu.ph`, `panelist2@student.buksu.edu.ph`, `panelist3@student.buksu.edu.ph`), and Dean (`dean@student.buksu.edu.ph`) with default password `Password123!`.
   - Lines 61–65 define strict institutional role rules: Course Instructor exclusion from committees, Secretary Compliance Gate requirement (`project.admSignatures.secretary.endorsed === true`) before Tier 1–3 signatures unlock, and committee composition (1 Adviser, 1 Secretary, 3 Panelists).

3. **Sub-Orchestrator Scope & Anti-Simulation Contract**:
   - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_e2e\SCOPE.md`: Lines 27–38 establish the E2E contract: standard exit codes, output artifacts (`scratch/qa-evidence/results.json`), zero-simulation enforcement (real DOM selectors, form fills, button clicks, API mutations), and liveness guards (strict ban on `networkidle`, use of `waitUntil: 'domcontentloaded'`, and 110s watchdog timeouts).

4. **Standards & Reference Methodology**:
   - `c:\Users\patri\dev\CMS-V2\.agents\skills\non-technical-test-case-generator\SKILL.md`: Lines 49–59 prescribe the canonical ISO/IEC/IEEE 29119-3 8-column layout (`Test Case #`, `Test Case Description`, `Test Steps`, `Test Data`, `Expected Result`, `Actual Result`, `Pass/Fail`, `Remarks`), plain-English non-technical step descriptions without developer jargon, and observable visual feedback verification.
   - `c:\Users\patri\dev\CMS-V2\.agents\skills\automated-qa-tester\SKILL.md`: Lines 19–21 mandate zero tolerance for unverified passes or simulated outcomes, requiring tangible DOM assertions.

---

## 2. Logic Chain

1. From the dispatch directive and `PROJECT.md`, the E2E testing track requires a formal 4-Tier Test Case hierarchy satisfying ISO/IEC/IEEE 29119-3 standards.
2. To satisfy **Tier 1 (Feature Coverage)**: Each primary feature area must have $\ge$ 5 test cases. We partitioned Tier 1 into:
   - Category 1A: UI Redesign & Component Sizing Optimization (5 test cases covering touch target normalization, shell continuity, heading hierarchy, Cowan 4-chunking, and table overflow protection).
   - Category 1B: Paper Deliverables & Printing Support (6 test cases covering Approval Sheet exposure, Document Viewer print unrolling, Plagiarism report print styles, Radix dialog/live minutes print unrolling, Evaluation rubric scoresheet printing, and global 1-inch paper margins).
   - Category 1C: Role Workflows & Functional Operations (6 test cases covering Student proposal studio, Instructor committee appointment, Faculty Adviser endorsement, Panelist rubric scoring, Secretary minutes & endorsement, and Dean signature & certificate).
   - *Total Tier 1 = 17 test cases.*
3. To satisfy **Tier 2 (Boundary & Corner Cases)**: Boundary and failure modes across each feature category must have $\ge$ 5 test cases. We established:
   - Category 2A: Empty Inputs & Form Validations (5 test cases: empty proposals, incomplete rubrics, blank late justifications, unselected tags, blank minutes).
   - Category 2B: System Bounds, Capacity & Thresholds (5 test cases: 10 proposal cap, 1–4 member team bounds, 5,000 char problem statement stress, file upload boundaries >50MB / invalid MIME-type, and strict 25% plagiarism rejection).
   - Category 2C: Unauthorized Routes & Security Access Controls (5 test cases: Student blocked from `/users`, Student blocked from `/defense-schedule`, Panelist blocked from unassigned projects, Student blocked from ADM signing, and unauthenticated session redirection).
   - Category 2D: Committee Role Exclusions & Conflicts of Interest (5 test cases: Instructor excluded from Adviser combobox, Secretary combobox, and Panelist comboboxes; Adviser excluded from Panelist on same team; duplicate panelist prevention).
   - Category 2E: Workflow Dependency & Sign-off State Gating (5 test cases: ADM locked pending Secretary endorsement, Chapter uploads locked pending Title approval, Defense scheduling locked pending Adviser endorsement, Prototype defense locked pending Late justification approval, and Archival locked pending complete Tier 1–3 signatures).
   - *Total Tier 2 = 25 test cases.*
4. To satisfy **Tier 3 (Cross-Feature Combinations)**: We engineered 5 pairwise cross-feature interaction cases covering cascading asynchronous states across the entire capstone progression:
   - TC-T3-INT-001: Student Title Proposal $\to$ Similarity Pre-Scan $\to$ Instructor Approval $\to$ Committee Assignment with Instructor Exclusion.
   - TC-T3-INT-002: Chapter Manuscript Upload $\to$ Plagiarism Scan $\to$ Adviser Endorsement $\to$ Defense Scheduling.
   - TC-T3-INT-003: Defense Hearing $\to$ Panelist Rubric Scoring $\to$ Secretary Minutes $\to$ ADM v1 Formation $\to$ Grade Release.
   - TC-T3-INT-004: Gantt Schedule Approval $\to$ Late Milestone Delay Trigger $\to$ Late Justification $\to$ Prototype Defense & ADM v2.
   - TC-T3-INT-005: 5-Chapter Compilation $\to$ Archive Plagiarism Scan $\to$ Secretary Gate $\to$ Multi-Tier Signatures $\to$ Archival & QR Certificate.
   - *Total Tier 3 = 5 test cases.*
5. To satisfy **Tier 4 (Real-World Application Scenarios)**: We authored 5 comprehensive multi-actor scenarios covering all 11 seed accounts across Phase 0 to Phase 4:
   - TC-T4-SCN-001: The Canonical Full-Lifecycle Graduation Journey (Team Alpha: 4 Students, Instructor, Adviser, Secretary, Panel Chair, Panelist 2, Panelist 3, Dean).
   - TC-T4-SCN-002: Title Defense Adversity, Pre-Scan High Similarity & Proposal Revision (Team Beta).
   - TC-T4-SCN-003: Manuscript Review Adversity, Sophisticated Document Viewer Revision Diff & Plagiarism Remediation.
   - TC-T4-SCN-004: Interactive Gantt Schedule Slippage, Late Justification Gating & Working Prototype Defense.
   - TC-T4-SCN-005: Secretary Compliance Verification Gate Lockout & Dean Multi-Tier Archival Authority.
   - *Total Tier 4 = 5 test cases.*
6. The entire suite yields **52 rigorously specified test cases** with complete Requirements Traceability Matrix (RTM) and automated execution harness contracts, fully ready for Playwright implementation and headless verification.

---

## 3. Caveats

1. **Backend & Plagiarism Engine Dependencies**: Tier 3 and Tier 4 scenarios assume that the Express backend, MongoDB, Redis, and FastAPI plagiarism service are active during test execution. In local development environments where the FastAPI plagiarism microservice is offline, the fallback mock in `server/modules/plagiarism/` will execute, but production verification requires all services online.
2. **Dynamic Defense Scheduling Dates**: Test cases involving defense scheduling specify relative future timestamps (e.g., "Next Friday 10:00 AM") rather than hardcoded dates to avoid time-drift test flakiness.
3. **No Project Source Modifications**: As `e2e_test_writer_1`, all outputs were strictly restricted to `.agents/teamwork/e2e_test_writer_1/` per workspace governance rules. Zero implementation source files or test execution runners were modified during this specification task.

---

## 4. Conclusion

The 4-Tier Test Case hierarchy has been fully designed and published to `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_test_writer_1\test_suite_design.md`. It strictly adheres to ISO/IEC/IEEE 29119-3 standards, enforces non-technical observable steps, incorporates complete anti-simulation criteria, models all 11 seed accounts, covers all 23 project features, and provides a turnkey blueprint for automated browser testing in Milestone M5 / E2E track.

---

## 5. Verification Method

To independently verify the completeness and compliance of this test suite design:

1. **Inspect Test Specification File**:
   - Check file existence and line count:
     ```pwsh
     Get-Item c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_test_writer_1\test_suite_design.md
     ```
   - Verify that all 52 test cases are defined (`TC-T1-UI-001` through `TC-T4-SCN-005`).
2. **Verify ISO/IEC/IEEE 29119-3 Schema Compliance**:
   - Confirm all tables contain the mandatory 8 columns: `Test Case #`, `Test Case Description`, `Test Steps`, `Test Data`, `Expected Result`, `Actual Result`, `Pass/Fail`, `Remarks`.
   - Confirm all test steps use numbered, non-technical plain English without developer jargon or raw API endpoint references.
3. **Verify Requirements Traceability**:
   - Inspect Section 8 (Requirements Traceability Matrix) to confirm 100% coverage of requirements R1–R4 from `ORIGINAL_REQUEST.md` and Features 1–23 from `PROJECT.md`.
4. **Invalidation Conditions**:
   - The specification is invalidated if any test case allows synthetic status passing without DOM verification, omits any of the 11 canonical seed accounts, violates the Course Instructor committee exclusion rule, or fails to enforce the Secretary ADM Compliance Gate.
