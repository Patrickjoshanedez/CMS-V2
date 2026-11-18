# DISPATCH — sub_orch_m2

## Mission: Milestone 2 — UI Sizing, Spacing & Cognitive Ergonomics Overhaul (R1)

- **Role**: Milestone 2 Sub-Orchestrator (`self`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Relevant Survey Findings**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_1\survey_report.md

## Scope & Target Deliverables:
1. **Mobile Touch Target Normalization (Feature 7)**:
   - Enforce min 44x44px touch targets on mobile viewports using responsive utility classes (`min-h-[44px] sm:min-h-0 sm:h-8 min-w-[44px] sm:min-w-0`) across:
     - `ActionDoneMatrixTab.jsx`
     - `PrototypeGalleryModal.jsx`
     - `ManuscriptTemplateWidget.jsx`
     - `TeamFormationNotificationItem.jsx`
     - `SubmissionReviewPage.jsx`
2. **Layout Width Shell Continuity (Feature 8)**:
   - In `client/src/components/archive/CanonicalDocumentViewer.jsx:1152 & 1169`, remove hardcoded `max-w-5xl` constraint to restore alignment with `DashboardLayout` `max-w-7xl`.
   - In `client/src/components/submissions/VersionHistory.jsx:180`, optimize `max-w-6xl` dialog to prevent viewport edge clipping on smaller laptop screens.
3. **Heading Hierarchy Correction (Feature 9)**:
   - In `client/src/components/archive/CanonicalDocumentViewer.jsx:1275`, change duplicate `<h1 className="text-xl sm:text-2xl font-bold font-serif...">` in metadata details drawer to semantic `<h2>`.
4. **Form Chunking (Cowan 4-Chunking) (Feature 10)**:
   - Refactor forms with >5 inputs into semantic `<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">` with `<legend className="text-sm font-semibold text-foreground px-2">` across:
     - `UsersPage.jsx` (`CreateUserForm`)
     - `ExistingCapstoneUploadPage.jsx`
     - `ProfilePage.jsx`
     - `ScheduleDefenseModal.jsx`
     - `MilestoneDeadlinesModal.jsx`
5. **Responsive Table Overflow Wrappers (Feature 11)**:
   - Ensure wide tables in `PlagiarismReport.jsx` and `VersionCompare.jsx` have responsive `overflow-x-auto` wrappers.

## Exclusive File Boundaries:
- `client/src/components/archive/CanonicalDocumentViewer.jsx`
- `client/src/components/submissions/VersionHistory.jsx`
- `client/src/pages/UsersPage.jsx`
- `client/src/pages/projects/ExistingCapstoneUploadPage.jsx`
- `client/src/pages/ProfilePage.jsx`
- `client/src/components/projects/PrototypeGalleryModal.jsx`
- `client/src/components/projects/ManuscriptTemplateWidget.jsx`
- `client/src/components/notifications/TeamFormationNotificationItem.jsx`
- `client/src/pages/submissions/SubmissionReviewPage.jsx`
- `client/src/components/defense/ScheduleDefenseModal.jsx`
- `client/src/components/projects/MilestoneDeadlinesModal.jsx`
- `client/src/components/archive/PlagiarismReport.jsx`
- `client/src/components/submissions/VersionCompare.jsx`

## Procedure:
Follow the Sub-orchestrator procedure:
1. Initialize your `SCOPE.md`, `BRIEFING.md`, and `progress.md` in your state folder.
2. Execute the Iteration Loop (2B):
   - a. Spawn Explorer (`teamwork_explorer`) to inspect target components and AST line ranges.
   - b. Spawn Worker (`teamwork_worker`) with the mandatory integrity warning to implement responsive touch targets, fieldset chunking, and layout normalization.
   - c. Spawn 2 Reviewers (`teamwork_reviewer`) independently to inspect WCAG 2.1 touch compliance and visual continuity.
   - d. Spawn 2 Challengers (`teamwork_challenger`) to verify rendering across 1440x900 and 390x844 viewports.
   - e. Spawn Forensic Auditor (`teamwork_auditor`) for integrity verification.
   - f. Evaluate Gate in `GATE_STATUS.md`.
3. When gate passes, write your `handoff.md` and notify parent via `send_message`.


## 2026-11-13T17:48:46Z
You are sub_orch_m2. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md.
Execute Milestone 2 (UI Sizing, Spacing & Cognitive Ergonomics Overhaul). Maintain your SCOPE.md, BRIEFING.md, and progress.md in c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\. Run the 2B iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor). When the gate passes, send your completion handoff report to your parent orchestrator via send_message.
