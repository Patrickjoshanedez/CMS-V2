# Lesson Learned: Committee Faculty Non-Duplicate Mutual Exclusion & Capstone 1 UI Scope Cleanup

## Incident & Root Cause Summary
- **Symptom 1 (Misplaced UI Cards in My Capstone)**: On "My Capstone" (`MyProjectPage.jsx`), the Capstone 1 tab incorrectly rendered `<Capstone2ManuscriptHub />` ("Step 1: Get the Institutional Template", "Step 2: Attach Working Manuscript Link") and `<ChapterProgressWithRounds chapters={[1, 2, 3]} />` (draft upload cards for Chapters 1, 2, and 3), cluttering the Title Defense workspace with premature Phase 2 drafting tools.
- **Symptom 2 (Committee Faculty Duplication)**: In `AssignCommitteeDialog.jsx` and `TeamsPage.jsx`, instructors could select the same faculty member across multiple roles (e.g., assigning a faculty member as both Adviser and Panel Member 1, or Secretary and REC / Chair). Furthermore, because MongoDB populated records sometimes retain `{ _id: '...' }` or ObjectId shapes, naive string comparisons failed or produced `"[object Object]"` collision keys.
- **Root Cause**:
  1. Lack of domain boundary enforcement in `MyProjectPage.jsx`'s Capstone 1 tab, which had conflated Title Defense with initial manuscript draft uploads (which canonically belong on the `/submissions` page).
  2. Missing universal ID normalization (`getId(val)`) and incomplete cross-role conflict mapping across all 5 faculty roles (`adviser`, `secretary`, `panelist1` [REC / Chair], `panelist2` [Panel Member 1], `panelist3` [Panel Member 2]).

## Prevention Rules & Institutional Invariants
1. **Canonical Capstone 1 Separation of Concerns**: Capstone 1 is strictly reserved for candidate title proposals, similarity pre-scan, and title defense hearing approval. Working manuscript links, templates, and chapter draft upload cards are barred from Capstone 1 on `MyProjectPage.jsx` and must reside strictly in their canonical Phase 2 or Submissions contexts.
2. **Defensive Universal ID Normalization (`getId`)**: Always extract scalar string IDs using the canonical `getId(val)` helper:
   ```javascript
   export function getId(val) {
     if (!val) return '';
     if (typeof val === 'string') return val;
     if (val._id) return String(val._id);
     if (val.id) return String(val.id);
     return String(val);
   }
   ```
   Never use raw `String(val)` or direct object equality checks when computing conflict maps or verifying role uniqueness.
3. **Multi-Tier Mutual Exclusion Defense**:
   - **Tier 1 (UI Combobox Disabled State)**: Mark already-assigned faculty options as disabled with an explanatory tooltip/badge ("Already Assigned as [Role]").
   - **Tier 2 (Guarded Selection Handlers)**: Selection handlers (`handleSelectAdviser`, `handleSelectSecretary`, `handleSelectPanelist1`, etc.) reject duplicates immediately and dispatch an instant error toast notification.
   - **Tier 3 (Submit-Time Zero-Tolerance Validation)**: `handleSubmit` collects all selected non-empty normalized IDs into a Set and throws an error if `seenIds.has(id)` before sending payload to the API.
4. **Dialog Viewport Bottom Padding (`pb-36`)**: Scrollable dialog cards housing floating absolute popovers/comboboxes (`max-h-52`) must maintain `pb-36` bottom padding to prevent fixed modal footers from clipping dropdown options.

## Verification Checklist & Runbook
- [x] **Checklist**: Verify `MyProjectPage.jsx` Capstone 1 tab has removed `Capstone2ManuscriptHub` and `ChapterProgressWithRounds`.
- [x] **Checklist**: Verify `AssignCommitteeDialog.jsx` and `TeamsPage.jsx` disallow assigning the same faculty member to more than one role on a team.
- [x] **Checklist**: Ensure `getId(val)` safely handles null, undefined, empty string, string IDs, `{ _id }`, and `{ id }` objects.
- [x] **Runbook**: Run targeted client test battery:
  ```bash
  npm test --workspace=client -- src/pages/projects/MyProjectPage.test.jsx src/components/teams/AssignCommitteeDialog.test.jsx
  ```
- [x] **Runbook**: Validate API route parity:
  ```bash
  npm run check:endpoints
  ```
- [x] **Runbook**: Validate agentic system governance and hooks:
  ```bash
  npm run validate:agentic
  npm run validate:governance
  ```
- [x] **Runbook**: Execute Playwright visual audit across desktop (1440x900) and mobile (390x844) viewports in both light and dark themes.

## Evidence & Verification Passed
- **Unit Tests Passed**: 18/18 client unit tests passed in 17.85s (`AssignCommitteeDialog.test.jsx` 15/15 passed, `MyProjectPage.test.jsx` 3/3 passed).
- **Parity Check Passed**: `SERVER_ENDPOINT_COUNT=204`, `CLIENT_ENDPOINT_COUNT=182`, `UNMATCHED_COUNT=0`.
- **Agentic Governance Passed**: 60/60 checks passed; all 4 governance stages valid (0 errors, 0 warnings).
- **Workspace Guardrail Passed**: `python scripts/workspace_guardrail.py` returned clean workspace with zero cognitive clutter.
- **Visual Feedback Loop Passed**: 8/8 visual audit screenshots captured and inspected across light/dark and desktop/mobile viewports:
  - `audit_my_capstone_cleaned_desktop_light.png`
  - `audit_my_capstone_cleaned_desktop_dark.png`
  - `audit_my_capstone_cleaned_mobile_light.png`
  - `audit_my_capstone_cleaned_mobile_dark.png`
  - `audit_committee_dedup_desktop_light.png`
  - `audit_committee_dedup_desktop_dark.png`
  - `audit_committee_dedup_mobile_light.png`
  - `audit_committee_dedup_mobile_dark.png`
