# 🤖 COGNITIVE BOUNDARY & RUNTIME CONTRACT FOR CODING AGENTS (AGENTS.md)
**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Security Level:** Hard-Bounded Execution Sandbox  
**Compliance Standard:** ASDLC v2.0-Ready  

---

## 1. PURPOSE AND SYSTEM OVERVIEW

This document establishes the **immutable operational boundaries, architectural expectations, and deterministic quality gates** for all AI Coding Agents, Copilots, and Orchestrator loops operating inside the CMS-V2 repository. 

To prevent **workspace clutter, split-brain desynchronisation, and "silent gray errors,"** every agent MUST read, parse, and strictly comply with these instructions before executing tool actions or modifying files.

### Canonical Academic Capstone Workflow (Ground Truth)
The BukSU IT Department capstone progression operates under a strictly sequenced **4-Phase Capstone Progression** preceded by Phase 0:
*   **Phase 0: Team Formation & Roster Locking:** Teams of 2–4 members assemble, bind to Academic Year / Course / Section, and assign 5 standardized roles (`Project Lead & Systems Analyst`, `Frontend & UI/UX Developer`, `Backend & Database Developer`, `Full-Stack Developer`, `QA & Technical Documentor`). Roster locked via `PATCH /api/teams/:id/lock`. Instructor appoints committee (Adviser, Chair, Secretary, Panelists).
*   **Phase 1: Capstone 1 (Title Defense & Proposal Pre-Scan):** Proponents draft 1..10 title proposals tagged with SDGs (1..17). Live archive cosine similarity pre-scan. Proposal defense hearing rubrics determine title approval (`titleStatus = 'approved'`).
*   **Phase 2: Capstone 2 (Chapters 1–3 Manuscript & Midterm Defense):** Chapters 1–3 uploaded. Plagiarism Scan v1 (Winnowing + SentenceTransformers, `< 25%`). Midterm defense evaluation. Action Done Matrix (`ADM v1`) logs panel remarks and multi-signatory digital sign-off.
*   **Phase 3: Capstone 3 (System Development & Progress Defense):** Full prototype implementation with Interactive Gantt Chart (4 milestone sections), late justification gating (`isLate`), Chapter 4 (Results) & Chapter 5 (Conclusions), progress defense rubric evaluation, and `ADM v2` sign-off.
*   **Phase 4: Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off & Archival):** Full 5-chapter manuscript compilation, deep vector plagiarism scan, final oral defense hearing, 3-Tier Multi-Signatory ADM verification (Adviser, Panelists, Chair, Dean), atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and sealed completion certificate PDF generation.

---

## 2. THE TWO-PILE INSTRUCTION ARCHITECTURE

Every agent operates under a strict **Two-Pile Governance Model** to prevent context compaction from erasing safety policies:

### Pile A: Soft Steering Guidelines (Subject to drift)
*   **Language Standard:** ECMAScript 2022 (ES13) for Node.js backend modules; React 18 with modern React Hooks and custom state abstractions (Zustand, React Query) for the frontend client.
*   **Design System:** Tailwind CSS utilizing design system CSS variable tokens (`bg-background`, `text-foreground`). Hardcoded hex colors and literal dark classes (e.g., `#020617`, `bg-slate-950`) are prohibited on functional components.
*   **Code Quality:** Maximize modularity. Consolidate repetitive tasks behind shared hooks under `client/src/hooks` and centralized utility functions.

### Pile B: Hard Survival Rules (Deterministic & Externally Enforced)
*   **Restricted Files:** Do not edit or overwrite environment secret files (`.env*`). Do not modify database seeders (`server/seeders/*`) or deployment automation scripts (`docker-compose*.yml`, `deploy.ps1`, `lan-deploy.ps1`, `infra/*`) without explicit confirmation.
*   **No Unbounded File Reading:** Full repository dumps, broad wildcard searches, and recursive `cat` style dumps are strictly prohibited. Agents must use structured file indexers or targeted line-range viewers.
*   **No Direct Database Mutations:** Direct raw MongoDB, Redis, or ChromaDB mutations via terminal scripts are blocked. All state changes must occur via the official API service layers.
*   **Dual-Persistence Memory Architecture:** Persistent agent execution trajectories, session states, and HLLM lessons are maintained strictly under `.agents/ptss/` (structured session JSONs & `index.jsonl`) and `memories/repo/` (technical context & lessons). Any auxiliary memory file written to the workspace root or unapproved paths will trigger an immediate pre-commit rejection.

---

## 3. REPOSITORY DIRECTORY LAYOUT & WHITELIST BOUNDARIES

To prevent a **Workspace Clutter Crisis**, the workspace maintains a strict whitelist. The creation of unvetted folders or loose scripts in the root directory is blocked.

```
/workspace/
├── client/                           ← React 18 Tailwind Frontend SPA
├── server/                           ← Node.js / Express.js REST API Backend
├── plagiarism_engine/                ← PyTorch & Winnowing Plagiarism API (FastAPI)
├── shared/                           ← Shared schema & utility workspace
├── scripts/                          ← All deployment, migration, and seeder scripts
├── docs/                             ← System specifications, guidelines, and manuals
├── assets/                           ← Media, logos, and static graphics
├── memories/                         ← HLLM repo lessons, interaction hooks, and technical context
├── .git/                             ← Local Git repository metadata
├── .agents/                          ← Shared memory, PTSS sessions, and execution trajectories
└── scratch/                          ← Intermediate developer scratch space
```

### File Write Whitelist
*   **Allowed Write Areas:** `client/src/`, `server/`, `plagiarism_engine/`, `shared/`, `scripts/`, `docs/`, `.agents/`, `memories/`, and `scratch/`.
*   **Strictly Prohibited:** No new root-level folders. No loose `.sh`, `.py`, or `.ps1` scripts in root (all scripts must live under `scripts/`).
*   **Shadow Tree Ban:** Files must never be written to or read from dead development trees (e.g., `staging/`, `dashboard-ui/`, `references/`).

---

## 4. CODE NAVIGATION & COGNITIVE-LOAD PRINCIPLES

1.  **Inspect Before Editing:** Always check if a target file has an existing, active implementation before writing a new version.
2.  **Targeted CST Patching:** Never overwrite complete files to implement minor edits. Identify exact line ranges and generate surgical diffs. Preserve all existing developer comments and JSDoc annotations exactly.
3.  **Validate Imports:** Verify all relative module import paths (`@/...`, `../../services/...`) against the actual directory structure. Do not assume module names.

---

## 5. RE-DEFENSE COMPLIANCE VERIFICATION SUITES

A task is marked completed **only** when all local linters, compilers, and unit tests return a zero-error exit code. Agents must run and pass the following suites to verify their changes:

```bash
# Validate the overall Agentic Governance & Security policies
npm run validate:agentic

# Validate the React Frontend unit and store tests
npm test --workspace=client

# Validate the Express Backend integration and unit suites
npm test --workspace=server
```

---

## 6. GIT POST-COMMIT TAGGING & AUTOMATED VERSIONING

The repository implements an automated post-commit hook `.git/hooks/post-commit` (and `.husky/post-commit`) that manages semantic tagging via `scripts/git-auto-tag.py`. Every commit message must be structured according to the following matrix:

| Commit Message Flag | Action Taken | Target Version Transition |
| :--- | :--- | :--- |
| **`feat: [major] ...`** | Increments Major version, resets minor/patch | `v1.1.0` $\rightarrow$ `v2.0.0` |
| **`feat: [minor] ...`** | Increments Minor version, resets patch | `v1.0.0` $\rightarrow$ `v1.1.0` |
| **`fix: ...` (default)** | Increments Patch version | `v1.1.0` $\rightarrow$ `v1.1.1` |

*   **Double-Tag Protection:** The tagging engine parses the current HEAD. If the commit already carries a semantic tag, the tag operation is skipped to prevent infinite git loop pipelines.

---

## 7. RUNAWAY WATCHDOGS & INFINITE LOOP CONTAINMENT

To protect token consumption and pipeline resources, the execution loop is actively monitored by an external watchdog:
*   **Max Iterations:** Hard capped at **15 turns**.
*   **Max Time:** Strict **300-second (5-minute)** wall-clock timeout.
*   **State-Hashing Watchdog:** Generates a SHA-256 hash across the serialized message trajectory and filesystem states at every turn. If a matching hash is discovered in the execution history, the agent is repeating actions without making progress—and the system will immediately terminate the loop.

---

## 8. HUMAN-IN-THE-LOOP (HITL) GATES

High-consequence actions must pause and request explicit human verification:
1.  **Database Seeding:** Any scripts modifying standard catalog records (`server/seeders/*`).
2.  **Production Releases:** Pushing tags beyond the major version line.
3.  **ADM Signatures:** Applying final digital signature hashes to the Action Done Matrix.

The agent will serialize its execution state, output a secure token, enter a sleep phase, and resume only when a valid human authorization signature is received.

---

## 9. ADVANCED CONTEXT GATHERING & COGNITIVE EFFICIENCY DIRECTIVES

To maximize agent performance, eliminate context compaction errors, and streamline development:

1.  **Skill-First Lookup Protocol:** Before making any architectural decision or code change, the agent MUST inspect the relevant skill in `.agents/skills/` (e.g. `capstone-lifecycle-orchestrator`, `anti-regression-and-ci-governance`, `verification-loop`, `context-gathering-and-ast-triage`).
2.  **Bounded Context Inspection:** Agents must NEVER perform unbounded file dumps or full-directory `cat` commands. Search symbols via targeted `grep_search` and inspect code via bounded line-ranges (`StartLine`/`EndLine`).
3.  **AST / CST Precision Patching:** Full-file rewrites are strictly prohibited. Edits must be surgical CST diffs targeting specific function or schema nodes, preserving all existing developer comments and JSDocs.
4.  **Zero-Slop Standard:** Code must use production-grade design tokens (`bg-background`, `text-foreground`, `border-border/60`), proper error boundaries, explicit prop validation, and zero mock placeholders.
5.  **Session Startup Memory Recall:** At the start of ANY new session/chat, the agent MUST inspect the recent sessions in `.agents/ptss/index.jsonl` (latest 2-3 sessions) and `memories/repo/CMS-V2-Technical-Context.md` to establish context and verify the current architectural state before taking action.
6.  **Dual-Persistence Session Memory:** Archive all meaningful tasks and skill patches to `.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json`, append to `.agents/ptss/index.jsonl`, and record learned runbooks to `memories/repo/CMS-V2-Technical-Context.md` or `memories/repo/lessons/` (with required keywords: `lesson`, `learned`, `prevention`, `runbook`, `checklist`).

---

## 10. UNIFIED QUALITY GATE VERIFICATION SEQUENCE

Before declaring any implementation task complete, agents MUST run and pass the full 6-point verification battery with zero errors:

```bash
# 1. API Route Parity Check (185 Server / 164 Client, UNMATCHED_COUNT = 0)
npm run check:endpoints

# 2. Agentic System Governance Audit (60/60 checks)
npm run validate:agentic

# 3. Agent Communication & Governance Pipeline
npm run validate:governance

# 4. React Frontend Unit & Institutional Fidelity Tests
npm test --workspace=client

# 5. Express Server 13-Stage Comprehensive Workflow Tests
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js

# 6. Workspace Cleanliness & Cognitive Guardrail
python scripts/workspace_guardrail.py
```

