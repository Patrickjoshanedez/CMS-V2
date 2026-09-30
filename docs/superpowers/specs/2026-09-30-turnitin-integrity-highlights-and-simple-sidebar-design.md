# Turnitin-Style Integrity Highlights Grounding & Non-Technical Sidebar Overhaul Design Spec

**Date:** 2026-09-30  
**Status:** Approved  
**Author:** Antigravity  

---

## 1. Executive Summary & Goal
The objective is to fix the PDF similarity highlight failure in the Academic Archive Manuscript Viewer (`CanonicalDocumentViewer.jsx`), ensuring that high-similarity papers (e.g. 90% similarity) visually render Turnitin-style highlight overlays with colored markers and numbered source badges (`[1]`, `[2]...`) on the actual PDF text. Simultaneously, all technical and algorithmic jargon in the sidebar (such as "Winnowing", "Embedding Cosine", "Visual Tiers & Context Signals", and "Verbatim") is replaced with plain, universally understood language (such as "Word-for-Word Match", "Similar Meaning", "Highlight Color Guide", and "Exact Match").

---

## 2. Root Cause Investigation (Systematic Debugging)

### Defect 1: Hardcoded `project.title` on All Conflict Spans
In `CanonicalDocumentViewer.jsx` lines 466–495, both `titleConflicts` and `abstractConflicts` were mapped with:
```javascript
matchedText: project?.title || '',
spans: [{ matchedText: project?.title || '' }]
```
1. For **abstract conflicts** (even with 100% similarity on the abstract), `matchedText` was set to `project.title` instead of the abstract sentences. As a result, the viewer never attempted to ground the abstract text in the PDF.
2. For **title conflicts**, `project.title` in MongoDB contained a draft/truncated title (`"elevation aware domain adaptation for sematic segm academic paper"`), whereas the PDF document contained the full canonical title (`"Elevation-Aware Domain Adaptation for Sematic Segmentation of Aerial Images"`), which was also present in `c.title`. Because `CanonicalDocumentViewer.jsx` ignored `c.title` and only passed `project.title`, the PDF text search failed.

### Defect 2: Rigid Text Grounding in `plagiarismHighlightAdapter.js`
In `plagiarismHighlightAdapter.js`, `getTextPosition(pdfDocument, cleanedText, { fuzzyThreshold: 0.85 })` was called with a single string. If the string had a length $< 70$ or differed by more than 15% edit distance, `getTextPosition` returned `null`, discarding the highlight entirely without attempting sentence or key-phrase fallback.

### Defect 3: Cognitive Friction from Academic/Technical Jargon in Sidebar
The sidebar displayed specialized algorithmic terms:
- `"Exact Overlap (Winnowing): 85%"` (Computer science Rabin-Karp fingerprinting)
- `"Semantic Overlap (Embedding Cosine): 75%"` (Vector space mathematics)
- `"Visual Tiers & Context Signals"` (Internal architecture terminology)
- `"VERBATIM"`, `"PARAPHRASE"`, `"MIXED"` (Technical classification tags)
Students and faculty need clear, plain-language metrics that immediately communicate similarity without requiring a computer science background.

---

## 3. Architecture & Detailed Design

### 3.1 Resilient Text Grounding & Sentence Decomposition (`CanonicalDocumentViewer.jsx`)
1. **Title Conflicts Resolution:**
   - For each conflict in `titleConflicts`, construct a prioritized list of candidate phrases:
     - `c.title` (Conflicting archived paper title, e.g. `"Elevation-Aware Domain Adaptation for Sematic Segmentation of Aerial Images"`)
     - `project.title` (Current project title)
     - Significant phrase tokens ($\ge 4$ words) common to both titles.
   - Store these candidates in `spans` so the grounding engine can match either.
2. **Abstract Conflicts Resolution:**
   - When an abstract conflict is present (e.g. similarity $\ge 60\%$), extract `project.abstract`.
   - Decompose `project.abstract` into discrete sentences using `/(?<=[.?!])\s+/`.
   - Filter for meaningful sentences ($\ge 30$ characters, excluding citations/boilerplate).
   - Generate discrete spans for each sentence. This ensures Turnitin-style visual highlighting where the entire matching abstract is highlighted sentence-by-sentence with the source's color and badge.
3. **Plagiarism Matches Packaging:**
   - Pass `candidateTexts: [sp.matchedText, src.matchedText, c.title, project.title].filter(Boolean)` in each `plagiarismMatch` item.

### 3.2 Enhanced Grounding Fallback (`plagiarismHighlightAdapter.js`)
Update `resolvePlagiarismHighlights`:
1. Iterate through `candidateTexts` for each suspect match.
2. For each candidate:
   - Attempt exact/fuzzy `getTextPosition`.
   - If that fails and candidate has multiple sentences, attempt sentence-level matching.
   - If candidate is a title or phrase and still fails, extract the leading 4–6 word chunk (which is almost always intact on page 1) and query `getTextPosition`.
3. When grounded:
   - Create standard Turnitin highlight rectangles with `mixBlendMode: 'multiply'`, `borderRadius: '2px'`, solid bottom border, and numbered source badge `[N]` on the top-left of the first rectangle.

### 3.3 Plain-English Sidebar & Legend Redesign
Replace all technical jargon across `CanonicalDocumentViewer.jsx`:

| Current Technical Term | New Plain-English Term | Rationale |
| :--- | :--- | :--- |
| `Exact Overlap (Winnowing): {N}%` | `Word-for-Word Match: {N}%` | Immediately understandable as exact phrase matching |
| `Semantic Overlap (Embedding Cosine): {N}%` | `Similar Meaning: {N}%` | Clear indicator of paraphrasing or conceptual similarity |
| `Visual Tiers & Context Signals` | `Highlight Color Guide` | Intuitive legend header for readers |
| `VERBATIM` badge | `EXACT MATCH` | Standard plain-English label |
| `PARAPHRASE` badge | `REPHRASED` | Standard plain-English label |
| `MIXED` badge | `PARTIAL MATCH` | Standard plain-English label |
| `Similar Manuscript Passage:` | `Matched Text in Paper:` | Natural and direct reading label |
| `Low (<50%)`, `Med (50-69%)`, `High (70-89%)`, `Critical (>=90%)` | Retained with clean descriptions | Simple percentage brackets are clear |

---

## 4. Verification & Testing Protocol
1. **Targeted Unit Tests:**
   - `client/src/utils/plagiarismHighlightAdapter.test.js`: Add test assertions for candidate text fallbacks and sentence decomposition.
   - `client/src/components/archive/CanonicalDocumentViewer.test.jsx`: Update assertions for new plain-language labels (`Word-for-Word Match`, `Similar Meaning`, `Highlight Color Guide`).
2. **Browser Automation Visual Feedback Loop (`scratch/visual_audit_integrity_highlights.mjs`):**
   - Execute Playwright to render `/archive/document/6abb6988f579ad965f29d9f9`.
   - Switch to `Integrity Highlights` tab.
   - Capture 4 distinct screenshots:
     - Desktop Viewport (1440x900) - Light Mode
     - Desktop Viewport (1440x900) - Dark Mode
     - Mobile Viewport (390x844) - Light Mode
     - Mobile Viewport (390x844) - Dark Mode
   - Assert presence of:
     - Turnitin highlight overlay rectangles on the PDF canvas.
     - Numbered source badges (`[1]`, `[2]`).
     - Plain-English sidebar labels (`Word-for-Word Match`, `Similar Meaning`, `Highlight Color Guide`, `EXACT MATCH`).
3. **Quality Gates:**
   - `npm run check:endpoints` (UNMATCHED_COUNT = 0)
   - `npm run validate:agentic` (60/60 checks passed)
   - Client unit test suite passing.
