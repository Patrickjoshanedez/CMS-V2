# Manuscript technical evidence ledger — 18 November 2026

Supporting evidence interpretation, authority level 5. This ledger maps retained execution artifacts to bounded manuscript claims; it is not a certificate or a fresh test run.

| Claim | Retained source | Verification and boundary |
| --- | --- | --- |
| 32 selected component cases passed on 27 October | [Dated evidence JSON](chapter-four-revision-evidence-2026-10-27.json); `scratch/chapter-four-revision-tests-a.json` and `scratch/chapter-four-revision-tests-b.json` | Both raw reports contain 16 passed and zero failed cases. Seven test files match retained source hashes. Isolated fixtures do not prove full live-service behavior. |
| Controlled lexical screening: TP24, FP0, TN16, FN8 | Same evidence JSON, `lexicalExperiment.lexical.reports` | Recomputed directly from 48 per-case positive/predicted fields: precision100%, recall75%, F1 85.71%, accuracy83.33%, specificity100%. Eight cases in each of six conditions; all eight manual paraphrases missed. Metadata categoryCount=8 is erroneous; actual six categories govern. |
| Lexical timing: 7.03, 14.56 and 82.17 ms means | Same JSON, latency records | 250/1,000/5,000 words; 30 measured repetitions and five warm-ups per size. In-memory Node scorer, k7/window4, fixed25% threshold; Ryzen7 5700U, about15.34GiB RAM, Windows, Node24.19.0. Excludes OCR/extraction, neural inference, network, DB, queues and browser. |
| Title screening: 24 synthetic pairs, no errors | Same JSON, title record | Threshold0.65, TP16/TN8/FP0/FN0. Small synthetic author-labeled test; not institutional population accuracy. |
| Historical regression: 1,029 client and 13 server workflow tests passed | `scratch/qa-evidence/shadcn-final-test-gates/verified-current-suites.json`; [verification narrative](../specs/shadcn-ui-implementation-verification.md) | Dated25 October; client174 files/16 shards, no failed/pending cases. Server raw report also checked:13 passed/zero failed. Historical source fingerprints, not a new current-build run. Counts remain separate from component and acceptance cases. |
| Verified survey:77 complete respondents | User-supplied response workbook and statistician-verified Result-Stat.docx | 71 Student/5 Faculty/1 Instructor; composite4.53(.30) usability and4.48(.34) satisfaction. Survey perceptions do not establish technical reliability. |

Fourteen of fifteen source hashes in the27 October evidence artifact match inspected workspace files; only `plagiarism_engine/app/services/embeddings.py` differs. The measured Node scorer, title utility, shared thresholds and all seven test files match. This strengthens lexical provenance but does not validate the changed embedding service or full hybrid pipeline.

Older October14 MiniLM benchmarks and the historical evaluation/report.md use different models/configurations and were not transferred to current BGE-M3 claims. A completion-certificate template is not an ISO technical certificate. Searches in bounded research/template/evidence locations did not establish signed interview/consent/permission records, selection logs or invitation denominators; absence from those inspected locations is not proof that no external record exists.

The manuscript now reports completed scoped testing while retaining the24-case acceptance and full hybrid/operational verification protocol. No independent certification, full acceptance execution, manual-process improvement or sustained production reliability is inferred.
