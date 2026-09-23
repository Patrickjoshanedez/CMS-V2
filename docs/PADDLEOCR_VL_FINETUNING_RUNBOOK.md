# 🧠 PaddleOCR-VL (0.9B) Cross-Format Metadata Extraction Fine-Tuning Runbook
**Target Platform:** BukSU Capstone Management System V2 (`cms-ocr-engine`)  
**Architecture:** Vision-Language Multimodal Transformer (0.9B parameters)  
**Methodology:** Multi-Task Instruction Fine-Tuning, QLoRA PEFT, and Reinforcement Learning Structural Rewards  

---

## 1. Executive Summary & Objective

In BukSU CMS-V2, retrospective capstone uploads process full manuscripts and condensed journals via the `cms-ocr-engine:8000` microservice and BullMQ asynchronous queue (`document-extraction`). 

Academic documents exhibit high variance across **layout** (single-column thesis, two-column IEEE/ACM format, three-column conference papers), **typography** (variable fonts, sizes, weights, headers), **visual quality** (scanned paper artifacts, rotations, low-DPI noise), and **metadata placement** (DOIs in headers, footers, or margins; publication years in copyright lines or defense transmittals).

Standard character-level OCR models fail on layout semantics. This runbook establishes the **multi-task instruction fine-tuning and reinforcement learning optimization framework** to train `PaddleOCR-VL-0.9B` into an accurate, schema-compliant JSON metadata extractor.

---

## 2. Mathematical Formulation of the Optimization Objective

### 2.1 Multi-Task Instruction Fine-Tuning Loss

Standard fine-tuning optimizes for character-level token prediction. For structured metadata extraction, the objective optimizes for syntactically valid and semantically aligned JSON:

$$\mathcal{L}_{\text{total}} = \alpha \cdot \mathcal{L}_{\text{CE}} + \beta \cdot \mathcal{L}_{\text{struct}} + \gamma \cdot \mathcal{L}_{\text{task}}$$

Where:
*   $\mathcal{L}_{\text{CE}}$ is the token-level cross-entropy loss over the generated target sequence:
    $$\mathcal{L}_{\text{CE}} = - \sum_{i=1}^{T} \log P(y_i \mid y_{<i}, X_{\text{img}}, X_{\text{prompt}})$$
*   $\mathcal{L}_{\text{struct}}$ is a structural penalty that enforces valid JSON syntax, key existence, and type constraints:
    $$\mathcal{L}_{\text{struct}} = \mathbb{I}(\text{JSON parses}) \cdot 0 + \mathbb{I}(\text{JSON fails}) \cdot \lambda_{\text{syntax}} + \sum_{k \in \mathcal{K}_{\text{req}}} \mathbb{I}(k \notin \text{keys}(y)) \cdot \lambda_{\text{key}}$$
*   $\mathcal{L}_{\text{task}}$ is a field-specific metric loss computing semantic distance between extracted fields and ground-truth metadata:
    $$\mathcal{L}_{\text{task}} = \sum_{f \in \mathcal{F}} w_f \cdot \mathcal{D}_f(y_f, y^*_f)$$
*   $\alpha, \beta, \gamma$ are curriculum-adjusted weighting hyperparameters (e.g., $\alpha=1.0, \beta=0.5, \gamma=0.8$).

---

### 2.2 Reinforcement Learning Structural Reward Function (Valid-Struct-Sim)

For compact models like `PaddleOCR-VL-0.9B`, Reinforcement Learning with Policy Gradient (PPO / DPO / GRPO) enforces structural discipline via the 3-tier composite reward:

$$R_t(y, y^*) = \text{Valid}_t(y) \cdot \text{Struct}_t(\varphi_t(y)) \cdot \text{Sim}_t(\varphi_t(y), \varphi_t(y^*))$$

#### Tier 1: Binary Validity Gate $\text{Valid}_t(y) \in \{0, 1\}$
Provides an uncompromising, non-differentiable gradient barrier. If the output string cannot be parsed into valid JSON or is truncated due to context limits, reward collapses to zero:
$$\text{Valid}_t(y) = \begin{cases} 1 & \text{if } \text{json.loads}(y) \text{ succeeds without error} \\ 0 & \text{otherwise} \end{cases}$$

#### Tier 2: Structural Adherence Cost $\text{Struct}_t(\varphi_t(y)) \in (0, 1]$
Softly penalizes parsed JSON that violates schema requirements or requires defensive sanitization:
$$\text{Struct}_t(\varphi_t(y)) = \exp\left( - \sum_{k \in \mathcal{K}} \text{penalty}(k, \varphi_t(y)) \right)$$
*   Deducts score if `authors` is a single concatenated string rather than a list of strings (`["Author A", "Author B"]`).
*   Deducts score if `publication_year` contains alphabetical noise (e.g., `"c. 2024"` instead of `"2024"`).
*   Deducts score if `doi` lacks standard international prefix (`10.xxxx/...`).

#### Tier 3: Multi-Objective Similarity $\text{Sim}_t(\varphi_t(y), \varphi_t(y^*)) \in [0, 1]$
Computes the weighted aggregate similarity across canonicalized field representations $\varphi_t(y)$:

$$\text{Sim}_t = \sum_{f \in \mathcal{F}} \omega_f \cdot S_f(\varphi(y)_f, \varphi(y^*)_f)$$

| Field ($f$) | Weight ($\omega_f$) | Similarity Metric ($S_f$) | Mathematical Definition |
| :--- | :--- | :--- | :--- |
| **Title** | 0.25 | $1 - \text{NED}$ | $1 - \frac{\text{Levenshtein}(y_{\text{title}}, y^*_{\text{title}})}{\max(|y|, |y^*|)}$ |
| **Abstract** | 0.25 | $1 - \text{NED}$ | $1 - \frac{\text{Levenshtein}(y_{\text{abstract}}, y^*_{\text{abstract}})}{\max(|y|, |y^*|)}$ |
| **Authors** | 0.20 | Token Set $F_1$ / Jaccard | $\frac{2 \cdot |Y_{\text{authors}} \cap Y^*_{\text{authors}}|}{|Y_{\text{authors}}| + |Y^*_{\text{authors}}|}$ |
| **Keywords** | 0.15 | Set Jaccard Index | $\frac{|Y_{\text{kw}} \cap Y^*_{\text{kw}}|}{|Y_{\text{kw}} \cup Y^*_{\text{kw}}|}$ |
| **Publication Year** | 0.05 | Binary Match | $\mathbb{I}(y_{\text{year}} == y^*_{\text{year}})$ |
| **DOI** | 0.05 | Normalized Exact Match | $\mathbb{I}(\text{norm}(y_{\text{doi}}) == \text{norm}(y^*_{\text{doi}}))$ |
| **Publication Venue** | 0.05 | Token Overlap | $\frac{|Y_{\text{venue}} \cap Y^*_{\text{venue}}|}{|Y^*_{\text{venue}}|}$ |

---

## 3. BukSU Capstone Canonical JSON Schema

All instruction datasets and model responses must strictly comply with this target schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BukSUCapstoneMetadata",
  "type": "object",
  "required": ["title", "abstract", "authors", "publication_year"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Full formal title of the capstone project or academic research paper."
    },
    "abstract": {
      "type": "string",
      "minLength": 50,
      "maxLength": 5000,
      "description": "Complete abstract narrative without truncation."
    },
    "authors": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 10,
      "description": "Array of individual author full names, stripped of academic prefixes."
    },
    "publication_year": {
      "type": "string",
      "pattern": "^(19|20)\\d{2}$",
      "description": "Four-digit Gregorian calendar publication or defense year."
    },
    "doi": {
      "type": ["string", "null"],
      "pattern": "^10\\.\\d{4,9}/[-._;()/:A-Za-z0-9]+$",
      "description": "Standard Digital Object Identifier if published in an indexed journal."
    },
    "publication_venue": {
      "type": ["string", "null"],
      "description": "Journal name, conference proceedings, or institutional capstone archive repository."
    },
    "keywords": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 15,
      "description": "Extracted technical keywords and domain terminology."
    }
  },
  "additionalProperties": false
}
```

---

## 4. Multi-Format Dataset Curation & Augmentation Strategy

To ensure zero-shot generalization across unpredictable academic document submissions, the training set must be curated across 4 orthogonal dimensions:

```
                      ┌───────────────────────────────────────┐
                      │    BukSU 4-Dimensional Diversity      │
                      └──────────────────┬────────────────────┘
                                         │
         ┌──────────────────┬────────────┴───────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
┌─────────────────┐┌─────────────────┐┌────────────────────┐┌─────────────────┐
│ Document Layout ││ Typography/Lang ││   Visual Quality   ││Metadata Position│
├─────────────────┤├─────────────────┤├────────────────────┤├─────────────────┤
│• 1-Col Thesis   ││• Serif (Times)  ││• 300 DPI Pristine  ││• Header / Mast  │
│• 2-Col IEEE/ACM ││• Sans (Arial)   ││• 150 DPI Compressed││• Footer / Notes │
│• 3-Col Conf.    ││• English / Fil. ││• 1-5° Skew & Blur  ││• Sidebar Column │
│• Split Sidebars ││• Bold Headings  ││• Watermark Overlays││• End Transmittal│
└─────────────────┘└─────────────────┘└────────────────────┘└─────────────────┘
```

### 4.1 Data Sources Composition
1.  **In-House BukSU Archive (High Value Domain Set, 40%)**: Actual historical BukSU IT Capstone manuscripts, journals, and project transmittals.
2.  **Open Academic Pre-print Datasets (Foundation Diversity, 30%)**: ArXiv, PubMed Central, and OpenAlex papers covering diverse typesetting templates.
3.  **Synthetic Layout Generator (Extreme Corner Cases, 20%)**: Programmatically generated PDFs using LaTeX and Weasyprint with randomized margins, multi-column divisions, and floating DOI boxes.
4.  **Noisy Scan Emulation (Visual Robustness, 10%)**: Augmenting digital PDFs with random Gaussian noise, perspective warp ($\pm 4^{\circ}$), brightness attenuation, and simulated Xerox photocopy artifacts.

---

## 5. Practical Fine-Tuning Recipe: QLoRA & Axolotl

For the compact `PaddleOCR-VL-0.9B` model, **QLoRA (Quantized Low-Rank Adaptation)** enables full fine-tuning of vision-language projections on a single consumer GPU (e.g. RTX 3090/4090 with 24 GB VRAM or V100/A100).

### 5.1 Axolotl Configuration (`config/axolotl_paddleocr_vl_0.9b.yaml`)

```yaml
base_model: PaddlePaddle/PaddleOCR-VL-0.9B
model_type: AutoModelForVision2Seq
tokenizer_type: AutoTokenizer

load_in_4bit: true
adapter: qlora
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj
  - vision_projection

datasets:
  - path: data/buksu_ocr_instructions.jsonl
    type: chat_template
    chat_template: chatml
    roles:
      user: ["user"]
      assistant: ["assistant"]

dataset_prepared_path: last_run_prepared
val_set_size: 0.1
output_dir: ./output/paddleocr_vl_buksu_v1

sequence_len: 4096
sample_packing: false
pad_to_sequence_len: true

gradient_accumulation_steps: 4
micro_batch_size: 2
num_epochs: 3
optimizer: paged_adamw_8bit
lr_scheduler: cosine
learning_rate: 0.0001
warmup_ratio: 0.05
weight_decay: 0.01

gradient_checkpointing: true
early_stopping_patience: 3

eval_steps: 50
save_steps: 100
logging_steps: 10
bf16: true
tf32: true
```

---

## 6. The BukSU Active Learning Flywheel (UI Feedback $\to$ Training Data)

CMS-V2 already captures user corrections via the UI. When instructors or students adjust extracted fields in `ExistingCapstoneUploadPage.jsx`, the frontend invokes `POST /api/documents/metadata-feedback`.

```text
[ExistingCapstoneUploadPage] ─── (User corrects field)
            │
            ▼
[POST /api/documents/metadata-feedback]
            │
            ▼
[MongoDB: MetadataExtractionFeedback]
  - fieldName: "doi"
  - extractedValue: "None"
  - correctedValue: "10.3390/rs17142529"
  - sourceHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            │
            ▼ (Nightly Cron Job)
[Export to JSONL Training Triples] (scripts/export-ocr-training-data.js)
            │
            ▼
[Continuous Fine-Tuning Pipeline] ─── (Axolotl / LoRA Checkpoint)
            │
            ▼
[Hot Reload Microservice] (cms-ocr-engine:8000)
```

---

## 7. Comprehensive Evaluation Benchmark Metrics

| Metric | Target Standard | Evaluation Method |
| :--- | :--- | :--- |
| **JSON Validity Rate** | $\ge 99.8\%$ | Validates complete parsability through strict `json.loads` without regex sanitization. |
| **Schema Compliance Rate** | $\ge 98.5\%$ | Validates all 4 required keys (`title`, `abstract`, `authors`, `publication_year`) exist with correct data types. |
| **Title Normalized Edit Distance ($1 - \text{NED}$)** | $\ge 96.0\%$ | Measures character-level fidelity on formal project titles. |
| **Abstract Normalized Edit Distance ($1 - \text{NED}$)** | $\ge 94.0\%$ | Measures semantic and syntactic fidelity over multi-paragraph abstracts. |
| **Author Extraction Set $F_1$** | $\ge 95.0\%$ | Exact string match of author names within array sets, ignoring ordering differences. |
| **Publication Year Exact Match** | $\ge 99.0\%$ | Exact 4-digit Gregorian calendar match against official defense documentation. |
| **P50 Latency (Page 1 Layout Analysis)** | $\le 1.8\text{s}$ | End-to-end inference latency on single GPU. |
