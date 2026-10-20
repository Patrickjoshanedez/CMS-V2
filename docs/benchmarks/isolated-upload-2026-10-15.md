# Isolated concurrent chapter-upload test — 15 October 2026

**Outcome: valid experiment; failed concurrent-upload acceptance criterion.**

## Scope and isolation

The user selected an isolated test environment. Disposable MongoDB, Redis, MinIO, application, and client containers used the private `cms-review-upload-net` network. No live database/storage volumes were attached. Application source and existing dependency volumes were mounted read-only. Test database and object storage used temporary memory-backed volumes; this tests persistence within the running environment, not disk durability or recovery after container removal. SMTP was restricted to loopback and the network had no external egress. No final ADM signatures were applied.

Official application services created an instructor, two students, five distinct faculty appointees, a locked team, and an approved project. These operations established test prerequisites; they are not evidence of full academic-workflow validation. The active roster-lock service authorizes the team leader, which differs from the supplied instructor-lock contract and requires separate review.

The actual Express application, HTTP authentication, multipart validation, MongoDB records, MinIO object storage, and Redis enqueueing were used. Plagiarism, extraction, and email workers were not started. Acceptance does not establish completion of those downstream jobs. The workload used one account and one project/chapter, deliberately exercising concurrent version allocation; it does not represent 50 distinct institutional users or independent team projects.

## Configuration and method

- Source baseline: Git `7dd3ef54b9bb7292d627cd1bf70a4ab0a2737f45` plus the existing working tree; application implementation was not changed for this test.
- Runtime: Node `v20.20.2`, application image `sha256:ca53aee633d959b7684539fdba0c941a5cd67850c0c9035eb3b1056c33cee180`.
- Application limit: 2 CPUs and 1 GiB memory. Client limit: 1 CPU and 256 MiB. MongoDB: 768 MiB; Redis: 192 MiB; MinIO: 512 MiB. Host resources remain shared with other local services.
- Fixture: valid three-part OOXML DOCX, 1,163 bytes, with deterministic non-academic test paragraphs. SHA256: `adcd8c784f6f080fc76dabfe27b4f08fc5bd5526c1f9ec463d946c9f920a0cd2`.
- A successful authenticated real-file preflight was required before the burst. It returned HTTP 201 in 992.6 ms.
- A separate Node client container dispatched 50 concurrent HTTP multipart uploads to `POST /api/submissions/:projectId/chapters`, with a 30-second per-request timeout. HTTP 200/201 plus a submission identity was required for acceptance. The burst was finite and was not a sustained capacity experiment.
- An initial host k6 preflight could not reach the private-network port and made no upload requests. It is retained as a setup failure, excluded from the measured burst. The actual workload ran entirely inside the private network using the versioned Node client script.

## Observed results

| Measure | Observed value |
| --- | --- |
| Burst requests completed | 50 of 50 |
| Accepted burst uploads | 15 (30%) |
| Rejected burst uploads | 35 (70%) |
| Rejection status and code | HTTP 409, `DUPLICATE_KEY` |
| Conflicting index fields | `projectId, chapter, version` |
| Mean burst request duration | 5,122.9 ms |
| Median duration | 5,215.4 ms |
| p95 duration | 7,701.5 ms |
| p99 duration | 7,766.9 ms |
| Maximum duration | 7,772.4 ms |
| Accepted records including preflight | 16 |
| Stored accepted objects verified | 16 of 16 |
| Accepted object hashes and byte sizes matching fixture | 16 of 16 |
| Accepted version sequence | 1 through 16, unique and contiguous |
| Missing or unexpected submission records relative to accepted receipts | 0 |

Latency includes both accepted and rejected responses and measures the client HTTP request through response-body reading. It excludes fixture setup, login, and downstream worker processing. Percentiles use linear interpolation over the 50 recorded request durations. This is one diagnostic burst, without statistical precision or general capacity claims.

## Diagnosis and limitations

The upload service reads the latest submission, calculates `nextVersion = latestSubmission.version + 1`, uploads the object, and then creates the record. A unique `(projectId, chapter, version)` index prevents duplicate persisted versions. Under the same-project burst, concurrent requests selected overlapping versions and 35 were rejected. The observed conflict code, index fields, and service ordering support a version-allocation race rather than a malformed fixture or missing approval.

The verification script retains the strict expectation of 51 accepted records (preflight plus 50 clients), so its overall outcome is failed even though all 16 accepted records and files passed integrity checks. Database record checks are distinct from expected workload acceptance. Storage-object orphan enumeration is unmeasured because the official storage service has no listing API. Since object upload precedes record creation, rejected record creation may leave objects without submission records; no exact orphan-object count is claimed.

The next remediation is an atomic or serialized per-project/chapter version-allocation strategy with appropriate bounded conflict handling and storage cleanup/compensation on unsuccessful record creation. It must be tested without removing the unique constraint or counting conflicts as successful uploads. Distinct-project and sustained workloads are separate follow-up experiments.

## Evidence and reproducibility

Raw artifacts: `scratch/qa-evidence/2026-10-15-isolated-upload/` contains `bootstrap.json`, `fixture.json`, `accepted-results.json`, `persistence-verification.json`, server/client logs, and the excluded host preflight records. The initial verifier output is also retained; its count diagnostics were clarified to distinguish expected requests from actually accepted records, while the overall all-uploads-required criterion remained unchanged.

Scripts: `isolated_upload_environment.ps1`, `isolated_upload_server.mjs`, `build_upload_fixture.mjs`, `run_isolated_upload_clients.mjs`, and `verify_isolated_uploads.mjs` under `scripts/benchmarks/`. Cleanup removes only exact container/network names carrying the benchmark ownership label. Reproduction requires fresh disposable resources; these findings must not be relabeled as a passing production-capacity result.
