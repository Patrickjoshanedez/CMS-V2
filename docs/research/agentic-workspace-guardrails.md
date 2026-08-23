# Workspace Cleanliness & Cognitive-Load Guardrail Engine Specification

## 1. Executive Summary
Workspace clutter, shadow clone accumulation, and multi-brain desynchronization are critical failure modes in production-grade agentic environments. When autonomous agents operate in cluttered directories, they suffer from **context window saturation**, **attention dilution** (editing files in obsolete shadow clones), and **Windows/OneDrive file-lock collisions (`EBUSY`/`EPERM`)**.

This document details the **Workspace Cleanliness & Cognitive-Load Guardrail Engine** ([`scripts/workspace_guardrail.py`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/scripts/workspace_guardrail.py)) integrated into the Stage 8 (Fix Audit) pipeline and Git Post-Commit hook.

---

## 2. The 5 Clutter Dimensions & Architectural Solutions

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      WORKSPACE CLEANLINESS & COGNITIVE-LOAD ENGINE                     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
       ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
       ▼                   ▼                               ▼                   ▼
[ 1. Shadow Purge ] [ 2. Script Gateway ]         [ 3. Memory Boundary ] [ 4. Git Linter ]
  - staging/          - Canonical scripts/          - .agents/ only        - Auto post-commit
  - dashboard-ui/       launchers                   - Lock down state        audit & purge
  - ghost src/        - Ban loose root .ps1           drift
```

### 1. Purging Shadow Clones & Restricting Directory Visibilities
* **Hazard**: File search tools (`list_dir`, `grep_search`) scan obsolete trees (`staging/`, `dashboard-ui/`), polluting the agent's context and causing the agent to mutate outdated copies.
* **Guardrail**: Active audit and quarantine of all zombie directories, ghost source folders (`src/`), and build artifacts outside `client/` and `server/`.

### 2. Neutralizing Script Proliferation via a Single-Entry Launcher Gateway
* **Hazard**: 12 different PowerShell deployment scripts in the root create operational ambiguity.
* **Guardrail**: Canonical entrypoint policy. Deployment scripts are consolidated into `scripts/`, exposing only verified launchers (`scripts/start-dev.ps1`, `scripts/deploy.ps1`).

### 3. Unifying Competing Brains under a Single Namespace
* **Hazard**: Multiple IDE and agent memory folders (`memories/`, `context/`, `.context_state.json`) create split-brain state desynchronization.
* **Guardrail**: Strict single-namespace enforcement (`.agents/` and `.github/hooks/state/`). Any unvetted memory directories outside these bounds are flagged as out-of-bounds.

### 4. Eliminating OneDrive Lock Contention (`EBUSY` / `EPERM`)
* **Hazard**: OneDrive background sync actively scans and locks newly written files, causing agent file writes to fail.
* **Guardrail**: Defensive file-handling with exponential backoff and randomized jitter to survive transient background locks.

### 5. The Pre-Commit / Post-Commit Workspace Cleanliness Linter
* **Integration**: Invoked automatically inside [`scripts/git-auto-tag.py`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/scripts/git-auto-tag.py), [`.husky/post-commit`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.husky/post-commit), and [`.git/hooks/post-commit`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.git/hooks/post-commit).
* **Guarantees**: Verifies workspace cleanliness prior to issuing semantic version tags, ensuring releases remain untainted by temporary caches or clutter.
