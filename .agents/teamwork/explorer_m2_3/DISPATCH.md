# DISPATCH — explorer_m2_3

## Mission: Features 10 & 11 — Form Chunking (Cowan 4-Chunking) & Table Overflow Wrappers
- Role: Codebase Explorer
- State Folder: c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_3\
- Working Directory: c:\Users\patri\dev\CMS-V2

## Mandatory Files to Read:
1. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md`
3. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\SCOPE.md`
4. `c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_1\survey_report.md`

## Focus Area:
Investigate target files for:
1. **Feature 10: Form Chunking (Cowan 4-Chunking)**
   - `UsersPage.jsx` (`CreateUserForm`)
   - `ExistingCapstoneUploadPage.jsx`
   - `ProfilePage.jsx`
   - `ScheduleDefenseModal.jsx`
   - `MilestoneDeadlinesModal.jsx`
   Locate exact file paths and input structures. Design semantic `<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">` with `<legend className="text-sm font-semibold text-foreground px-2">` chunking.
2. **Feature 11: Table Overflow Wrappers**
   - Identify tables lacking `overflow-x-auto` in `EvaluationPanel.jsx`, `EvaluationWorkspace.jsx`, `PlagiarismReport.jsx`, `VersionCompare.jsx`, `DynamicChartWidget.jsx`, `SecretaryMinutesDocumentSheet.jsx`.

Document everything in `analysis.md` and `handoff.md` in your state folder.


## 2026-11-13T17:52:10Z
You are explorer_m2_3.
Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_3\DISPATCH.md.
MANDATORY: Read c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md first before starting work.
Also read:
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m2\SCOPE.md
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_1\survey_report.md

Investigate Features 10 & 11:
1. Feature 10 (Form Chunking / Cowan 4-Chunking):
   - Locate and inspect forms with >4-5 inputs across:
     - UsersPage.jsx (CreateUserForm)
     - ExistingCapstoneUploadPage.jsx
     - ProfilePage.jsx
     - ScheduleDefenseModal.jsx
     - MilestoneDeadlinesModal.jsx
   - Design semantic <fieldset className="space-y-4 rounded-lg border border-border/60 p-4"> with <legend className="text-sm font-semibold text-foreground px-2"> chunking according to cognitive ergonomics principles.
2. Feature 11 (Responsive Table Overflow Wrappers):
   - Locate wide tables in EvaluationPanel.jsx, EvaluationWorkspace.jsx, PlagiarismReport.jsx, VersionCompare.jsx, DynamicChartWidget.jsx, and SecretaryMinutesDocumentSheet.jsx.
   - Verify which tables lack outer overflow-x-auto wrappers and document exact line numbers for adding wrappers.
Write your analysis and recommendations to c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_3\analysis.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\explorer_m2_3\handoff.md.
When finished, send a message to sub_orch_m2 reporting completion.
