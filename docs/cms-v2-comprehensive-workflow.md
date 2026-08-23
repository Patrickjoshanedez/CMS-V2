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
 │   PHASE 1     │     │   PHASE 2     │     │   PHASE 3     │
 │Team & Section │────►│Chapters 1-3 & │────►│Dual-Pipeline  │
 │ Roster Lock   │     │Async Ingestion│     │Plagiarism Scan│
 └───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
 ┌───────────────┐     ┌───────────────┐     ┌───────▼───────┐
 │   PHASE 6     │     │   PHASE 5     │     │   PHASE 4     │
 │Auto-Archive & │◄────│Evaluation &   │◄────│Defense Hearing│
 │Certificate PDF│     │ADM Sign-off   │     │  Scheduling   │
 └───────────────┘     └───────────────┘     └───────────────┘
```

### Phase 1: Team Formation, Discipline Alignment & Roster Locking
*   **Team Capacity Constraint:** Students initiate team profiles under `TeamsPage.jsx`, generating secure invitation tokens [738]. In alignment with BukSU IT department mandates, teams are capped at a **minimum of 2 and a maximum of 4 members** [251, 504].
*   **Academic Taxonomy Tagging:** Teams are bound to a strict relational hierarchy: `Academic Year` → `Course (e.g., BSIT)` → `Section` [251, 951].
*   **The Team Lock Protocol:** Once the student group roster is complete, the Team Leader locks the group via `PATCH /api/teams/:id/lock` [251, 954]. This sets `isLocked: true`, freezes the team membership, and updates a **sticky, color-coded visual banner at the top of the interface** (Emerald Green for Open, Crimson Red for Locked) [140, 251, 812].
*   **Title Pre-Scan Screening:** To prevent topic duplication, teams draft up to three titles [738, 936]. As they type inside `CreateProjectPage.jsx`, a real-time pre-scan endpoint (`POST /api/projects/title-check`) computes string distances against the historical database, displaying an interactive visual similarity gauge [616, 738, 1058].

### Phase 2: Milestone submissions, Queue Ingestion & Late Justification
*   **Dynamic Submission Buffer:** Rather than enforcing a rigid three-upload constraint, the client uses an editable upload workspace with "Add More" and "Done" batched buffers, resolving file upload limits [125, 336].
*   **Magic-Byte Validation Gate:** Files are received via Multer. To block spoofed extensions, a custom middleware (`fileValidation.js`) performs binary validation, checking the first 1024 bytes for the `%PDF` signature (0x25 0x50 0x44 0x46) and preventing malicious uploads [46, 266].
*   **Asynchronous Queue Offloading:** Valid files are uploaded to S3 and mapped in MongoDB as `Submission` documents [212, 336]. A task is pushed to the BullMQ `plagiarism-check` queue [207, 336]. If a document lacks metadata, a local **Ollama (`llama3.2:3b`) parser** reads text buffers via pdf-parse, extracting Title, Authors, Abstract, and Keywords according to a strict, JSON schema [209, 633].
*   **Late Justification Locking:** If a student submits work after the deadline defined in `settings.model.js`, the submission API flags the entry as `isLate: true` [126]. The UI renders a `JustificationCard` locking further submissions and requiring the student to input a valid explanation, which alerts the adviser [126, 809].

### Phase 3: The Dual-Pipeline Plagiarism Detection Engine
Once enqueued, submissions are parsed using two complementary, highly specialized pipelines to detect both literal matching and semantic paraphrasing [208]:

1.  **Syntactic Matcher (Winnowing Rolling-Hash):**
    *   The document's raw text is normalized (whitespace stripped, lowercase conversion) [81, 454].
    *   The normalized stream is chunked into character \(k\)-grams [81, 208].
    *   **Karp-Rabin Rolling Hashing:** Hashes are generated recursively:  
        $$H(c_{i+1}...c_{i+k}) = (H(c_i...c_{i+k-1}) - c_i \cdot b^{k-1}) \cdot b + c_{i+k}$$
    *   A sliding window of size \(w\) selects the minimum hash value per frame as a positional fingerprint, which is saved to `DocumentFingerprint` [208].
    *   The index computes exact syntactic similarity against the corpus using Jaccard span-union metrics [81, 208].
2.  **Semantic Matcher (PyTorch Vector Projections):**
    *   Celery workers pass text segments to FastAPI [207, 208].
    *   Paragraphs are tokenized and projected into 384-dimensional dense vectors using the **PyTorch `all-MiniLM-L6-v2` transformer model** [2, 208].
    *   The vector coordinates are indexed inside **ChromaDB** [2, 207].
    *   The engine calculates Cosine Proximity to identify conceptual matches [208]:  
        $$	ext{Similarity}(ec{u}, ec{v}) = rac{ec{u} \cdot ec{v}}{\|ec{u}\| \|ec{v}\|}$$
    *   Results are separated inside `PlagiarismChecker.jsx` into two distinct tabs: "Similarity" (Winnowing) and "Plagiarism" (Semantic) [141, 809].

### Phase 4: Faculty Self-Selection, Scheduling & Hearings
*   **Panel Role Definitions:** Each capstone project is mapped to explicit panel roles: **Chair, Panel Member, and Secretary** [122, 123].
*   **Workload-Balanced Staffing Optimization:** Coordinators use an automated allocation engine (`workloadOptimizationStrategy.js`) that models teacher assignment as a Constraint Satisfaction Problem (CSP), balancing section, section limit, and department capacity parameters to prevent faculty overallocation [43, 743].
*   **Faculty Self-Selection:** Faculty members can also browse open capstone topics on their portal and self-assign to available slots up to the team cap [624].
*   **Interactive Visual Scheduler:** Approved defense schedules, milestone dates, and upcoming consultation windows are dynamically mapped onto month views inside `CalendarScheduler.jsx` [136, 500].

### Phase 5: Gated Evaluations, Inline Annotations & ADM checklist
*   **Grade Leakage Gating:** Panelists input rubrics on `EvaluationPanel.jsx` [739]. To prevent premature score leaks, final grading cards, weighted sums, and defense decisions are locked behind the `/consolidated-grades` route, returning a `HTTP 403 EVALUATIONS_INCOMPLETE` response until *all* assigned panelists submit their marks [86, 139, 809].
*   **Inline Coordinate Comments Drawer:** To provide Google-Doc-style feedback, panelists use `DocumentPreview.jsx` [141, 144]. Highlighting text selections captures viewport client rectangles, saving coordinates `{ x, y, width, height }` as `SubmissionComments` in MongoDB [137, 144, 482]. Students review annotations inside an expandable sidebar drawer [141].
*   **Action Done Matrix (ADM) Sign-off:** Revisions requested during defense are compiled into the ADM [122]. Panelists review student adjustments, and clicking approve fires `POST /:projectId/action-done-matrix/:itemId/sign`, capturing a base64 digital canvas signature and compiling a cryptographically signed signature block [119, 120, 809].

### Phase 6: Automatic Archiving, Read-Only Redirection & Verification
*   **Auto-Archiving Database Hook:** When the Panel Chair logs the final digital signature, the `Project` Mongoose model executes a pre-save check [120, 809]. If all ADM rows are marked as `'verified'`, the database triggers an automatic transition: setting `isArchived = true`, setting `projectStatus = 'archived'`, and locking editable metadata [119, 120, 140].
*   **Public Redirection Gate:** When guest or student users query the public catalog and click on an archived capstone, the system automatically redirects them to a read-only view (`GET /api/archive/:id/view`) [809]. This streams the raw PDF manuscript binary from S3 directly to `DocumentViewer.jsx`, completely hiding internal panelists’ remarks, scorecards, and administrative metadata [809].
*   **Certificate Compilation:** On archiving, the backend compiles dynamic, golden-bordered **Capstone Completion Certificates** complete with the BUKSU seal and a verification hash, downloadable via `CertificatePage.jsx` [738, 1061].

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
