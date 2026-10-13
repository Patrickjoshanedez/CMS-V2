# CMS-V2 Durable Evidence Inventory & Audit Ledger
**Repository:** BukSU Capstone Management System V2 (CMS-V2)  
**Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  
**Last Verified Revision:** HEAD (`e6f9b3f` + working tree remediation patches)  
**Verification Date:** 2026-10-13  

---

## 1. Overview & Verification Standards

2026-10-14 scoped layout evidence: [Responsive layout audit](RESPONSIVE_LAYOUT_AUDIT.md). Focused tests and actual-app/component captures support specific fixes; full quality gates and complete role/state coverage remain unresolved. Do not interpret this entry as system-wide sign-off.

This inventory serves as the authoritative, maintained audit register for all tests, documentation, architecture specifications, and agent memory records in the CMS-V2 workspace.

### Status Definitions
* **`verified`**: The artifact's claims or test suites have been directly executed and confirmed to match active code behavior under verified test runs.
* **`needs review`**: The artifact contains potential drift, unverified assumptions, or requires further empirical benchmarking.
* **`superseded`**: The artifact represents an older implementation pattern replaced by an authoritative successor.
* **`historical`**: Read-only archival artifact preserved for research continuity or audit trails, not active guidance.

---

## 2. Test Suite Evidence & Classification

### A. Institutional Workflow & Authorization Tests
| Requirement ID | File Path & Type | Requirement Covered | Status | Concrete Supporting Evidence | Decision | Authoritative Replacement / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | `server/tests/unit/institutionalWorkflow.reliability.test.js` (Unit Test) | Committee appointment restrictions (Faculty only; Instructor excluded; No duplicate panelists; Panelist existence check) | **verified** | 8/8 tests pass (`vitest run tests/unit/institutionalWorkflow.reliability.test.js`). Fails on mutation. | **keep** | Enforces Pile B committee rules in `team.service.js`. |
| **REQ-AUTH-02** | `server/tests/unit/institutionalWorkflow.reliability.test.js` (Unit Test) | Project Archival Gates: Phase 4 / final phase prerequisite, passed defense verdict gate (`DEFENSE_VERDICT_UNMET`), Secretary ADM endorsement gate (`SECRETARY_ENDORSEMENT_REQUIRED`). | **verified** | 8/8 tests pass. Mutation test (`if(false)` on defense check) produced expected failure. | **keep** | Enforces institutional archival gates in `projectArchive.service.js`. |
| **REQ-WORKFLOW-01** | `server/tests/integration/comprehensive-all-workflows.test.js` (Integration Test) | Complete 13-stage end-to-end capstone workflow: proposal, title deliberation, committee assignment, chapter upload, evaluations, auto-archive. | **verified** | Pass across all 13 workflow stages under MongoDB memory server. | **keep** | Core institutional end-to-end gatekeeper. |
| **REQ-WORKFLOW-02** | `server/tests/unit/admAutoProgression.test.js` (Unit Test) | Action Done Matrix (ADM) auto-progression and signatory verification across milestones (v1, v2, v3). | **verified** | 100% test pass on milestone transitions and secretary gate unlocking. | **keep** | Enforces ADM lifecycle in `projectCore.service.js`. |
| **REQ-WORKFLOW-03** | `client/src/components/projects/adm/admWorkflow.test.js` (Client Unit Test) | Client ADM state machine, secretary endorsement banner lock, signature state derivation. | **verified** | 5/5 tests pass (`npm test --workspace=client -- admWorkflow.test.js`). | **keep** | Powers `ActionDoneMatrixTab.jsx` UI gates. |
| **REQ-WORKFLOW-04** | `client/src/pages/projects/SecretaryReviewPage.test.jsx` (Client Unit Test) | Committee Secretary defense minutes upload, auto-parsing into ADM rows, and endorsement gate signature. | **verified** | Vitest client passes with 0 errors. | **keep** | Powers `/secretary-review` studio. |

### B. Plagiarism & Similarity Engine Tests
| Requirement ID | File Path & Type | Requirement Covered | Status | Concrete Supporting Evidence | Decision | Authoritative Replacement / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-PLAG-01** | `server/tests/unit/plagiarism.coverage.test.js` (Unit Test) | Mandatory scan fallback, degraded score tracking (`semanticStatus: 'degraded'`), archival gate rejection for degraded scans. | **verified** | All coverage tests pass. Disclaimed that mocked tests verify control-flow only, not neural detection accuracy. | **keep** | Enforces plagiarism reliability in `plagiarism.job.js` and `projectArchive.service.js`. |
| **REQ-PLAG-02** | `server/tests/unit/plagiarism.exclusions.test.js` (Unit Test) | Boilerplate, citation quotes, and bibliography exclusions before fingerprinting. | **verified** | Passing assertions on smart-quote and reference section strip. | **keep** | Prevents false positives on BukSU title sheets. |
| **REQ-PLAG-03** | `server/tests/unit/plagiarism.denoising.test.js` (Unit Test) | Span denoising and minimum match length thresholding ($k \ge 7$). | **verified** | Unit tests confirm single-word collisions are filtered out. | **keep** | Enforces Winnowing mathematical noise floor. |
| **REQ-PLAG-04** | `scripts/iso_plagiarism_benchmark.js` (Benchmark Script) | ISO/IEC 25010/25023 multi-scenario plagiarism accuracy measurement against live engine. | **needs review** | Requires live `plagiarism_engine` microservice with `BAAI/bge-m3` embedding core. Synthetic corpus verified. | **keep** | Authoritative empirical benchmark harness. Excluded from `npm test`. |
| **REQ-PLAG-05** | `server/scripts/run-plagiarism-benchmark.js` (Benchmark Script) | PAN standard character-span precision and recall calculation against `truth-dataset.json`. | **verified** | Runs and generates PAN metrics. Correctly marked as synthetic calibration benchmark in `docs/archive/`. | **keep** | Historical calibration runner. |

### C. Document Processing & Ingestion Tests
| Requirement ID | File Path & Type | Requirement Covered | Status | Concrete Supporting Evidence | Decision | Authoritative Replacement / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-OCR-01** | `server/tests/unit/documentExtraction.retry.test.js` (Unit Test) | Extraction resilience: storage file preservation on retry, scoped temp directory cleanup, and polling status compatibility. | **verified** | Targeted vitest unit tests pass. | **keep** | Hardens `documentExtraction.job.js`. |
| **REQ-OCR-02** | `server/tests/unit/pdfMetadataExtractor.test.js` (Unit Test) | Multi-strategy PDF metadata extraction: title, authors, abstract, publication venue disambiguation. | **verified** | 8/8 tests pass in `pdfMetadataExtractor.test.js`. | **keep** | Powers archival auto-fill ingestion. |
| **REQ-OCR-03** | `server/tests/unit/secretaryMinutesMerge.test.js` (Unit Test) | Defense minutes extraction and merge into Action Done Matrix rows. | **verified** | Unit tests pass on DOCX and text parsing. | **keep** | Powers Secretary review upload workflow. |

---

## 3. Documentation & Architecture Evidence

| Requirement ID | File Path | Current Status | Supporting Evidence / Audit Findings | Decision | Authoritative Guidance / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-DOCS-01** | `docs/ARCHITECTURE.md` | **verified** | Accurately describes monorepo architecture, Express 5 REST API, PaddleOCR-VL microservice, Winnowing + BAAI/bge-m3 hybrid engine, S3/MinIO dual storage, and BullMQ queues. | **keep** | Core system architectural ground truth. |
| **REQ-DOCS-02** | `README.md` | **verified** | Verified startup commands, environment prerequisites, and test instructions (`check:endpoints`, `validate:agentic`, `validate:governance`). | **keep** | Authoritative repository entrypoint. |
| **REQ-DOCS-03** | `docs/AUTHORITATIVE_INDEX.md` | **verified** | Newly created authority index with 6-level hierarchy of precedence and document classification. | **keep** | Authoritative navigation roadmap. |
| **REQ-DOCS-04** | `docs/benchmarks/plagiarism-benchmark-spec.md` | **verified** | Newly created benchmark specification detailing datasets `ISO-BUKSU-V1` and `PAN-SPANS-V1`, scoring configuration, and control-flow vs accuracy separation. | **keep** | Authoritative benchmark standard. |
| **REQ-DOCS-05** | `docs/TEST_QUARANTINE.md` | **verified** | Newly created quarantine ledger showing 0 active quarantined tests and automated expiry tracking rules. | **keep** | Enforces zero silent skips. |
| **REQ-DOCS-06** | `FILES_INDEX.md` | **superseded** | Contains outdated early-2026 references (e.g. references deleted `PlagiarismChecker.jsx`). | **superseded** | Replaced by `docs/AUTHORITATIVE_INDEX.md` and this inventory. |
| **REQ-DOCS-07** | `docs/archive/plagiarism_benchmark_report.md` | **historical** | Updated with explicit historical label, dataset version (`PAN-SPANS-V1`), and control-flow mock disclaimer. | **archive** | Historical reference only. |

---

## 4. Agent Memory & Governance Evidence

| Requirement ID | File Path | Current Status | Supporting Evidence / Audit Findings | Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-PTSS-01** | `.agents/ptss/index.jsonl` | **verified** | Repaired line 217 syntax collision (concatenated records separated into valid JSON lines). All 213 records validated by `verify_workspace_evidence.py`. | **repaired** | Zero JSON parsing errors; append-only invariant preserved. |
| **REQ-PTSS-02** | `.agents/ptss/sessions/*.json` | **verified** | All 213 session files verified to match indexed sessions, including restored records for missing files. | **verified** | Continuous cross-session recall restored. |
| **REQ-PTSS-03** | `.agents/skills/hermes-curator/scripts/audit_skills.py` | **verified** | Patched `load_ptss_index` to ignore comment lines and output actionable stderr warnings rather than silently swallowing decode errors. | **repaired** | 26 active, 2 stale, 0 decode errors. |
| **REQ-GOV-01** | `.github/hooks/` (Scripts & State) | **verified** | 28 tracked governance files verified active by `validate:agentic` (60/60 checks) and `validate:governance` (DAG, prefetch, decision coherence). | **reconciled** | Ruled out intended removal: IHSA runtime explicitly consumes these scripts during validation. |
| **REQ-SAFE-01** | `scripts/verify_workspace_evidence.py` | **verified** | Automated prevention check verifying JSON/JSONL, link validity, retired components, test commands, and quarantine expiry. | **keep** | Executable safeguard against recurring evidence drift. |

### B. Workspace Organization & Evidence Maintenance
| Requirement ID | File Path | Current Status | Supporting Evidence / Audit Findings | Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ORG-01** | `docs/classification-manifest.json` | **verified** | Machine-readable classification manifest indexing all core artifacts across categories, statuses, governing requirements, and retirement reasons. Verified by `verify_workspace_evidence.py`. | **keep** | Authoritative machine-readable classification registry. |
| **REQ-ORG-02** | `.agents/skills/workspace-evidence-maintenance/SKILL.md` | **verified** | Codified systematic workspace organization, evidence maintenance, 6-tier authority rules, quarantine governance, and operational checklist. Referenced in `AGENTS.md` and `docs/AUTHORITATIVE_INDEX.md`. | **keep** | Reusable agent procedure. |
| **REQ-ORG-03** | `scripts/generate_test_cases.py` | **verified** | Migrated from `docs/generate_test_cases.py` to `scripts/` adhering to AGENTS.md layout whitelist. Successfully generates `docs/CMS_V2_Test_Cases.xlsx` (170 test cases). | **moved** | Relocated script to `scripts/` and updated output path resolution. |
| **REQ-ORG-04** | `scripts/verify_workspace_evidence.py` | **verified** | Enhanced with classification manifest schema check, replacement resolution, active test command isolation from archives, and negative testing sandbox (`scratch/test_validator_negative_fixtures.py`: 4/4 scenarios caught). | **keep** | Automated prevention gate running under `npm run check:evidence`. |

---

## 5. Unresolved Dependencies & Improvement Backlog

1. **Plagiarism Microservice End-to-End Live Benchmark**:
   - `scripts/iso_plagiarism_benchmark.js` requires the Python FastAPI container running with PyTorch `BAAI/bge-m3` weights. In offline/CI environments, the benchmark is skipped, while unit tests with mock fallbacks verify software control flow.
   - **Recommendation**: Deploy a dedicated benchmark runner in GPU-enabled staging environments to generate continuous statistical detection quality telemetry.
2. **Legacy Phase Numbering Invariants**:
   - The platform cleanly supports both 4-phase institutional terminology (Capstones 1, 2, 3, 4) and 3-semester academic mappings (`capstone_1`, `capstone_2`, `capstone_3` / `final`).
   - **Recommendation**: Complete gradual phase string unification across legacy seeder files in future planned migrations.
