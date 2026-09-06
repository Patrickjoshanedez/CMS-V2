# Lesson Learned: High-Contrast Surface Tokens, Autosave with Exit Guard & Root Text Scaling

## Context & Incident
In CMS-V2, light mode borders using `border-slate-100` or `border-slate-200` washed out against clean white backgrounds, lacking structural definition and clarity compared to dark mode's crisp `border-slate-700`. Furthermore, long proposal form entry risked accidental tab closure without feedback, and typography scaling was previously limited to an un-persisted single-step toggle.

## Key Changes
1. **High-Contrast Border & Surface Standardization**:
   - Page Canvas: `bg-slate-100` in light mode, `dark:bg-[#060b13]` in dark mode.
   - Containers & Cards: `bg-white border border-slate-300 shadow-sm` in light mode, `dark:bg-[#0c1424] dark:border-slate-700 dark:shadow-none` in dark mode.
   - Input & Textarea Controls: `border border-slate-400/80 bg-white text-slate-900 placeholder-slate-400` in light mode, `dark:border-slate-700 dark:bg-[#080d18] dark:text-slate-100 dark:placeholder-slate-500` in dark mode.
   - Active Focus Rings: `focus:border-blue-600 focus:ring-2 focus:ring-blue-100` in light mode, `dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-900/40` in dark mode.
   - Section Dividers: `border-slate-300` in light mode, `dark:border-slate-800` in dark mode.

2. **Debounced Autosave Hook with Navigation Exit Guard (`useAutosave.js`)**:
   - Debounces data caching to `localStorage` (and remote API sync), tracking reactive state across `'saved' | 'saving' | 'unsaved'`.
   - Listens to `beforeunload` events when status is `'unsaved'` or `'saving'` to prevent accidental data loss.
   - Pairs with reactive `<SaveStatusIndicator status={saveStatus} />` chip displaying amber pulsing dot for `Saving...`, rose dot for `Unsaved changes`, and emerald dot for `Draft (Auto-saved)`.

3. **Accessible Text Scaling Dropdown (`TextScaleDropdown.jsx`)**:
   - Offers 3 tiers: `1x (Normal) 100% 16px`, `1.1x (Medium) 110% 17.6px`, `1.25x (Large) 125% 20px`.
   - Modifies root `document.documentElement.style.fontSize` so all rem-based typography across the application scales proportionately.
   - Persists user selection in `localStorage('app_text_scale')`.
   - Mounted in header alongside theme switcher and notification bell.

## Prevention Checklist & Runbook

### Runbook: Verifying Surface Tokens & Form Ergonomics
1. **Checklist - Design Token Integrity**:
   - Ensure card containers use `border-slate-300` in light mode and `border-slate-700` in dark mode.
   - Ensure form inputs use `border-slate-400/80` with focus ring `focus:ring-blue-100` / dark `focus:ring-blue-900/40`.
   - Verify `--background`, `--card`, and `--border` in `client/src/index.css`.
2. **Checklist - Exit Guard & Autosave Verification**:
   - Type edits into form fields -> status immediately switches to `Unsaved changes`.
   - Wait for debounce timer (1200ms) -> transitions to `Saving...` with pulse animation, then `Draft (Auto-saved)`.
   - Verify `beforeunload` blocks exit if closed while `unsaved` or `saving`.
3. **Checklist - Text Scaling Verification**:
   - Select `1.1x (Medium)` or `1.25x (Large)` from the dropdown.
   - Inspect root `<html>` style: `fontSize` should equal `17.6px` or `20px`.
   - Refresh page: verify scale tier is restored from `localStorage`.
4. **Verification passed**:
   - Run targeted client tests: `npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx src/components/TextScaleDropdown.test.jsx src/hooks/useAutosave.test.jsx src/components/projects/AutoExpandingTextarea.test.jsx src/components/projects/AlignmentSelectorDialog.test.jsx`.
