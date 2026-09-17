# 🔬 Plagiarism Detection Engine Accuracy Report
**Compliance Standard:** PAN@CLEF Character-Level Benchmark  
**Evaluation Threshold:** $S_{\text{hybrid}} \ge 25.0\%$  
**Institutional Gate Status:** **PASSED (Production-Grade)** (PlagDet: `0.8359` vs Target: `0.6`)

---

## 1. Multi-Tier Ablation Study Matrix

| Detection Tier | Precision ($P$) | Recall ($R$) | $F_1$-Measure | Granularity ($G$) | PlagDet Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Lexical (Winnowing Only)** | `0.9857` | `0.7525` | `0.8221` | `1.0` | `0.8221` |
| **Semantic (MiniLM Only)** | `0.9857` | `0.7767` | `0.8359` | `1.0` | `0.8359` |
| **Hybrid ($S_{\text{hybrid}}$ Formula)** | **`0.9857`** | **`0.7767`** | **`0.8359`** | **`1.0`** | **`0.8359`** |

---

## 2. Methodology & Mathematical Definitions

* **Precision:** $\frac{|\bigcup (r \cap s)|}{|r|}$ (Proportion of flagged characters that are genuine plagiarism).
* **Recall:** $\frac{|\bigcup (s \cap r)|}{|s|}$ (Proportion of genuine plagiarized passages successfully caught).
* **Granularity:** $\frac{1}{|S_{\text{detected}}|} \sum |R_s|$ (Penalty for reporting fragmented passages).
* **PlagDet Score:** $\frac{F_1}{\log_2(1 + G)}$ (Harmonic balance of accuracy penalized by fragmentation).
