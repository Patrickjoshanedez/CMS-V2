---
name: archive-browser-batch-ingestion
description: End-to-end guide and Playwright runner for batch archiving academic capstone papers (PDF and DOCX) through the live CMS-V2 browser UI (/archive/upload/capstone), validating OCR metadata auto-fill, ChromaDB indexing, and fixing real upload/extraction failures along the way. Trigger whenever asked to "archive sample papers", "batch archive via browser", "upload 50 archive papers", "ingest papers through the UI", "bulk archive PDFs/DOCX in browser", "verify archive upload flow", or troubleshoot archive upload limits, OCR timeouts, or ChromaDB indexing failures during archival.
---

# Archive Browser Batch Ingestion (CMS-V2)

Archival ingestion in BukSU CMS-V2 can fail silently or timeout when driven against real-world 30–50 MB capstone manuscripts, mixed PDF/DOCX/legacy `.doc` corpora, historical publication years, or background ChromaDB vector indexing. Driving the actual `/archive/upload/capstone` React form with Playwright — instead of bypassing the UI with raw database inserts — exercises every production boundary (client validation, Multer field limits, BullMQ + PaddleOCR/PyMuPDF extraction, Radix Select menus, academic program/year gates, S3/filesystem persistence, and ChromaDB indexing) and surfaces bugs real users would hit.

---

## 1. Pre-Flight Checklist (Why Each Check Matters)

Before running a browser archival batch against `http://localhost:43211`:

1. **Verify Running Services**:
   Confirm `cms-server` (`http://localhost:43210/api/health`), `cms-client` (`http://localhost:43211`), `cms-ocr-engine` (`:8000`), and `cms-plagiarism-api` (`http://localhost:8001/health`) are healthy.
2. **Confirm File Size & MIME Separation**:
   - Normal student chapter submissions keep `MAX_UPLOAD_SIZE_MB = 25`.
   - Archived capstones can reach **40+ MB** (e.g., 3D rendering / graphics theses), so bulk archival routes (`/api/projects/archive/bulk` and `/api/documents/extract-pdf-metadata`) must use `MAX_ARCHIVE_UPLOAD_SIZE_MB = 50` and support both **PDF** and **DOCX** (OOXML), while gracefully rejecting legacy OLE2 `.doc` binaries in both client UI and backend validation.
3. **Confirm Multer Field Ceiling**:
   The React upload form sends up to 12+ multipart text fields (`title`, `abstract`, `keywords`, `authors`, `publicationYear`, `doi`, `publicationVenue`, `courseId`, `academicYear`, `metadataTarget`, `plagiarismTarget`, `originalityScore`). Ensure `archiveDualUpload` allows at least `fields: 50` so valid browser submissions never hit `MulterError: Too many fields` (`400`).
4. **Confirm Academic Program Hierarchy**:
   Check `/api/academics/courses` for every `courseCode` present in the manifest (e.g., `BSIT`, `BSEMC`). Create missing programs via `/users` -> Academic Hierarchy (or authenticated `POST /api/academics/courses`) before uploading so the `#courseId` `<Select>` can match them cleanly.
5. **Account for Upload Rate Limits**:
   `uploadLimiter` allows `200` requests per 15 minutes in development (`2` requests per archived paper: extraction + bulk submit = `90` requests for 45 papers). Avoid redundant retries in tight loops.

---

## 2. Manifest & Corpus Inspection

1. Inspect the manifest (e.g., `Sample papers/ground_truth_manifest.json`) vs. physical files in the directory.
2. Flag legacy binary `.doc` files (header `d0cf11e0a1b11ae1`):
   - Exclude legacy duplicate `.doc` files from positive archival expectations.
   - Run one negative UI test verifying the upload form blocks `.doc` with a clear toast error before proceeding with `.pdf` and `.docx` entries.
3. Deduplicate against already-archived projects before uploading:
   - Paginate `GET /api/projects/archive/search?limit=50&page=<N>` (backend validation caps `limit <= 50`; requesting `limit=100` returns HTTP 400 and produces a false-empty skip set).

---

## 3. Running Browser Archival in Watchdog-Safe Batches

CMS-V2 enforces a **120-second ceiling** per automated script run. Large 35–40 MB PDFs take ~35–45 seconds end-to-end in the browser, while typical 1–5 MB PDFs/DOCX take 5–12 seconds.

**Never batch 45 papers into a single Playwright invocation** — run sequential idempotent slices of **5 papers** (always one batch at a time so concurrent instructor logins do not collide on auth/Socket state, keeping even 15–40 MB PDF slices well under 90s):

```bash
# Step A: Validate edge cases (40MB PDFs, DOCX files, legacy .doc rejection)
node .agents/skills/archive-browser-batch-ingestion/scripts/browser_batch_archive.mjs \
  --manifest="Sample papers/ground_truth_manifest.json" \
  --dir="Sample papers" \
  --mode=edge

# Step B: Process remaining manifest items sequentially in 5-paper slices
# Run one slice to completion before starting the next: --start=0, 5, 10, ..., 40 with --limit=5
node .agents/skills/archive-browser-batch-ingestion/scripts/browser_batch_archive.mjs --start=0 --limit=5
```

### Critical Browser Automation Invariants
*   **Never use `waitUntil: 'networkidle'`**: CMS-V2's notification poller and Socket.IO heartbeat keep network traffic active permanently, hanging `networkidle` until timeout. Always use `waitUntil: 'domcontentloaded'` plus explicit state locators (`#courseId`, `text=No academic paper selected yet.`).
*   **Wait for Extraction Completion Before Submitting**: After `setInputFiles`, wait for the HTTP `200`/`202` response from `/api/documents/extract-pdf-metadata` AND wait until `document.body.textContent` no longer shows `Extracting Metadata` before overriding/verifying metadata inputs.
*   **Clamp Input Lengths**: Match backend Zod schemas (`title` <= 300 chars, `abstract` <= 5000 chars, `keywords` <= 10 tags, `authors` <= 20 entries, `doi`/`publicationVenue` <= 255 chars) so valid papers never fail validation due to long abstracts or author lists.
*   **Incremental Checkpointing**: Save each archived record immediately to `--report` so interruptions never orphan progress tracking.

---

## 4. Fix-As-You-Go Diagnostic Loop

Whenever a paper fails during extraction, form selection, submission, or vector indexing, halt batch progression and diagnose the root cause across all four tiers (`client` -> `server` -> `ocr_engine` -> `plagiarism_api`). See [references/troubleshooting-matrix.md](references/troubleshooting-matrix.md) for exact error signatures and verified fixes.

---

## 5. End-to-End Verification Before Closing

Do not declare batch ingestion complete based solely on `HTTP 201` responses:

1. **Paginated Archive Total & Program Counts**:
   Verify `/api/projects/archive/search?limit=50` reports the expected total (`existing + newly archived`), with every item carrying non-zero document storage metadata (`fileSize > 0`).
2. **ChromaDB Index Population**:
   Check `http://localhost:8001/health` (`collection_count > 0`, `model_loaded: true`) and inspect `docker logs --tail 30 cms-plagiarism-api` to confirm zero background `TypeError` or tensor sequence overflow errors.
3. **Live Visual Navigation via `/browser` Subagent**:
   Invoke the `browser` subagent (`Model: "flash"`) as Instructor to visit `/archive`, verify program filters (`BSIT`, `BSEMC`), search bar queries, pagination, and open both a **PDF** and a **DOCX** manuscript in `/archive/document/:projectId` to confirm `SophisticatedDocumentViewer` renders natively without fallback errors.
