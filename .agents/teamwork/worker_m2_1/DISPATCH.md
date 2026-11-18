# DISPATCH — worker_m2_1

## Mission: Implement Milestone 2 — UI Sizing, Spacing & Cognitive Ergonomics Overhaul
- **Role**: Milestone 2 Worker (`teamwork_worker`)
- **State Folder**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\worker_m2_1\`
- **Working Directory**: `c:\Users\patri\dev\CMS-V2`
- **Mandatory Files to Read**:
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md`
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\SCOPE.md`
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_1\analysis.md`
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_2\analysis.md`
  - `c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_3\analysis.md`

## Mandatory Skills to Load & Apply:
- `c:\Users\patri\dev\CMS-V2\.agents\skills\cognitive-ergonomics-ux\SKILL.md`
- `c:\Users\patri\dev\CMS-V2\.agents\skills\cms-ui-consistency-library\SKILL.md`
- `c:\Users\patri\dev\CMS-V2\.agents\skills\system-implementor\SKILL.md`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Work Instructions:
Implement the surgical changes documented by Explorers 1, 2, and 3:

1. **Feature 7 — Mobile Touch Target Normalization**:
   - `client/src/components/projects/ActionDoneMatrixTab.jsx`: line 826 Add Row button (and companion toolbar buttons) -> `min-h-[44px] sm:min-h-0 sm:h-8`
   - `client/src/components/projects/PrototypeGalleryModal.jsx`: lines 138 & 147 -> `min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8`
   - `client/src/components/teams/ManuscriptTemplateWidget.jsx`: lines 117 & 189–214 -> `min-h-[44px] sm:min-h-0 sm:h-8`
   - `client/src/components/teams/TeamFormationNotificationItem.jsx`: lines 226, 235, 246, 251, 261, 272 -> `min-h-[44px] sm:min-h-0 sm:h-8` (and `min-w-[44px] sm:min-w-0` for icons)
   - `client/src/pages/submissions/SubmissionReviewPage.jsx`: lines 901, 913, 939, 947, 955 -> `min-h-[44px] sm:min-h-0 sm:h-8` (or `sm:h-8.5`)

2. **Features 8 & 9 — Layout Width Shell Continuity & Heading Hierarchy**:
   - `client/src/components/archive/CanonicalDocumentViewer.jsx`: lines 1152 & 1169 -> replace `max-w-5xl` with `w-full max-w-full`; line 1275 -> replace `<h1 ...>` with `<h2 ...>`
   - `client/src/components/submissions/VersionHistory.jsx`: line 180 -> replace dialog sizing with `max-h-[min(90dvh,54rem)] max-w-4xl overflow-y-auto`

3. **Feature 10 — Form Chunking (Cowan 4-Chunking)**:
   - `client/src/pages/users/UsersPage.jsx`: chunk `CreateUserForm` (lines 1327–1430) into 2 `<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">` with `<legend className="text-sm font-semibold text-foreground px-2">` ("Personal Identity" & "Account Credentials & Role Access")
   - `client/src/pages/archive/ExistingCapstoneUploadPage.jsx`: chunk metadata form (lines 1618–1963) into 3 semantic fieldsets ("Document Publication Identity", "Content Abstract & Classification", "Bibliographic Citations")
   - `client/src/pages/profile/ProfilePage.jsx`: chunk "Academic Info" (lines 520–774) and "Account Details" (lines 349–434) with semantic `<fieldset>` and `<legend>`
   - `client/src/components/defense/ScheduleDefenseModal.jsx`: chunk lines 282–533 into 2 fieldsets ("Hearing Timeslot & Venue" and "Target Organization & Panel Confirmation")
   - `client/src/components/instructor/MilestoneDeadlinesModal.jsx`: chunk lines 218–416 into 2 fieldsets ("Academic Batch & Scope Binding" and "Deliverable Component & Target Cutoff")

4. **Feature 11 — Responsive Table Overflow Wrappers**:
   - `client/src/components/projects/EvaluationPanel.jsx`: lines 269 & 549 -> ensure `overflow-x-auto` on table container divs
   - `client/src/components/submissions/EvaluationWorkspace.jsx`: lines 669, 719, 767 -> wrap raw tables in `<div className="overflow-x-auto rounded-md border border-border">`
   - `client/src/components/submissions/PlagiarismReport.jsx`: line 243 -> wrap `<Table>` in `<div className="overflow-x-auto rounded-md border border-border">`
   - `client/src/components/submissions/VersionCompare.jsx`: line 63 -> wrap `<Table>` in `<div className="overflow-x-auto">` and ensure `min-w-[480px]`
   - `client/src/components/reports/DynamicChartWidget.jsx`: line 444 -> ensure `min-w-[480px]` on table
   - `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx`: lines 1870 & 2205 -> ensure outer paper container has `overflow-x-auto` for mobile screens

## Verification Requirement:
Run fast-path targeted Vitest tests for the affected components:
```bash
npm test --workspace=client -- src/components/projects/ActionDoneMatrixTab.test.jsx
npm test --workspace=client -- src/components/projects/PrototypeGalleryModal.test.jsx
npm test --workspace=client -- src/components/teams/ManuscriptTemplateWidget.test.jsx
npm test --workspace=client -- src/components/teams/TeamFormationNotificationItem.test.jsx
npm test --workspace=client -- src/pages/submissions/SubmissionReviewPage.test.jsx
npm test --workspace=client -- src/components/archive/CanonicalDocumentViewer.test.jsx
npm test --workspace=client -- src/components/submissions/VersionHistory.test.jsx
npm test --workspace=client -- src/pages/users/UsersPage.test.jsx
npm test --workspace=client -- src/components/defense/
npm test --workspace=client -- src/components/projects/EvaluationPanel.test.jsx
```
Also run governance and endpoints check:
```bash
npm run check:endpoints
npm run validate:governance
```

Document all modified files, diffs, and verification commands with full passing test outputs in `handoff.md` in your state folder.
Report back to `sub_orch_m2` upon completion.
