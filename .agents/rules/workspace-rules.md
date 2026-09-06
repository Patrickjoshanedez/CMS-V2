# 🤖 CMS-V2 COGNITIVE BOUNDARY & MASTER BLUEPRINT (workspace-rules.md)

**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Security Level:** Hard-Bounded Execution Sandbox  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. PURPOSE & MODULAR RECIPE ARCHITECTURE

This document establishes the **executive cognitive boundary and operational index** for AI Coding Agents and Orchestrator loops in CMS-V2. 

To eliminate cognitive bloat and prevent monolithic rule-limit exhaustion, detailed domain implementations are partitioned into specialized, standalone **Recipe Books** under `.agents/rules/`:

| Recipe Book | Scope & Responsibility |
| :--- | :--- |
| **[00-chat-starter-protocol.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/00-chat-starter-protocol.md)** | Absolute top-priority startup snapshot, validation schema & session priming. |
| **[01-architecture-and-governance.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/01-architecture-and-governance.md)** | Monorepo stack, Canonical 4-Phase Capstone progression, and Institutional Role boundaries. |
| **[02-skills-and-hermes-recipe.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/02-skills-and-hermes-recipe.md)** | 64-skill catalog, Mandatory First-Use contract, Hermes loop, and Dual-Persistence memory. |
| **[03-verification-and-quality-gates.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/03-verification-and-quality-gates.md)** | Fast-Path Targeted Testing, Unified 7-Point Quality battery, Playwright visual feedback, and Git auto-tagging. |
| **[04-environment-and-ui-recipes.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/04-environment-and-ui-recipes.md)** | Docker container dependency sync, defensive entity prefix normalization, 16:9 canvas, and floating input recipes. |

---

## 2. THE TWO-PILE INSTRUCTION ARCHITECTURE

Every agent operates under a strict **Two-Pile Governance Model**:

### Pile A: Soft Steering Guidelines (Subject to Contextual Tuning)
* **Language Standard**: ECMAScript 2022 (ES13) for Node.js backend modules; React 18 with modern Hooks, Zustand, and React Query for client code.
* **Design Token Adherence**: Use Tailwind CSS variables (`bg-background`, `text-foreground`, `border-border/60`). Hardcoded hex colors and literal dark classes are prohibited on functional components.
* **Modularity**: Consolidate repetitive tasks behind shared hooks (`client/src/hooks`) and centralized utility functions.

### Pile B: Hard Survival Rules (Deterministic & Externally Enforced)
* **Rule 0: Chat-Starter Preflight Snapshot**: Check and maintain active `.agents/ptss/chat-starter.json` before chatting or executing tasks.
* **Playwright Visual Feedback Loop**: All UI/UX modifications in `client/src/` MUST execute Playwright visual capture (light/dark mode, desktop 1440x900, mobile 390x844).
* **Protected Files**: Never edit `.env*` secret files. Never modify database seeders (`server/seeders/*`) or deployment automation scripts (`docker-compose*.yml`, `deploy.ps1`, `lan-deploy.ps1`) without explicit human authorization.
* **No Unbounded File Reading**: Full repository dumps, broad wildcard searches, and recursive dumps are strictly blocked.
* **No Direct DB Mutations**: Direct raw database mutations via terminal scripts are blocked; all changes must flow through official API service layers.
* **Dual-Persistence Memory**: Trajectories live strictly in `.agents/ptss/` and durable lessons in `memories/repo/`.

---

## 3. REPOSITORY DIRECTORY LAYOUT & WRITE WHITELIST

To prevent workspace clutter, the repository enforces a strict write whitelist:

```
/workspace/
├── client/              ← React 18 Tailwind Frontend SPA
├── server/              ← Node.js / Express 5 REST API Backend
├── plagiarism_engine/   ← FastAPI & PyTorch Sentence-Transformers Engine
├── shared/              ← Canonical schemas, roles & validation utilities
├── scripts/             ← Deployment, migration & guardrail scripts
├── docs/                ← System specifications & manuals
├── assets/              ← Media, university logos & static graphics
├── memories/            ← HLLM repo lessons & technical context
├── .git/                ← Git metadata & hooks
├── .agents/             ← Shared memory, PTSS sessions & cognitive rules
└── scratch/             ← Intermediate developer scratch space
```

* **Allowed Write Areas**: `client/src/`, `server/`, `plagiarism_engine/`, `shared/`, `scripts/`, `docs/`, `.agents/`, `memories/`, and `scratch/`.
* **Strictly Prohibited**: No new root-level folders. No loose `.sh`, `.py`, or `.ps1` scripts in root (must live under `scripts/`).
* **Zero Shadow Trees**: Never read from or write to dead trees (e.g. `staging/`, `dashboard-ui/`, `references/`).

---

## 4. ASDLC [v2.0] 8-STAGE BOUNDED EXECUTION LIFECYCLE

All tasks proceed strictly through the 8 stages:
* **STAGE 0: STARTUP PREFLIGHT**: Verify active `chat-starter.json`. Inspect latest 2–3 sessions in `index.jsonl` and `CMS-V2-Technical-Context.md`.
* **STAGE 1: INTENT DECOMPOSITION & SKILL LOOKUP**: Query the Skills Dictionary to prime domain skills before taking action.
* **STAGE 2: TARGETED CONTEXT GATHERING**: Use bounded line-slices (`StartLine`/`EndLine`). Never dump whole files.
* **STAGE 3: STRUCTURAL INSPECTION**: Trace caller-callee chains. Verify endpoint parity via `npm run check:endpoints`.
* **STAGE 4: STATECHART-DRIVEN ORCHESTRATION**: Model transitions and edge cases before generating code.
* **STAGE 5: SURGICAL CST EDITING**: Apply surgical diffs preserving comments and JSDocs. Zero whole-file rewrites.
* **STAGE 6: DETERMINISTIC VERIFICATION**: Run Fast-Path Targeted Testing during iteration. Run the full 7-point battery on closure.
* **STAGE 7: HUMAN-IN-THE-LOOP (HITL) GATING**: Pause and request confirmation for database seeding, major releases, or ADM signature hashes.
* **STAGE 8: FIX AUDITING & DUAL-PERSISTENCE ARCHIVAL**: Persist session to `.agents/ptss/sessions/`, append to `index.jsonl`, and record runbooks in `memories/repo/`. Update `chat-starter.json`.

---

## 5. UNIFIED QUALITY GATE BATTERY

```bash
# 1. API Route Parity Check (196 Server / 175 Client, UNMATCHED_COUNT = 0)
npm run check:endpoints

# 2. Agentic System Governance Audit (60/60 checks)
npm run validate:agentic

# 3. Agent Communication & Governance Pipeline
npm run validate:governance

# 4. React Frontend Unit & Institutional Fidelity Tests
# Fast-Path (1–5s): npm test --workspace=client -- <target-test-file>
# Full Gate Closure: npm test --workspace=client
npm test --workspace=client

# 5. Express Server Comprehensive Workflow Tests
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js

# 6. Workspace Cleanliness Guardrail
python scripts/workspace_guardrail.py

# 7. Playwright Visual Audit Gate (Mandatory for client UI modifications)
node scratch/<feature>_audit.mjs
```
