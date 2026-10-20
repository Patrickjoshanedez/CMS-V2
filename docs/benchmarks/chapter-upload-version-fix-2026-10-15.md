# Chapter upload version correction — 15 October 2026

Status: targeted correction verified by unit tests and real HTTP contention trials; stored-file readback and full workflow closure remain incomplete.

## Change

Chapter uploads previously computed the next version from a latest-record read. Concurrent callers could select the same version and fail the unique `(projectId, chapter, version)` index. The correction uses a MongoDB counter scoped to project and chapter, reconciles legacy version/revision floors, then atomically increments both numbers. The unique submission index remains in place. Reservations are monotonic and never reused; failed uploads can leave gaps. Mixed old/new application deployments are not covered: all upload writers must use the corrected allocator.

Uncommitted manuscript and justification objects are tracked for best-effort deletion on upload failure. Cleanup errors are logged without masking the original error. Once the submission record is created, ownership transfers to the persisted record; subsequent notification or queue errors cannot delete its files. This is compensation, not a transaction spanning MongoDB and storage. Downstream errors after commit can still produce an error response for a persisted submission; request idempotency remains separate work.

## Measured results

The same isolated topology and finite same-account/project/chapter workload described in [the baseline](isolated-upload-2026-10-15.md) was used. Each corrected trial included a successful preflight followed by 50 concurrent real multipart DOCX requests. The second trial alternated requests between two application processes in the same container and database; both shared the 2-CPU/1-GiB application limit. No extraction, plagiarism, or email workers ran. This verifies HTTP acceptance under contention, not completed downstream processing or general production capacity.

| Trial | Accepted burst requests | Version conflicts | Mean request ms | Median ms | p95 ms | p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Before correction, one process | 15/50 | 35 | 5122.9 | 5215.4 | 7701.5 | 7766.9 |
| Corrected, one process | 50/50 | 0 | 9675.5 | 10314.4 | 12279.6 | 12317.1 |
| Corrected, two processes | 50/50 | 0 | 14429.4 | 14814.8 | 16621.6 | 16647.4 |

The corrected trials returned 102 distinct submission IDs and unique response versions 1–102, including two preflights. These are response receipts, not a completed independent database/storage readback. Latency includes response-body reading; percentiles use linear interpolation. Each topology has one measured burst, without confidence intervals or sustained-load evidence. Acceptance improved while measured latency increased; no speedup is claimed.

The corrected fixture was a 1,163-byte, valid three-part OOXML file with SHA-256 `26ff38fbdf5533cff2b6082de9b62b4faf7dbf0c998c51b9bcc1a0279ddd4336`. Its small size limits transfer-capacity interpretation.

## Verification limits and remaining work

The first readback was interrupted because cleanup started before verification completed. It supplies no corrected-run file-integrity result. A fresh repeat fixture then timed out twice during application-service imports at the 110-second startup watchdog, including after competing host check processes were stopped. Logs localize the stall to imports but do not establish its root cause. No further retry or false pass was recorded. All owned disposable containers and the internal network were removed; live data volumes were not used.

Ten allocator unit tests and five cleanup unit tests passed. They use model/storage doubles and do not prove real storage fault recovery. Targeted ESLint passed. Endpoint parity passed with 222 server endpoints, 202 client endpoints, and zero unmatched endpoints. The agentic audit passed 60/60. The combined governance command could not launch Python; rerunning prefetch, synchronization, and decision coherence explicitly with the bundled Python runtime passed all three steps (11 agents, 8 edges, zero coherence errors/warnings). Workspace guardrail and all 34 evidence checks passed. Earlier comprehensive-workflow startup failures remain unresolved; full workflow/client suites were not newly certified. No client UI was changed.

Before release, resolve startup stalls, repeat corrected-run database/object/hash verification with cleanup gated on a completed result, exercise real storage failures, run the remaining workflow gates, and evaluate distinct-account/project and sustained realistic-manuscript workloads. Separately, late justification upload errors are still swallowed by existing behavior and can leave a late submission without a persisted letter; this requires its own correction.

## Evidence and reproduction

- Corrected receipts, logs, combined manifest, and explicit interrupted-verification record: `scratch/qa-evidence/2026-10-15-isolated-upload-fixed/`.
- Repeat startup diagnostics: `scratch/qa-evidence/2026-10-15-isolated-upload-verified/startup.log`.
- Unit results: `scratch/qa-evidence/2026-10-15-review-validation/chapter-version-unit-results.json` and `chapter-cleanup-vitest.json`.
- Implementation: `server/modules/submissions/chapterVersion.service.js`, `submissionVersion.model.js`, and `submission.service.js`.
- Regression tests: `server/tests/unit/chapterVersion.test.js` and `chapterUploadCleanup.test.js`.
- Harness: `scripts/benchmarks/isolated_upload_environment.ps1` supports a guarded evidence directory; `run_isolated_upload_clients.mjs` accepts isolated endpoint URLs; `isolated_upload_worker.mjs` starts a second application process without fixture creation or queue workers.

Raw scratch evidence is disposable; this report preserves the measured results and their limits. Preserve the failed baseline rather than replacing it with corrected results.
