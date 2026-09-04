# BukSU CMS-V2 Comprehensive End-to-End System Workflow Specification
**System Standard Version:** v2.1.0-Production-Ready  
**Academic Institution:** Bukidnon State University (BukSU) Information Technology Department  
**Dossier Type:** Core Architectural, Functional & Deployment Specification  

---

## EXECUTIVE SUMMARY

The **BukSU Capstone Management System V2 (CMS-V2)** is a production-grade enterprise platform engineered to digitize, secure, and streamline the multi-stage undergraduate capstone lifecycle for the Information Technology Department [206]. Operating as an npm monorepo with integrated Python microservices, MongoDB, and background task worker queues, CMS-V2 unifies the academic review cycle with a secure developer lifecycle [207, 334]. 

This document serves as the definitive final specification, mapping two interconnected operational pipelines:
1. **The Academic Capstone Lifecycle Workflow:** The sequential progression guiding students, faculty (advisers, panelists, chairs, and secretaries), and capstone coordinators from account creation to certificate issuance [334, 951].
2. **The ASDLC Agentic Engineering & Deployment Pipeline:** The automated, state-bounded software engineering lifecycle executing rules-enforcement, structural code manipulation, automated test verifications, and git post-commit auto-tagging [334, 1129].

---

## SECTION 1: SYSTEM ARCHITECTURE & COMPONENT MAPPING

To maintain decoupled, resilient operation under high computational loads (such as parallel plagiarism scans and document rendering), CMS-V2 splits responsibilities across specialized tiers [47, 105]:

```
                     ┌───────────────────────────────────┐
                     │          React 18 SPA             │
                     │    (Zustand / TanStack Query)     │
                     └─────────────────┬─────────────────┘
                                       │ HTTP / WebSockets
                                       ▼
                     ┌───────────────────────────────────┐
                     │       Express API Gateway         │
                     │     (Mongoose / cookie JWT)       │
                     └─────────┬───────────────────┬─────┘
                               │                   │
                     Redis/    │                   │ HTTP
                     BullMQ    ▼                   ▼
                     ┌──────────────┐    ┌───────────────────┐
                     │ Celery Queue │    │ FastAPI ML Engine │
                     │   Workers    │    │ (ChromaDB Vector) │
                     └──────────────┘    └───────────────────┘
```

*   **Presentation Layer (Client):** Developed using **React 18.3**, **Vite 8**, **Tailwind CSS 3.4**, and **Zustand 5** [2, 326]. It executes dynamic client-side route-gating, renders split-screen PDF previewers with coordinate comment overlays, and features dynamic accessibility/multiplier scales [1, 2, 504].
*   **Application Gateway (Server):** Powered by **Node.js 18+**, **Express 5.2.1**, and **Mongoose 9.4.1** [1]. It acts as a stateless REST API, enforces Role-Based Access Control (RBAC), manages Socket.IO real-time notification streams, and dispatches background computations to Redis-backed queues [1, 47, 207].
*   **Plagiarism Engine (ML Core):** Built with **FastAPI**, **Celery**, and **ChromaDB**, wrapping a **PyTorch-backed Sentence-Transformer (`all-MiniLM-L6-v2`)** [2, 207, 208]. It pre-computes 384-dimensional dense vectors and performs Reciprocal Rank Fusion searches across the institutional repository [207, 208, 481].
*   **Durable Storage Tier:** Abstracts file-system access using a unified interface wrapper (`storage.service.js`) supporting dynamic switches between local filesystem structures (`/uploads`) and AWS S3-compatible cloud buckets [3, 45].

---

## SECTION 2: THE ACADEMIC CAPSTONE LIFECYCLE WORKFLOW

The academic workflow operates as a "lock-step" state machine, preventing students from bypassing milestones or accessing restricted states prematurely [996].

```
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │    PHASE 0    │     │    PHASE 1    │     │    PHASE 2    │
 │Team Formation │────►│ Capstone 1    │────►│  Capstone 2   │
 │ & Roster Lock │     │Title Proposals│     │Chapters 1–3   │
 └───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
 ┌───────────────┐     ┌───────────────┐             │
 │    PHASE 4    │     │    PHASE 3    │     ┌───────▼───────┐
 │  Capstone 4   │◄────│  Capstone 3   │◄────│   ADM v1      │
 │ Final Defense │     │  System Dev   │     │  Sign-off     │
 │ & Archival    │     │ & Gantt Chart │     └───────────────┘
 └───────────────┘     └───────────────┘
```

### Phase 0: Team Formation, Discipline Alignment & Roster Locking
*   **Team Capacity Constraint:** Students initiate team profiles under `TeamsPage.jsx`, generating secure invitation tokens [738]. In alignment with BukSU IT department mandates, teams are capped at a **minimum of 2 and a maximum of 4 members** [251, 504].
*   **5 Standard Proponent Roles:** Teams assign standardized roles: (1) `Project Lead & Systems Analyst`, (2) `Frontend & UI/UX Developer`, (3) `Backend & Database Developer`, (4) `Full-Stack Developer`, (5) `QA & Technical Documentor`.
*   **Academic Taxonomy Tagging:** Teams are bound to a strict relational hierarchy: `Academic Year` → `Course (e.g., BSIT)` → `Section` [251, 951].
*   **The Team Lock Protocol:** Once the student group roster is complete, the Team Leader locks the group via `PATCH /api/teams/:id/lock` [251, 954]. This sets `isLocked: true`, freezes the team membership, and updates a **sticky, color-coded visual banner at the top of the interface** (Emerald Green for Open, Crimson Red for Locked) [140, 251, 812].
*   **Committee Appointment:** Instructors assign committee members via `AssignCommitteeDialog`: Adviser, Secretary, and 3 Panelists (Panelist 1 designated as Chair).

### Phase 1: Capstone 1 — Dynamic Title Proposals, Similarity Pre-Scan & Proposal Defense
*   **Dynamic Title Proposals:** Proponents submit between **1 and 10** title proposals with dynamic "Add More" / "Done" UI actions. Proposals are categorized by IT Field of Discipline with matching UN SDG alignments (1..17).
*   **Real-Time Title Similarity Pre-Scan:** As students draft titles inside `CreateProjectPage.jsx`, the system queries `POST /api/projects/title-check` to calculate cosine similarity against past approved BukSU capstones, rendering an interactive live compliance meter.
*   **Proposal Defense Hearing & Rubric Scoring:** Committee evaluates proposals using institutional rubrics (`DEFENSE_TYPES.PROPOSAL`). Scoring $\ge 75\%$ yields `titleStatus = 'approved'`, atomically advancing the project to Phase 2 (`capstonePhase = 2`).

### Phase 2: Capstone 2 — Chapters 1–3 Manuscript Ingestion, Plagiarism Scan v1 & ADM v1
*   **Manuscript Upload & Validation:** Students upload Chapters 1–3. Binary magic-byte validation enforces `%PDF` (0x25 0x50 0x44 0x46) signatures.
*   **Dual-Engine Plagiarism Screening (v1):** Fast Karp-Rabin $k$-gram Winnowing fingerprinting combined with PyTorch SentenceTransformers (`all-MiniLM-L6-v2`) via Celery/FastAPI. The institutional threshold (`< 25%`) is validated before defense endorsement.
*   **Midterm Oral Defense Hearing:** Committee conducts the oral proposal hearing (`DEFENSE_TYPES.MIDTERM`). Secretary logs panel minutes and recommendations.
*   **Action Done Matrix (ADM v1):** Panel suggestions auto-populate into ADM rows. Students log `actionsTaken` and `pageNumbers`. Multi-signatory digital sign-off (Tier 1: Adviser, Tier 2: Panelists, Tier 3: Chair) clears the milestone, advancing to Phase 3 (`capstonePhase = 3`).

### Phase 3: Capstone 3 — System Implementation, Interactive Gantt Tracker & Progress Defense
*   **Interactive Gantt Chart Tracker:** Tracks build velocity across 4 institutional sections: Planning & Research, Architecture & Design, System Dev & Infrastructure, Testing & Optimization.
*   **Late Justification Interceptor:** If uploads occur past deadline dates configured in system settings, submissions are flagged with `isLate: true`, rendering a `JustificationCard` locking further submissions until the adviser reviews and endorses the justification.
*   **Chapters 4–5 Progress & System Demo Defense:** Students submit working prototypes and draft Chapter 4 (Results & Discussion) and Chapter 5 (Conclusions & Recommendations). Committee conducts progress defense evaluation (`DEFENSE_TYPES.PAPER`).
*   **ADM v2 Sign-off:** Panel feedback from the prototype/progress defense is verified and signed off via `ADM v2`, advancing to Phase 4 (`capstonePhase = 4`).

### Phase 4: Capstone 4 — Final Defense, Multi-Tier ADM Sign-Off, Auto-Archiving & Certificates
*   **Full Manuscript Compilation:** Chapters 1–5 merged into final institutional manuscript with title defense approval gating.
*   **Deep Vector Plagiarism Scan:** Deep indexing and cross-corpus verification across ChromaDB.
*   **Blind Evaluation Shield & Final Defense:** Committee scores the final oral defense (`DEFENSE_TYPES.FINAL`). Panelist rubrics remain masked until the Chair concludes deliberations.
*   **3-Tier Multi-Signatory Sign-Off:** Digital signatures captured across Adviser, Panel Members, Panel Chair, and Dean.
*   **Auto-Archiving Database Hook:** Atomic transition setting `isArchived = true`, `projectStatus = 'archived'`, populating the public read-only **Research Archive** (`GET /api/archive/:id/view`), and issuing cryptographically sealed **Capstone Completion Certificates** with BUKSU seals via `CertificatePage.jsx`.

---

## SECTION 3: THE ASDLC AGENTIC ENGINEERING & DEPLOYMENT PIPELINE

To support continuous iteration on the CMS-V2 platform while preventing "silent gray errors"—which represent **75.17% of multi-agent failures** where code compiles but breaks underlying business logic—all repository changes execute under the **Agentic SDLC (ASDLC)** [96, 219, 1037].

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STAGE 1    │     │   STAGE 2    │     │   STAGE 3    │     │   STAGE 4    │
│    RULES     │────►│  ANALYZING   │────►│  INSPECTING  │────►│ AGENT CALL   │
│ Standing Ord.│     │Context Triage│     │ AST Traversal│     │  Statechart  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│   STAGE 8    │     │   STAGE 7    │     │   STAGE 6    │     ┌──────▼───────┐
│  FIX AUDIT   │◄────│  FINALIZING  │◄────│  VERIFYING   │◄────│   STAGE 5    │
│ IAL Watchdog │     │ MCP Pause/Res│     │Builder-Verif.│     │ CODE EDITING │
└──────────────┘     └──────────────┘     └──────────────┘     │   CST Patch  │
                                                               └──────────────┘
```

### Stage 1: Rules & Standing Orders (CLAUDE.md / AGENTS.md)
The repository enforces a strict **Two-Pile Architecture** for instruction design [13, 122]:
*   *Steering Pile:* Human style preferences, code guidelines, and formatting metrics [204]. These are conversational rules allowed to drift over sessions.
*   *Survival Pile:* Hard boundaries (file-write directories whitelists, local execution sandbox rules, and tool access limits) [204]. These are **governance rules** enforced by code wrappers outside the model's context window to prevent "governance decay" during context compaction [128, 129, 204].

### Stage 2: Context Analysis & Triage (C1 × T2)
To prevent "context rot" and attention dilution, the system segments codebase memory into **Static Instructions, Dynamic Task DAGs, and Ephemeral Scratchpads** [155, 746]. It restricts active directory visibility, ensuring file-exploration tools (`grep_search`, `list_dir`) ignore duplicate staging paths (`staging/`, `dashboard-ui/`), eliminating token bloat and OneDrive sync collisions (`EBUSY`/`EPERM`) [449, 1032].

### Stage 3: AST Inspection & Call-Graph Navigation
Unbounded full-file dumps are prohibited [18]. Instead, a specialized AST analyzer parses file targets into language-agnostic Universal AST (UniAST) schemas, letting the agent traverse call-graph chains, lookup type declarations, and map system dependencies in \(O(\log N)\) execution time [18, 370].

### Stage 4: Deterministic Statechart Orchestration
To avoid unpredictable, multi-agent conversational drift, orchestration is bound to SCXML-compliant Moore statecharts [153]. The state machine defines the workflow transitions; the language model acts as a task worker that can only choose valid transitions, ensuring complete process predictability across repeated runs [153, 176, 294].

### Stage 5: CST-Based Incremental Code Editing
Writing full files is blocked [154]. Editing is performed using **Incremental Patching** [154]. The agent outputs fine-grained unified diff edits; the orchestrator applies these edits to the Concrete Syntax Tree (CST) using the `tree.edit` API, preserving all formatting, indentations, and human code comments [154, 302].

### Stage 6: The Builder-Verifier Feedback Loop
An agent is never permitted to self-evaluate task completion [146]. The system pairs the generator/builder agent with a deterministic verification container [146, 238]. A task is committed only when the verifier executes local linters, TypeScript compilers, and integration test suites, returning a clean exit code 0 [146].

### Stage 7: MCP Pause-and-Resume Continuations
High-risk tools (database migrations, production tag pushes, signature locks) trigger the **Model Context Protocol (MCP) Multi Round-Trip Request (MRTR)** flow [266, 267]. The agent Gateway returns a signed `input_required` state, serializes the agent's complete execution context as an HMAC-signed token, and sleeps [583]. Execution resumes only when a human coordinator signs the token.

### Stage 8: Fix Auditing & Infinite Loop Defense (IAL Watchdog)
To prevent runaway token-burn during self-healing retry failures, an external watchdog monitors operations [163, 1051]:
*   *Layer 1:* Hard limit of **15 turns** per task.
*   *Layer 2:* Hard wall-clock limit of **300 seconds (5 minutes)**.
*   *Layer 3:* At each turn, a SHA-256 hash is computed across the serialized message trajectory and filesystem states [163]. If the hash matches a past transaction, the loop is broken and terminated [163].

---

## SECTION 4: CONTINUOUS INTEGRATION & AUTOMATED RELEASES

To guarantee compliance, the repository links the **Workspace Clutter Linter** and the **Automated Tagging Engine** directly into Git's post-commit lifecycle:

```
                  Local Git Commit 
                         │
                         ▼
             [husky/post-commit Hook]
                         │
                         ▼
             [workspace_guardrail.py] ─── (Flag Clutter?) ──► [Self-Purge / Fail]
                         │ (Clear)
                         ▼
              [git-auto-tag.py Hook]
                         │
                         ▼
             (Analyze Commit Message)
             ├── "[major]" ──► vX.0.0 Tag
             ├── "[minor]" ──► v1.X.0 Tag
             └── default   ──► v1.1.X Tag
                         │
                         ▼
              [Automated Repository Sync]
              (git push origin <branch> --tags)
```

1.  **Trigger:** A developer executes a commit.
2.  **Cleanliness Audit:** The linter scans for duplicate folders (`staging/`, `__pycache__`) and purges them to maintain workspace hygiene [974].
3.  **Semantic Version Check:** The tagging script reads the commit message:
    *   `[major]` \(ightarrow\) Increments Major, resets minor/patch (`v1.1.0` \(ightarrow\) `v2.0.0`).
    *   `[minor]` \(ightarrow\) Increments Minor, resets patch (`v1.0.0` \(ightarrow\) `v1.1.0`).
    *   Default \(ightarrow\) Increments Patch (`v1.1.0` \(ightarrow\) `v1.1.1`).
4.  **Auto-Push Sync:** The hook identifies the active branch and automatically syncs code and tags to the remote repository (`git push origin <branch> --tags`), securing deployment synchronization.
