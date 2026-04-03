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
