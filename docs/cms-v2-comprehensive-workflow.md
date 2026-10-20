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
 │ Registration  │────►│    Topics     │────►│  Capstone 1   │
 │ & Team Lock   │     │ & Committee   │     │Chapters 1–3   │
 └───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
 ┌───────────────┐     ┌───────────────┐             │
 │    PHASE 4    │     │    PHASE 3    │     ┌───────▼───────┐
 │  Capstone 3   │◄────│  Capstone 2   │◄────│   ADM v1      │
 │ Ch. 4–5 &     │     │ System Dev &  │     │  Sign-off     │
 │ Final Archive │     │ Gantt / ADM v2│     └───────────────┘
 └───────────────┘     └───────────────┘
```

### Phase 0: Registration, Profile Setup & Team Locking
*   **Profile Completion:** Students verify their accounts and provide Student ID, section, and assigned Capstone Instructor; degree program, section code, and academic year are resolved from the selected section.
*   **Team Capacity:** Invitation-based teams contain 2–4 students. A student may belong to only one active project per academic term, and incomplete student profiles prevent roster lock.
*   **Roster Lock:** The Team Leader locks the completed team through the team API; locked membership cannot be changed.

### Phase 1: Title Proposals, Similarity Screening & Committee Assignment
*   **Dynamic Proposals:** Teams submit 1–10 topics with discipline, problem statement, objectives, technical stack, and SDG mapping.
*   **Similarity Pre-Scan:** `CreateProjectPage.jsx` checks titles against approved archive records and warns at the configured similarity threshold.
*   **Instructor Review:** The Capstone Instructor accepts or requests revisions; faculty Adviser, Panel Chair, Panelists, and Secretary appointments are made for the project.

### Phase 2: Capstone 1 — Chapters 1–3 & Proposal Defense
*   **Sequential Adviser Review:** Chapter 1 approval unlocks Chapter 2; Chapter 2 approval unlocks Chapter 3; Chapter 3 approval unlocks proposal compilation.
*   **Defense Clearance:** The compiled manuscript passes plagiarism review and receives Adviser endorsement before proposal defense scheduling.
*   **Minutes, ADM v1 & Grades:** The Secretary records minutes and ADM concerns. Required panel, Secretary, Adviser, and Instructor sign-offs and official Instructor grade release complete the semester.

### Phase 3: Capstone 2 — System Development & Prototype Defense
*   **Adviser-Approved Gantt:** The assigned Adviser approves the schedule before students record daily progress; weekly check-ins follow the approved dates.
*   **Late Gate & Evidence:** Late progress requires an editable justification, Adviser review, and Instructor waiver. GitHub and uploaded media remain visible to authorized faculty.
*   **Prototype Defense:** Adviser clearance gates scheduling. The Secretary records system concerns in ADM v2; official grades remain hidden until Instructor release.

### Phase 4: Capstone 3 — Chapters 4–5, Final Defense & Archival
*   **Sequential Review & Dual Deliverables:** Chapters 4 and 5 require Adviser approval before compiling the full manuscript and journal paper; both pass plagiarism screening before defense clearance.
*   **Final Defense & ADM v3:** The Secretary records minutes and final concerns; grades stay hidden until Instructor release and required signatories complete ADM v3.
*   **Completion:** Generate the approval sheet, archive and index the approved documents, and issue the completion certificate. Preserve prior drafts, annotations, consultation logs, and minutes for audit.

Capstone 1, Capstone 2, and Capstone 3 each occupy one academic semester. In APIs and stored records, `workflowPhase` is the overall Phase 0–4 state; `capstonePhase` remains the legacy course counter 1–3.

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
