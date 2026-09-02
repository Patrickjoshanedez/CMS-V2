---
name: capstone-lifecycle-orchestrator
version: 1.0.0
schema-version: 1
description: >
  End-to-end orchestration patterns for BukSU Capstone Management System V2.
  Use when implementing or modifying multi-phase capstone lifecycles, dynamic title proposals (1..10),
  unified faculty account role mapping (chair, secretary, panelist, adviser), Action Done Matrix (ADM)
  with multi-signatory digital sign-off, inline Google Docs-style annotations, late justification gating,
  automated final defense archival, Winnowing vs. MiniLM plagiarism separation, or automated CI/CD tagging.
  Triggers on: "capstone workflow", "action done matrix", "title proposal", "defense evaluation",
  "inline annotations", "committee assignment", "archived reader", "soft-delete retention".
---

# Capstone Lifecycle Orchestration (CMS-V2)

This skill codifies the architectural rules, data schemas, API routes, and frontend state patterns for the 4-phase BukSU Capstone Management System lifecycle.

---

## 1. Core Lifecycle Phases

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Capstone 1    │ ───►  │   Capstone 2    │ ───►  │   Capstone 3    │ ───►  │   Capstone 4    │
│Proposal Defense │       │  Ch 1-3 & ADM   │       │  Ch 4-5 & ADM   │       │ Final & Archival│
│ 1..10 Proposals │       │ Inline Feedback │       │ System Dev      │       │ Full Paper, Jrnl│
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. Key Architectural Patterns

### 2.1 Dynamic Title Proposals (No 3-Proposal Hard Minimum)
- **Constraint**: Proponents can submit between **1 and 10** title proposals with dynamic "Add More" / "Done" UI actions.
- **Validation**: Schema enforces `arr.length >= 1 && arr.length <= 10` in `project.model.js` and `project.validation.js`.
- **Classification**: Categorized under "IT Field of Discipline" with matching SDG tags.

### 2.2 Unified Faculty Account & Committee Dispatch
- **Unified Role**: Single `ROLES.FACULTY` account covers all academic committee roles.
- **Role Assignment**:
  - `PANEL_ROLES.CHAIR`: Panel chair presiding over defense and final approval.
  - `PANEL_ROLES.SECRETARY`: Recording defense minutes and populating ADM items.
  - `PANEL_ROLES.MEMBER`: Panel evaluation scoring.
  - `ROLES.ADVISER`: Research guidance, consultation logging, and repository monitoring.

### 2.3 Capstone 2 and 3 (Chapters + Integrated ADM)
- **Drafting & Revisions**: Capstone 2 is strictly Chapters 1-3 manuscript drafting, followed by Defense and the Action Done Matrix. Capstone 3 is Chapters 4-5, Prototype Development, and its own ADM phase.
- **Integrated ADM UI**: ADM is NOT a standalone tab; it is integrated directly inside the Capstone 2 and Capstone 3 views to enforce continuity of feedback tracking.
- **Defense Minutes Extraction**: Secretary uploads defense minutes; action items auto-populate the Action Done Matrix.
- **Multi-Signatory Verification**: Each ADM item contains a cryptographic `signatures` array tracking `{ userId, name, role, signedAt, signatureDataUrl }`.

### 2.4 Google Docs-Style Inline Annotations
- Reviewers highlight precise line ranges (`page`, `lineStart`, `lineEnd`, `selectedText`).
- Proponents view reviewer annotations with author badges, timestamp, and resolved check states.

### 2.5 Late Justification Gating
- Justification input modal and submission flags activate **only** when `submittedAt > deadlineAt`.

### 2.6 Automatic Archival on Final Defense Release
- Instructor evaluation release (`POST /api/evaluations/:projectId/final/release`) atomically sets:
  - `project.isArchived = true`
  - `project.projectStatus = 'archived'`
  - `project.archivedAt = new Date()`
- Archived projects route directly to the full manuscript reader, abstract, and citation generators.

### 2.7 Definite Lexical Plagiarism vs. Semantic Similarity Separation
- **Lexical Overlap**: Karp-Rabin $k$-gram fingerprinting via Winnowing algorithm.
- **Semantic Similarity**: Dense MiniLM vector cosine similarity ($384$-dimensional embeddings via Sentence-Transformers).

---

## 3. Verification & Quality Gates

When modifying capstone workflows, execute the complete verification chain:

```bash
# 1. Comprehensive 13-stage all-workflows integration test
npx vitest run tests/integration/comprehensive-all-workflows.test.js --fileParallelism=false

# 2. Live workflow evidence generator
node scripts/verify-all-workflows-evidence.mjs

# 3. Client unit and store tests
npm test --workspace=client

# 4. Agentic governance compliance
npm run validate:agentic
```
