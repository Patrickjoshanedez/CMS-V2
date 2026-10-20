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

This skill codifies the architectural rules, data schemas, API routes, and frontend state patterns for the BukSU workflow: Phase 0 followed by three one-semester Capstone courses across Phases 2–4. Keep persisted `workflowPhase` (0–4) distinct from legacy `capstonePhase` (course number 1–3).

---

## 1. Five-Phase Progressive State Machine

```
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┬────────────────────────┐
│ Phase 0: Formation│ Phase 1: Proposal │ Phase 2: Ch. 1–3  │ Phase 3: System   │ Phase 4: Final Defense │
│                   │                   │      & ADM v1     │    Dev & Gantt    │   & Auto-Archive       │
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼────────────────────────┤
│ • 1–4 Members     │ • 1..10 Proposals │ • Iterative Ch.   │ • Gantt Tracker   │ • Ch. 4–5 Upload       │
│ • 5 Proponent     │ • Dual-Engine     │   Uploads         │ • Task Progress   │ • Blind Scoring Panel  │
│   Roles Assigned  │   Similarity Scan │ • Faculty Document│ • Midterm ADM v2  │ • ADM Final Sign-off   │
│ • Instructor      │ • Cascaded Thresh-│   Review Anchors  │ • Lateness Justi- │ • FRINS6 Synthesis     │
│   Appoints Com-   │   old Validation  │ • Sec. Minutes    │   fication Inter- │ • Public Cold Storage  │
│   mittee          │ • Title Hearing   │   Auto-Population │   ceptor          │   Auto-Migration       │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴────────────────────────┘
```

Course mapping: Phase 1 is pre-course proposal review; Phase 2 is Capstone 1, Phase 3 is Capstone 2, and Phase 4 is Capstone 3. Each Capstone course occupies one academic semester.

---

## 2. Key Architectural Patterns

### 2.1 Phase 0: Profile Setup & Team Formation
- **Team Size**: Strict minimum of 2 and maximum of 4 members (`MAX_TEAM_MEMBERS = 4`).
- **Profile Gate**: Student ID, section, and assigned Capstone Instructor must be complete before roster lock; degree program and academic year come from the selected section.
- **Term Uniqueness**: A student cannot join another active capstone project in the same academic term.
- **5 Standard Roles**:
  1. `Project Lead & Systems Analyst`
  2. `Frontend & UI/UX Developer`
  3. `Backend & Database Developer`
  4. `Full-Stack Developer`
  5. `QA & Technical Documentor`
- **Lock Guard**: Enforces roster size and complete student profiles before the team is locked.
- **Responsibilities**: Member responsibilities are separate from institutional committee appointments.

### 2.2 Phase 1: Dynamic Title Proposals & Similarity Cascading
- **Constraint**: Proponents submit between **1 and 10** title proposals with dynamic "Add More" / "Done" UI actions (no rigid 3-proposal minimum).
- **Classification**: Categorized under "IT Field of Discipline" with matching SDG tags (1..17).
- **Dynamic Threshold**: Cascaded via `usePolicyStore` from `GET /api/settings` (`maxSimilarityThreshold`).
- **Dual-Engine Scan**: Karp-Rabin $k$-gram Winnowing footprints (exact match) + PyTorch dense MiniLM embeddings (semantic cosine similarity).
- **Approval Gate**: The Capstone Instructor reviews candidate topics and faculty committee roles are assigned. Title approval advances the overall workflow to Phase 2; it does not prove that a defense occurred.

### 2.3 Phase 2: Chapters 1–3, Document Review & Integrated ADM v1
- **Drafting & Revisions**: Iterative upload buffers for Chapters 1-3.
- **Sequential Review**: Adviser approval of each chapter unlocks the next; compilation, plagiarism clearance, Adviser endorsement, and defense scheduling follow Chapter 3.
- **Inline Annotations**: Normalized coordinates `{ page, lineStart, lineEnd, selectedText }` with author badges and resolution toggles.
- **Secretary Defense Minutes**: Secretary records or uploads defense minutes; suggestions auto-populate into ADM v1.
- **Student Action Fields**: Proponents enter implementation details in `actionsTaken` and `pageNumbers`.
- **Grade Visibility**: Panel scores remain hidden from students until the Capstone Instructor releases them.
- **Signatories**: ADM v1 records the required Panel Chair, Panelist, Secretary, Adviser, and Instructor verification.
- **Print Styles**: `.no-print` classes on buttons and controls to produce institutional PDF/print exports.

### 2.4 Phase 3: Capstone 2 System Development & Interactive Gantt Tracker
- **Gantt Engine**: 4 standard sections (Planning & Research, Architecture & Design, System Dev & Infrastructure, Testing & Optimization) with task durations and progress sliders.
- **Adviser Gate**: The assigned Adviser approves the schedule before students log daily progress.
- **Weekly Progress**: Check-ins use approved schedule deadlines; overdue entries require Adviser review and Instructor waiver.
- **Prototype Clearance**: GitHub and media evidence plus Adviser clearance gate system defense scheduling.
- **ADM v2**: Tracks prototype defense feedback; grades remain hidden until Instructor release.

### 2.5 Phase 4: Capstone 3 Final Defense & Archival
- **Sequential Review**: Chapters 4 and 5 require Adviser approval before final manuscript compilation.
- **Dual Deliverables**: Compile the complete academic manuscript and condensed journal paper; both must pass plagiarism checks before defense clearance.
- **Grade Visibility**: Final panel scores remain hidden until the Capstone Instructor releases them.
- **ADM v3 & Archive**: Complete required signatures and approval sheet before archive indexing and completion certificate generation.

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
