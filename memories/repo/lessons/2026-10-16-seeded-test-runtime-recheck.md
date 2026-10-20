# Seeded test runtime recheck — 2026-10-16

## Lesson learned

Seeded student accounts may already have academic assignments, a team, and an in-progress E2E project even when the dashboard shows a generic Phase 0 welcome message. Read the signed-in user's profile, team, project, submissions, and ADM through the app API before creating anything.

## Prevention

Do not create a duplicate team or project based on the dashboard's welcome copy alone. Treat a mismatch between `capstonePhase`, `stage`, and `projectStatus` as a workflow blocker; do not repair it with raw MongoDB writes.

## Runbook

1. Authenticate with the seeded account from the supplied report without echoing credentials.
2. Read `/api/users/me`, `/api/teams/me`, `/api/projects/me`, `/api/submissions/project/:projectId`, and the project's Action Done Matrix.
3. Compare the app's phase, stage, status, required submissions, committee, and ADM gates before attempting a transition.
4. If the browser cannot load, inspect API health and client-container health separately. A healthy API does not prove that Vite is ready.
5. After a package-lock change, allow one bounded Vite optimizer run; if it remains unhealthy, inspect filtered logs and process use before restarting again.
6. Remove temporary preview HTML from `client/src` before restarting Vite so the app does not retain audit-only entry points.

## Checklist

- [x] Seeded login succeeded without recording credentials.
- [x] Existing profile assignments and E2E team were checked before writes.
- [x] Project state mismatch was recorded with no direct database mutation.
- [ ] Client recovers and visual audit completes in light/dark, desktop/mobile.
- [ ] Final synthetic ADM, archive, QR verification, and vector indexing pass through supported APIs.
