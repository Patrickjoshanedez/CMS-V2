# 2026-04-02 Closure Verification

- agent preflight resolved: context-manager, researcher, coder, logic-debugger, test-automation, reviewer
- verification reruns passed: server (19 files, 364 passed, 12 skipped), client (1 file, 3 passed)
- smoke probe results: localhost:5173 OK 200, localhost:5000/api/health OK 200
- reviewer verdict APPROVED with one non-blocking doc-drift note

## Durable Lessons (2026-04-02)

- StorageService `uploadFile` signature order is `(buffer, key, contentType)`; callsites must preserve this order to prevent upload corruption.
- Normalize Multer errors in the global error handler so clients get stable HTTP status and explicit application error code mapping.
- Archive dual-file upload invariant: accept exactly one `academicPaperFile` and one `academicJournalFile`; reject unexpected fields or duplicates with `400` and an explicit code.
- Test-only middleware bypasses must fail closed: gate strictly on `NODE_ENV === "test"` and avoid permissive runtime flags that could disable protections outside tests.
- Endpoint parity checks must target mounted active modules only; if a client endpoint maps exclusively to `*-PatPat`/legacy files, treat it as a real production gap and fail CI.
- Project read access must be enforced at both route and service layers: only faculty roles may access any project, while students must be constrained to their own team project to prevent IDOR.
- CSV student import must never use shared default passwords and must refuse updates when an existing email belongs to a non-student role.
- Production compose local verification can fail with `502` if `.env.prod` sets `MONGODB_URI` to Atlas; for local container validation, override `MONGODB_URI=mongodb://mongodb:27017/cms_v2` at runtime when recreating `server`, then rerun `/api/health`.

## Durable Lessons (2026-04-05 Production Rebuild/Remediation)

- Always include profile-aware orphan cleanup before core production rebuild.
- Verify core runtime with compose ps, in-container health probes, and an explicit ngrok absence check.
- Keep ngrok public-exposure command fail-closed on required auth/domain env vars.
- Keep .localstack/cache untracked.

## Durable Lessons (2026-04-06 Mixed Compose/DNS Incident)

- Mixed compose sources (`docker-compose.yml` with `docker-compose.prod.yml`) can split services across networks and break DNS resolution, causing nginx `502` on `/api`, `/socket.io`, and avatar upload routes.
- `rebuild-prod.ps1` must fail closed on mixed-compose labels using dynamic project-name resolution, and must enforce `cms-server` absence before declaring runtime healthy.
- Public-exposure preflight must reject default-like `NGROK_BASIC_AUTH` values, not just empty values.
- Canonical post-fix verification bundle: `/api/health` `200`, `/socket.io` polling `200`, `/vite.svg` `200`, `/api/users/me/avatar` non-`502`, and confirmed shared client/server network.

## Durable Lessons (2026-04-07 ngrok Auth Policy Transition)

- When replacing ngrok basic auth with OAuth in production compose, verify removal by confirming no `WWW-Authenticate` basic-auth challenge/prompt is returned.
- Validate public endpoints over HTTPS after auth-policy changes (at minimum `/`, `/api/health`, static asset, and `/socket.io` polling).
- ngrok free-plan abuse interstitial is distinct from basic auth and may appear once on first visit; do not treat it as a basic-auth regression.

## Durable Lessons (2026-04-07 Windows Docker Compose Rebuild)

- On Windows in this repo, run compose commands with command-scope `PATH` prepended with `C:\Program Files\Docker\Docker\resources\bin` so both `docker` and `docker-credential-desktop` resolve.
- For CMS rebuild verification, explicitly select compose file: `docker compose -f docker-compose.yml build`.
