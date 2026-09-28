# Original User Request

## Initial Request — 2026-09-26T12:04:31Z

This is a single self-contained fix; keep it small and focused.
Resolve print margin collapse and logo clipping in BukSU Capstone Management System V2 Action Done Matrix (Form RU-F-033) by eliminating CSS selector conflicts, applying authentic 16mm-20mm page padding in print mode, and ensuring 1:1 visual parity between editor view and printed output.

Working directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2
Integrity mode: development

## Requirements

### R1. Fix Print Margin Collapsing & CSS Selector Specificity Override
- Remove `#root div` from the reset block in `@media print` inside `ActionDoneMatrixTab.jsx`, which previously applied `padding: 0 !important` and `margin: 0 !important` to all page containers and stripped document margins to `0px`.
- Enforce high-specificity document sheet styling (`#root .adm-document-page`, `.adm-sheet-paper-container .adm-document-page`) with authentic print padding (`16mm 18mm 20mm 18mm !important`) matching the editor's visual margins.

### R2. Prevent Logo & Content Edge Clipping
- Ensure `BuksuAdmDocumentHeader` and the BukSU university seal maintain generous clearance from paper boundaries, preventing the seal from touching page edges or being cropped by printer unprintable zones.
- Align table columns and title margins so that they align proportionally within the 16mm-18mm left and right document gutters.

### R3. Total Suppression of Editor UI & Buttons in Print Output
- Strictly guarantee that no buttons (`+ Add Panelist Row`, `+ Add Suggestion`, `Sign Digitally`, `Re-sign`), interactive badges, editing lines, checkboxes, or helper hints (`"Tables dynamically allocate space as you type."`) leak into print.
- Ensure empty input fields print as clean whitespace (`""`) with zero placeholder string leaks.

### R4. Strict Scope Isolation
- Do not modify `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx`.

## Acceptance Criteria

### Margin & Alignment Verification
- [ ] Programmatic inspection verifies computed print padding is `> 0px` (specifically `16mm 18mm 20mm 18mm`).
- [ ] BukSU official seal top and left offsets in print mode exceed `15mm` from the physical paper edge.
- [ ] Printed table width matches printable content area (`calc(210mm - 36mm)` ~ 174mm) with balanced left and right margins.

### Visual & Functional Parity
- [ ] Playwright visual feedback loop captures updated `04_adm_print_page1.png` and `05_adm_print_final_sheet.png` demonstrating visible margins matching the editor sheet.
- [ ] 0 buttons or interactive controls visible in print output.
- [ ] 0 placeholder strings visible in blank rows in print output.
- [ ] Targeted client unit tests (`ActionDoneMatrixTab.test.jsx`, `SecretaryMinutesDocumentSheet.test.jsx`) pass with zero regressions.

## 2026-09-26T14:48:05Z

This is a single self-contained fix; keep it small and focused.
Resolve page arrangement, blank space elimination, and print overflow in the BukSU Secretary's Minutes Document (Form OVPAA-F-INS-032). Ensure balanced spatial distribution across 3 sheets, eliminate accidental blank pages, prevent table-footer overlap, and achieve polished visual rhythm aligned with i-arrange principles.

Working directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2
Integrity mode: development

## Requirements

### R1. Balanced 3-Sheet Page Arrangement & Content Distribution
- Eliminate disproportionate page density where Page 1 has large empty voids while Page 2 is overcrowded with multiple panel members, recommendations, verdicts, and signatures.
- Distribute committee remarks cleanly across 3 authentic sheets by default:
  - **Sheet 1 (Opening Sheet)**: BukSU Header, Document Title ("SECRETARY'S MINUTES"), Metadata Fields (Title of Paper, Proponents, Type of Defense, Rounds, Date/Time/Venue, Adviser, Panel Chair, Panel Members, Secretary), and Panel Chair Remarks.
  - **Sheet 2 (Continuation Sheet)**: Continuation Header ("SECRETARY'S MINUTES (CONTINUATION)") and Panel Member 1 Remarks (e.g. Raul Lecaros).
  - **Sheet 3 (Final Sign-off Sheet)**: Continuation Header, Panel Member 2 Remarks (e.g. Joseph Abella/Client), Overall Recommendations, Panel Verdict checkboxes, and Secretary Digital Signature Block.
- Provide automatic continuation sheet allocation if comments exceed vertical page capacity, matching the official BukSU Prototype Defense Minutes reference.

### R2. Eradicate Print Overflow & Accidental Blank Pages
- Prevent table content on continuation and final sheets from extending into or overlapping the official BukSU footer (`Document Code: OVPAA-F-INS-032`).
- Fix `@media print` height and overflow constraints (`height: 296mm`, `break-inside: avoid`, footer positioning) to eliminate phantom/blank overflow pages (such as Page 3 printing only a disconnected footer on a blank sheet).
- Guarantee that all essential sign-off components (Overall Recommendations, Panel Verdict, and Secretary Digital Signature Block) are cleanly rendered on the final sheet without truncation or clipping.

### R3. Visual Rhythm & Spatial Layout Polish (i-arrange)
- Establish consistent vertical rhythm and spacing scales between metadata fields, table headers, bullet comments, and signature blocks.
- Ensure empty space on sheets with fewer comments is balanced with proportional table min-height or elegant vertical alignment rather than abrupt dead white voids.
- Maintain strict suppression of all editor controls (`+ Add Suggestion`, `+ Add Panelist Row`, `+ Add Continuation Page`, `Sign Digitally`, `Remove Page`) and guidelines in print mode.

### R4. Strict Scope Isolation & Non-Regression
- Do not modify or regress `client/src/components/projects/ActionDoneMatrixTab.jsx`.
- Preserve all digital signature verification and ADM sync capabilities in `SecretaryMinutesDocumentSheet.jsx`.

## Acceptance Criteria

### Spatial & Layout Verification
- [ ] Programmatic print audit verifies zero footer collisions across all generated sheets (table `bottom` offset strictly above footer `top` offset with `>= 10mm` clearance).
- [ ] No phantom blank pages generated in print preview or PDF export (every printed sheet contains substantive document content; no empty page with just a floating footer).
- [ ] Sheet 1, Sheet 2, and Final Sign-off Sheet maintain balanced content density with comfortable breathing room.
- [ ] Overall Recommendations, Panel Verdict checkboxes, and Secretary Signature block render with 100% visibility on the final sheet.

### Visual & Functional Parity
- [ ] Playwright visual inspection captures updated print sheets across all pages demonstrating clean pagination and authentic BukSU institutional presentation.
- [ ] Zero interactive buttons or editing guidelines leak into printed output.
- [ ] Targeted client unit tests (`SecretaryMinutesDocumentSheet.test.jsx`, `ActionDoneMatrixTab.test.jsx`) pass with zero regressions.
- [ ] Route parity (`npm run check:endpoints`) and agentic governance (`npm run validate:agentic`) maintain 100% pass rate.

## 2026-09-28T06:10:21Z

Remediate all 22 prioritized interface quality, accessibility (WCAG 2.1 AA/AAA), theming, responsive design, and anti-patterns/AI slop findings identified during the system-wide audit of BukSU Capstone Management System V2 (CMS-V2) across all 5 remediation phases.

Working directory: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2
Integrity mode: development
Requested team: Full agent team

## Requirements

### R1. Document Viewer Consolidation & Dead Code Pruning (Phase 1)
Consolidate all document reading and verification flows strictly into the canonical `SophisticatedDocumentViewer.jsx` format, removing legacy non-canonical document viewers (`PaginatedDocumentViewer.jsx` and `ReadonlyPDFViewer.jsx`) in accordance with Pile B Rule 18. Redirect any existing test mocks to `SophisticatedDocumentViewer.jsx`, and eliminate redundant duplicate inline `style={{ color }}` tags across authentication components.

### R2. Mobile Ergonomics & Touch Target Normalization (Phase 2)
Ensure all interactive buttons, auxiliary controls, modal dismiss buttons, and accordion triggers maintain a minimum interactive touch target bounding box of 44x44px (`min-h-[44px] min-w-[44px]`) on touch/mobile viewports per WCAG 2.1 SC 2.5.5 and WCAG 2.2 SC 2.5.8 across `GoogleScholarSidebar.jsx`, `PrototypeGallery.jsx`, and `TeamCommitteeAssignmentsView.jsx`.

### R3. Accessible Semantics & Administrative Route Hardening (Phase 3)
Equip all icon-only interactive controls with explicit accessible names (`aria-label`) and state indicators (`aria-expanded`), notably on team chapter deadline accordions in `TeamCommitteeAssignmentsView.jsx`. Provide live region status announcements and `aria-busy` during long-running asynchronous operations such as the instructor workload balancing optimizer. Implement client-side route redirects in `App.jsx` for `/committee` -> `/committee-assignments` and `/scheduling` -> `/scheduling-center`.

### R4. Institutional Typography & Anti-Patterns De-Slop Pass (Phase 4)
Eliminate cliché multi-stop gradient headings and metric fills in `BukSULoginSidePanel.jsx` and `LandingPage.jsx`, replacing them with high-contrast institutional color tokens. Replace asymmetric `border-l-4` card accents in `ProjectCohortCard.jsx` and `DefenseSchedulingPage.jsx` with balanced, accessible status badges or indicator pills. Enforce English locale consistency (`hl="en"`) on the Google Identity Services OAuth login component in `LoginPage.jsx`.

### R5. Progressive Widget Loading & Layout Architecture (Phase 5)
Decouple monolithic top-level `PageSkeleton` gates in `InstructorDashboard.jsx` into progressive, widget-level loading states so individual dashboard cards render immediately without waiting for slower aggregate network calls. Convert the static 2x2 decorative icon grid in `BukSULoginSidePanel.jsx` into an informative milestone progression timeline.

## Acceptance Criteria

### A1. Functional & Structural Integrity
- [ ] No references to `PaginatedDocumentViewer` or `ReadonlyPDFViewer` remain in active application code, and all document viewing uniformly uses `SophisticatedDocumentViewer`.
- [ ] Direct navigation to `/committee` seamlessly redirects to `/committee-assignments`, and `/scheduling` redirects to `/scheduling-center`.
- [ ] The Google Sign-In button consistently renders in institutional English across all network origins.

### A2. Accessibility & Mobile Compliance (WCAG 2.1 AA/AAA)
- [ ] All interactive buttons in `GoogleScholarSidebar.jsx`, `PrototypeGallery.jsx`, and `TeamCommitteeAssignmentsView.jsx` satisfy >= 44x44px touch targets.
- [ ] Icon-only accordion chevrons provide explicit `aria-label` and dynamic `aria-expanded` state.
- [ ] Workload optimization triggers announce calculation status to screen readers via `aria-busy` and `role="status"`.
- [ ] No gradient text remains on headings or metrics, and all card status accents maintain balanced borders without `border-l-4` tells.

### A3. Verification & Governance
- [ ] Client unit tests pass with zero errors: `npm test --workspace=client`
- [ ] API endpoint parity passes with zero unmatched routes: `npm run check:endpoints`
- [ ] Agentic system governance audit passes 100% of checks: `npm run validate:agentic`
- [ ] Visual verification via Playwright confirms responsive rendering across Desktop (1440x900) and Mobile (390x844) in both Light and Dark modes.
