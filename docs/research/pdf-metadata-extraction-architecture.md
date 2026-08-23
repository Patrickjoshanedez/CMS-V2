# Research & Architectural Blueprint: Asynchronous Academic PDF Metadata Extraction Pipeline

## 1. Executive Summary & Problem Formulation
The current metadata extraction pipeline in CMS-V2 relies on synchronous heuristic regex parsing via `pdf-parse` in `server/services/pdfMetadataExtractor.js`. This approach experiences high failure rates when extracting multi-column author affiliations, publication years embedded in journal headers, and DOIs. 

To eliminate manual input during legacy capstone and archive uploads, this research establishes an asynchronous, multi-tiered architecture that integrates layout-aware document models (GROBID / GLM-OCR), BullMQ background workers, and authoritative scholarly API validation.

---

## 2. Target System Architecture

```
[ Frontend Upload UI ] (ExistingCapstoneUploadPage / ArchiveLegacyUploadPage)
        │
        │ 1. POST /api/documents/upload-archive (Multipart PDF)
        ▼
[ Server HTTP Gateway ] (document.routes.js)
        │
        ├─► 2. Save file buffer to Storage (/uploads or S3)
        ├─► 3. Enqueue job into BullMQ: `metadata-extraction`
        └─► 4. Return HTTP 202 Accepted { jobId, fileKey }
        
[ BullMQ Worker Queue ] (jobs/metadataExtraction.job.js)
        │
        │ 5. Dequeue job
        ▼
[ Tier 1: Layout-Aware ML Parser ] (GROBID / GLM-OCR Microservice)
        │  - Extracts Title, Abstract, Year, and Structured Authors
        │  - Detects DOI token if physically printed
        │
        ├──────────────────────┬──────────────────────┐
        │ DOI found            │ No DOI found         │
        ▼                      ▼                      ▼
[ Crossref API: /works/{doi} ] [ Crossref: query.bibliographic ] [ S2AG Paper Title Search ]
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
[ Decision Gate: Relevancy Score >= 0.85? ]
        ├── YES ──► Merge & prioritize verified publisher metadata
        └── NO  ──► [ Tier 3: LLM Structured Fallback (GLM-OCR / Ollama JSON Schema) ]
                               │
                               ▼
[ Socket.IO / SSE Broadcast ] ──► Pushes `{ jobId, metadata, confidence }` to Client
```

---

## 3. Tier Breakdown & Integration Specifications

### Tier 1: GROBID Containerized Engine
* **Protocol**: REST Web Service (`/api/processHeaderDocument`)
* **Advantage**: Spatial token coordinate awareness (`pdfalto`), separating superscripts and affiliations from proper author names.
* **Throughput**: ~8-10 PDFs/sec on multi-core Node/Docker setup.

### Tier 2: Crossref & Semantic Scholar Verification Layer
* **Polite Pool Access**: Include `mailto:tech@cms-buksu.edu.ph` in headers for rate-limit immunity.
* **Bibliographic Querying**:
  ```javascript
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(extractedTitle)}&rows=1`;
  ```
* **Score Guard**: Reject fuzzy matches below similarity threshold `0.85` to avoid metadata contamination.

### Tier 3: LLM Structured Output Fallback (GLM-OCR / Ollama)
* **Context Minimization**: Extract only pages 1–3 text buffers (<8,000 chars) to prevent context dilution.
* **JSON Schema Enforcement**: Strict output schema specifying:
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "abstract": { "type": "string" },
      "publicationYear": { "type": ["number", "null"] },
      "authors": {
        "type": "array",
        "items": { "type": "string" }
      },
      "keywords": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["title", "abstract", "authors"]
  }
  ```

---

## 4. Implementation Roadmap
1. **Queue Definition**: Create `server/jobs/metadata.queue.js` and worker `server/jobs/metadata.worker.js`.
2. **Worker Logic**: Implement tiered fallback logic with retry backoff.
3. **Socket Event**: Emit `METADATA_EXTRACTED` event on completion.
4. **Client Binding**: Subscribe in `ExistingCapstoneUploadPage.jsx` and auto-fill form inputs upon event receipt.
