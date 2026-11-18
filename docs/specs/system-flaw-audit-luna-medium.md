# CMS-V2 flaw audit and Luna medium repair plan

Date: 27 October 2026 (Asia/Manila). Scope: current working tree, including existing uncommitted changes. This is a repair backlog supported by code inspection, not a release approval. No application source was changed during this audit.

## Read this first

The most urgent defect is password recovery accepting an email-global verification flag as proof for a different caller. Fix task 01 first. Next protect manuscript access and instructor ownership, then committee integrity and plagiarism clearance. Repair OCR reliability after the clearance defects.

Evidence labels: **Executed** means an isolated execution reproduced the stated behavior; **Static** means the reachable code path was traced; **Conditional** means the flawed behavior depends on a configuration/backend setting whose deployed value was not inspected. No live attack, production state mutation, or end-to-end exploit was performed. Line references describe this working tree and may move after edits.

## System map and audit boundaries

The application has a React client with shared query hooks, an Express API with service-level business rules, MongoDB models, local/S3 storage, Socket.IO notifications, BullMQ/Redis jobs, and document/plagiarism services. The highest-risk boundaries are API-to-service authorization, alternate file/event access paths, academic clearance decisions, and job state transitions.

The audit traced auth routes/validation/service; HTTP and socket authentication; local storage versus canonical document permissions; evaluation release; committee assignment and defense readiness; submission approval and archive clearance; OCR enqueue, processing, failure, and polling. It also inspected affected tests and ran selected checks.

Not established: exhaustive coverage of every endpoint, live deployed configuration, dependency vulnerability status, visual/accessibility correctness, detection-model accuracy, real email delivery, production performance, or all semester/ADM transitions. Existing reports describe unresolved UI/runtime acceptance; this audit does not convert those into verified product defects or passes.

## Execution instructions for Luna on medium reasoning

1. Read repository AGENTS.md and startup memory. Preserve all pre-existing changes. Do not change secrets, seeders, deployment files, live records, or signatures.
2. Work on one numbered task at a time. Reopen only the listed functions and immediate callers. Do not rewrite entire files or refactor unrelated features.
3. Add a failing behavioral test for the specific defect. Make the smallest service-level repair. Test both rejection and legitimate success. Rejected operations must cause no writes, notifications, or progression.
4. Run the named targeted tests. A passing mock proves that code path only; do not claim live integration coverage. Never weaken assertions to match flawed behavior.
5. Record changed files, actual test results, remaining limitations, and a checkpoint. If blocked, stop dependent work and continue an independent task.
6. For any client UI change, perform the required light/dark desktop 1440x900 and mobile 390x844 visual loop. Use DOM readiness, never networkidle. Backend-only repairs do not require screenshots.
7. At closure run the repository quality gates, with each command bounded below 120 seconds. Shard broad tests if needed and account for every test file. A failed or blocked gate remains explicitly unresolved.

Recommended order: **01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13**. Tasks 04 and 05 should share final-committee validation; task 09 should reuse task 08's current-user/session checks. Task 13's fixture correction can be done before socket repairs to establish a usable test baseline.

## Task 01 — Critical: require caller-held proof for password reset

**Evidence: Executed + Static.** `server/modules/auth/auth.service.js:157–159` marks an email's OTP verified. `resetPassword:328–360` accepts no code when that stored flag is true. `auth.validation.js:128–133` makes code optional. `auth.routes.js:57–62` exposes the reset route publicly.

**Failure:** Client A verifies its OTP. During the remaining validity window, client B can submit that email and a new password without knowing the OTP. An isolated invocation of the exact reset method with model stubs saved the password with code omitted. This requires an existing verified, unexpired OTP; it is not an unconditional reset of every account.

**Repair:** Require the correct OTP in the final reset request, or require a cryptographically random, short-lived, single-use reset capability returned to the verifying caller. An email-level boolean is never sufficient proof. Consume the proof atomically with a defined failure/retry policy; do not introduce a consume-then-write gap that strands a valid reset on persistence failure. Update the actual reset client contract if required.

**Implementation shape (adapt to existing models):** `validateRequiredProof(request); claimUnexpiredUnconsumedProof(email, proof); persistPasswordAndInvalidateSessions();` Use a transaction or an explicitly recoverable claim; do not paste this outline as production code.

**Tests:** In `server/tests/integration/auth.test.js` and a focused auth unit suite: verify with A, reset without proof using B → rejected; incorrect/expired proof → rejected; valid proof → one success; replay/concurrent use → at most one password update. Also verify the legitimate browser reset flow still works.

**Done when:** Knowing an email and another caller having verified an OTP cannot reset the password.

**Implementation checkpoint (27 October 2026):** Implemented caller-supplied OTP validation and atomic one-time consumption in `server/modules/auth/auth.service.js` and `auth.validation.js`; the reset form now sends the OTP it received after verification. Regression coverage includes missing/wrong proof, successful consumption, and concurrent requests. Server reset tests pass 5/5; client auth page tests pass 7/7; targeted ESLint and Prettier checks pass. No broader auth integration or release suite was run in this checkpoint.

## Task 02 — High: enforce manuscript permissions on local storage

**Evidence: Static, conditional on local storage being used.** `server/app.js:155` authenticates `/storage`. `server/middleware/storage-file-server.middleware.js:58–80` applies project membership only to students; other authenticated roles reach file serving at line 126. `server/modules/documents/document.service.js:271–287` separately rejects unassigned faculty. Thus the alternate file route bypasses the canonical policy for a known local key.

**Failure:** An unrelated faculty member requests another active project's local manuscript path and passes the role-specific guard. Missing project records also fail open in the student branch.

**Repair:** Extract/reuse the canonical project-document read authorization and enforce it for every role before reading a file. Missing project → deny. Explicitly preserve approved archive/instructor policy. Do not create an assumption that all instructors or all faculty can read everything.

**Tests:** Add focused storage middleware tests. Project member and assigned committee → allowed; unrelated student/faculty → 403; missing project → denied; archived/public handling → follows canonical document policy. Cover recognized project-key layouts and verify denial never calls file sending.

**Done when:** A file URL grants no broader access than the document service.

## Task 03 — High: bind instructor actions to their assigned section

**Evidence: Static.** Grade route `server/modules/evaluations/evaluation.routes.js:153–163` checks only instructor role. `evaluation.controller.js:77–81` passes no actor; `evaluation.service.js:390–430` updates grades without instructor ownership. Committee route `server/modules/teams/team.routes.js:107–111` and `team.controller.js:239–244` reach `team.service.js:1899–1913`, which checks instructor/admin role but not assigned-section ownership before committee changes.

**Failure:** An instructor can release another section's evaluation results or replace its committee by supplying the target ID.

**Repair:** Pass `req.user` into grade-release service calls. Resolve project → team → section → assigned instructor using existing canonical relationships. Use one reusable ownership guard for grade release and committee assignment, before any mutation. Preserve explicitly supported administrator policy; do not invent new roles or bypasses.

**Tests:** Add cross-section cases to evaluation integration/unit coverage and `server/tests/unit/team.assign-committee.test.js`. Assigned instructor → success; foreign instructor → 403 with no evaluation/team/project write, notification, or automatic progression. Verify direct service invocation also rejects an unauthorized actor.

**Done when:** Instructor role alone cannot modify another section's grades or committee.

## Task 04 — High: validate the complete committee after partial updates

**Evidence: Static.** `server/modules/teams/team.validation.js:102–116` permits omitted fields. `team.service.js:1913–1955` compares only the submitted adviser/secretary/panelists; assignments at 1980, 2008 and 2042 preserve omitted stored roles.

**Failure:** Existing panelist P remains in the panel while `{ adviserId: P }` makes P adviser. The submitted panelist list is empty during conflict validation.

**Repair:** Build the effective final committee from stored values and explicitly supplied updates. Normalize IDs. Distinguish omission from explicit removal. Validate adviser/secretary exclusions, duplicate panelists, account eligibility, and panel count against the final state before changing either team or project.

**Implementation shape:** `next = mergeUsingOwnPropertyChecks(existing, input); validateCommittee(next); applyValidatedCommittee(next);` Avoid truthy/default merges that silently reinterpret null or empty lists.

**Tests:** Extend `server/tests/unit/team.assign-committee.test.js`: adviser-only, secretary-only, and panelists-only requests that collide with stored roles all reject; nonconflicting partial updates succeed; failures leave both records untouched.

**Done when:** No partial update can create a committee the full validation would reject.

## Task 05 — High: enforce exactly three defense panelists

**Evidence: Static.** `server/modules/teams/team.service.js:2012–2014` permits up to five panelists; 2067–2073 marks counts >=3 complete. `server/modules/projects/services/projectDefense.service.js:57–66` requires exactly three for readiness. Assignment and scheduling disagree with each other and the institutional contract.

**Repair:** Reject more than three, and mark a committee complete only with one eligible adviser, one eligible secretary, and exactly three distinct eligible panelists. If staged partial assignments are supported, keep 0–2 incomplete. Reuse task 04's final-state validator. Do not silently truncate existing invalid committees; expose a repair-required result.

**Tests:** Three panelists plus required roles → complete; four/five → rejected without writes; supported partial states → incomplete; scheduling and assignment agree. Correct existing tests that encode “>=3 panelists.”

**Done when:** Every committee marked complete can satisfy the same composition check at defense scheduling.

## Task 06 — High: unreadable text must never earn perfect originality

**Evidence: Static.** `server/jobs/plagiarism.job.js:564–620` writes completed, 100% originality, zero similarity and no warning for blank/<50-character text. Submission approvals at `server/modules/submissions/submission.service.js:2863–2900,3386–3418` accept completed low-similarity results. Archive checks at `projectArchive.service.js:705–706` use `projectTitle.service.js:168–225`, which rejects explicit degradation but accepts this result without coverage information.

**Failure:** A scanned/unreadable manuscript can pass the plagiarism portion of approval/archival without meaningful analysis. Other academic gates still apply.

**Repair:** Replace the short-text success branch with a typed insufficient-text/extraction-failed or review-required result. Leave scores unset. Make clearance require explicit valid analysis coverage, not merely “completed” and a low score. Preserve successful adequately analyzed documents and any deliberate manual-review policy.

**Tests:** New worker test plus approval/archive guard tests: empty, whitespace, 49 characters and image-only extraction cannot receive 100% or clear; valid analyzed text can. Assert both Submission and PlagiarismResult records, not just worker return value.

**Done when:** No analysis cannot be represented as a clean analysis.

## Task 07 — High, conditional: remove fabricated plagiarism clearance

**Evidence: Static + Conditional.** `_ensureMockPlagiarismForApproval` in `server/modules/submissions/submission.service.js:247–286` writes a completed perfect score when `PLAGIARISM_FORCE_MOCK_SCORE` is enabled. Approval paths at 2875–2876 and 3392–3393 call it for unfinished/failed scans. `server/config/env.js:710–713` defaults it on in development and does not restrict explicit true to tests. The deployed flag was not inspected.

**Repair:** Remove synthesized clearance from real approval paths. Default simulation off; isolate any retained simulator to tests. Real institutional decisions must reject simulated evidence, even if a flag is mistakenly enabled. Do not edit secret environment files for this repair.

**Tests:** Both approval methods reject missing/queued/processing/failed results with the flag true and false. Production-mode configuration cannot enable fake clearance. Simulated results never satisfy final clearance.

**Done when:** Approval cannot manufacture the evidence it is supposed to verify.

## Task 08 — High: invalidate old access sessions and align socket authentication

**Evidence: Static.** Password reset/change in `server/modules/auth/auth.service.js:377–384,427–431` revokes refresh tokens only. `server/middleware/authenticate.js:28–51` checks JWT signature/expiry and active/verified account but no session/password-change version. `server/services/socket.service.js:51–87` trusts signed claims without loading the current account; its connection handler has no expiry/invalidation disconnect.

**Failure:** A stolen access token remains valid after password recovery until expiry. Deleted/deactivated users can still open sockets with an unexpired token, and established sockets have no timer enforcing token expiry. Account/role changes can leave stale socket identity active.

**Repair:** Add an explicit session or token-version invalidation boundary and verify it for HTTP and socket handshakes. Reset/change invalidates prior sessions; define logout scope using the existing intended policy. Disconnect affected live sockets on invalidation and enforce access expiry with an authenticated reconnect flow. Use current user role/verification/active state. If caching identity, define how invalidation reaches the cache and every server instance.

**Tests:** Old access and refresh tokens fail after reset/change; new login succeeds. Deactivated/deleted/unverified accounts fail socket handshake. Established sockets lose access on expiry/invalidation, and role changes cannot retain old privileges. Use controlled time and bounded event waits.

**Done when:** Password recovery/account deactivation revokes access consistently across HTTP and live events.

## Task 09 — High: authorize every project room subscription

**Evidence: Static.** `server/services/socket.service.js:108–135` checks team membership only for students; faculty/instructor branches join any syntactically valid project room without checking the project or assignment. Project events are emitted through `project.controller.js:989–993` and the project services. Archived students also bypass membership; archive event access needs explicit policy rather than an inferred public entitlement.

**Repair:** Resolve the project and authorize room access for each current user against canonical project permissions. Deny nonexistent projects. Specify archive-event access separately from published-manuscript access; do not expose private defense/ADM updates merely because a manuscript is archived. Revalidate/remove subscriptions when membership or role changes.

**Tests:** Assigned faculty/student/instructor where permitted → joins; unrelated faculty/student/instructor → denied; nonexistent project → denied; denied sockets receive no project event; revoked members stop receiving events. Use valid 24-character IDs.

**Done when:** Knowing a project ID does not grant subscription rights.

## Task 10 — Medium: consume refresh tokens atomically

**Evidence: Static.** `server/modules/auth/auth.service.js:255–291` reads an unrevoked refresh token, issues its successor at 288, then revokes the parent at 291. Concurrent calls can both pass the read. Reuse detection at 262–264 revokes all refresh tokens for the account.

**Repair:** Atomically claim an unexpired/unrevoked parent before successor creation. Define safe failure and concurrent retry behavior; keep malicious replay detection. Check the existing client refresh interceptor before adding another refresh coordinator. Avoid global account logout for ordinary concurrent refreshes without a defined policy.

**Tests:** Controlled concurrent refresh calls produce at most one valid successor; replay is detected; expected client concurrency has deterministic recovery; persistence failure does not leave an undocumented unusable session state.

**Done when:** Two requests cannot independently rotate the same parent token.

## Task 11 — High: correct OCR terminal-attempt handling

**Evidence: Static, checked against installed BullMQ source.** `server/jobs/documentExtraction.job.js:129–130` uses `(attemptsMade || 1) >= attempts` inside the processor. Installed `node_modules/bullmq/dist/cjs/classes/job.js:91,515–519` starts attemptsMade at zero and evaluates retry eligibility with attemptsMade + 1. Default extraction attempts are two in `server/jobs/queue.js:50–55`.

**Failure:** Attempts see 0 then 1. Neither is recognized as final. The worker skips failed cache state (134–148), temp cleanup (152–160), and terminal notification (162–167). `server/modules/documents/document.controller.js:260–280` returns cached processing before inspecting the actual queue failure, potentially masking failure until its 3,600-second expiry.

**Repair:** Inside the processor use `currentAttempt = (job.attemptsMade ?? 0) + 1` and compare with configured attempts, or centralize terminal handling in a worker failure event with its correct semantics. Preserve owner userId in terminal cache data. Handle early unrecoverable failures explicitly if used.

**Tests:** Correct `server/tests/unit/documentExtraction.retry.test.js` fixtures from 1/2 to processor-visible 0/1. First failed attempt preserves temp object; final failure deletes it, caches failed, emits one error, and polling reports terminal failure. Existing retry tests passing with incorrect fixtures do not disprove this bug.

**Done when:** Exhausted jobs visibly fail and clean up exactly once.

## Task 12 — Medium: never report a nonexistent OCR job as queued

**Evidence: Static.** `server/modules/documents/document.controller.js:208–225` uploads a temporary file, ignores enqueue's return value, and returns 202 queued. `server/jobs/queue.js:168–175` can return null when no queue is available. The controller catches thrown enqueue errors but does not clean up its temporary upload.

**Failure:** A queue-availability change can produce a job ID with no job. A thrown enqueue error falls back synchronously but leaks the uploaded temporary file.

**Repair:** Require a nonempty actual enqueue result before 202. Null and thrown failures must clean up temporary storage, then use the existing synchronous fallback. Make cleanup failure observable without concealing the original error. Successful enqueue transfers cleanup responsibility to the worker.

**Tests:** Enqueue returns null → synchronous result and temp deleted; enqueue throws → same; success → actual job ID and temp preserved for worker. No fallback response may claim queued.

**Done when:** Every queued response corresponds to a real job.

## Task 13 — Medium: repair socket tests so they can detect authorization regressions

**Evidence: Static + failed runtime attempt.** `server/tests/unit/socket.service.test.js:61` emits `join:project` with `project-alpha`, but `server/services/socket.service.js:109` requires a 24-character hexadecimal ID and silently returns. The test then awaits joined:project indefinitely until the test timeout in an unrestricted environment. Its client disconnect is only on the success path. In this audit runtime it failed earlier with `websocket error`, so the invalid-ID wait was not dynamically reached.

**Repair:** Use valid fixture IDs and mock the new account/project authorization boundaries explicitly. Bound every event wait, reject on connect_error/disconnect where appropriate, and close clients/servers in finally/afterEach even after assertions fail. Add negative room-access and account-invalidation tests from tasks 08–09. Never loosen the production ID validator to satisfy the fixture.

**Tests:** The socket suite finishes promptly on success, denial, connection failure, and missing acknowledgment; no hanging handles. Where local sockets are disallowed, classify that run as environment-blocked and use an approved runner; do not mark it passed.

**Done when:** A denied/invalid join is asserted as denial and never awaited as a successful join.

## Verification observed in this audit

| Check | Result | What it establishes |
| --- | --- | --- |
| Endpoint mappings | Passed: 229 server, 209 client, 0 unmatched | Client route paths have mappings; does not prove authorization |
| Agentic validation | Passed: 62/62 | Governance configuration checks; does not prove workflow safety |
| Evidence validator | Passed: 34/34 after document registration and session archival | Authority/record integrity including the new audit |
| Workspace guardrail and documentation whitespace check | Passed | Workspace policy and changed-document whitespace checks |
| First selected server run | 4 suites failed before discovery, 0 tests | EPERM renaming Vitest temporary cache; no application verdict |
| Selected run with workspace TEMP/TMP and bounded tests | 3 suites passed; 18 tests passed; socket suite 1 test failed | Registration-role, institutional reliability and OCR retry tests pass; socket reported websocket error |
| Task 01 follow-up | Server auth password-reset 5/5; client AuthPages 7/7; ESLint and Prettier passed | Covers new proof requirement and one-time consumption; not a full auth integration run |
| Password-reset reproduction | Saved password with omitted proof against isolated stubs | Demonstrates the method's shared-verification flaw; no live account changed |

Selected command: `npm test --workspace=server -- tests/unit/socket.service.test.js tests/unit/institutionalWorkflow.reliability.test.js tests/unit/documentExtraction.retry.test.js tests/unit/auth.registration-role.test.js --testTimeout=5000 --hookTimeout=10000`. Second run took 92.80 seconds. The passing OCR tests have the attempt-count fixture defect described above. No full-suite, compiler, root lint, visual, or production acceptance claim is made.

## Repair implementation checkpoint — 27 October 2026

All 13 findings received source or test-fixture repairs. A later targeted review reopened task 08's client expiry/reconnect requirement; its directions are in the [Mongo/WebSocket recovery handoff](luna-mongo-websocket-recovery.md). This is an implementation checkpoint, not a release sign-off.

| Tasks | Repair state | Focused evidence | Remaining verification limit |
| --- | --- | --- | --- |
| 01 | Fixed | Password-reset server tests 5/5 and client auth tests 7/7 from the prior checkpoint | Full auth integration suite not run |
| 02–05 | Fixed | Storage authorization, instructor authorization, and committee suites: 22/22 | Evaluation integration requires MongoMemoryServer and did not reach tests |
| 06–07 | Fixed | Plagiarism clearance/archive tests 19/19; worker blank, whitespace, 49-character, and image-only cases 4/4; production flag logic is limited to test mode | Submission approval integration was not run; do not treat mock results as real scan evidence |
| 08 | Server invalidation fixed; client expiry recovery open | Password-reset/registration tests 17/17; account invalidation 5/5; approved-runner socket suite 5/5 | Client has no refresh/reconnect handler after the server expires a token; follow the recovery handoff |
| 09, 13 | Focused suite verified with approved localhost access | Socket authorization suite 5/5; valid IDs, assignment ACLs, denials, bounded waits and cleanup | Authenticated live-browser expiry and room resubscription are not yet verified |
| 10–11 | Fixed | Atomic refresh rotation, replay, session-version mismatch, retry/final-attempt tests passed in the 12-test grouped run | Database-backed end-to-end rotation was not run |
| 12 | Fixed and focused API suite verified | Queue fallback/retry unit tests passed in the 12-test grouped run; approved-runner document extraction API suite 6/6 | Full workflow suite is not rerun |

Additional passing checks: plagiarism-specific worker and clearance tests 23/23 across two focused runs; storage/instructor/committee tests 22/22; auth password-reset/registration tests 17/17; account invalidation tests 5/5; `node --check` and `git diff --check` passed for the repair sources. Vitest runs that stalled before discovery were stopped at the two-minute watchdog. The socket and MongoMemoryServer failures are explicitly unverified/environment-blocked outcomes, not passes. Full release gates remain unrun.

## Closure checklist for repairs

Follow-up evidence: the restricted runtime returned `connect EACCES` for a plain localhost HTTP probe and MongoDB startup aborted with an internal assertion. With approved localhost execution, HTTP/WebSocket probes passed, cached MongoDB 8.2.6 started in 4,813 ms, the socket suite passed 5/5, and document extraction API passed 6/6. Live backend (43210) and Vite proxy (43211) WebSocket transports opened and correctly rejected missing-token authentication. This supersedes the earlier socket/document-API environment-blocked verdict, but not unrun evaluation/approval integrations or browser expiry recovery. See the [Luna repair directions](luna-mongo-websocket-recovery.md).

Run focused tests per task before expanding. Final checks: endpoint parity, agentic validation, governance pipeline, complete client suite (bounded/sharded if necessary), comprehensive server workflow, workspace guardrail, evidence validation, applicable lint/build, and visual loop when client UI changed. Capture outcomes individually. Never call the system release-ready while a required check is failed, blocked, or unrun.

Deliver each task with: finding ID; changed functions; why the old behavior was unsafe; regression test that failed before the repair; successful and rejected cases afterward; remaining limits. This report is supporting guidance; approved institutional requirements and verified contracts retain higher authority.
