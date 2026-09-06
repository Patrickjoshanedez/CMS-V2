# Lesson Learned: Edge Cases & Layout Regression Hardening Across Animated Inputs, Autosave & Sidebar

## Context & Incident
Deploying animated inputs, autosaving drafts, client-side text scaling, and collapsible navigation introduces several common edge cases and layout regressions across modern browsers:
1. **Auto-Expanding Textarea Scroll Jumping & Flicker**: Setting `textarea.style.height = "auto"` instantaneously collapses the element to 0px before re-reading `scrollHeight`. If the user is editing far down a long page, the viewport visibly jumps upward. Typing near bottom borders can also trigger a +1px expansion loop without `overflow-y-hidden` and `box-border`.
2. **Autosave SPA Navigation Drops & Key Collisions**: `beforeunload` only catches page refresh or tab closure. Internal client route transitions (e.g. switching between Dashboard and Capstone) silently drop unpersisted keystrokes. Rapid typing also triggers out-of-order network save race conditions.
3. **Sidebar Rail Tooltip Clipping**: In collapsed rail state (`w-[76px]`), `overflow-y-auto` causes `absolute left-[calc(100%+10px)]` tooltips to be clipped or create horizontal scrollbar jitter.
4. **Text Scaling Container Collisions**: Fixed container heights (`h-10`, `h-12`) cause vertical clipping or word wraps when root font scaling is increased to 1.1x or 1.25x.
5. **Autofill Style Hijacking**: WebKit/Blink injects yellow backgrounds onto form inputs, destroying dark mode contrast.

## Key Changes & Resolutions
1. **Jitter-Free Auto-Expanding Textarea (`AutoExpandingTextarea.jsx` & `ResilientTextarea`)**:
   - Preserves `window.scrollY` offset around height recalculation: stores `window.scrollY`, resets height to `auto`, calculates dynamic `Math.max(scrollHeight, minHeight)`, and restores scroll position.
   - Enforces `box-border` and `overflow-y-hidden` to completely stop border calculation jitter and scrollbar flickering loops.
2. **Proposal-Aware Autosave with Flush on Unmount (`useAutosave.js` & `useProposalAutosave`)**:
   - Flushes `latestDataRef.current` synchronously to `localStorage` during `useEffect` cleanup on unmount, preserving data across SPA client-side route transitions.
   - Cancels pending in-flight HTTP requests via `AbortController` before issuing new debounced remote save calls, filtering out `AbortError` / `ERR_CANCELED`.
   - Namespaces drafts with `draft_capstone_${projectId}_proposal_${proposalIndex}` to avoid cross-tab overwrites.
3. **Portal-Based Sidebar Rail Tooltips (`Sidebar.jsx`)**:
   - Uses `createPortal(tooltip, document.body)` with fixed viewport coordinates (`getBoundingClientRect()`) so collapsed rail tooltips escape `overflow-y-auto` container boundaries.
   - Includes full keyboard focus and mouseover event synthesis support.
4. **Text Scaling Resilience**:
   - Standardized flexible minimum heights (`min-h-[2.5rem]`, `py-2`) and relative rem-based Tailwind typography classes across all navigation and form headers.
5. **Global Dark Mode Autofill & Contrast Fix (`index.css`)**:
   - Applied global `-webkit-box-shadow: 0 0 0px 1000px ... inset !important` and `-webkit-text-fill-color` to prevent yellow autofill washouts.
   - Styled native `<select option>` elements with explicit background and text contrast tokens.

## Prevention Checklist & Runbook

### Runbook: Verifying Layout Robustness & Autosave Resilience
1. **Checklist - Auto-Expanding Textarea**:
   - Navigate to proposal submission page with extensive content.
   - Type multiple paragraphs and then delete lines rapidly: verify viewport scroll position does NOT jitter or jump upward.
   - Inspect textarea computed styles: verify `box-sizing: border-box` and `overflow-y: hidden`.
2. **Checklist - Autosave Route Navigation**:
   - Enter proposal details and immediately click a navigation link in the sidebar without waiting for debounce timer.
   - Return to proposal page: verify unpersisted keystrokes were synchronously flushed to `localStorage` on unmount.
   - Rapidly type edits: verify earlier slower requests are aborted via `AbortController` without race-condition state rollbacks.
3. **Checklist - Sidebar Rail Tooltips**:
   - Collapse sidebar to `w-[76px]` rail mode.
   - Hover over navigation icons: verify floating tooltips render via React Portal directly in `document.body` outside the `overflow-y-auto` scroll container without clipping.
4. **Checklist - Text Scaling & Autofill**:
   - Toggle font size to Large (1.25x): verify headers and interactive bars adapt without vertical text clipping.
   - Test Chrome/Edge autofill: verify input backgrounds remain crisp white/dark slate rather than washed-out pale yellow.
5. **Verification Battery**:
   - `npm test --workspace=client -- src/components/layouts/Sidebar.test.jsx src/components/projects/AutoExpandingTextarea.test.jsx src/hooks/useAutosave.test.jsx src/components/TextScaleDropdown.test.jsx src/pages/projects/CreateProjectPage.test.jsx`
   - `npm run check:endpoints`
   - `npm run validate:agentic`
   - `npm run validate:governance`
   - `python scripts/workspace_guardrail.py`
