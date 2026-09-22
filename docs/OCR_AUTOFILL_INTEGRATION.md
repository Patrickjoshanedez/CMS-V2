# PDF OCR Auto-Fill & Asynchronous Ingestion Integration

## Overview

The BukSU Capstone Management System (CMS-V2) features a production-grade, asynchronous document ingestion and Optical Character Recognition (OCR) pipeline. The system extracts structured academic metadata (title, abstract, authors, publication year, DOI, publication venue, keywords) from uploaded PDF files (both full manuscripts and condensed journals) and auto-fills archival forms.

The architecture is powered by a dedicated **`PaddleOCR-VL (0.9B)`** microservice container with graceful in-process fallback (`pdf-parse`), **BullMQ** asynchronous job queuing with Redis caching, and real-time **Socket.IO** progress notifications.

---

## High-Level Architecture

```text
[Browser / Client]
       │
       ├─ (1) POST /api/documents/extract-pdf-metadata (multipart/form-data)
       ▼
[Express Server Controller] (document.controller.js)
       │
       ├─ (2) Writes temp PDF to storageService ('temp-extractions/<jobId>.pdf')
       ├─ (3) Enqueues job in BullMQ 'document-extraction' queue
       ▼
[Client Response] ─── HTTP 202 Accepted { status: 'queued', jobId: '<jobId>' }
       │
       ├─ Client listens to Socket.IO ('ocr:progress', 'ocr:complete', 'ocr:error')
       └─ Client polls fallback GET /api/documents/extraction-status/<jobId>
       │
       ▼
[BullMQ Worker] (documentExtraction.job.js)
       │
       ├─ Emits Socket.IO 'ocr:progress' (10% - Staged)
       ├─ Reads PDF stream from storageService
       ├─ Invokes metadataExtractionService
       │     │
       │     ├─ Sends PDF buffer to PaddleOCR-VL (http://cms-ocr-engine:8000/extract)
       │     └─ Fallback: In-process pdf-parse heuristic extraction (ocrStatus: 'degraded')
       │
       ├─ Normalizes confidence scores and derives keywords/academic year
       ├─ Caches result in Redis ('extraction:job:<jobId>', TTL: 1 hour)
       ├─ Emits Socket.IO 'ocr:complete' (100%)
       └─ Cleans up temp PDF from storageService
```

---

## Core Components

### 1. Dedicated Metadata Extraction Service (`server/services/metadataExtraction.service.js`)
- Isolates metadata extraction logic completely from manuscript CRUD (`document.service.js`).
- Dispatches extraction requests to `ocrExtractionService` (`PaddleOCR-VL 0.9B`) and in-process heuristic parsing (`server/utils/pdfMetadataExtractor.js`).
- Standardizes confidence scores across fields and performs intelligent fallback enrichment.

### 2. OCR Engine Microservice (`PaddleOCR-VL 0.9B`)
- Dedicated container running on `http://cms-ocr-engine:8000`.
- Fast, high-accuracy vision-language model for academic PDF document layout analysis and OCR.
- Vector and semantic search core backed by `BAAI/bge-m3` (1024-dimensional dense + sparse embeddings).

### 3. BullMQ Asynchronous Ingestion Queue (`server/jobs/queue.js`, `server/jobs/documentExtraction.job.js`)
- Queue: `document-extraction` registered in Bull Board.
- Supports concurrent workers with multi-stage progress reporting (10% staging, 40% OCR parsing, 80% field alignment, 100% complete).
- Emits real-time Socket.IO events (`ocr:progress`, `ocr:complete`, `ocr:error`).
- Stores results in Redis (`extraction:job:<jobId>`) with a 1-hour expiration.
- Auto-deletes temporary upload artifacts (`temp-extractions/<jobId>.pdf`) upon job completion or failure.

### 4. Client Integration (`client/src/services/metadataService.js` & `ExistingCapstoneUploadPage.jsx`)
- Seamlessly handles both HTTP 202 async jobs and HTTP 200 synchronous responses.
- Real-time animated progress bar showing OCR extraction stages and percentage.
- Socket.IO listeners coupled with polling fallback (`GET /api/documents/extraction-status/:jobId`).
- Per-field rescan, confidence badges (0–100%), and active OCR source indicator.

---

## Extracted Metadata & Confidence Scoring

The system extracts the following structured fields:

| Field | Extraction Method | Confidence Range | Notes |
|---|---|---|---|
| **Title** | PaddleOCR-VL layout header detection / Case heuristics | 0–100% | 30–300 chars, capitalized academic title |
| **Abstract** | Vision-language block detection / Boundary regex | 0–100% | 50–3000 chars, boundary bounded by Introduction/Keywords |
| **Authors** | Line analysis + entity detection | 0–100% | Sanitizes academic prefixes (Dr., Engr., Prof.) |
| **Publication Year** | PDF metadata + publication date regex | 0–100% | 1900–(Current+1), automatically computes Academic Year |
| **DOI** | International standard DOI pattern | 0–100% | `10.xxxx/...` or `https://doi.org/...` |
| **Publication Venue** | Journal/Conference name recognition | 0–100% | IEEE, ACM, Springer, Institutional Capstone Journal |
| **Keywords** | Section extraction & TF-IDF keyword derivation | 0–100% | Deduplicated and formatted into canonical acronyms |

---

## API Endpoints

### 1. Ingest PDF Document
`POST /api/documents/extract-pdf-metadata`

- **Headers:** `Content-Type: multipart/form-data`, `Cookie: <auth-token>`
- **Body:** `file: <PDF Binary>`
- **Query Params:** `async=true` (default in production with Redis) or `sync=true`
- **Response (HTTP 202 Accepted):**
```json
{
  "success": true,
  "message": "Document metadata extraction job queued.",
  "data": {
    "jobId": "extract-1727000000000-a1b2c3d4",
    "status": "queued",
    "statusUrl": "/api/documents/extraction-status/extract-1727000000000-a1b2c3d4"
  }
}
```

### 2. Poll Extraction Job Status
`GET /api/documents/extraction-status/:jobId`

- **Headers:** `Cookie: <auth-token>`
- **Response (HTTP 200 OK - Active):**
```json
{
  "success": true,
  "jobId": "extract-1727000000000-a1b2c3d4",
  "status": "active",
  "progress": 40,
  "stage": "Extracting metadata via PaddleOCR-VL..."
}
```
- **Response (HTTP 200 OK - Completed):**
```json
{
  "success": true,
  "jobId": "extract-1727000000000-a1b2c3d4",
  "status": "completed",
  "progress": 100,
  "data": {
    "metadata": {
      "title": "Automated Archival and Plagiarism Detection in Capstone Systems",
      "abstract": "This study presents the architecture and empirical evaluation...",
      "authors": "Añedez, P. J., Antipuesto, T.",
      "year": "2026",
      "doi": "10.1234/buksu.2026.01",
      "venue": "BukSU Information Technology Research Journal",
      "keywords": "OCR, Deep Learning, BullMQ, Archival"
    },
    "confidence": {
      "title": 95,
      "abstract": 92,
      "authors": 88,
      "year": 99,
      "doi": 95,
      "venue": 85,
      "keywords": 90
    },
    "provider": "paddleocr-vl",
    "ocrStatus": "ok"
  }
}
```

### 3. Record Field Correction Feedback
`POST /api/documents/metadata-feedback`

- **Headers:** `Content-Type: application/json`, `Cookie: <auth-token>`
- **Body:**
```json
{
  "fieldName": "title",
  "extractedValue": "Automated Archival",
  "correctedValue": "Automated Archival and Plagiarism Detection in Capstone Systems",
  "confidence": 60,
  "sourceFileName": "manuscript.pdf"
}
```

---

## Configuration & Environment Variables

```env
# Dedicated OCR Microservice (PaddleOCR-VL 0.9B)
OCR_ENGINE_URL=http://cms-ocr-engine:8000

# Extraction Cache TTL (in milliseconds, default 10 minutes)
PDF_METADATA_CACHE_TTL_MS=600000

# Redis Connection (Required for BullMQ Asynchronous Queuing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Testing & Quality Assurance

- **Unit Tests**:
  - `server/tests/unit/pdfMetadataExtractor.test.js` — Heuristic parser, boundary isolation, cache hashing.
  - `server/tests/unit/pdfMetadataExtractor.ai.test.js` — PaddleOCR-VL extraction dispatch & fallback handling.
- **Integration Tests**:
  - `server/tests/integration/documentExtraction.async.test.js` — BullMQ async job creation, polling status, active progress, Redis caching, and error handling.
  - `server/tests/integration/documents.test.js` — Synchronous fallback endpoint behavior.
- **Frontend Tests**:
  - `client/src/pages/archive/ExistingCapstoneUploadPage.test.jsx` — Document selection, asynchronous polling, Socket.IO updates, and form autofill.
