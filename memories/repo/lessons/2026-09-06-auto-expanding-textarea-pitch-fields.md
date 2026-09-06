# Lesson & Runbook: Auto-Expanding Textarea Component & Proposal Form Ergonomics

## Overview
- **Date:** 2026-09-06
- **Task:** Auto-Expanding Textarea Component and Pitch Deck Integration
- **Components:** `client/src/components/projects/AutoExpandingTextarea.jsx`, `client/src/pages/projects/CreateProjectPage.jsx`

## Lesson Learned
1. **Dynamic Scroll Height Auto-Adjustment:**
   - When converting fixed-height textareas and single-line text inputs to dynamically expandable inputs, setting `textarea.style.height = "auto"` prior to querying `textarea.scrollHeight` is critical to allow the container to shrink smoothly when users backspace or delete content.
   - Using CSS transition `transition-[height,border-color,box-shadow,background-color] duration-200 ease-out` combined with `resize-none overflow-hidden` creates a fluid, flicker-free expansion animation whenever text wraps to a new line or is pasted.
2. **Institutional Test Contract Preservation:**
   - In `CreateProjectPage.test.jsx`, test assertions query `input[id="proposal-0-title"]` and access `window.HTMLInputElement.prototype` to dispatch synthetic change events.
   - Therefore, while pitch fields (`problemStatement`, `proposedSolution`, `uniqueContribution`, `targetUsers`, `expectedImpact`) benefit tremendously from `AutoExpandingTextarea` to prevent horizontal text overflow and truncation, the `Proposed Project Title` must retain its `<Input>` contract unless the test suite is explicitly updated to target textareas.
3. **Multi-Consumer Backwards Compatibility:**
   - `AutoExpandingTextarea` is also utilized by `ActionDoneMatrixTab.jsx` and `LiveDefenseMinutesModal.jsx` with `variant="ghost"` and floating `savingStatus` badges (`saving`, `saved`, `error`).
   - Maintaining these optional props prevents regressions across table-cell editing and live defense logging workflows.

## Prevention
- Always inspect existing test files (`grep_search` or targeted test runs) before replacing base HTML element types in established institutional forms.
- Ensure reusable components support both default and ghost variants when shared across forms and data tables.

## Runbook & Checklist
1. [x] Upgrade `AutoExpandingTextarea.jsx` to support dynamic height adjustment, minimum height calculation, resize event listeners, and CSS transitions.
2. [x] Wire `AutoExpandingTextarea` into pitch fields in `CreateProjectPage.jsx`:
   - `problemStatement` (minRows=3)
   - `proposedSolution` (minRows=3)
   - `uniqueContribution` (minRows=1)
   - `targetUsers` (minRows=1)
   - `expectedImpact` (minRows=1)
3. [x] Ensure `Proposed Project Title` maintains `Input` contract for test assertions.
4. [x] Run targeted unit tests:
   - `npm test --workspace=client -- src/components/projects/AutoExpandingTextarea.test.jsx`
   - `npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx`
   - `npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx`
5. [x] Run governance verification: `check:endpoints`, `validate:agentic`, `validate:governance`, `workspace_guardrail.py`.
