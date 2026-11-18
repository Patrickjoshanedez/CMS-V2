# Handoff Report: Feature 7 — Mobile Touch Target Normalization

**Date:** 2026-11-13 (UTC) / 2026-11-14 (Local)  
**Agent:** `explorer_m2_1` (Teamwork Explorer)  
**Recipient:** `sub_orch_m2` (`fcb4abc4-612c-444c-a031-c0d3c2b99c4c`)  
**Milestone:** Milestone 2 (M2.1) — UI Sizing, Spacing & Cognitive Ergonomics Overhaul  
**Feature:** Feature 7 — Mobile Touch Target Normalization  

---

## 1. Observation

Direct examination of the CMS-V2 codebase confirmed the exact file paths, line numbers, and existing interactive element code across all 5 target components:

### Target 1: `client/src/components/projects/ActionDoneMatrixTab.jsx`
- **Line 826:**
  ```jsx
  {canAddRow && (
    <Button size="sm" onClick={handleAddRow} className="gap-1.5 text-xs h-8">
      <Plus className="h-3.5 w-3.5" />
      Add Row
    </Button>
  )}
  ```
- **Line 817:** `className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"` (`handleAddContinuationPage`)
- **Line 802:** `className="gap-1.5 text-xs h-8 text-primary border-primary/40 hover:bg-primary/5"` (`handleBalancePages`)
- **Line 836:** `className="gap-1.5 text-xs h-8"` (`handlePrint`)

### Target 2: `client/src/components/projects/PrototypeGalleryModal.jsx`
- **Line 138:**
  ```jsx
  <Button
    size="sm"
    variant="outline"
    onClick={handleCopyGithub}
    className="h-8 text-xs gap-1.5"
  >
  ```
- **Line 147:**
  ```jsx
  <Button size="sm" asChild className="h-8 text-xs gap-1.5">
    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
      <span>Open Code</span>
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  </Button>
  ```

### Target 3: `client/src/components/teams/ManuscriptTemplateWidget.jsx`
- **Line 117:**
  ```jsx
  {isInstructor && (
    <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
      <Link
        to="/settings?tab=administration"
        title="Configure manuscript template link in instructor settings"
      >
        <Settings2 className="h-3 w-3" /> Set in Settings
      </Link>
    </Button>
  )}
  ```
- **Line 189 & 198:**
  ```jsx
  <Button
    size="sm"
    className="h-8 gap-1.5 text-xs"
    onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
  >
  ```
- **Line 205:**
  ```jsx
  {isInstructor && (
    <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
  ```

### Target 4: `client/src/components/teams/TeamFormationNotificationItem.jsx`
- **Line 251:**
  ```jsx
  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAssign}>
    <UserCheck className="h-3.5 w-3.5" />
    Assign Committee
  </Button>
  ```
- **Line 226:** `className="h-8 gap-1.5 text-xs"` (`Edit Committee`)
- **Line 235 & 246:** `className="h-8 text-xs"` (`Inspect Roster`)
- **Line 261:** `className="h-8 w-8 text-muted-foreground hover:text-foreground"` (`Mark as read` icon button)
- **Line 272:** `className="h-8 w-8 text-muted-foreground hover:text-destructive"` (`Delete notification` icon button)

### Target 5: `client/src/pages/submissions/SubmissionReviewPage.jsx`
- **Line 947:**
  ```jsx
  {teamGoogleDocUrl && (
    <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
      <a href={teamGoogleDocUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3.5 w-3.5 text-primary" />
        Open Team Google Doc
      </a>
    </Button>
  )}
  ```
- **Line 955:**
  ```jsx
  {activeSubmissionId && (
    <Button asChild variant="outline" className="w-full gap-2 text-xs h-8">
      <a
        href={`/api/submissions/${activeSubmissionId}/file?download=true`}
        download={activeRound?.fileName || 'manuscript.docx'}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download className="h-3.5 w-3.5" />
        Download Original
      </a>
    </Button>
  )}
  ```
- **Line 939:** `className="w-full gap-2 shadow-xs h-8.5 text-xs"` (`Fullscreen Viewer`)
- **Line 901:** `className="w-full gap-1.5 text-xs h-8"` (`View Full Report`)
- **Line 913:** `className="w-full gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"` (`Re-scan Archive`)

---

## 2. Logic Chain

1. **Premise 1 (Standard):** WCAG 2.1 Success Criterion 2.5.5 and WCAG 2.2 Success Criterion 2.5.8 establish that the minimum target size for touch inputs is 44×44 CSS pixels unless an equivalent link or inline exception applies.
2. **Premise 2 (Current Code):** In all 5 components, interactive buttons hardcode fixed height tokens `h-8` (32px), `h-8.5` (34px), or `h-8 w-8` (32x32px) without viewport-specific media query scaling.
3. **Premise 3 (Mobile Experience):** On mobile viewports (<640px, e.g. 390x844), users interact via fingertip rather than a mouse pointer. A 32px height target yields high error rates and accidental actuation of neighboring controls (such as the adjacent 32x32px "Delete notification" icon button next to "Mark as read" in `TeamFormationNotificationItem.jsx`).
4. **Premise 4 (Desktop Ergonomics):** On desktop viewports (>=640px), compact `h-8` (32px) density is visually desirable and aligned with the CMS-V2 layout standard.
5. **Deduction:** Introducing responsive class patterns `min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8` (or `min-h-[44px] sm:min-h-0 sm:h-8` for text buttons) satisfies WCAG touch target requirements on mobile viewports (<640px) while preserving exact compact density on desktop viewports (>=640px).

---

## 3. Caveats

- **Scope Boundary:** This investigation strictly scopes touch target normalization to the 5 target files specified for Feature 7. Other pages and components across the 369 JSX files in `client/src/` may contain additional `h-8` buttons; those are cataloged separately in `survey_report.md` or left for future iteration.
- **Read-Only Invariant:** Per team role rules, no source files under `client/src/` were modified by `explorer_m2_1`. All findings and proposed patches are delivered in this handoff and `analysis.md` for `system_implementor` execution.
- **No Test Breaking Assumptions:** Vitest test suites for all 5 components were inspected. None of them assert literal `className` strings containing `h-8`; assertions rely on accessibility roles, text content, and `data-testid` attributes.

---

## 4. Conclusion

Feature 7 investigation is complete. The exact file paths, line numbers, current implementations, and surgical CST diffs have been documented in detail in `analysis.md`.
The proposed changes are atomic, zero-risk to existing unit tests, and fully enforce the 44px mobile touch target floor mandated by modern web standards and Milestone 2 requirements.

---

## 5. Verification Method

To independently verify the recommendations:

### A. Unit Test Suite (Zero Regressions)
Run the fast-path targeted Vitest commands across the 5 affected component test suites:
```bash
npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx
npm test --workspace=client -- src/components/projects/PrototypeGalleryModal.test.jsx
npm test --workspace=client -- src/components/teams/ManuscriptTemplateWidget.test.jsx
npm test --workspace=client -- src/components/teams/TeamFormationNotificationItem.test.jsx
npm test --workspace=client -- src/pages/submissions/SubmissionReviewPage.test.jsx
```

### B. Mobile Viewport Touch Target Measurement (Playwright)
In a Playwright headless script or browser inspector at mobile viewport (390 × 844):
```javascript
const bbox = await page.locator('[data-testid="adm-add-row-btn"]').boundingBox();
expect(bbox.height).toBeGreaterThanOrEqual(44);
```

### C. Invalidation Conditions
- Any button in the target set rendering `< 44px` height or width on a `<640px` viewport.
- Any desktop view (1440x900) where button height stretches beyond `32px` (`h-8`) due to missing `sm:min-h-0 sm:h-8` reset.
