# Frontend Mythos: Token Compression & Playwright Payload Optimization

When executing multi-iteration visual verification loops, raw CLI outputs, verbose React hydration stack traces, and unminified DOM trees can consume thousands of tokens per cycle. This reference defines:
1. The **Minified Playwright Output JSON Schema** ("RTK" Principle).
2. The **Local LLMLingua-2 Token Compression Pipeline**.
3. **HTML/DOM Tree Tuning** to compress structural markup by up to 75% without corrupting syntax.

---

## 1. Minified Playwright Output JSON Schema

Raw Playwright execution often produces 800+ lines of duplicate React key warnings, Webpack bundle internals, and CSS source maps. The Mythos runner passes logs through a deduplication and normalization filter to produce a high-density, low-noise payload.

### The JSON Schema (`report.schema.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MythosVisualVerifyReport",
  "type": "object",
  "required": ["status", "url", "timestamp", "summary", "screenshots"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["passed", "warning", "failed"]
    },
    "url": { "type": "string", "format": "uri" },
    "timestamp": { "type": "string", "format": "date-time" },
    "summary": {
      "type": "object",
      "required": ["totalErrors", "uniqueErrors", "layoutShiftsDetected"],
      "properties": {
        "totalErrors": { "type": "integer" },
        "uniqueErrors": { "type": "integer" },
        "layoutShiftsDetected": { "type": "boolean" },
        "hydrationMismatch": { "type": "boolean" }
      }
    },
    "deduplicatedErrors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "message", "count", "origin"],
        "properties": {
          "type": { "type": "string", "enum": ["console.error", "pageerror", "hydration", "network"] },
          "message": { "type": "string", "description": "Normalized, single-line error message" },
          "count": { "type": "integer", "description": "Number of times this error fired" },
          "origin": { "type": "string", "description": "File and line number of first occurrence (e.g., App.tsx:42)" }
        }
      }
    },
    "adversarialResults": {
      "type": "object",
      "properties": {
        "germanNounTest": {
          "type": "object",
          "properties": {
            "passed": { "type": "boolean" },
            "overflowPixels": { "type": "number" },
            "failingSelector": { "type": "string" }
          }
        },
        "zeroDataTest": {
          "type": "object",
          "properties": {
            "passed": { "type": "boolean" },
            "containerCollapsed": { "type": "boolean" }
          }
        },
        "latency3GTest": {
          "type": "object",
          "properties": {
            "passed": { "type": "boolean" },
            "clsScore": { "type": "number" }
          }
        }
      }
    },
    "screenshots": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### Example Minified Report (Consumes ~120 tokens instead of 2,500)
```json
{
  "status": "warning",
  "url": "http://localhost:3000/dashboard",
  "timestamp": "2026-09-30T22:35:00.000Z",
  "summary": {
    "totalErrors": 24,
    "uniqueErrors": 1,
    "layoutShiftsDetected": false,
    "hydrationMismatch": false
  },
  "deduplicatedErrors": [
    {
      "type": "console.error",
      "message": "Each child in a list should have a unique 'key' prop.",
      "count": 24,
      "origin": "MetricCardGrid.tsx:38"
    }
  ],
  "adversarialResults": {
    "germanNounTest": {
      "passed": false,
      "overflowPixels": 18.5,
      "failingSelector": ".badge-title"
    },
    "zeroDataTest": { "passed": true, "containerCollapsed": false },
    "latency3GTest": { "passed": true, "clsScore": 0.002 }
  },
  "screenshots": ["desktop.png", "tablet.png", "mobile.png"]
}
```

---

## 2. Tuning LLMLingua-2 for HTML/DOM Tree Compression

When capturing intermediate DOM trees for Claude or Gemini to review, generic compressors often strip closing tags (`</div>`), break attribute quotes, or drop critical CSS selectors.

### The DOM Compression Problem
A standard compressor trained on conversational text treats `<div class="p-4 flex">` as expendable punctuation, destroying:
1. Closing tags required for XML/HTML parsing.
2. `class` and `id` tokens essential for Tailwind and CSS debugging.
3. Accessibility roles (`role="dialog"`, `aria-label`).

### The LLMLingua-2 Solution
Run Microsoft's `llmlingua-2-bert-base-multilingual-cased-meetingbank` with a strict `force_tokens` whitelist.

#### 1. The `force_tokens` Parameter
Explicitly lock structural punctuation so the BERT token-classifier cannot drop them:
```python
dom_force_tokens = [
    '\n', '\t', ' ', '{', '}', '[', ']', '(', ')',
    '<', '>', '/', '=', ':', '"', "'",
    'class', 'id', 'role', 'aria-', 'data-testid',
    'div', 'button', 'span', 'p', 'h1', 'h2', 'h3',
    'table', 'tr', 'td', 'th', 'form', 'input'
]
```

#### 2. Pre-Filtering Heuristics Before LLM Scoring
Before passing the DOM string to LLMLingua, strip non-semantic noise:
* **Collapse SVG Path Vectors**: Replace `d="M10 20 L30 40 ..."` ($500+$ tokens) with `d="[svg-path]"`.
* **Strip Base64 Images**: Replace `data:image/png;base64,...` with `[base64-data]`.
* **Prune Script / Style Tags**: Strip raw inline CSS bundles and Webpack hydration chunks.

```python
import re

def pre_filter_dom(dom_html: str) -> str:
    # 1. Prune SVG vectors
    dom_html = re.sub(r'd="[^"]{20,}"', 'd="[svg-path]"', dom_html)
    # 2. Prune base64 images
    dom_html = re.sub(r'data:image\/[^;]+;base64,[a-zA-Z0-9+/=]{30,}', '[base64-img]', dom_html)
    # 3. Prune inline scripts
    dom_html = re.sub(r'<script[\s\S]*?<\/script>', '', dom_html)
    return dom_html
```

#### 3. Recommended Budget Rates
* **Console Logs & Errors**: `target_rate = 0.20` to `0.25` (Compresses by $75\%\text{--}80\%$).
* **HTML/DOM Snapshots**: `target_rate = 0.35` to `0.45` (Compresses by $55\%\text{--}65\%$). Retains 100% of parent-child hierarchy and visual styling while dropping verbose boilerplate.

---

## 3. Running the Local Compression Server

The `scripts/compression-server.py` microservice exposes a local FastAPI endpoint at `http://localhost:8000/compress`.

### Start the Service
```bash
# In an isolated terminal or background process:
python .claude/skills/frontend-mythos/scripts/compression-server.py
```

### Calling from Playwright (`visual-verify.ts`)
The Playwright harness automatically queries `http://localhost:8000/compress`. If the service is running, it returns the compressed payload; if offline, it gracefully falls back to deterministic in-memory log deduplication.
