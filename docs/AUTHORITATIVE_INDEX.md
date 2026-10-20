# CMS-V2 Authoritative Document Index & Order of Precedence
**Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Governance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  
**Status:** Authoritative Repository Authority Index  

---

## 1. The Strict Order of Authority (Ground Truth)

When evidence or documentation conflicts across the workspace, agents and developers must strictly adhere to the following **Order of Authority**:

```
[Level 1: Highest Authority]
Approved Institutional Requirements & Role Boundaries
  (BukSU IT Department capstone guidelines, 4-phase sequence, role consolidation, instructor committee exclusion)
       │
       ▼
[Level 2: Contract Authority]
Approved API Contracts & Intended User Behavior
  (shared schemas, route contracts verified by endpoint parity, role permissions)
       │
       ▼
[Level 3: Implementation Authority]
Implementation Verified Against Those Requirements
  (Express controllers/services, React components passing zero-error gates)
       │
       ▼
[Level 4: Test Authority]
Tests That Enforce Verified Behavior
  (Deterministically passing integration suites, unit suites, and Playwright visual loops)
       │
       ▼
[Level 5: Supporting Guidance]
Supporting Documentation
  (ARCHITECTURE.md, README.md, technical specifications, runbooks)
       │
       ▼
[Level 6: Lowest Authority]
Historical Session Records & Archived Summaries
  (.agents/ptss/ sessions, archived plans, delivery manifests)
```

> [!IMPORTANT]
> **No Blind Trust:** Do not automatically treat running code, passing mocks, or historical session records as correct. When a conflict between code and institutional requirements arises, the institutional requirement governs. Unresolved requirement conflicts must be explicitly documented rather than fabricated.

---

## 2. Authoritative Document Registry

### A. Canonical Institutional & Governance Documents (Active Authority)
| Document | Path | Scope & Authority |
| :--- | :--- | :--- |
| **Cognitive Boundary & Runtime Contract** | [`AGENTS.md`](file:///c:/Users/patri/dev/CMS-V2/AGENTS.md) | Universal operating sandbox, Two-Pile architecture, Phase 0 plus four overall workflow phases, ASDLC rules. |
| **Cognitive Contract for Gemini / Antigravity** | [`GEMINI.md`](file:///c:/Users/patri/dev/CMS-V2/GEMINI.md) | Supreme cognitive protocols, 8-stage lifecycle, 7-point quality battery. |
| **System Architecture Specification** | [`docs/ARCHITECTURE.md`](file:///c:/Users/patri/dev/CMS-V2/docs/ARCHITECTURE.md) | Technical stack, monolithic API, plagiarism hybrid engine, PaddleOCR-VL pipeline, S3/MinIO storage. |
| **System Overview & Quickstart** | [`README.md`](file:///c:/Users/patri/dev/CMS-V2/README.md) | Developer onboarding, architecture diagrams, verified test commands. |
| **Durable Evidence Inventory** | [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) | Comprehensive status, requirement tracing, and audit evidence for tests and docs. |
| **Plagiarism Benchmark Specification** | [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md) | Benchmark datasets, scoring models, and distinction from unit test mock controls. |
| **Test Quarantine Register** | [`docs/TEST_QUARANTINE.md`](file:///c:/Users/patri/dev/CMS-V2/docs/TEST_QUARANTINE.md) | Ledger of quarantined tests with owners, failure reasons, and expiry dates. |
| **Workspace Evidence Maintenance Skill** | [`.agents/skills/workspace-evidence-maintenance/SKILL.md`](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/workspace-evidence-maintenance/SKILL.md) | Systematic workspace organization, evidence maintenance, document authority tracking, and retirement policy. |
| **Document Classification Manifest** | [`docs/classification-manifest.json`](file:///c:/Users/patri/dev/CMS-V2/docs/classification-manifest.json) | Machine-readable classification registry of current, needs-review, superseded, and generated artifacts. |

### B. Core Operational Specifications
| Document | Path | Status | Authoritative Scope |
| :--- | :--- | :--- | :--- |
| **Action Done Matrix Spec** | [`docs/specs/action-done-matrix.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/action-done-matrix.md) | Verified | ADM multi-tier digital sign-off and Secretary gate. |
| **IHSA Specification** | [`docs/specs/ihsa-specification.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/ihsa-specification.md) | Verified | Interconnected Harness Scaling Architecture & hooks runtime. |
| **Multi-Chapter Storage Spec** | [`docs/specs/multi-chapter-streaming-and-storage-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/multi-chapter-streaming-and-storage-spec.md) | Verified | Authenticated manuscript streaming and MinIO signed URLs. |
| **Capstone Lifecycle Workflow** | [`docs/cms-v2-comprehensive-workflow.md`](file:///c:/Users/patri/dev/CMS-V2/docs/cms-v2-comprehensive-workflow.md) | Current | Phase 0, Capstone 1–3 semester mapping, review gates, defenses, grades, ADM, and archival. |

### C. Historical & Superseded Documents (Read-Only / Reference Only)
The following documents are historical or superseded. Readers seeking authoritative guidance must consult the replacement document listed:

| Historical Document | Historical Date | Status | Authoritative Replacement |
| :--- | :--- | :--- | :--- |
| `FILES_INDEX.md` | Early 2026 | **Superseded** | [`docs/AUTHORITATIVE_INDEX.md`](file:///c:/Users/patri/dev/CMS-V2/docs/AUTHORITATIVE_INDEX.md) & [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) |
| `docs/delivery/DELIVERY_MANIFEST.md` | 2026-03-26 | **Historical** | [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) |
| `docs/archive/plagiarism_benchmark_report.md` | 2026-04-14 | **Historical** | [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md) |
| `docs/archive/` (all files) | Various | **Historical** | Current specifications under `docs/` and `docs/specs/` |

### D. Active Testing Instructions & Verification Gates

Temporary synthetic workflow fixture (non-authoritative): `scratch/e2e-student-fixtures/compiled_proposal_e2e.docx` is disposable upload-test material and must not be treated as an academic manuscript or institutional evidence; see its `generated` classification in `docs/classification-manifest.json`.
Responsive layout findings and coverage limits: [Responsive layout audit](RESPONSIVE_LAYOUT_AUDIT.md). This is a scoped working-tree assessment, not system-wide sign-off.

Authoritative instructions for executing deterministic test suites and quality gates:
1. **Targeted Fast-Path Unit Tests (1–5s):**
   - Server: `npm test --workspace=server -- <target-test-file>`
   - Client: `npm test --workspace=client -- <target-test-file>`
2. **Comprehensive Integration Workflow Gate (~20s):**
   - Full 13-stage lifecycle: `npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js`
3. **Workspace Evidence & Authority Suite (<2s):**
   - Run: `npm run check:evidence`
4. **Endpoint Route Parity (<2s):**
   - Run: `npm run check:endpoints`
5. **Agentic System & Governance Verification (<5s):**
   - Run: `npm run validate:agentic` and `npm run validate:governance`
6. **Playwright Visual Feedback Loop:**
   - Run targeted audit in `scratch/` across 4 viewports (desktop light/dark, mobile light/dark).

### E. Benchmark Procedures & Calibration

### E.1 Live Workflow Defect Follow-up
The 15 October seeded-student run produced targeted fixes for proposal-hearing state integrity, first-upload wording, dashboard query freshness, plain-text manuscript preview, new-project deliverable defaults, ADM phase labels, unearned blank-minutes verdict defaults, overclaimed plagiarism originality language, pending-schedule readiness copy, mobile scan-meter overlap, and demo URL validation/error feedback. Focused minutes suites passed 16/16, report/detail/schedule suites passed 40/40, responsive SubmissionDetailPage passed 16/16, and PrototypeShowcaseAndDemo passed 6/6. A live archive scan did not update the displayed coverage summary and the report route remained loading; this is recorded as unresolved evidence. Verified client evidence and unresolved server-test limitations are recorded in [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) and `.agents/ptss/sessions/2026-10-15_e2e-workflow.json`. The workflow remains correctly gated at Capstone 2 ADM: committee recommendations and Secretary compliance endorsement are pending, so do not proceed to Capstone 3 or archival by inventing approvals.

Student input follow-up (15 October 2026): existing ADM metadata fields were valid, committee recommendation rows were empty, and the Phase 3 demo URL field now rejects invalid entries with clear feedback. Its focused suite passed 6/6. The live archive scan/report route did not return a refreshed report and remains an unresolved runtime concern; see the workflow session record. The student workflow still requires authentic adviser endorsement and committee/Secretary action before Chapter 4–5.

Workflow status correction (16 October 2026): ADM-driven and instructor-driven phase transitions now set the project stage to the destination capstone and restore `projectStatus=active`. The phase-aware submission guard also accepts legacy `proposal_approved` records only when the required capstone phase is already unlocked, so the status mismatch does not strand existing submissions. The focused progression suite passed 8/8 with mocked database access; endpoint parity reported 0 unmatched routes. The seeded project's stored state was not mutated during this code correction. Weekly Gantt check-in waivers, QR certificate generation, and archive vector indexing remain open in [the session record](../.agents/ptss/sessions/2026-10-16_workflow-refactor-status-transition.json) and [the active task checkpoint](../.agents/ptss/tasks/workflow-refactor.json).

Synthetic final-phase execution (17 October 2026): using the existing seeded fixture, final manuscripts and scans, synthetic released evaluations, Secretary endorsement, five ADM signatures, archival, the approval sheet, and anonymous QR certificate verification passed through official APIs. No actual defense occurred; archive indexing remains queued. The fixture lacked verified Gantt, repository, and prototype evidence, so this is not a clean Phase 0 through Phase 3 lifecycle result. An earlier interim note incorrectly treated “three numbered stages plus Final” as a conflict with the requested phase model. The current contract separates overall `workflowPhase` 1–4 from the legacy `capstonePhase` course counter 1–3, with Phase 0 team formation before project creation; the phase mapping is reconciled in [`shared/constants/capstonePhases.js`](../shared/constants/capstonePhases.js). Focused ADM/archive tests passed 21/21, comprehensive server workflow passed 13/13, and focused client suites passed 25/25. The instructor visual audit passed 8/8 captures; the repeated full student loop hit its watchdog. See [the session record](../.agents/ptss/sessions/2026-10-17_synthetic-final-adm-archive-run.json) and [the evidence inventory](EVIDENCE_INVENTORY.md).

Latest seeded-account lifecycle execution (17 October 2026): a separate synthetic project completed the Gantt, late weekly check-in and waiver, system clearance, Capstone 2 and final hearing, Chapter 4–5 revisions, final manuscript scans, ADM endorsements/signatures, grade releases, and archival through official APIs. The follow-up phase refactor reconciled numbering: workflow Phase 1 handles proposal intake, Phases 2–4 map to Capstone 1–3, and `capstonePhase` remains the 1–3 course counter. The project is searchable with both final manuscripts and its synthetic repository/gallery fixtures; stored documents and generated PDFs read back, and public certificate verification passed. No actual oral defense occurred. Chapter 4–5 revision resubmissions used the app's mock plagiarism fallback, while both final manuscripts completed their scan jobs at 100% originality. The GitHub URL and gallery image are test fixtures; the URL was not verified against GitHub. See [the session record](../.agents/ptss/sessions/2026-10-17_latest_seeded_account_e2e.json), [the task checkpoint](../.agents/ptss/tasks/2026-10-17_latest_seeded_account_e2e.json), and [the evidence inventory](EVIDENCE_INVENTORY.md).

Archive indexing readback follow-up (17 October 2026): a read-only `GET /api/projects/:id` for the latest seeded account's archived project returned `archiveIndexing.status=completed` with two document IDs matching the final academic manuscript and journal paper, `completedAt` set, and no `lastError`. This API readback confirms indexing; archive search visibility alone was not treated as proof. No project or database state changed. The same follow-up stopped a MongoMemoryServer-backed integration retry before assertions at 108 seconds; the isolated binary cache remained empty and no Node or `mongod` test process remained. The verification-loop skill now checks binary availability before further retries. See `.agents/ptss/sessions/2026-10-17_mongodb-binary-preflight-recovery.json` and the matching row in [`docs/EVIDENCE_INVENTORY.md`](EVIDENCE_INVENTORY.md).

Workflow enforcement update (17 October 2026): student submission surfaces resolve batch and section deadline records, and the submission service enforces the selected due date, late-upload closure, and required late justification at the API boundary. Gantt schedule edits are limited to assigned students and the assigned Adviser, with approval remaining a separate Adviser action. Focused client coverage passed 52/52, the scheduled deadline policy unit suite passed 3/3, the submissions integration suite passed 67/67, and the Gantt authorization suites passed 21/21 client plus 11/11 server checks. The required visual audit could not reach the local app through the available browser bridge; the full client suite remains unverified after its 120-second watchdog. See [the evidence inventory](EVIDENCE_INVENTORY.md) and current [workflow checkpoint](../.agents/ptss/tasks/2026-10-17_four-phase-workflow-refactor.json).

Isolated upload follow-up: [15 October 2026 upload contention experiment](benchmarks/isolated-upload-2026-10-15.md). Real HTTP/MongoDB/MinIO/Redis acceptance was exercised in disposable infrastructure: 15/50 burst uploads accepted, 35 version conflicts; all 16 accepted files including preflight passed byte-integrity checks. This is failed same-project contention evidence, not a passing capacity or full-workflow claim.

Follow-up evidence: [15 October 2026 review validation](benchmarks/review-validation-2026-10-15.md). Two bounded 50-client title-screening trials failed strict success thresholds; workflow startup and independent-source ingestion remained blocked. The report governs interpretation of `scripts/benchmarks/k6_concurrent_title_checks.js`, `k6_valid_submissions.js`, `run_independent_manuscripts.py`, and `run_independent_copy_probe.py`. These results do not establish accepted-submission capacity or independent detection accuracy.

Authoritative procedures for empirical model evaluation (see [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md)):
1. **Model Accuracy vs. Mock Controls:** Unit tests with mocked responses prove software control-flow only. Model detection accuracy must be evaluated using versioned benchmark datasets against the live Python service (`plagiarism_engine:8000`).
2. **Versioned Benchmark Datasets:**
   - `ISO-BUKSU-V1`: Synthetic 50-pair manuscript corpus evaluating verbatim, paraphrased, and cross-chapter similarity.
   - `PAN-SPANS-V1`: Synthetic boundary-detection corpus evaluating character-offset precision and recall.
3. **Hyperparameter Invariants:** Hybrid score weights ($w_{lex}=0.65, w_{sem}=0.35$) and minimum similarity threshold ($\theta_{min}=0.78$) are immutable during benchmark runs.

---

## 3. Discrepancy Reconciliation Principles

1. **Intended Architecture vs. Deployed Behavior**:
   - Neural vector scanning (`BAAI/bge-m3`) is the primary intended model. When running locally without GPU or Python container, the system falls back to in-process Winnowing with degraded flags (`ocrStatus: 'degraded'`).
   - Mocked neural tests (e.g., `plagiarism.coverage.test.js`) prove control flow, but do not prove model accuracy.
2. **Capstones & Phase Progression**:
   - The platform strictly enforces 4 institutional phases: Phase 1 (Proposal), Phase 2 (Midterm / Chapters 1–3), Phase 3 (Development / Progress Defense), and Phase 4 (Final Defense & Archival).
   - In legacy code paths mapping to 3 semesters (`capstone_1`, `capstone_2`, `capstone_3`), Phase 3/Final stage represents the final defense and archival stage.


Corrective follow-up: [Chapter upload version correction, 15 October 2026](benchmarks/chapter-upload-version-fix-2026-10-15.md). Real corrected bursts accepted 50/50 requests with one process and 50/50 with two processes; 15 mocked regression tests passed. Independent stored-file readback and full workflow closure remain incomplete. The historical 15/50 baseline remains valid.

Instructor portal layout review (16 October 2026): the non-authoritative checkpoint at `scratch/instructor-portal-audit.json` records responsive review and focused verification, including the ReportsPage test timeout. It does not certify academic decisions or replace institutional workflow requirements. The durable prevention runbook is in `memories/repo/CMS-V2-Technical-Context.md`.

Seeded-account runtime recheck (16 October 2026): the user-provided reseed report was used as account data, not as workflow authority. The seeded student's profile already has a section and instructor, and an E2E team/project already exists. The project reports `capstonePhase=3`, `stage=capstone_1`, and `projectStatus=proposal_approved` despite locked proposal/Chapters 1–3 submissions and an approved ADM. The API recovered after restart; the client remains unhealthy during Vite dependency optimization. No project workflow state was changed. See `.agents/ptss/sessions/2026-10-16_seeded-account-runtime-recheck.json` and `memories/repo/lessons/2026-10-16-seeded-test-runtime-recheck.md`. Both are Level 6 non-authoritative records; the institutional four-phase lifecycle governs.

Follow-up (17 October 2026): the same existing seeded project was advanced through the authorized synthetic final gates and archived. The earlier record remains accurate for its read-only timestamp; the newer session records the archive receipt and the missing earlier-phase evidence.

Closure follow-up (17 October 2026): the archived Gantt schedule now opens read-only without autosaving, and the API rejects archived plan edits. Assigned Adviser schedule editing is enabled through the shared permission rule. Deadline and Gantt surfaces were reviewed in light/dark at desktop/mobile sizes; focused Gantt coverage passed 22/22 client tests and 12/12 isolated server tests. The full client suite remains unverified after its watchdog. The comprehensive server suite stopped at MongoMemoryServer configuration before reaching assertions. See `.agents/ptss/sessions/2026-10-17_archived-gantt-visual-verification.json`.

Archived-project read-only follow-up (17 October 2026): the latest seeded-account report was used only as account reference data. The archived project displays a review-only notice; submission uploads, ADM edits/layout actions, and Secretary Minutes save/clear actions are disabled. Server guards cover project core, title/proposal, stream routing, defense, team roster/role/leadership/link/committee routes, evaluation, minutes, and submission mutations. Four Playwright theme/viewport captures showed no document-wide horizontal overflow, and changed server files pass syntax checks. The default Vitest setup did not reach assertions because the managed Windows temp path denied the Vite SSR cache rename and the isolated MongoMemoryServer fixture could not complete localhost access; an isolated single-worker run of `server/tests/unit/team.assign-committee.test.js` passed 12/12 mocked service tests. Mongo-backed integration and full-client suites remain unverified, so the broader changes remain `needs-review`. See `.agents/ptss/sessions/2026-10-17_archived-project-readonly-guard-closure.json` and the matching evidence inventory row.

Latest seeded-account state check (17 October 2026): official read-only API requests verify the report-listed account is signed in with a section/instructor profile and belongs to a locked two-member team assigned to an archived project. The live state therefore supersedes the DOCX's earlier zero-project reseed snapshot; the project was not changed. This confirms the archived account state but leaves clean-start Phase 0–Capstone 1 evidence open. See the session record and evidence inventory follow-up.

Student registration domain alignment (17 October 2026): client validation now requires the dedicated `@student.buksu.edu.ph` domain, matching server validation. Focused client and server schema tests passed 3/3 each. The public form visual audit remains unverified because the current browser session redirects `/register` to the dashboard and the isolated Playwright browser could not be installed after DNS resolution failed. No account or project state was changed. See [the evidence inventory](EVIDENCE_INVENTORY.md) and [the session record](../.agents/ptss/sessions/2026-10-17_archived-project-readonly-guard-closure.json).

Title approval state recheck (17 October 2026): the title service regression suite passes 10/10 in 17.60 seconds with database startup disabled and project-core/committee collaborators isolated. Title approval now remains independent of a later proposal-defense schedule and clears stale legacy title-review schedules. Full Mongo-backed workflow and clean-start Phase 0–Capstone 1 verification remain open; see the [evidence inventory](EVIDENCE_INVENTORY.md) and [session record](../.agents/ptss/sessions/2026-10-17_archived-project-readonly-guard-closure.json).

Archive manuscript reader follow-up (17 October 2026): archived TXT manuscripts preserve their original response MIME type and filename and use the canonical `SophisticatedDocumentViewer` with archive identity metadata. Focused archive/shared-reader tests passed 27/27, and the actual archive view was checked in light/dark at desktop/mobile sizes. No account or project data changed. The latest seeded account already has a locked archived project, so clean-start Phase 0–Capstone 1 remains unverified; see `.agents/ptss/sessions/2026-10-17_archive-text-reader-followup.json` and `.agents/ptss/tasks/2026-10-17_phase0_capstone1_followup.json`.

Seeded-account workflow verification follow-up (17 October 2026): the live dashboard still shows the final seeded student on the unchanged synthetic archive. The isolated MongoMemoryServer workflow suite passed 13/13 scenarios and the auth integration suite passed 17/17; neither represents a real hearing or external storage integration. Targeted registration schema passed 3/3, and endpoint parity, agentic governance, governance DAG, evidence integrity, and workspace guardrail checks passed. The full client suite remains incomplete after a bounded shard was stopped while progressing, and a fresh browser registration-to-Capstone 1 run remains open. See the [evidence inventory](EVIDENCE_INVENTORY.md), `.agents/ptss/sessions/2026-10-17_seeded-account-workflow-verification.json`, and `.agents/ptss/tasks/2026-10-17_phase0_capstone1_followup.json`.

Live account isolation follow-up (17 October 2026): read-only checks found the first alternate seeded student already has an active submitted-title project and another already has an archived project. Neither was changed. Because live registration dispatches OTP over SMTP and the transport was not verified as a local test sink, no registration or OTP email was triggered. The browser was restored to the final seeded student. See the [evidence inventory](EVIDENCE_INVENTORY.md) and the [session record](../.agents/ptss/sessions/2026-10-17_seeded-account-workflow-verification.json).

Client suite sharding follow-up (17 October 2026): the first sequential one-eighth Vitest shard passed 16 test files and 108 cases in 92.13 seconds. Two concurrent shards did not reach terminal summaries before 110 seconds and are not counted as passes. Continue with one shard process at a time and reconcile all 123 discovered client test files. See the [evidence inventory](EVIDENCE_INVENTORY.md) and [active checkpoint](../.agents/ptss/tasks/2026-10-17_phase0_capstone1_followup.json).

Client shard verification update (17 October 2026): sequential shard 2/8 passed 16 files and 79 tests in 60.17 seconds. This replaces the incomplete concurrent shard 2/8 attempt; shard 3/8 still requires a sequential run. The other shard results remain open until coverage reconciles against all 123 client test files. See the [evidence inventory](EVIDENCE_INVENTORY.md) and [active checkpoint](../.agents/ptss/tasks/2026-10-17_phase0_capstone1_followup.json).
Client shards 3/8–5/8 verification update (17 October 2026): sequential shard 3/8 passed 16 files and 81 tests in 50.45 seconds, shard 4/8 passed 15 files and 85 tests in 48.73 seconds, and shard 5/8 passed 15 files and 97 tests in 47.87 seconds after its focused component suite passed 5/5 with the Gantt role-guard contract corrected. Shards 1/8–5/8 cover 78 files and 450 tests; shards 6/8–8/8 remain. See the [evidence inventory](EVIDENCE_INVENTORY.md), [active checkpoint](../.agents/ptss/tasks/2026-10-17_phase0_capstone1_followup.json), and [session record](../.agents/ptss/sessions/2026-10-17_seeded-account-workflow-verification.json).
Client shard 6/8 verification update (17 October 2026): shard 6/8 passed 15 files and 116 tests in 68.82 seconds. Shards 1/8–6/8 cover 93 files and 566 passing tests; shards 7/8–8/8 remain. See the [evidence inventory](EVIDENCE_INVENTORY.md) and the active seeded-account verification record.
Client shard 7/8 verification update (17 October 2026): shard 7/8 passed 15 files and 83 tests in 57.46 seconds. Shards 1/8–7/8 cover 108 of 123 discovered files and 649 passing tests; shard 8/8 remains. See the [evidence inventory](EVIDENCE_INVENTORY.md).
Client suite sharding closure (17 October 2026): all eight sequential Vitest shards passed 753 tests across all 123 discovered test files exactly once. The per-shard file counts (16, 16, 16, 15, 15, 15, 15, 15) match Vitest’s disjoint balanced shard ranges. See the [evidence inventory](EVIDENCE_INVENTORY.md) and seeded-account workflow session record.
Server workflow verification update (17 October 2026): the comprehensive integration suite passed 13/13 against isolated MongoMemoryServer fixtures with external storage adapters mocked. A sandbox loopback denial prevented one rerun before assertions; the approved isolated rerun passed all 13 cases in 36.30 seconds, without using the running application database.
