# BukSU Capstone Management System V2 — Engineering Lesson
**Date**: September 26, 2026  
**Topic**: Action Done Matrix (ADM Form RU-F-033) — Inline Document Input Style & Print Parity Refactor  
**Status**: RESOLVED & VERIFIED  

---

## 1. Problem Context & User Intent
The BukSU Action Done Matrix (`client/src/components/projects/ActionDoneMatrixTab.jsx`) previously utilized boxed, form-like inputs that clashed with the authentic institutional paper aesthetic established by the Secretary Minutes form (`OVPAA-F-INS-032`). The user required:
1. Refactoring the ADM input elements to match the Secretary Minutes document style: clean inline text with subtle hover/focus underlines, authentic serif typography, auto-expanding textareas, and zero boxed input containers.
2. Complete print parity matching BukSU Form `RU-F-033` (matching official specifications), guaranteeing that all editor-only controls, action buttons, interactive hints, and placeholder text are strictly excluded from print.
3. Strict zero-regression constraint: *“the Secretary minutes is already good do not change anything in that”*.

---

## 2. Root Cause Analysis & Key Architectural Lessons Learned

### Lesson 1: AutoResizeTextarea with Static Print Twins
- In interactive screen mode, users need auto-resizing textareas that allocate vertical space dynamically as content is entered, styled with transparent backgrounds, serif fonts, and subtle focus underlines.
- In print mode (`@media print`), browser form controls (`<textarea>`, `<input>`) introduce native styling artifacts, fixed heights, clipping, and scrollbars.
- **Prevention Pattern**: Implement a dual-rendering structure where the interactive `<textarea className="print:hidden">` is paired with an adjacent static typography twin `<div className="hidden print:block font-serif text-[8.5pt] leading-snug whitespace-pre-wrap break-words">{value || ''}</div>`. This guarantees 100% text expansion, perfect line wrapping, and zero scrollbars in printed PDFs.

### Lesson 2: Zero-Placeholder Guarantee in Print Media
- In typical web forms, placeholders guide users (e.g. `"Enter Capstone Project Title..."`, `"Panel Member Name"`, `"p. #"`).
- In institutional document printing, printing placeholder strings on unpopulated or partially filled rows corrupts official records.
- **Prevention Pattern**: Ensure print twin elements universally evaluate `{value || ''}`. Empty inputs print as pure clean whitespace, preserving official document cleanliness without placeholder leaks.

### Lesson 3: Mongoose Required String Validation on Blank ADM Rows
- In `server/modules/projects/project.model.js`, `actionDoneMatrixItemSchema.suggestion` has `{ type: String, required: true, trim: true }`.
- When clicking `+ Add Panelist Row` to generate a new row on both client and server, passing `suggestion: ""` caused Mongoose to throw a `400 Bad Request` validation failure.
- **Prevention Pattern**: In `server/modules/projects/project.controller.js` (`createActionDoneMatrixItem`), provide a resilient default fallback string (`suggestion?.trim() ? suggestion.trim() : 'New recommendation'`), and similarly initialize new rows on the client.

### Lesson 4: Scope Boundary Preservation
- To honor explicit institutional stability constraints, `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx` was strictly untouched (0 lines modified, verified via `git status` and test suites).

---

## 3. Implementation Verification Checklist

- [x] Replaced boxed input fields with inline `AutoResizeTextarea` and borderless text inputs in `ActionDoneMatrixTab.jsx`.
- [x] Implemented static serif print twins with `{value || ''}` to eliminate placeholder leakage.
- [x] Structured table with authentic BukSU Form RU-F-033 columns (`NAME OF PANEL` [26%], `SUGGESTION OF THE PANEL(S)` [35%], `ACTION TAKEN` [30%], `PAGE NUMBER/S` [9%]).
- [x] Suppressed all editor controls in print: `+ Add Panelist Row`, `+ Add Suggestion`, `"Tables dynamically allocate space as you type."`, `Sign Digitally`, `Re-sign`, and `Secretary Compliance Verification Gate`.
- [x] Maintained strict touchless protection of `SecretaryMinutesDocumentSheet.jsx`.
- [x] Verified Mongoose validation fallback on `createActionDoneMatrixItem`.
- [x] Passed targeted client unit tests: 22/22 passed (`ActionDoneMatrixTab.test.jsx`, `Capstone1CollapsibleSections.test.jsx`).
- [x] Passed Secretary Minutes tests: 4/4 passed (`SecretaryMinutesDocumentSheet.test.jsx`).
- [x] Passed API route parity: `npm run check:endpoints` (`UNMATCHED_COUNT = 0`).
- [x] Passed Agentic governance: `npm run validate:agentic` (60/60 checks).
- [x] Executed Playwright visual audit across light, dark, print emulation, and mobile viewports with generated evidence artifacts.

---

## 4. Runbook for Institutional Document Print Parity

When implementing or modifying BukSU print-first forms (such as `RU-F-033`, `OVPAA-F-INS-032`, or Rubric sheets):

1. **Dual Structure**: Always pair interactive inputs (`print:hidden`) with static typography divs (`hidden print:block`).
2. **Typography Consistency**: Use `font-serif`, `leading-snug`, and explicit point sizing (`text-[8.5pt]` or `text-[9pt]`) matching institutional guidelines.
3. **No Placeholders in Print**: Ensure print twins render `{value || ''}` and never `{value || placeholder}`.
4. **Header Alignment**: Ensure header components (`BuksuAdmDocumentHeader`) allocate explicit min-height (`min-h-[76px]`) to clear the university seal from titles.
5. **Print Stylesheet Isolation**: Apply `@media print { @page { size: A4 portrait; margin: 0 !important; } }` and hide all interactive buttons with `no-print print:hidden`.
6. **Evidence Generation**: Always execute Playwright print emulation (`page.emulateMedia({ media: 'print' })`) and inspect generated PDF output before closing tasks.
