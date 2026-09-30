# Architectural Specification: Sample Capstone Archival, OCR Accuracy Refactoring & Plagiarism Engine Verification

**Date:** 2026-09-30  
**Status:** Approved for Execution  
**Goal:** Automate ingestion and archival of 45 sample capstone papers, sort them into BSIT and BSEMC courses, refactor the OCR/PDF metadata extraction engine via an automated feedback loop to achieve 100% accuracy, index vector embeddings in ChromaDB, and rigorously test plagiarism detection and archive filtering.

---

## 1. System Overview & Architecture

### 1.1 Academic Scope & Course Demarcation
BukSU College of Technologies houses two primary computing degree programs:
- **BSIT (Bachelor of Science in Information Technology):** IoT sensors, embedded systems, network infrastructure, disaster response platforms, automation, cloud/web architectures, and intelligent systems.
- **BSEMC (Bachelor of Science in Entertainment and Multimedia Computing):** Game engineering, custom game engines, real-time 3D graphics rendering, computer animation, digital arts, and gamification frameworks.

### 1.2 Monorepo Architecture Integration
- **Server:** Node.js Express backend with MongoDB (Mongoose), MinIO S3 document storage, and BullMQ queues.
- **Plagiarism Engine:** FastAPI microservice (`cms-plagiarism-api:8001`) with Celery worker, ChromaDB vector database (`cms_documents_v2` collection), and PyTorch Sentence-Transformers (`BAAI/bge-m3` 1024-dim dense + sparse embeddings).
- **OCR Ingestion Engine:** `server/utils/pdfMetadataExtractor.js` with fallback pipeline integrating PaddleOCR-VL and `pdf-parse`/`mammoth`.
- **Archive Search:** `server/modules/projects/project.service.js:searchArchive` with program (`BSIT`/`BSEMC`), author, date, and keyword facet filtering.

---

## 2. Component Design & Deliverables

### Deliverable 1: Dataset Sorting & Ground-Truth Manifest
- Establish `Sample papers/ground_truth_manifest.json` containing the canonical metadata for all 45 papers:
  - `filename`: Source file path
  - `courseCode`: `BSIT` or `BSEMC`
  - `canonicalTitle`: Exact verified manuscript title
  - `canonicalAuthors`: Array of author names
  - `canonicalYear`: Publication year
  - `canonicalAbstract`: Abstract text summary
  - `tags`: Key topical keywords and discipline tags
- Convert `COMPETENCY_BASED_CURRICULUM_INFORMATION.doc` to `.docx` to ensure modern parser compatibility.

### Deliverable 2: Database Course Seeding
- Seed `BSEMC` in MongoDB `courses` collection if not already present:
  - `name`: "Bachelor of Science in Entertainment and Multimedia Computing"
  - `code`: "BSEMC"
  - `isActive`: true
- Retrieve `BSIT` and `BSEMC` course ObjectIds to bind archived projects.

### Deliverable 3: OCR / Metadata Extractor Refactoring & Feedback Loop
- Enhance `server/utils/pdfMetadataExtractor.js`:
  - Add noise suppression rules to remove conference headers, publisher watermarks (e.g. "WHO launches second global status report...", "UNESCO - EOLSS", "Computing Undergraduate Research Symposium", "PROCEEDINGS OF...", "ISSN", etc.).
  - Improve title boundary detection when multi-line titles appear before author affiliations or abstracts.
  - Fix abstract extraction when "Abstract" or "Summary" is lowercase or stylized.
  - Implement an automated test runner `scratch/eval_ocr_accuracy.mjs` that benchmarks extraction accuracy against `ground_truth_manifest.json` until 100% (45/45) accuracy is achieved.

### Deliverable 4: Archival & Ingestion Automation
- Update `bulkUploadSchema` in `server/modules/projects/project.validation.js` and `server/modules/projects/project.service.js:bulkUploadArchive` to accept `courseId` so projects are properly associated with `BSIT` or `BSEMC` rather than generating orphan ObjectIds.
- Execute batch archival:
  - Upload PDF/DOCX buffers to MinIO S3 (`final_academic` storage keys).
  - Create approved `Submission` records with extracted full text.
  - Create `Project` records with `status: 'archived'`, `isArchived: true`, title, abstract, authors, keywords, and associated `courseId`.

### Deliverable 5: Plagiarism Vector Indexing & Cross-Similarity Audit
- Index all 45 papers into ChromaDB collection `cms_documents_v2` via `cms-plagiarism-api`.
- Run an exhaustive cross-corpus similarity audit:
  - Test near-duplicate pairs (e.g. IoT accident detection variants) to verify similarity scores above warning thresholds.
  - Test cross-domain pairs (e.g. 3D Game Rendering vs Agricultural IoT) to verify low baseline similarity (<15%).
  - Ensure zero runtime errors, zero NaN scores, and 100% indexing success.

### Deliverable 6: Archive Search, Filtering & Tag Verification
- Query `GET /api/projects/archive`:
  - `program=BSIT` returns only BSIT projects.
  - `program=BSEMC` returns only BSEMC projects.
  - Tag/keyword search returns matching papers.
  - Verify total archived count equals 45.

---

## 3. Testing & Deterministic Quality Gates
1. `npm test --workspace=server -- tests/unit/pdfMetadataExtractor.test.js` (or targeted test)
2. `scratch/eval_ocr_accuracy.mjs`: Assert 45/45 (100%) accurate extractions.
3. `scratch/eval_plagiarism_matrix.py`: Assert ChromaDB count == 45 and similarity scores are non-zero and mathematically bounded [0, 1].
4. `npm run check:endpoints`: Assert UNMATCHED_COUNT == 0.
5. `npm run validate:agentic`: Assert 60/60 checks pass.
