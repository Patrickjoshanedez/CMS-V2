# Lesson Learned: Global Page Transition Progress Bar and SDG Combobox UX Overhaul

## Problem Statement
1. **Page Transition Delay:** Proponents and faculty experienced noticeable psychological delay when transitioning between routes (e.g. from `/dashboard` to `/teams`, `/projects`, `/users`) because React 18 `startTransition` and Vite dynamic page chunk fetching held the previous view without eager feedback.
2. **Missing SDGs & Restricted Scrolling:** In `CreateProjectPage.jsx`, only 6 UN SDGs were hardcoded in `SDG_ALIGNMENT_OPTIONS` instead of all 17, giving the impression of a broken dropdown with truncated options that could not be scrolled down.
3. **Missing Feedback on Selection:** Selecting an SDG or Discipline updated internal form state without any confirmation message, leaving users uncertain if their choice was recorded.

## Key Changes & Architecture
1. **Global Top Progress Controller (`client/src/lib/topProgress.js`):**
   - Implemented an NProgress/YouTube-style progress controller with eager 0ms start (`24%`), organic asymptotic trickle up to `95%`, surge to `100%` on page ready, and smooth fade-out.
   - Attached capture-phase document click interceptor for internal links and wrapped `history.pushState`, `history.replaceState`, and `window.onpopstate` for programmatic navigations.
   - Pinned `TopProgressBar.jsx` to the viewport top (`fixed top-0 left-0 right-0 z-[999999] h-[2.5px]`) with BukSU brand gradient and neon drop-shadow head.
2. **Suspense Bridge in `App.jsx`:**
   - Synchronized React `<Suspense>` chunk downloads with `topProgress.start()` on mount and `topProgress.done()` on unmount, guaranteeing the loading bar runs until the target component finishes loading.
3. **SdgCombobox Component (`client/src/components/projects/SdgCombobox.jsx`):**
   - Imported all 17 UN Sustainable Development Goals from `@cms/shared`.
   - Embedded real-time keyword search, color-coded goal badges (`SDG 1` to `SDG 17`), smooth scroll container (`max-h-64 overflow-y-auto`), and live match counter.
   - Added instant `toast.success` notifications confirming SDG and Discipline selection.
   - Added an active institutional alignment preview card in `CreateProjectPage.jsx`.

## Prevention Rules & Checklist
1. **Checklist:** Never hardcode subsets of standardized institutional catalogs (such as UN SDGs or academic disciplines) directly inside page components; always import the authoritative constants from `@cms/shared`.
2. **Checklist:** When designing custom popover dropdowns, provide explicit search filtering and styled scrollbar rules to ensure all items are reachable across dark and light themes.
3. **Runbook:** For tactile user confidence during multi-step proposal authoring, emit immediate feedback via `toast.success` whenever the proponent updates major institutional metadata (SDG, discipline, pitch deck fields).
4. **Prevention:** To prevent psychological waiting anxiety in React SPAs with code-split chunks, always pair React Router transitions and Suspense boundaries with a zero-latency top progress bar.

## Verification Evidence
- `npm test --workspace=client -- src/components/ui/TopProgressBar.test.jsx`: 4/4 tests passed (152ms).
- `npm test --workspace=client -- src/components/projects/SdgCombobox.test.jsx`: 5/5 tests passed (319ms).
- `npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx`: 5/5 tests passed (960ms).
- Full client test suite: 41 test files passed, 150 tests passed (51.73s).
- Quality gates: `npm run check:endpoints`, `npm run validate:agentic` (60/60), `npm run validate:governance`, and `python scripts/workspace_guardrail.py` all passed cleanly with 0 errors, 0 warnings.
