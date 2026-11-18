# Objective 4 Isolated Multi-Container Verification Report (18 November 2026)

Supporting technical verification evidence (authority level 5). All results reported here were directly observed against the isolated CMS-V2 Docker stack (`-p cms_obj4_iso`, `scratch/docker-compose.obj4-iso.yml`) and post-edit server unit runs, while keeping default development volumes (`cms-v2_*`) and `server/modules/plagiarism/plagiarismClearance.js` untouched.

> [!NOTE]
> **Methodological & Non-Certification Disclosure:** These measurements verify software functionality, workflow enforcement, authenticated microservice recovery, and runtime hybrid plagiarism behavior inside an isolated containerized deployment (`EMBEDDING_MODEL=all-MiniLM-L6-v2`, 384-dim CPU runtime). They do not constitute independent third-party ISO/IEC 25010 or ISO/IEC/IEEE 29119-3 certification, do not replace benchmark evaluation on 1024-dim `BAAI/bge-m3` hardware, and rely on bounded synthetic/PAN corpora.

---

## 1. Environment Configuration (`cms_obj4_iso`)

| Component | Isolated Endpoint / Version | Configuration Summary |
| :--- | :--- | :--- |
| MongoDB | `127.0.0.1:27028` (`mongo:7`) | Ephemeral database `cms_v2_iso` seeded via `server/seeders/index.js` and `seed-canonical-role-accounts.js` |
| Redis | `127.0.0.1:6389` (`redis:7-alpine`) | BullMQ queue broker and Socket.IO adapter |
| SMTP Sink | `127.0.0.1:11080` | Local ESMTP capture server for real OTP/notification email inspection |
| OCR Engine | `127.0.0.1:8010` (`cms-v2-cms-ocr-engine`) | Document ingestion service |
| Plagiarism API | `127.0.0.1:8011` (`cms-v2-plagiarism_api`) | Protected by `PLAGIARISM_ENGINE_API_TOKEN`, `EMBEDDING_MODEL=all-MiniLM-L6-v2` (384-dim CPU), `k = 50, w = 100, semantic_threshold = 0.45` |
| Express Server | `127.0.0.1:43220` | Node/Express 5 API + BullMQ workers (`plagiarism`, `email`, `document-extraction`) |
| Vite Client | `127.0.0.1:43221` | React 18 SPA audited via headless Chromium (`1440x900`) |

---

## 2. 24-Case Live Acceptance Matrix (`TC-1.1` through `TC-5.4`)

Executed via `scratch/run_obj4_acceptance_24.mjs` (raw output: `scratch/obj4_acceptance_24_results.json`, recorded `2026-11-18T00:36:50.359Z`): **24 / 24 passed (`100.00%`)**, zero skipped assertions, plus Playwright UI screenshots (`tc22_viewer_ooxml.png`, `tc22_viewer_diff.png`, `tc53_scheduling_center.png`) visually inspected with zero console/page errors.

| Role Group | Cases Executed | Key Verified Behaviors |
| :--- | :--- | :--- |
| **Student (`TC-1.1`–`TC-1.8`)** | 8 / 8 PASS | Domain-restricted registration + SMTP OTP; invalid OTP error code `OTP_INVALID`; 4-member roster cap (`TEAM_FULL`) + lock; 0.96 title similarity screening; sequential chapter gate + >25 MB upload rejection (413); late justification & signed-letter enforcement; `409 CONCURRENT_REVIEW_CONFLICT` + atomic `[v2, v3]` parallel uploads; QR certificate verification & `409 PROJECT_ARCHIVED` lock |
| **Faculty Adviser (`TC-2.1`–`TC-2.5`)** | 5 / 5 PASS | Unassigned Team B denial (403); `SophisticatedDocumentViewer` live OOXML preview & Word/Sentence/Line diff + annotations (201); ChromaDB full hybrid plagiarism block at 61% (`S_comp = 0.6082`) and clean clearance at 0%; Socket.IO `notification:new` unlock audit; Gantt plan, weekly check-ins, GitHub/prototype clearance |
| **Faculty Panelist (`TC-3.1`–`TC-3.4`)** | 4 / 4 PASS | Panelist report read + adviser-only review boundary (403); rubric incomplete/over-max validation (400); locked score denial + Instructor unlock (`draft`) + re-submit; Phase 4 Tier 2/3 ADM signature lock prior to Secretary endorsement (403) and post-endorsement completion |
| **Faculty Secretary (`TC-4.1`–`TC-4.3`)** | 3 / 3 PASS | Secretary-only minutes entry write/publish denial (403) + verdict locking; proposal minutes publish to ADM (`publishedRows = 1`); pre-endorsement archive rejection (`400 SECRETARY_ENDORSEMENT_REQUIRED`) and valid endorsement (`200`) |
| **Course Instructor (`TC-5.1`–`TC-5.4`)** | 4 / 4 PASS | Account create/update/deactivate + immediate `401` session revocation; committee COI rejections (`instructor`, duplicate panelist, role conflict) + alternate proposal title approval; threshold updates (`15% / 25%`) + live Scheduling Center UI + consolidated grades; auto-archive (`ALREADY_ARCHIVED`), `114.25 ms` report response (`<10,000 ms` SLA), archive search hit |

---

## 3. Authenticated Hybrid Plagiarism Benchmark

Raw outputs: `scratch/obj4_hybrid_benchmark_results.json` and `scratch/iso_eval_reports/metrics.json` (recorded `2026-11-17T22:41:46Z`).

* **Authentication & Tamper-Resistance Negative Controls:** `4 / 4` unauthenticated or wrong-token calls to `POST /index/sync` and `POST /check-sync` returned `HTTP 401 {"detail":"Unauthorized"}`. `run_detection.py --require-hybrid-api` rejected `3 / 3` invalid inputs (`non_empty_results_dir` exit `2`; `wrong_document_id` exit `1`; `invalid_score_string` exit `1`).
* **PAN Span Evaluation Corpus (`n = 10` documents at threshold `0.25`):**
  * Lexical-only: `Precision = 1.0000`, `Recall = 0.0000`, `F1 = 0.0000`, `Granularity = 1.0000`, `PlagDet = 0.0000` (`tp_chars = 0, fp_chars = 0, fn_chars = 5,265`).
  * Semantic (`all-MiniLM-L6-v2`) & Hybrid (`S_hybrid`): `Precision = 1.0000`, `Recall = 0.5951`, `F1 = 0.7153`, `Granularity = 1.0000`, `PlagDet = 0.7153` (`tp_chars = 3,188, fp_chars = 0, fn_chars = 2,077`).
* **Controlled 48-Case Direct-API Corpus (`8` indexed sources, threshold `0.25`):**
  * Confusion matrix: `TP = 32, FP = 8, TN = 8, FN = 0` (`Precision = 80.00%`, `Recall = 100.00%`, `Specificity = 50.00%`, `F1 = 88.89%`, `Accuracy = 83.33%`).
  * Category breakdown (vs 27 October Node lexical-only baseline):
    * `verbatim` (`n = 8`): `8/8 TP`, `mean S_hybrid = 85.08%`, `Dense = 100.00%`, `Sparse = 100.00%`, `Winnowing = 70.16%` (Oct 27 lexical: `98.39%`).
    * `partial_reuse` (`n = 8`): `8/8 TP`, `mean S_hybrid = 48.05%`, `Dense = 77.22%`, `Sparse = 85.51%`, `Winnowing = 15.55%` (Oct 27 lexical: `56.74%`).
    * `sentence_reordering` (`n = 8`): `8/8 TP`, `mean S_hybrid = 65.08%`, `Dense = 97.19%`, `Sparse = 100.00%`, `Winnowing = 31.84%` (Oct 27 lexical: `84.11%`).
    * `manual_paraphrase` (`n = 8`): `8/8 TP` (`100.00%` recall), `mean S_hybrid = 40.24%`, `Dense = 84.27%`, `Sparse = 74.77%`, `Winnowing = 0.00%` (improved from `0/8 TP`, `0.00%` in the Oct 27 lexical baseline).
    * `independent_control` (`n = 8`): `8/8 TN` (`100.00%` specificity), `mean S_hybrid = 0.00%`.
    * `quoted_control` (`n = 8`): `8/8 FP` (`mean S_hybrid = 63.18%`) when invoking raw Python `POST /check-sync` directly because FastAPI does not run Node `server/services/plagiarism.service.js` `applyExclusions` quote-stripping (which produced `8/8 TN` at `0.00%` in the Oct 27 Node experiment).
  * HTTP round-trip latency (`48` calls): `min = 44.54 ms`, `median = 121.35 ms`, `mean = 120.40 ms`, `max = 200.76 ms` (engine processing `min = 40.86 ms`, `median = 115.95 ms`, `mean = 115.05 ms`, `max = 192.51 ms`).

---

## 4. Three-Cycle Live Outage/Recovery & Sustained Concurrent Burst

Executed via `scratch/run_obj4_recovery.mjs --phase batch1` and `--phase batch2` (`scratch/obj4_recovery_results.json`, completed `2026-11-18T00:45:23.306Z`):

* **Healthy Baseline:** `scanCoverage = "full"`, `semanticStatus = "completed"`, `composite_score = 0.3186`.
* **Cycles 1, 2, and 3 (`docker compose stop plagiarism_api` -> queued rescan -> start container + 31s circuit-breaker reset -> recovered rescan):**
  * During all 3 real container outages, fallback completed safely with `scanCoverage = "degraded"`, `semanticStatus = "failed"`, `scanType = "syntactic_fallback"`, and Adviser clearance was deterministically blocked with `HTTP 400 PLAGIARISM_SCAN_DEGRADED`.
  * After all 3 container restarts (`GET /health` `status = "ok"`, `model_name = "all-MiniLM-L6-v2"`), re-queued scans returned `scanCoverage = "full"`, `semanticStatus = "completed"`, `scanType = "hybrid_source_tracker"`, deterministic `composite_score = 0.3186`, and Adviser approval succeeded (`HTTP 200`).
* **Sustained Burst:** `24 / 24` concurrent protected `POST /check-sync` requests succeeded (`HTTP 200`, total wall time `16,064.13 ms`, latency `min = 13,909.56 ms`, `median = 14,995.42 ms`, `p95 = 16,031.73 ms`, `max = 16,042.60 ms`), followed by `6 / 6` consecutive BullMQ re-scans via Express completing at `scanCoverage = "full"` (`overallScore = 32`, `547.06 ms`–`1,037.32 ms`).

---

## 5. Production Defects Discovered and Resolved During Live Testing

1. `server/modules/submissions/submission.validation.js`: Retained `expectedUpdatedAt` in `reviewSubmissionSchema` so Zod validation does not silently strip optimistic-concurrency tokens.
2. `server/jobs/plagiarism.job.js` & `server/modules/plagiarism/plagiarism.controller.js`: Wired authenticated ChromaDB vector indexing/removal into corpus sync flows and preserved positive Mongo lexical fallback scores when vector candidates are zero.
3. `plagiarism_engine/plagiarism_engine/database.py` & `hst_pipeline.py`: Added `exclude_project_id` filtering so compiled manuscripts and final papers do not self-match prior chapters of the same team in ChromaDB.
4. `server/services/plagiarism.service.js`, `fingerprintIndex.service.js`, & `server/jobs/plagiarism.job.js`: Excluded same-project records and `revisions_required`/`rejected` drafts from corpus indexing/comparison so rejected plagiarized submissions cannot boomerang.
5. `server/modules/notifications/notification.model.js`: Added eight active workflow event types missing from `NOTIFICATION_TYPES` (including `evaluation_unlocked`, `committee_appointed`, `adm_endorsed`).
6. `server/modules/submissions/defenseMinutes.service.js`: Added explicit literal keys `midterm: 'CAPSTONE_2'` and `paper: 'CAPSTONE_3'` in `publishToADM` and scoped secretary endorsement reset by milestone.
7. `server/modules/projects/services/projectTitle.service.js`: Normalized `similarityPercentage` before calling `assertPlagiarismScanCanClear` during auto-archival (leaving `plagiarismClearance.js` untouched).
8. `server/jobs/queue.js`: Cleared terminal (`completed`/`failed`) BullMQ jobs matching `plag-${submissionId}` inside `enqueuePlagiarismJob` so manual Archive Re-scan requests execute reliably instead of being deduplicated against stale history.

---

## 6. Post-Edit Verification Runs

* **Focused Server Plagiarism & Clearance Suites (Batch A):** `6 / 6` test files passed, **`53 / 53` tests passed** (`submission.service.plagiarism.test.js` 19, `plagiarism-clearance.test.js` 8, `submission.review-flow.test.js` 6, `plagiarism.coverage.test.js` 11, `plagiarism.exclusions.test.js` 5, `plagiarism.resilience.test.js` 4).
* **Focused Server Workflow & Utility Suites (Batch B):** `9 / 9` test files passed, **`41 / 41` tests passed** (`institutionalWorkflow.reliability.test.js` 10, `defenseMinutes.test.js` 5, `projectArchiveCertificateIndex.test.js` 5, `projectTitleFinalApprovalGate.test.js` 3, `submission.revision-diff.test.js` 2, `team.lock-formation-gate.test.js` 5, `titleSimilarity.util.test.js` 4, `plagiarism.worker-short-text.test.js` 4, `plagiarism.denoising.test.js` 3). Combined across the 15 focused server files: **`94 / 94` tests passed**.
* **Client-Server Endpoint Parity:** `SERVER_ENDPOINT_COUNT=229`, `CLIENT_ENDPOINT_COUNT=209`, `UNMATCHED_COUNT=0`.
