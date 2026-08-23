# Research & Calibration: Plagiarism Engine Hybrid Scoring & Vector Retrieval

## 1. Executive Overview
The CMS-V2 plagiarism engine (`plagiarism_engine/plagiarism_engine/engine.py`) employs a two-tier hybrid architecture:
1. **Semantic Candidate Retrieval**: Dense normalized embeddings (`SentenceTransformers` `all-MiniLM-L6-v2`) queried against ChromaDB HNSW index.
2. **Deep Text Fingerprinting**: Karp-Rabin hash-based **Winnowing algorithm** and Jaccard token overlap for exact character span detection.

---

## 2. Mathematical Model & Scoring Calibration

The final originality and plagiarism score is calculated as a composite metric:

$$S_{\text{composite}} = w_{\text{lex}} \cdot S_{\text{Jaccard}} + w_{\text{sem}} \cdot S_{\text{Cosine}} \cdot \mathbb{I}(S_{\text{Cosine}} > \theta_{\text{min}})$$

Where:
* $w_{\text{lex}} = 0.65$: Weight assigned to exact lexical winnowing fingerprint match spans.
* $w_{\text{sem}} = 0.35$: Weight assigned to semantic vector proximity.
* $\theta_{\text{min}} = 0.78$: Minimum cosine threshold for vector candidate selection.

```
       Raw Document Text
              │
              ├──► Paragraph / Sliding Chunk Segmentation (window = 512 tokens, stride = 128)
              │           │
              │           ▼
              │    SentenceTransformers Batch Encoding
              │           │
              │           ▼
              │    ChromaDB Approximate Nearest Neighbors (top_k = 5)
              │
              └──► Karp-Rabin Rolling Hash (k-gram = 25, window = 40)
                          │
                          ▼
                   Winnowing Fingerprints Selection
                          │
                          ▼
                   Character Span Matching & Overlap Union
                          │
                          ▼
            Composite Plagiarism Report Output
```

---

## 3. Chunking Strategy for Large Capstone Documents
* **Problem**: Fixed character slicing breaks mid-sentence and disrupts grammatical semantics.
* **Calibrated Solution**:
  * **Segmenting**: Paragraph-aware semantic chunking with a 512-token ceiling and 128-token overlap.
  * **Filtering**: Strip boilerplates (table of contents, bibliography/references section, formal acknowledgment signatures) before generating fingerprints.

---

## 4. Vector Store Scalability: ChromaDB vs. Distributed Stores
* **Current State**: Embedded DuckDB/Parquet ChromaDB local persistence.
* **Scale Evaluation**:
  * Up to 10,000 capstone documents: Embedded ChromaDB maintains sub-50ms ANN queries.
  * 10,000+ multi-campus documents: Transition to standalone ChromaDB server container or Qdrant cluster to allow independent horizontal worker scaling.
