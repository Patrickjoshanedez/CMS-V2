# Lesson Learned: Action Done Matrix (Form RU-F-033) Authentic Multi-Page A4 Document Sheets & Print Parity

- **Date:** 2026-09-26
- **Task:** Eliminate dashboard print chrome, textarea blue scrollbars, and unpaginated overflow when printing Action Done Matrix (ADM), establishing 100% visual and physical A4 print parity with Secretary Minutes (Form OVPAA-F-INS-032) and institutional template `docs/Project-Workspace-ADM.docx` (Form RU-F-033).
- **Keywords:** lesson, learned, prevention, runbook, checklist, evidence, passed

---

## 1. Problem & Context
When printing or exporting the Action Done Matrix from `/projects/:id?tab=capstone_1`, users encountered:
1. **Dashboard Chrome Leakage:** 9+ printed pages containing web dashboard elements (Back button, KPI cards, Milestone Stepper, Tab Triggers, and Collapsible Accordion shells).
2. **Textarea Scrollbar Artifacts:** Interactive `<textarea>` and `<AutoExpandingTextarea>` elements rendered browser-native blue scrollbars/thumb indicators in print.
3. **Unpaginated A4 Spillovers:** Unconstrained row lists overflowed the physical $296\text{mm} \approx 1119\text{px}$ page height, splitting rows across page margins uncontrollably.
4. **Dark Mode Inversion:** Dark theme background colors (`bg-background`) bled into document printing.

---

## 2. Solution & Architectural Decisions
1. **Multi-Page A4 Document Architecture:**
   - Mirrored `SecretaryMinutesDocumentSheet.jsx` design standard using `.adm-sheet-paper-container` with discrete `.adm-document-page` children ($210\text{mm} \times 296\text{mm}$).
   - **Page 1 (Opening Sheet):** BukSU Seal, University Header, Centered "ACTION DONE MATRIX", Underlined Project Title print twin, Note to Researchers, Review Type tick boxes (`Internal Review` / `External Review`), 4-column Table Header (`Name of Panel`, `Suggestion of the Panel(s)`, `Action Taken`, `Page Number/s`), up to 4 rows (`PAGE_1_CAPACITY = 4`), and pinned institutional footer (`Page 1 of Y`).
   - **Continuation Sheets (Pages 2 to Y-1):** University Header, `ACTION DONE MATRIX (CONTINUATION)`, Review Type tick boxes, 4-column Table Header, up to 6 rows (`CONTINUATION_PAGE_CAPACITY = 6`), and pinned footer (`Page X of Y`).
   - **Final Sheet (Page Y):** University Header, Table Header + remaining rows (up to 2 rows), Secretary Compliance Verification Gate banner, Signatories Board (Tier 1 Adviser & Instructor, Approved by Panel Member 1, Panel Member 2, and REC / Chair), and pinned footer (`Page Y of Y`).
2. **Continuation Page Insertion Control:**
   - The `+ Add Continuation Page (Insert before Final Sheet)` button is strictly rendered outside Pages 1 through Y-1 and never after the Final Sheet.
   - Row migration controls (`↑ P{pageIdx}` and `↓ P{pageIdx+2}`) allow fine-grained redistribution of rows across sheets.
3. **Dual-Presentation Textarea Static Twins:**
   - Interactive `<AutoExpandingTextarea>` is hidden during print (`print:hidden`).
   - Accompanied by `<div className="hidden print:block font-serif text-[8.5pt] leading-tight text-black whitespace-pre-wrap">` to render clean, publication-grade text without blue scrollbars.
4. **Dark Mode Immunity & Global Print Isolation:**
   - Inoculated `.adm-sheet-paper-container` and `.adm-document-page` in `client/src/index.css` with forced `#ffffff` backgrounds, `#000000` text, and `#000000` borders.
   - Global print rules hide non-ADM dashboard components (`.project-title-card`, `.workflow-phase-tracker`, `[role='tablist']`, `.card:not(:has(.adm-sheet-paper-container))`, and buttons).

---

## 3. Verification & Evidence
- **Automated Tests:**
  - Fast-Path Client Test: `npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx` (14/14 passed).
  - Secretary Minutes Regression Test: `npm test --workspace=client -- src/components/projects/SecretaryMinutesDocumentSheet.test.jsx` (4/4 passed).
  - Milestone Collapsible Sections: `npm test --workspace=client -- src/components/projects/Capstone1CollapsibleSections.test.jsx` (18/18 passed).
  - Route Parity Check: `npm run check:endpoints` (UNMATCHED_COUNT = 0).
  - Agentic System Governance Audit: `npm run validate:agentic` (60/60 passed).
- **Playwright Visual & Physical PDF Evidence:**
  - Verified screenshots in `scratch/screenshots/adm_print/`:
    - `01_adm_screen_dark_mode.png`: Dark dashboard with crisp white sheets.
    - `02_adm_print_emulated.png`: 7 isolated printed sheets without dashboard chrome.
    - `03_adm_desktop_light_page1.png`: Opening Sheet with BukSU Seal & RU-F-033 metadata.
    - `04_adm_desktop_light_final_signatories.png`: Final Sheet with Secretary Gate and Signatories Board.
    - `05_adm_mobile_light.png` & `06_adm_mobile_dark.png`: Mobile responsive paper layout.
    - `Action_Done_Matrix_RU-F-033_verified.pdf`: Multi-page A4 physical PDF with RU-F-033 footers.
