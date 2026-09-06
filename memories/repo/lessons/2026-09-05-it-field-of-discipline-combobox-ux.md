# Lesson Learned: Standardized IT Fields of Discipline & Searchable Combobox UX

## Context & Incident
In `CreateProjectPage.jsx`, the IT Field of Discipline selector was restricted to a static, unsearchable 6-item dropdown (`CAPSTONE_DISCIPLINE_OPTIONS`) that omitted key curriculum domains (e.g. Cloud Computing, Telemedicine, Agri-Tech, GIS, FinTech, E-Governance). Proponents could not search disciplines, lacked visual confirmation of domain classification, and had no tactile toast feedback upon selection.

## Root Cause Analysis
1. **Curriculum Domain Truncation**: The selection list had only 6 hardcoded options defined locally in the page component instead of importing from canonical `@cms/shared` constants.
2. **Missing Combobox Accessibility & Searchability**: Standard `<Select>` components become cumbersome as options grow beyond 10 items. Without keyword search and categorized domain badges, finding specialized fields created cognitive friction.
3. **Silent State Mutations**: Selecting a discipline updated React component state silently without dispatching immediate toast confirmations.

## Lessons Learned & Prevention Runbook
1. **Single Source of Truth in `@cms/shared`**:
   - Institutional constants must reside in `@cms/shared` (`shared/constants/disciplines.js`) to guarantee parity across backend validation, client forms, reporting engines, and defense rubrics.
2. **Domain-Categorized Combobox Pattern**:
   - When selections exceed 10 items, deploy a combobox with:
     - Real-time keyword search across names, categories, and descriptions.
     - Domain badges (`Software Engineering`, `Intelligent Systems`, `Applied Informatics`, etc.).
     - Scrollable viewport (`max-h-64 overflow-y-auto`) to prevent viewport cutoffs.
     - Keyboard navigation (`Escape`, `ArrowDown`, `Enter`).
3. **Instant Tactile Toast Feedback**:
   - Emitting Sonner `toast.success` upon combobox selection provides immediate confirmation to students during high-stakes proposal authoring.
4. **Dual Alignment Preview**:
   - Provide visual confirmation cards showing both the selected IT Field of Discipline domain and the UN SDG alignment directly above submission.

## Prevention Checklist
- [x] All 18+ CHED CMO 25 s. 2015 & BukSU IT Department disciplines are exported from `@cms/shared`.
- [x] Searchable `DisciplineCombobox` filters by title, domain, and description with zero cutoffs.
- [x] Selecting a discipline triggers `toast.success` with name and domain context.
- [x] Dual preview cards render domain scope and UN SDG target notes.
- [x] Comprehensive unit tests verify placeholder, dropdown open, real-time search, selection, and toast dispatch.

## Verification Evidence
- `client/src/components/projects/DisciplineCombobox.test.jsx`: 5/5 passed.
- `client/src/pages/projects/CreateProjectPage.test.jsx`: 6/6 passed.
- Full client test suite: 42 test files passed, 156 tests passed.
- `npm run check:endpoints`: 196 Server / 175 Client, UNMATCHED_COUNT = 0.
- `npm run validate:governance`: 60/60 checks passed, 0 errors, 0 warnings.
- `python scripts/workspace_guardrail.py`: Clean and pristine.
