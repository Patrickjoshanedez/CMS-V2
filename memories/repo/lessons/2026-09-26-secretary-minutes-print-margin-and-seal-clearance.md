# BukSU Capstone Management System V2 — Engineering Lesson
**Date**: September 26, 2026  
**Topic**: Secretary Minutes (OVPAA-F-INS-032) — Print Margin Collapsing & Seal Clearance Resolution  
**Status**: RESOLVED & VERIFIED  

---

## 1. Problem Context & User Intent
Following the resolution of the Action Done Matrix print layout, the user identified that the **Secretary Minutes Document Sheet** (`client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx`) suffered from the identical defect:
- In print mode, all outer margins collapsed to `0px`, causing the BukSU seal on the top-left to collide with the paper edge and be clipped, and the document table and title to stretch edge-to-edge without gutters.
- The user requested applying the exact same print margin formatting and visual parity to the Secretary Minutes.

---

## 2. Root Cause Analysis & Key Architectural Lessons Learned

### Lesson 1: Cascading Specificity Overrides in Print Stylesheets
- Inside `@media print`, `#root div` was included in the global container reset rule:
  ```css
  html, body, #root, #root div, main, .main-content {
    margin: 0 !important;
    padding: 0 !important;
  }
  ```
- Because `#root div` has a specificity of `(1, 0, 1)`, it overrode `.secretary-minutes-page` `(0, 1, 0)` with `!important`, stripping all page padding down to `0px` in print mode.
- **Prevention Pattern**: Never include generic element selectors like `#root div` in global resets. Target only specific top-level application roots (`html, body, #root, main, .main-content`) and enforce compound high-specificity selectors for document pages:
  ```css
  #root .secretary-minutes-page,
  #root div.secretary-minutes-page,
  .secretary-sheet-paper-container .secretary-minutes-page {
    padding: 16mm 18mm 20mm 18mm !important;
  }
  ```

### Lesson 2: Seal Sizing & Header Container Clearance
- In `SecretaryMinutesDocumentSheet.jsx`, `.secretary-minutes-page img` previously had `max-height: 44px !important`, which shrank the seal, while `BuksuDocumentHeader` lacked a minimum container height.
- **Prevention Pattern**: Enforce `min-h-[76px]` on the relative header container with vertical flex alignment and set text container padding to `px-20 sm:px-24`. Allow the seal image to scale cleanly (`max-height: 64px !important`), maintaining measured clearance (`top: 60.5px`, `left: 68.0px`, corresponding to > 15mm clearance from physical paper edges).

---

## 3. Implementation Verification Checklist

- [x] Removed `#root div` from the print CSS reset in `SecretaryMinutesDocumentSheet.jsx`.
- [x] Enforced compound high-specificity print padding (`16mm 18mm 20mm 18mm !important`).
- [x] Positioned official OVPAA-F-INS-032 footer with matching 18mm side margins (`left: 18mm; right: 18mm; bottom: 8mm; width: calc(210mm - 36mm)`).
- [x] Refined `BuksuDocumentHeader` with `min-h-[76px] flex flex-col justify-center` and `px-20 sm:px-24`.
- [x] Verified print metrics programmatically: `padding = 60.47px 68.03px 75.59px 68.03px`, `logo top/left offset = 60.5px / 68.0px`, `table width = 657.625px` with balanced 68.0px left/right margins.
- [x] Passed targeted client unit tests: 20/20 passed (`SecretaryMinutesDocumentSheet.test.jsx`, `ActionDoneMatrixTab.test.jsx`).
- [x] Passed API route parity: `npm run check:endpoints` (`UNMATCHED_COUNT = 0`).
- [x] Passed Agentic governance: `npm run validate:agentic` (60/60 checks).
- [x] Generated visual evidence artifacts:
  - `07_secretary_editor_page1_light.png`
  - `08_secretary_print_page1.png`
  - `09_secretary_print_final_sheet.png`
  - `Secretary_Minutes_OVPAA-F-INS-032.pdf`
