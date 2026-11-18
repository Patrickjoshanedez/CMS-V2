Redesign the entire UI of this system according to modern web standards, optimize component sizing and UX, and verify that all features, paper deliverables, printing formats, and workflows across all roles are fully working and tested with seed accounts.

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