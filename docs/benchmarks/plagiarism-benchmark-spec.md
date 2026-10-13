# Plagiarism Engine Benchmark Specification & Dataset Provenance
**Version:** 1.0.0  
**Standard Compliance:** ISO/IEC 25010 (Software Quality) & ISO/IEC 25023 (Measurement)  
**Status:** Authoritative Benchmark Control Specification  

---

## 1. Scope & Architectural Separation

To prevent misleading performance claims and preserve test suite determinism, CMS-V2 strictly isolates:

1. **Unit & Integration Regression Suites** (`server/tests/unit/`, `server/tests/integration/`):
   - **Purpose**: Verify **software control-flow correctness**, error handling, authorization gates, BullMQ queue dispatch, and degraded result reporting.
   - **Mocking**: Mocked FastAPI or neural responses (e.g. in `plagiarism.coverage.test.js`) verify that fallback branches and DB persistence operate deterministically without external services.
   - **Crucial Invariant**: **Mocked neural responses do not measure or establish model detection accuracy.**

2. **Empirical Accuracy Benchmarks** (`scripts/iso_plagiarism_benchmark.js`, `server/scripts/run-plagiarism-benchmark.js`):
   - **Purpose**: Measure **actual statistical detection quality** (Macro-Precision, Macro-Recall, F1-Score, PlagDet, False Discovery Rate) against controlled datasets.
   - **Execution**: Must execute against the live, unmocked plagiarism engine (`BAAI/bge-m3` or `all-MiniLM-L6-v2` dense/sparse embeddings + Winnowing fingerprinting on port 8001).
   - **Separation**: Benchmarks are **excluded from standard CI unit test commands** (`npm test`) to avoid non-deterministic network/GPU dependencies and timeout stalls.

---

## 2. Benchmark Datasets: Provenance & Ground Truth

### Dataset 1: ISO Multi-Scenario Synthetic Capstone Corpus (`ISO-BUKSU-V1`)
* **Version**: `1.0.0`
* **File Location**: Embedded in `scripts/iso_plagiarism_benchmark.js`
* **Provenance**: Synthetically generated technical manuscripts rooted in Bukidnon State University IT capstone domains (IoT Precision Agriculture LoRaWAN, Indigenous VR Cultural Heritage Unreal Engine 5).
* **Confidentiality**: Zero production student data. 100% synthetic research narratives.
* **Scenarios & Expected Labels**:
  | Scenario ID | Test Narrative | Expected Verdict | Labeling Rationale |
  | :--- | :--- | :--- | :--- |
  | **SCEN-01** | Verbatim Copy-Paste | **Plagiarized** ($\ge 85\%$) | Exact verbatim text match from existing archive source |
  | **SCEN-02** | Paraphrased / Evasion | **Plagiarized (Semantic)** ($\ge 50\%$) | Heavy synonym substitution and clause reordering covering identical technical claims |
  | **SCEN-03** | Clean Independent Paper | **Original** ($< 15\%$) | Unrelated domain narrative with zero shared conceptual ancestry |
  | **SCEN-04** | Institutional Boilerplate | **Original** ($< 25\%$) | Independent paper containing standard BukSU approval sheets, panel rosters, and cited quotes |

### Dataset 2: PAN Character-Span Ground Truth (`PAN-SPANS-V1`)
* **Version**: `1.0.0`
* **File Location**: `server/scripts/truth-dataset.json`
* **Provenance**: Controlled synthetic document pairing with exact character index boundary ground truth spans `[start, end]`.
* **Expected Labels**: Exact span overlap for precision/recall calculation under PAN plagiarism detection metrics.

---

## 3. Configuration & Scoring Hyperparameters

Benchmark evaluations are strictly tied to specific parameter sets. Comparing scores across differing configurations is invalid.

* **Lexical Winnowing Parameters**:
  - $k$-gram size ($k$): `7`
  - Window size ($w$): `4`
  - Hash function: Karp-Rabin with Mersenne prime $2^{61} - 1$
* **Neural Vector Core**:
  - Primary Model: `BAAI/bge-m3` (1024-dimensional dense + sparse vector core)
  - Secondary/Fallback Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense)
  - Vector Similarity Threshold ($\theta_{\text{min}}$): `0.78`
* **Hybrid Scoring Weights**:
  - Lexical Weight ($w_{\text{lex}}$): `0.65`
  - Semantic Vector Weight ($w_{\text{sem}}$): `0.35`
  - Formula: $S_{\text{composite}} = 0.65 \cdot S_{\text{Jaccard}} + 0.35 \cdot S_{\text{Cosine}} \cdot \mathbb{I}(S_{\text{Cosine}} > 0.78)$

---

## 4. Exclusion & Preprocessing Rules

Before computing fingerprints or embeddings, documents undergo deterministic preprocessing:
1. **Institutional Boilerplates**: Institutional headers, College of Technologies seals, "Approval Sheet", "Panel of Examiners", and defense transmittal letter blocks are filtered.
2. **Quoted Citations**: Exact text enclosed in standard quotes or blockquote indentation is excluded from plagiarism matching.
3. **Bibliography / References**: References sections following standard APA/IEEE heading markers are truncated from the analysis window.
4. **Smart Quote & Whitespace Normalization**: Unicode typographical quotes (`“`, `”`, `‘`, `’`) are normalized to ASCII (`"`, `'`), and whitespace is collapsed.

---

## 5. Execution Procedure & Reproduction

```bash
# 1. Ensure plagiarism engine microservice is running
docker compose up -d plagiarism-engine

# 2. Run the ISO/IEC Multi-Scenario Accuracy Benchmark
node scripts/iso_plagiarism_benchmark.js

# 3. Run the Character-Span PAN Metric Benchmark
node server/scripts/run-plagiarism-benchmark.js --k 7 --w 4 --report docs/archive/plagiarism_benchmark_report.md
```

---

## 6. Known Limitations

1. **Synthetic Corpus Scope**: `ISO-BUKSU-V1` evaluates structural paraphrasing and boilerplate filtration, but does not capture LLM-based recursive AI text obfuscation.
2. **OCR Noise**: Benchmarks evaluate raw UTF-8 strings. Scanned PDF extractions with degraded OCR confidence require separate character error rate (CER) evaluation under PaddleOCR-VL benchmarks.
3. **Hardware Dependency**: Neural embedding throughput and latency vary depending on GPU availability (NVIDIA CUDA vs CPU inference).
