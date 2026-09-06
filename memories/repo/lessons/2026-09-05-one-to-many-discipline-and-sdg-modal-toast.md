# Lesson: One-to-Many Field of Discipline and SDG Alignment Modal & Toast Architecture

## Incident & Requirement Context
In BukSU Capstone Management System V2 (CMS-V2), Phase 1 proposal drafting requires establishing clear institutional classification and societal relevance for each submitted title proposal. In the initial implementation, single-select comboboxes restricted each title to one discipline and one SDG. However, capstone projects regularly encompass multiple intersecting disciplines (e.g. *Artificial Intelligence & Machine Learning* alongside *Health Informatics & Telemedicine* and *Mobile Application Development*) and address multiple UN Sustainable Development Goals (e.g., *SDG 3: Good Health and Well-being* and *SDG 9: Industry, Innovation and Infrastructure*). The user explicitly instructed:
> *"make this a button that will open a toast because Field of Discipline & SDG Alignment is one to many meaning one title has many field or sdg"*

## Key Lessons Learned
1. **Modal Checkbox Dialog for High-Density Multi-Select**: Trying to cram multi-select dropdown menus into compact form cards causes viewport cutoffs, scrolling conflicts, and accidental dismissals. Providing dedicated `[ + Select Disciplines ]` and `[ + Select SDGs ]` trigger buttons opening a responsive `<AlignmentSelectorDialog>` modal gives students adequate visual space for search filtering, domain categorization chips, and multi-checkbox review.
2. **Immediate Tactile Feedback with Sonner Toasts**: Emitting actionable Sonner toasts upon applying or removing alignments provides immediate confirmation to students that their selection changes are saved locally to the proposal draft state.
3. **Array Schema Parity**: The backend project model (`server/modules/projects/project.model.js`) defines `capstoneType: { type: [String], validate: ... }` and `sdgTags: { type: [String], validate: ... }` with length limits between 1 and 10. Representing multi-selection as string arrays in the React client maintains strict 1:1 parity with the MongoDB schema and seeder validation contracts.
4. **Portal Testing in JSDOM & React 18**: When testing components that use `createPortal(..., document.body)`, testing environments can suffer unmount lifecycle issues if `document.body` nodes are manually deleted outside of React's unmount flow. Adding a `portal = true` prop (default `true` in production, `false` in unit tests) allows isolated component tests to run cleanly inside their test container while preserving full modal portal behavior in production.

## Prevention Guidelines
- **Always Validate Array Defaults**: Ensure form state initializers provide arrays (`capstoneType: [...]`, `sdgTags: [...]`) and fallback guards (`currentProposal.capstoneType || []`) to prevent `TypeError: undefined is not iterable` or `.map is not a function`.
- **Enforce Selection Limits (1–10)**: Provide visible indicators and button disabling when the user reaches the maximum threshold of 10 items, preventing schema validation failures on proposal submission.
- **Maintain Lucide Icon Imports**: Always verify that all icon components used inside JSX (e.g. `X`, `Layers`, `Globe`, `Plus`) are explicitly imported from `'lucide-react'`.

## Runbook for Adding Multi-Select Modal Dialogs
1. **Define Constants & Lookups**: Standardize catalog items in `@cms/shared` with `id`, `name`, `domain` (or category), and description.
2. **Build Reusable Dialog**: Create an accessible modal dialog component supporting search filtering, domain tabs, checkboxes, selection counters, and cancel/apply buttons.
3. **Integrate Buttons & Badge Cloud**: In the host form, replace combobox inputs with a trigger button and a wrap-around badge pill container displaying selected items with individual `(x)` remove buttons.
4. **Wire Toast Notifications**: Trigger `toast.success` and `toast.info` with descriptive feedback on save and remove.
5. **Verify Comprehensive Suite**: Run client unit tests, endpoint checks, agentic validation, and server workflows.

## Verification Checklist
- [x] Trigger buttons (`[ + Select Disciplines ]`, `[ + Select SDGs ]`) open modal dialogs with smooth transitions.
- [x] Search input filters disciplines and SDGs in real time.
- [x] Domain filter chips allow quick navigation across IT specializations.
- [x] Selected items display checkmarks and custom badge indicators.
- [x] Multi-selection supports 1 to 10 items per title proposal.
- [x] Tag pill clouds display selected items with removal buttons.
- [x] Sonner toasts emit on applying or removing alignments.
- [x] Client and server unit & integration test suites pass with 100% green.
