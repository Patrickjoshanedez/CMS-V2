# Lesson Learned: Sample Paper OCR Metadata Verification Gate & Archival Corpus Indexing

**Date:** 2026-10-14  
**Category:** OCR Extraction, Batch Archival Ingestion, Vector Search & Governance  
**Keywords:** lesson, learned, prevention, runbook, checklist, evidence, passed  

---

## 1. Context & Objective
All 45 sample capstone papers in `Sample papers/` (42 PDFs, 3 DOCX files) required rigorous verification through the OCR metadata extraction pipeline (`pdfMetadataExtractor.js`, `extractText.js`, `mammoth`, and PaddleOCR-VL) to test metadata parsing accuracy prior to archival ingestion. The system mandates that no document enters the institutional archives without passing verified OCR parsing against canonical benchmarks.

---

## 2. Key Lessons Learned
1. **Pre-Archival OCR Testing Gate**:
   - Running OCR extraction during the batch ingestion loop and validating against canonical metadata ensures zero corrupted or mislabeled papers enter the archival database.
   - Enforcing a minimum 70% word overlap threshold on extracted titles guarantees high-fidelity metadata parsing while tolerating minor formatting variations.
2. **Plagiarism Engine API Contracts**:
   - `POST /index` takes an `IndexRequest` object containing `document_id`, `text`, and `metadata`, dispatching Celery tasks (`index_document_task`) for asynchronous embedding into ChromaDB via BGE-M3.
   - Explicitly verifying that the task worker module exports all required tasks (`celery_app`, `check_document_task`, `index_document_task`) in `plagiarism_engine/main.py` prevents missing-symbol runtime errors.
3. **Windows Libuv Process Exit Invariant**:
   - In Node.js 22+ on Windows, calling `process.exit(0)` while active Mongoose reconnect event listeners or timers are pending can cause `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`.
   - Calling `mongoose.connection.removeAllListeners()` and `await mongoose.connection.close()` with `process.exitCode = 0` allows the libuv event loop to drain cleanly without crashing.

---

## 3. Prevention Runbook & Checklist
- [x] **Preflight**: Verify test corpus and ground truth manifest integrity in `Sample papers/ground_truth_manifest.json`.
- [x] **OCR Benchmarking**: Run isolated accuracy evaluation (`scratch/last_ocr_eval.json`) before initiating any batch upload.
- [x] **Gate Enforcement**: Enforce mandatory title overlap check ($\ge 70\%$) directly in ingestion pipelines (`scripts/batch-archive-sample-papers.js`).
- [x] **Vector Synchronization**: Dispatch and index all approved final academic documents into ChromaDB (`scripts/index_all_sample_papers_chroma.js`).
- [x] **Search & Filter Verification**: Assert 100% test pass on program filters (BSIT, BSEMC), tags, full-text queries, authors, and year ranges (`scripts/verify_archive_search_filters.js`).
- [x] **Plagiarism Cross-Similarity Audit**: Assert verbatim detection, candidate cluster retrieval, and low false positive rate on disjoint topics (`scripts/audit_plagiarism_cross_similarity.js`).
- [x] **Governance Verification**: Run `check:endpoints`, `validate:agentic`, `verify_workspace_evidence.py`, and `workspace_guardrail.py`.

---

## 4. Verification Evidence Passed
- **OCR Accuracy Benchmark**: 45 / 45 papers passed (100% accuracy, `scratch/last_ocr_eval.json`).
- **Batch Archival Ingestion**: 45 / 45 papers verified and archived into MongoDB and MinIO (24 BSIT, 21 BSEMC).
- **ChromaDB Stored Count**: 725 paragraph segments embedded in collection `cms_documents`.
- **Archive Search & Filtering**: 7 / 7 tests passed (100% pass, `scripts/verify_archive_search_filters.js`).
- **Plagiarism Cross-Similarity Audit**: 3 / 3 tests passed (100% pass, `scripts/audit_plagiarism_cross_similarity.js`).
- **Route Parity**: `SERVER_ENDPOINT_COUNT=222`, `CLIENT_ENDPOINT_COUNT=202`, `UNMATCHED_COUNT=0`.
- **Agentic Governance**: 60 / 60 checks passed (`npm run validate:agentic`).
- **Workspace Evidence & Authority**: 34 / 34 checks passed (`scripts/verify_workspace_evidence.py`).
- **Workspace Guardrail**: Pristine workspace, zero cognitive clutter (`scripts/workspace_guardrail.py`).
