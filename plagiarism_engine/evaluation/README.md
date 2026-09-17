# 🔬 Automated Plagiarism Detection Evaluation Framework (PAN@CLEF Standard)

Quantitative evaluation suite for the BukSU CMS-V2 hybrid plagiarism detection engine (Winnowing + Sentence-Transformers MiniLM).

---

## 📁 Pipeline Components

1. **`generate_corpus.py`**: Synthesizes suspicious documents with interleaved original and plagiarized text across 4 techniques:
   - **Verbatim Copying** (Exact character-for-character replication)
   - **Synonym Swapping** (WordNet lexical substitution)
   - **Semantic Paraphrasing** (Sentence restructuring & connector shifting)
   - **Structural Shuffling** (Clause and paragraph reordering)
   Outputs `corpus/ground_truth.json` and `corpus/ground_truth.xml`.

2. **`run_detection.py`**: Automated test client that:
   - Synchronizes source documents into ChromaDB (`POST /index`).
   - Submits suspicious documents to the FastAPI service (`POST /check`).
   - Polls task status (`GET /result/{task_id}`) and saves outputs to `results/*.json`.
   - Includes automatic in-process fallback if the HTTP service is offline.

3. **`evaluate.py`**: Calculates PAN-standard metrics:
   - **Precision ($P$)**: $\frac{|\bigcup (r \cap s)|}{|r|}$
   - **Recall ($R$)**: $\frac{|\bigcup (s \cap r)|}{|s|}$
   - **Granularity ($G$)**: Over-fragmentation penalty
   - **PlagDet Score**: $\frac{F_1}{\log_2(1 + G)}$
   - Exports `metrics.json`, `report.md`, and `pr_curve.png`.

---

## 🚀 Quick-Start Guide

### 1. Install Dependencies
```bash
pip install -r requirements-eval.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('wordnet'); nltk.download('omw-1.4')"
```

### 2. Run the 3-Step Evaluation
```bash
# Step 1: Synthesize ground truth test corpus (e.g., 10 documents)
python generate_corpus.py --num-docs 10

# Step 2: Execute detection against the running Plagiarism Engine
# Ensure Plagiarism API is running on port 8001
python run_detection.py --api-url http://localhost:8001

# Step 3: Compute PAN metrics and evaluate quality gate (e.g., PlagDet >= 0.70)
python evaluate.py --threshold 0.25 --min-plagdet 0.70
```

---

## 📊 Using the Results in Your Thesis

* **Chapter 4 (Results & Discussion):** Copy the markdown table generated in `report.md` to show the **3-Tier Ablation Study Matrix** (Winnowing vs. MiniLM vs. Hybrid).
* **Threshold Justification:** Include `pr_curve.png` to empirically justify why the **25% institutional threshold** optimizes the precision/recall trade-off.
