## 2026-09-28T06:12:26Z

You are the Project Orchestrator for BukSU Capstone Management System V2 (CMS-V2).

Your Identity:
- Archetype: orchestrator
- Working directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\orchestrator_1
- Workspace directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2
- Parent / Caller: Sentinel (Conversation ID: 4dc46a8f-57da-4a5e-94bb-ac3e93d9e37e)
- User Request file: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md (under timestamp ## 2026-09-28T06:10:21Z)

Mission:
Remediate all 22 prioritized interface quality, accessibility (WCAG 2.1 AA/AAA), theming, responsive design, and anti-patterns/AI slop findings identified during the system-wide audit of BukSU Capstone Management System V2 (CMS-V2) across all 5 remediation phases:

1. Phase 1: Document Viewer Consolidation & Dead Code Pruning
   - Consolidate all document reading and verification flows strictly into canonical `SophisticatedDocumentViewer.jsx` format.
   - Remove legacy non-canonical viewers `PaginatedDocumentViewer.jsx` and `ReadonlyPDFViewer.jsx` per Pile B Rule 18.
   - Redirect any existing test mocks to `SophisticatedDocumentViewer.jsx`.
   - Eliminate redundant duplicate inline `style={{ color }}` tags across authentication components.

2. Phase 2: Mobile Ergonomics & Touch Target Normalization
   - Ensure all interactive buttons, auxiliary controls, modal dismiss buttons, and accordion triggers maintain a minimum interactive touch target bounding box of 44x44px (`min-h-[44px] min-w-[44px]`) on touch/mobile viewports per WCAG 2.1 SC 2.5.5 and WCAG 2.2 SC 2.5.8 across `GoogleScholarSidebar.jsx`, `PrototypeGallery.jsx`, and `TeamCommitteeAssignmentsView.jsx`.

3. Phase 3: Accessible Semantics & Administrative Route Hardening
   - Equip all icon-only interactive controls with explicit accessible names (`aria-label`) and state indicators (`aria-expanded`), notably on team chapter deadline accordions in `TeamCommitteeAssignmentsView.jsx`.
   - Provide live region status announcements and `aria-busy` during long-running asynchronous operations such as the instructor workload balancing optimizer.
   - Implement client-side route redirects in `App.jsx` for `/committee` -> `/committee-assignments` and `/scheduling` -> `/scheduling-center`.

4. Phase 4: Institutional Typography & Anti-Patterns De-Slop Pass
   - Eliminate cliché multi-stop gradient headings and metric fills in `BukSULoginSidePanel.jsx` and `LandingPage.jsx`, replacing them with high-contrast institutional color tokens.
   - Replace asymmetric `border-l-4` card accents in `ProjectCohortCard.jsx` and `DefenseSchedulingPage.jsx` with balanced, accessible status badges or indicator pills.
   - Enforce English locale consistency (`hl="en"`) on the Google Identity Services OAuth login component in `LoginPage.jsx`.

5. Phase 5: Progressive Widget Loading & Layout Architecture
   - Decouple monolithic top-level `PageSkeleton` gates in `InstructorDashboard.jsx` into progressive, widget-level loading states so individual dashboard cards render immediately without waiting for slower aggregate network calls.
   - Convert the static 2x2 decorative icon grid in `BukSULoginSidePanel.jsx` into an informative milestone progression timeline.

Acceptance Criteria & Verification Battery:
- Client unit tests pass with zero errors: `npm test --workspace=client`
- API endpoint parity passes with zero unmatched routes: `npm run check:endpoints`
- Agentic system governance audit passes 100% of checks: `npm run validate:agentic`
- Playwright visual verification confirms responsive rendering across Desktop (1440x900) and Mobile (390x844) in both Light and Dark modes.

Coordination Requirements:
- Maintain your plan in `plan.md`, current status in `progress.md`, and memory in `BRIEFING.md` in your working directory.
- Dispatch specialist subagents as needed and supervise their execution.
- When all phases are completed and verified, deliver your final report and notify Sentinel via `send_message` so that an independent post-victory audit can be triggered.


## 2026-11-13T17:25:32Z

[Message] timestamp=2026-11-13T17:25:32Z sender=ae728e2c-0bf5-4df5-ae63-e0537f564eed priority=MESSAGE_PRIORITY_HIGH content=Redesign the entire UI of this system according to modern web standards, optimize component sizing and UX, and verify that all features, paper deliverables, printing formats, and workflows across all roles are fully working and tested with seed accounts.

Integrity mode: development

## Requirements

### R1. UI Redesign & Sizing Optimization
Redesign the system UI across all views to be clear, consistent, and compliant with modern web standards. Optimize component scaling, typography, and spacing across the interface so elements are not oversized, revising or replacing layouts wherever amiss.

### R2. Full Functional Enhancement & Workflow Integrity
Ensure all system features and functions are fully working and enhanced as intended. Follow the actual workflow across all roles (Student, Instructor, and Faculty committee appointments including Adviser, Panelist, Secretary, and Chair) rather than outdated instructions, revising any functionality that does not function as intended.

### R3. Paper Deliverables & Printing Format
Ensure all paper requirements, deliverables, forms, and manuscript documents across the capstone lifecycle are fully functional and properly styled for printing formats.

### R4. Seed Account Testing & Real-Scenario Browser Verification
Create dedicated seed accounts for each role and execute realistic end-to-end scenario testing across all role workflows using browser navigation, ensuring all workflows across all roles complete without simulated finishes.

## Acceptance Criteria

### UI & Layout Standards
- [ ] Every page and view across the application uses consistent styling, typography, and responsive spacing without oversized buttons, inputs, cards, or dialogs.
- [ ] Layouts display correctly without broken grids, clipping, overlapping elements, or unformatted containers across standard desktop viewports.

### Role Workflows & Functional Verification
- [ ] End-to-end capstone workflow (from team formation and title proposals through proposal defense, manuscript chapters, prototype progress, and final defense with Action Done Matrix) succeeds across all respective roles (Student, Instructor, Adviser, Panelist, Secretary, Chair).
- [ ] Dedicated seed accounts created for each role successfully authenticate and perform their required workflow actions.
- [ ] No role workflow encounters blocking console errors, broken API requests (HTTP 4xx/5xx), or unresolved UI states during end-to-end execution.

### Deliverables & Printing Support
- [ ] All capstone document views, approval sheets, and Action Done Matrix forms render valid printable formats with print stylesheets (`@media print`) without clipped content or missing sections.
- [ ] All required academic paper deliverables and review artifacts can be viewed, generated, or printed without errors.

### Independent Verification Sweeps
- [ ] Browser-driven automated verification runs through each role's complete workflow and records passing status for every workflow step.

---

## Execution Environment & Context
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\orchestrator_1/
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Identity**: You are the Project Orchestrator (teamwork_orchestrator). Dispatches tasks to specialists, monitors progress, and synthesizes results. Maintain your BRIEFING.md, plan.md, and progress.md in your state folder.
