# 🤖 COGNITIVE BOUNDARY & RUNTIME CONTRACT FOR CODING AGENTS (AGENTS.md)
**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Security Level:** Hard-Bounded Execution Sandbox  
**Compliance Standard:** ASDLC v2.0-Ready  

---

## 1. PURPOSE AND SYSTEM OVERVIEW

This document establishes the **immutable operational boundaries, architectural expectations, and deterministic quality gates** for all AI Coding Agents, Copilots, and Orchestrator loops operating inside the CMS-V2 repository. 

To prevent **workspace clutter, split-brain desynchronisation, and "silent gray errors,"** every agent MUST read, parse, and strictly comply with these instructions before executing tool actions or modifying files.

---

## 2. THE TWO-PILE INSTRUCTION ARCHITECTURE

Every agent operates under a strict **Two-Pile Governance Model** to prevent context compaction from erasing safety policies:

### Pile A: Soft Steering Guidelines (Subject to drift)
*   **Language Standard:** ECMAScript 2022 (ES13) for Node.js backend modules; React 18 with modern React Hooks and custom state abstractions (Zustand, React Query) for the frontend client.
*   **Design System:** Tailwind CSS utilizing design system CSS variable tokens (`bg-background`, `text-foreground`). Hardcoded hex colors and literal dark classes (e.g., `#020617`, `bg-slate-950`) are prohibited on functional components.
*   **Code Quality:** Maximize modularity. Consolidate repetitive tasks behind shared hooks under `client/src/hooks` and centralized utility functions.

### Pile B: Hard Survival Rules (Deterministic & Externally Enforced)
*   **No Unbounded File Reading:** Full repository dumps, broad wildcard searches, and recursive `cat` style dumps are strictly prohibited. Agents must use structured file indexers or targeted line-range viewers.
*   **No Direct Database Mutations:** Direct raw MongoDB, Redis, or ChromaDB mutations via terminal scripts are blocked. All state changes must occur via the official API service layers.
*   **Single Memory Namespace:** Agents are forbidden from writing context files, status logs, or memories outside of the `.agents/` or `.github/hooks/state/` directories. Any auxiliary memory file written to the workspace root will trigger an immediate pre-commit rejection.

---

## 3. REPOSITORY DIRECTORY LAYOUT & WHITELIST BOUNDARIES

To prevent a **Workspace Clutter Crisis**, the workspace maintains a strict whitelist. The creation of unvetted folders or loose scripts in the root directory is blocked.

```
/workspace/
├── client/                           ← React 18 Tailwind Frontend SPA
├── server/                           ← Node.js / Express.js REST API Backend
├── plagiarism_engine/                ← PyTorch & Winnowing Plagiarism API (FastAPI)
├── scripts/                          ← All deployment, migration, and seeder scripts
├── docs/                             ← System specifications, guidelines, and manuals
├── assets/                           ← Media, logos, and static graphics
├── .git/                             ← Local Git repository metadata
├── .agents/                          ← Shared memory and execution trajectories
├── scratch/                          ← Intermediate developer scratch space
├── knowledge/                        ← Directly-accessible source files (Read-Only)
└── out/                              ← Flat write-only outbox for final deliverables
```

### File Write Whitelist
*   **Allowed Write Areas:** `client/src/`, `server/`, `plagiarism_engine/`, `scripts/`, `docs/`, `.agents/`, `scratch/`, and `out/`.
*   **Strictly Prohibited:** No new root-level folders. No loose `.sh`, `.py`, or `.ps1` scripts in `/workspace/` (all scripts must live under `/workspace/scripts/`).
*   **Shadow Tree Ban:** Files must never be written to or read from dead development trees (e.g., `staging/`, `dashboard-ui/`, `memories/`, `context/`).

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

# Validate the Express Backend integration and ADM compliance suites
npm test --workspace=server
```

---

## 6. GIT POST-COMMIT TAGGING & AUTOMATED VERSIONING

The repository implements an automated post-commit hook `.git/hooks/post-commit` that manages semantic tagging. Every commit message must be structured according to the following matrix:

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
1.  **Database Seeding:** Any scripts modifying standard catalog records.
2.  **Production Releases:** Pushing tags beyond the major version line.
3.  **ADM Signatures:** Applying final digital signature hashes to the Action Done Matrix.

The agent will serialize its execution state, output a secure token, enter a sleep phase, and resume only when a valid human authorization signature is received.
