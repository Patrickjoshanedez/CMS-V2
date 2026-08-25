# 📑 Multi-Chapter Streaming & Polyglot Storage Architecture Specification

**System:** BukSU Capstone Management System V2 (CMS-V2)  
**Document Code:** `SPEC-STORAGE-STREAMING-01`  
**Classification:** Technical Defense Specification  

---

## 1. Executive Summary

Standard flat-file compression archives (such as `.zip` or `.rar`) degrade performance in capstone management workflows because they render manuscripts opaque to real-time OCR, metadata extraction, and plagiarism engines without incurring repeated, CPU-intensive decompression cycles.

CMS-V2 implements a **Memory-Efficient Multi-Process Streaming Pipeline** combined with **Decoupled Polyglot Storage**:
1. **Interactive Client Draft Buffer**: Multi-chapter batching via dynamic "Add More" / "Done" staging arrays.
2. **Constant-Memory S3/MinIO Streaming**: Direct cloud piping with 64KB buffers to eliminate web server RAM spikes and local disk I/O bottlenecks.
3. **Magic-Byte Header Validation**: Real-time inspection of the first 1024 bytes (`%PDF` / `0x25 0x50 0x44 0x46`) to block extension spoofing before upload finalization.
4. **Paragraph-Group Semantic Compression**: BullMQ worker text extraction into 384-dimensional dense vectors ($n\text{DCG}@5 \approx 0.459$) indexed in ChromaDB for sub-second similarity lookups.

---

## 2. Architectural Comparison

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            STREAMING PIPELINE vs ZIP ARCHIVING                              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
             ┌─────────────────────────────────┴─────────────────────────────────┐
             ▼                                                                   ▼
┌───────────────────────────────┐                               ┌───────────────────────────────┐
│     TRADITIONAL ZIP MODEL     │                               │      CMS-V2 STREAMING MODEL   │
├───────────────────────────────┤                               ├───────────────────────────────┤
│ • Opaque binary container     │                               │ • Multi-Chapter staged buffer │
│ • High RAM decompression loop │                               │ • Constant 64KB RAM stream    │
│ • Blocked background OCR      │                               │ • Direct S3/MinIO cloud pipe  │
│ • Vulnerable to extension spoofs │                            │ • In-flight Magic-Byte check  │
│ • Monolithic token ingestion  │                               │ • Paragraph-Group Chunking    │
└───────────────────────────────┘                               └───────────────────────────────┘
```

---

## 3. Storage Layer Specifications

| Component | Technology | Configuration Parameter | Operational Characteristic |
| :--- | :--- | :--- | :--- |
| **Object Store Client** | `@aws-sdk/client-s3` | `STORAGE_MODE=s3` | Provider-agnostic AWS S3 / LocalStack / MinIO API |
| **Stream Chunk Size** | Node.js `Readable` Stream | `highWaterMark: 64 * 1024` | 64KB constant-memory buffer per active upload stream |
| **Security Interceptor** | Magic-Byte Validator | Header Scan (1024 bytes) | Asserts `%PDF-` signature (`0x25 0x50 0x44 0x46`) |
| **Background Queue** | BullMQ + Redis 7 | Job: `process-manuscript` | Asynchronous, non-blocking text extraction |
| **Vector Database** | ChromaDB + PyTorch | `all-MiniLM-L6-v2` | 384-dimensional dense semantic embeddings |
| **Chunking Metric** | Paragraph-Group Segmenter | Semantic boundary window | $n\text{DCG}@5 \approx 0.459$ retrieval accuracy |

---

## 4. Verification Suite

The streaming pipeline is verified locally via:
```bash
# Execute S3 / MinIO multi-chapter streaming verification
node scripts/runners/verify_s3_streaming_pipeline.js
```
