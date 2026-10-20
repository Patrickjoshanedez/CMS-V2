# Chapter 4 follow-up validation — 15 October 2026

Status: partial execution; no claim of complete workflow validation or submission capacity.

Subsequent isolated upload experiment: [isolated upload results](isolated-upload-2026-10-15.md). A real-file preflight passed, then 15 of 50 concurrent same-project uploads were accepted and 35 returned HTTP 409 version conflicts. All 16 accepted files including preflight matched the fixture; this does not resolve independent-manuscript or full-workflow validation.

This follow-up is separate from the October 14 benchmark snapshot. Earlier results remain historical evidence and are not overwritten by this run. All outcomes below refer to the observed development environment.

## Live concurrency experiment

The replacement workload used k6 with 50 virtual clients, one authenticated benchmark account, and two read-only title-screening requests per client. Each request called `POST /api/projects/title-check` with valid JSON; success required HTTP 200, `success: true`, and a data object. Login was outside the workload latency metric. The request timeout was 30 seconds. No chapters were uploaded and no project records were changed by this workload. This is a finite burst, not a sustained 50-user acceptance or capacity test.

| Run | Requested/completed iterations | Successful responses | Timeouts | Mean request duration | Median | p95 | p99 | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 100/100 | 93 | 7 | 11,447.3 ms | 5,924.0 ms | 29,890.7 ms | 29,921.0 ms | Failed strict success thresholds |
| 2 | 100/100 | 89 | 11 | 12,773.0 ms | 6,536.9 ms | 29,968.8 ms | 29,997.0 ms | Failed strict success thresholds |

These latency summaries include timeout observations; they are not successful-response-only latency. Both runs exited k6 with code 99 (failed thresholds). Raw metrics and summaries are retained under `scratch/qa-evidence/2026-10-15-review-validation/concurrent-title-*`. Run 1 coincided with local service/test-worker startup. Run 2 followed completion of the workflow workers and preceded independent-manuscript inference. Container resource sampling showed substantial CPU activity across services, including MongoDB. Startup and background load are possible confounders; the experiment does not isolate a specific bottleneck. No third identical 50-client run was attempted after the repeated timeout outcome. A stable-environment diagnosis is required before rerunning.

## Submission-workload preflight

The historical account authenticated successfully, but its project `6ace911a729374e9daf2b21f` has a submitted (not approved) title, no panelists, and a one-member team. It is not a dedicated load-test project. No chapter uploads were attempted against it.

`scripts/benchmarks/k6_valid_submissions.js` provides a separate bounded, real-DOCX upload workload. It requires explicit credentials, file path, and a dedicated project whose title starts with `Benchmark` or `Load Test`. Authentication and project prerequisites fail closed. Validation errors, rate-limit responses, malformed responses, and server errors are failures rather than accepted submissions. Until a valid test target is supplied or created through approved application workflows, submission throughput remains unmeasured.

## Workflow rerun attempts and coverage

Existing comprehensive-workflow and RBAC suites were inspected before execution. They use an isolated in-memory test database and mocked object-storage functions. Several comprehensive cases write fixture model records rather than execute user-facing API workflows; predefined plagiarism scores and archival metadata do not validate engine accuracy or real archival.

The first host attempt failed before test collection with a Vitest cache `EPERM`. A redirected-cache attempt, an elevated host diagnostic run, and a Linux-container run reached the 110-second watchdog without completed scenarios. The workers stalled during startup/import before an observable MongoDB process. The precise slow import remains unidentified. Test workers were terminated without stopping the running application server. Zero completed scenarios means no new workflow pass rate or resolution of the earlier 13 failures can be reported.

Detailed classification and logs: `scratch/qa-evidence/2026-10-15-review-validation/workflow-rerun-report.md`. The next action is startup/import diagnosis, followed by isolated reruns and genuinely executed API acceptance scenarios; assertions must not be weakened to obtain passes.

## Independent manuscript evaluation

Three externally sourced, CC-BY PLOS manuscripts were obtained separately from the five fixed passages used in the prior constructed corpus. Their full texts, attribution, source URLs, and content hashes are retained by the independent-manuscript runner. An isolated second plagiarism-service instance uses a separate collection and temporary persistence directory; the live `cms_documents` archive is not a test ingestion target.

The isolated service was verified empty before ingestion. Its first valid official `/index/sync` request, using a bounded 5,000-character source excerpt, exceeded the 60-second request deadline. No successful detection responses or controlled-copy metrics were obtained. The isolated service process was terminated and no further inference retries were attempted. The three licensed manuscripts and guarded runner are prepared, but independent detection validation remains incomplete. A first request also revealed runtime/workspace schema drift: the running container requires an explicit `document_id`, which the benchmark payload was corrected to provide before the timed-out ingestion attempt.

The prepared experiment tests attributable excerpts from independently sourced publications and does not supply adjudicated authentic-plagiarism labels. Any future results must be reported as a small independent-source controlled-copy experiment, rather than institutional manuscript accuracy. Unmodified public documents are not automatically assumed plagiarism-free. Precision, specificity, and general accuracy cannot be manufactured when suitable negative controls and independently adjudicated labels are absent.

## Required completion evidence

1. Identify and resolve test startup/import stalls; rerun with scenario-level logs and classify mocked/model-only coverage separately.
2. Supply an approved, locked, dedicated submission test project, then run valid DOCX uploads and verify stored submissions, version integrity, and downstream completion.
3. Complete the isolated independent-source probe; subsequently acquire a larger source-disjoint, independently annotated corpus for general detection and localization claims.
4. Diagnose resource pressure and repeat the bounded concurrency experiment with warm-up, resource limits, request counts, and background workload recorded.
