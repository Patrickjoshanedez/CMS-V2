# Plagiarism Engine Benchmark Report (Historical)
> [!NOTE]
> **Status:** Historical Benchmark Run Record  
> **Dataset Version:** `PAN-SPANS-V1` (Synthetic 1-Doc Calibration Corpus)  
> **Authoritative Specification:** [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md)  
> **Control Invariant:** Mocked neural unit tests (e.g., `plagiarism.coverage.test.js`) verify **software control-flow and fallback logic only**. They do not measure or validate neural detection accuracy.

---

## 1. Measured Performance Metrics

| Metric | Measured Score | Evaluation Methodology |
| :--- | :--- | :--- |
| **Macro-Precision** | **100.00%** | PAN Character-Span True Positive / (True Positive + False Positive) |
| **Macro-Recall** | **63.64%** | PAN Character-Span True Positive / (True Positive + False Negative) |
| **Macro-F1 (NormPlagDet)** | **77.78%** | Harmonic Mean of Precision & Recall |
| **Macro-Granularity** | **1.00** | Span Fragmentation Degree ($1.00$ indicates contiguous detection) |
| **PlagDet (PAN standard)** | **77.78%** | $\frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} / \log_2(1 + \text{Granularity})$ |

---

## 2. Benchmark Configuration

* **Engine Evaluated:** Winnowing Fingerprinting Core (`server/services/plagiarism.service.js`)
* **Parameters:** $k$-gram size $k = 7$, Window size $w = 4$, Mersenne-61 rolling hash
* **Evaluation Target:** Single synthetic document (`test_doc_1`) with controlled pangram spans
* **Execution Script:** `node server/scripts/run-plagiarism-benchmark.js`

---

## 3. Scope & Reproducibility Notice

This record reflects an isolated calibration run against synthetic dataset `PAN-SPANS-V1`. For multi-scenario academic evaluation including semantic paraphrasing and institutional boilerplate filtering, execute `node scripts/iso_plagiarism_benchmark.js` in accordance with the [Plagiarism Benchmark Specification](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md).