# CMS-V2 Technical Context

## Prevention Rules
- For orchestration initialization-only changes, require an evidence triad before completion: (1) targeted verification report, (2) explicit mutation evidence convention with numeric score, (3) reviewer verdict.
- Any submissions read endpoint must enforce scoped authorization through `getSubmissionViewContext` or `_assertCanViewSubmission` against project membership/assignment, not role-only shortcuts.
- When a service method signature is hardened with requester context, add or update route-level integration coverage for that endpoint to catch stale call sites.
- For monorepo targeted server verification, always run focused tests with server context command: `npm --prefix server run test -- <files>`.
- Keep regression coverage for archive/certificate guards: missing finals, plagiarism failed, non-archived upload, missing certificate key.

## Test Fixture Notes
- Submission chapter-upload integration fixtures must include at least one assigned panelist on the project in Capstone phase 1, otherwise uploads fail with PANELISTS_NOT_ASSIGNED before other assertions.
