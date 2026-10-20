# CMS-V2 Empirical Benchmark & Verification Harness

This directory contains the reproducible benchmark scripts used to generate the empirical measurements for **Chapter 4 Table 4.3 (Plagiarism Confusion Matrix)** and **Table 4.5 (Performance, Concurrency & Ingestion)** of the BukSU Capstone Management System V2 (CMS-V2).

Every measurement is strictly traceable to raw JSON/CSV telemetry saved under `scratch/benchmarks/<timestamp>/`.

---

## 1. System Environment & Prerequisites

### Toolchain Versions
- **Python**: 3.14.3 with `scikit-learn>=1.6`, `scipy>=1.15`, `requests>=2.32`
- **Node.js**: v20.x with workspace packages installed (`npm install`)
- **k6 Load Generator**: v0.56.0 (located in PATH or `scratch/bin/k6.exe`)
- **Docker Compose Stack**: `cms-mongodb`, `cms-redis`, `cms-plagiarism-redis`, `cms-plagiarism-api`, `cms-minio`
- **Hardware Profile**: AMD Ryzen 7 5700X3D (8 cores, 16 threads), 32 GB DDR4 RAM, Windows 11 host

### Port Mapping
- Express Backend API: `http://localhost:43210`
- Plagiarism Microservice API: `http://localhost:8001`
- MongoDB: `localhost:27018`
- Redis (BullMQ): `localhost:6379`
- Redis (Plagiarism Celery): `localhost:6380`

---

## 2. Benchmark Scripts Overview

| File | Purpose | Corresponding Report Target |
| :--- | :--- | :--- |
| `run_table43_benchmark.py` | Generates 120-document labelled corpus (seed 42), seeds 45 historical documents to `/index/sync`, runs threshold sweep and weight ablation on 48 validation documents, and evaluates 72 held-out test documents against `POST /check-sync`. | **Table 4.3** (Plagiarism Confusion Matrix) |
| `k6_prescan_express.js` | k6 sequential 1 VU load test against `POST /api/projects/title-check` (Express MongoDB text search + Levenshtein). | **Table 4.5** (Scenario A: Client API) |
| `k6_prescan_chroma.js` | k6 sequential 1 VU load test against `POST /check-sync` with 1,000 indexed titles in ChromaDB (Python SentenceTransformers CPU). | **Table 4.5** (Scenario A: Vector API) |
| `k6_concurrent_submissions.js` | k6 ramping virtual users (up to 50 VUs) submitting small DOCX manuscripts with authentication session. | **Table 4.5** (Scenario B: Concurrency) |
| `run_table45_bullmq.js` | Node.js script submitting 10 simultaneous 50-page manuscripts to BullMQ `document-extraction` queue, sampling Redis memory peak and Docker container stats. | **Table 4.5** (Scenario C: Ingestion) |
| `run_table45_orchestrator.py` | Master orchestrator executing 3 consecutive repetitions of all Table 4.5 scenarios and computing median + min–max ranges into `table_4_5_measured.csv`. | **Table 4.5** (Full Automated Suite) |

---

## 3. Reproduction Commands

### Step 1: Table 4.3 Plagiarism Benchmark
```bash
python scripts/benchmarks/run_table43_benchmark.py --output-dir scratch/benchmarks/<timestamp>
```
*Outputs generated:*
- `table_4_3_measured.csv`: Final confusion matrix (Category, Samples, TP, FN, TN, FP, Recall, Specificity, Precision, F1).
- `table_4_3_summary.json`: Detailed classification metrics, ROC-AUC, Wilson 95% CIs.
- `validation_threshold_sweep.csv`: Threshold sweep 0.05..0.90 on validation split.
- `validation_weight_ablation.csv`: Winnowing weight sweep 0.0..1.0 on validation split.
- `failure_cases.json`: Detailed excerpts of false negatives and false positives.

### Step 2: Character-Level PAN@CLEF Evaluation
```bash
python plagiarism_engine/evaluation/evaluate.py --reports-dir scratch/benchmarks/<timestamp>/pan_reports
```
*Outputs generated:*
- Precision, Recall, Granularity, and PlagDet metric scores.

### Step 3: Table 4.5 Performance, Concurrency & Ingestion
```bash
python scripts/benchmarks/run_table45_orchestrator.py --output-dir scratch/benchmarks/<timestamp> --runs 3
```
*Outputs generated:*
- `table_4_5_measured.csv`: Table 4.5 formatted CSV with median and min–max latency ranges.
- `table_4_5_summary.json`: Raw run data across all 3 repetitions.
- `k6_prescan_express_mongo_run[1-3].json`: k6 raw metrics for Express pre-scan.
- `k6_prescan_chroma_vector_run[1-3].json`: k6 raw metrics for ChromaDB vector pre-scan.
- `k6_concurrency_run[1-3].json`: k6 raw metrics for 50 VU concurrent submission load.
- `bullmq_run_[1-3].json`: Per-job queue wait and processing durations, peak Redis memory, and Docker CPU/RSS stats.

### Step 4: RBAC Security Matrix Verification
```bash
npm test --workspace=server -- tests/integration/rbac-matrix-benchmark.test.js
```
*Verifies 6 institutional RBAC rules via Supertest (Instructor exclusion, mutual exclusion, Secretary endorsement gate, minutes authorization, student protection, JWT tampering).*

### Step 5: Full Test Battery & API Endpoint Parity
```bash
# Frontend test battery
npm test --workspace=client

# Backend test battery
npm test --workspace=server

# API route parity check (222 routes, UNMATCHED_COUNT = 0)
npm run check:endpoints
```
