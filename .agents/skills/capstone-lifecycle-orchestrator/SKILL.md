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

This skill codifies the architectural rules, data schemas, API routes, and frontend state patterns for the **5-phase BukSU Capstone Management System lifecycle**.

---

## 1. 5-Phase Progressive State Machine

```
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┬────────────────────────┐
│ Phase 0: Formation│ Phase 1: Proposal │ Phase 2: Ch. 1–3  │ Phase 3: System   │ Phase 4: Final Defense │
│                   │                   │      & ADM v1     │    Dev & Gantt    │   & Auto-Archive       │
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼────────────────────────┤
│ • 2–4 Members     │ • 1..10 Proposals │ • Iterative Ch.   │ • Gantt Tracker   │ • Ch. 4–5 Upload       │
│ • 5 Proponent     │ • Dual-Engine     │   Uploads         │ • Task Progress   │ • Blind Scoring Panel  │
│   Roles Assigned  │   Similarity Scan │ • Faculty Document│ • Midterm ADM v2  │ • ADM Final Sign-off   │
│ • Instructor      │ • Cascaded Thresh-│   Review Anchors  │ • Lateness Justi- │ • FRINS6 Synthesis     │
│   Appoints Com-   │   old Validation  │ • Sec. Minutes    │   fication Inter- │ • Public Cold Storage  │
│   mittee          │ • Title Hearing   │   Auto-Population │   ceptor          │   Auto-Migration       │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴────────────────────────┘
```

---

## 2. Key Architectural Patterns

### 2.1 Phase 0: Team Formation & 5 Standardized Roles
- **Team Size**: Strict minimum of 2 and maximum of 4 members (`MAX_TEAM_MEMBERS = 4`).
- **5 Standard Roles**:
  1. `Project Lead & Systems Analyst`
  2. `Frontend & UI/UX Developer`
  3. `Backend & Database Developer`
  4. `Full-Stack Developer`
  5. `QA & Technical Documentor`
- **Lock Guard**: Enforces zero duplicate role assignments; locked via `POST /api/teams/:id/lock`.
- **Committee Dispatch**: Assigned by Instructor: Adviser, Secretary, and 3 Panelists (Panelist 1 designated as Chair).

### 2.2 Phase 1: Dynamic Title Proposals & Similarity Cascading
- **Constraint**: Proponents submit between **1 and 10** title proposals with dynamic "Add More" / "Done" UI actions (no rigid 3-proposal minimum).
- **Classification**: Categorized under "IT Field of Discipline" with matching SDG tags (1..17).
- **Dynamic Threshold**: Cascaded via `usePolicyStore` from `GET /api/settings` (`maxSimilarityThreshold`).
- **Dual-Engine Scan**: Karp-Rabin $k$-gram Winnowing footprints (exact match) + PyTorch dense MiniLM embeddings (semantic cosine similarity).
- **Approval Gate**: Panel chair approves 1 proposal, advancing team to Capstone 2 (`capstonePhase = 2`).

### 2.3 Phase 2: Chapters 1–3, Document Review & Integrated ADM v1
- **Drafting & Revisions**: Iterative upload buffers for Chapters 1-3.
- **Inline Annotations**: Normalized coordinates `{ page, lineStart, lineEnd, selectedText }` with author badges and resolution toggles.
- **Secretary Defense Minutes**: Secretary uploads defense minutes; suggestions auto-populate into `ActionDoneMatrix`.
- **Student Action Fields**: Proponents enter implementation details in `actionsTaken` and `pageNumbers`.
- **Tiered Signatories Board**:
  - *Tier 1*: Adviser & Instructor signatures
  - *Tier 2*: Defense Panelists signatures
  - *Tier 3*: Committee Chair final endorsement
- **Print Styles**: `.no-print` classes on buttons and controls to produce institutional PDF/print exports.

### 2.4 Phase 3: System Development & Interactive Gantt Tracker
- **Gantt Engine**: 4 standard sections (Planning & Research, Architecture & Design, System Dev & Infrastructure, Testing & Optimization) with task durations and progress sliders.
- **Late Justification Interceptor**: Intercepts upload actions when `submittedAt > deadlineAt`, requiring formal explanation and attachment for instructor approval.
- **Capstone 3 ADM v2**: Tracks prototype and midterm defense feedback.

### 2.5 Phase 4: Final Defense, Blind Shield & Auto-Archival
- **Full Manuscript**: Chapters 1-5 combined upload with certificates.
- **Blind Evaluation Shield**: Panelists independently score rubrics; aggregate scores are masked on student dashboards until chair deliberations conclude.
- **FRINS6 Compliance Synthesis**: Server synthesizes approved manuscript, rubric scores, plagiarism certificate, and cryptographically signed ADM.
- **Auto-Archiving Pipeline**: Chair final sign-off atomically sets `isArchived = true`, `projectStatus = 'archived'`, populates public **Research Archive**, streams approved PDF, and formats APA 7th / IEEE citations.

### 2.6 Concurrency, Sync & Atomic Patching
- **Granular Endpoint**: `PATCH /api/adm/:projectId/rows/:itemId` targets only `{ "rows.$.suggestions": val }` or `{ "rows.$.actionsTaken": val }`.
- **Debounced Autosave**: 750ms debouncing with inline status badges (`Saving...` $\to$ `Saved`).
- **Post-Signature Row Freezing**: Row cells are locked immediately upon panelist signature.

---

## 3. Pre-Commit Quality Verification Sequence

```bash
# 1. API route parity (185 server / 164 client, 0 unmatched)
npm run check:endpoints

# 2. React frontend unit & fidelity tests
npm test --workspace=client

# 3. Server comprehensive 13-stage workflow integration suite
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js

# 4. Agentic policy audit (60/60 checks)
npm run validate:agentic

# 5. Agent synchronization and coherence validation
npm run validate:governance

# 6. Workspace guardrail audit
python scripts/workspace_guardrail.py
```
