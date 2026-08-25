# 🤖 CMS-V2 COGNITIVE BOUNDARY, SKILL ECOSYSTEM & WORKSPACE RULES

**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Compliance Standard:** ASDLC v2.0-Ready | Zero-Clutter Architecture  
**Runtime Boundary:** Hard-Bounded Execution Sandbox  

---

## 1. WORKSPACE STACK & MONOREPO ARCHITECTURE

* **Server API Backend (`server/`)**: Express.js 5 + Mongoose ODM + Redis + BullMQ Asynchronous Task Queues.
* **Client Frontend SPA (`client/`)**: React 18 + Vite + Tailwind CSS + Zustand Store + TanStack React Query.
* **Plagiarism & Similarity Engine (`plagiarism_engine/`)**: FastAPI + Celery + ChromaDB (HNSW Vector Index) + PyTorch Sentence-Transformers (`all-MiniLM-L6-v2`) + Winnowing Fingerprinting.
* **Shared Workspace (`shared/`)**: Canonical JSON schemas, role constants, and cross-platform validation utilities.
* **Tooling & Environment**: Node.js via `npm` workspaces; Python runtime via root `.venv/` virtual environment.

---

## 2. THE TWO-PILE INSTRUCTION ARCHITECTURE

Every agent operates under a strict **Two-Pile Governance Model**:

### Pile A: Soft Steering Guidelines (Subject to Contextual Tuning)
* **Code Quality & Modularity**: Consolidate repetitive tasks behind shared hooks under `client/src/hooks` and centralized utility functions.
* **Design Token Adherence**: Use Tailwind design system CSS variables (`bg-background`, `text-foreground`). Hardcoded hex colors and literal dark classes are prohibited on functional components.
* **Documentation & AST Navigation**: Target specific AST symbol definitions and bounded line ranges rather than unconstrained file dumps.

### Pile B: Hard Survival Rules (Deterministic & Externally Enforced)
* **Protected Files (Strict Lock)**: Never edit or overwrite environment secret files (`.env*`). Never modify database seeders (`server/seeders/*`) or deployment automation scripts (`docker-compose*.yml`, `deploy.ps1`, `lan-deploy.ps1`, `infra/*`) without explicit confirmation.
* **Directory Containment Whitelist**:
  * **Allowed Write Areas**: `client/src/`, `server/`, `plagiarism_engine/`, `shared/`, `scripts/`, `docs/`, `.agents/`, and `scratch/`.
  * **Strictly Prohibited**: No new root-level folders. No loose `.sh`, `.py`, or `.ps1` scripts in root (all scripts must reside under `scripts/`).
  * **Zero Shadow Trees**: Never read from or write to dead trees (e.g. `staging/`, `dashboard-ui/`, `references/`).
* **Single Memory Namespace**: Persistent agent memory, lessons, and trajectories must live strictly under `.agents/` or `.github/hooks/state/`.
* **No Direct DB Mutations**: Direct raw database mutations via terminal scripts are blocked; all mutations must flow through official API service layers.

---

## 3. INSTALLED SKILL ECOSYSTEM & DYNAMIC DISPATCH

The workspace includes **60 verified cognitive skills** under `.agents/skills/`. Agents must dynamically activate relevant skills before executing specialized tasks:

```
├── Architecture & Core:     [senior-backend, senior-fullstack, senior-data-engineer, refactor, capstone-lifecycle-orchestrator]
├── Frontend Excellence:     [frontend-patterns, frontend-specialist, zustand, tanstack-query, web-design-guidelines]
├── Design Polish Suite:     [i-frontend-design, i-polish, i-typeset, i-colorize, i-arrange, i-delight, i-harden, i-animate]
├── Plagiarism & AI Engine:  [plagiarism-engine, scikit-learn, huggingface-tokenizers, content-analysis]
├── Reliability & Infra:     [sre-engineer, sre-reliability-engineering, devops-iac-engineer, docker-compose-production]
├── Data & Schemas:          [mongoose-mongodb, xlsx, pdf, algorithmic-art]
└── ASDLC & Governance:      [aif-loop, verification-loop, continual-learning, anti-slop, long-agent, skill-creator,
                              skill-write-or-patch, ptss, hermes-curator]
```

---

## 4. VERIFICATION GATES & TASK COMPLETION CONTRACT

An implementation or refactoring task is officially completed **only** when all local verification suites exit with zero errors:

```bash
# 1. Agentic Governance & Security Audit
npm run validate:agentic

# 2. React Frontend Unit & Store Test Suite
npm test --workspace=client

# 3. Express Backend Integration & Unit Test Suite
npm test --workspace=server

# 4. Workspace Cleanliness Guardrail Linter
python scripts/workspace_guardrail.py
```

---

## 5. AUTOMATED SEMANTIC TAGGING & REMOTE SYNC

Post-commit operations are managed by [`scripts/git-auto-tag.py`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/scripts/git-auto-tag.py) via `.husky/post-commit`:
* `feat: [major] ...` $\rightarrow$ Increments Major version (`v1.1.0` $\rightarrow$ `v2.0.0`).
* `feat: [minor] ...` $\rightarrow$ Increments Minor version (`v1.0.0` $\rightarrow$ `v1.1.0`).
* `fix: ...` (default) $\rightarrow$ Increments Patch version (`v1.1.0` $\rightarrow$ `v1.1.1`).
* **Auto-Push Rule**: Automatically pushes active branch and release tags to remote `origin` when configured.
* **Double-Tag Loop Guard**: Bypasses tagging if HEAD already carries a semantic version tag.

---

## 6. RUNAWAY WATCHDOG & INFINITE LOOP CONTAINMENT

* **Max Iteration Ceiling**: Hard capped at **15 turns**.
* **Max Duration**: Strict **300-second (5-minute)** wall-clock timeout.
* **SHA-256 State Hashing**: Hashes transaction trajectories and filesystem state at every turn. Immediate fail-safe abort triggered if repetitive stagnation is detected.

---

## 7. HERMES PIPELINE PROTOCOL

The workspace runs a **Hermes-style self-improving agent pipeline**. Every agent session follows this execution flow:

```
User Message ──► Agent Execution ──► Skill Trigger Check
                                            │
                               ┌────────────▼──────────────┐
                               │   skill-write-or-patch     │  ◄── fires when gap detected
                               │   Write or Patch SKILL.md  │
                               └────────────┬──────────────┘
                                            │
                               ┌────────────▼──────────────┐
                               │   ptss  Session Archive    │  ◄── fires after meaningful task
                               │   .agents/ptss/sessions/   │
                               └────────────┬──────────────┘
                                            │
                               ┌────────────▼──────────────┐
                               │   Next Session Retrieval   │  ◄── injected at session start
                               └───────────────────────────┘
```

### 7.1 Skill Write or Patch (`skill-write-or-patch`)

Agents MUST invoke `skill-write-or-patch` when any of the following are true:
- The same sub-problem was solved twice without a backing skill.
- An existing skill is missing a trigger phrase, CMS-V2 path, or workflow step.
- A task reveals a repeatable pattern not yet captured in any skill.

**Write** creates a new SKILL.md in `.agents/skills/<name>/`.
**Patch** surgically modifies only the relevant lines of an existing skill — never overwrites the whole file.

### 7.2 PTSS Session Archive (`ptss`)

After every meaningful task (feature, fix, refactor, or skill mutation), agents MUST archive a session record:
```
.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json
```
And append a summary line to:
```
.agents/ptss/index.jsonl
```

At the **start** of a new session where continuity matters, agents SHOULD retrieve prior context by grepping `index.jsonl` and loading the 1–3 most relevant session files.

### 7.3 Hermes Curator (`hermes-curator`)

The curator audits skill lifecycle on demand. Invoke it with the phrase **"audit skills"** or **"run hermes curator"**.

Lifecycle thresholds:
| State    | Condition                    | Action                              |
|----------|------------------------------|-------------------------------------|
| Active   | Used in PTSS within 30d      | None                                |
| Stale    | 30–44d since last PTSS hit   | Add `_STALE.md` marker              |
| Archived | 45d+ since last PTSS hit     | Move to `.agents/skills/.archived/` |
| Restored | Manual request               | Move back to `.agents/skills/`      |

**Curator constraints**: never deletes; always snapshots before a pass; respects `.agents/skills/_CURATOR_SKIP`; max 8 LLM patch iterations per run.

### 7.4 Memory Namespace

All PTSS files must remain under `.agents/ptss/`. No session state may be written to the workspace root, `memories/`, or `context/`.

### 7.5 Continuous Autonomous Skill Harvesting (CASS)

Whenever a complex requirement is fulfilled, a recurring workflow is solved, or a domain gap is addressed:
1. **Detect Resolution**: The agent harness analyzes whether the solved task represents a reusable architectural or domain pattern.
2. **Synthesize or Patch**:
   - If novel: Write a new `SKILL.md` in `.agents/skills/<skill-name>/` with yaml frontmatter, trigger phrases, core workflow steps, and CMS-V2 specifics.
   - If an existing skill exists: Surgically patch the missing capabilities or paths.
3. **Register & Archive**: Register the skill in `.agents/rules/workspace-rules.md` and log the session snapshot in `.agents/ptss/sessions/` and `.agents/ptss/index.jsonl`.

