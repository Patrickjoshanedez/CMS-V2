# 🧠 SKILLS DICTIONARY, HERMES PIPELINE & CONTINUAL LEARNING RECIPE

**Rule File:** `.agents/rules/02-skills-and-hermes-recipe.md`  
**Parent Blueprint:** [workspace-rules.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/workspace-rules.md)  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. SKILLS DICTIONARY CATALOG

The workspace houses **64 verified cognitive skills** under `.agents/skills/`. This catalog forms the authoritative **Skills Dictionary**:

```
├── Architecture & Core:     [senior-backend, senior-fullstack, senior-data-engineer, refactor, capstone-lifecycle-orchestrator]
├── Frontend Excellence:     [frontend-patterns, frontend-specialist, zustand, web-design-guidelines]
├── Design Polish Suite:     [i-frontend-design, ui-design-principles, i-polish, i-typeset, i-colorize, i-arrange, i-delight, i-harden, i-animate]
├── Plagiarism & AI Engine:  [scikit-learn, huggingface-tokenizers, content-analysis]
├── Reliability & Infra:     [sre-engineer, sre-reliability-engineering, devops-iac-engineer, docker-compose-production]
├── Data & Schemas:          [mongoose-mongodb, xlsx, pdf, algorithmic-art]
└── ASDLC & Governance:      [aif-loop, verification-loop, continual-learning, anti-slop, long-agent, skill-creator,
                              skill-write-or-patch, ptss, hermes-curator, anti-regression-and-ci-governance,
                              context-gathering-and-ast-triage]
```

---

## 2. MANDATORY FIRST-USE CONTRACT

Before generating code or planning implementations touching a specialized domain, agents **MUST** inspect and adhere to the matching skill:
* **Backend Architecture & APIs**: `senior-backend`, `mongoose-mongodb`
* **Frontend UI, Layout & State**: `frontend-patterns`, `frontend-specialist`, `zustand`
* **Design Polish & Aesthetics**: `i-frontend-design`, `ui-design-principles`, `i-polish`, `i-colorize`, `i-arrange`
* **Academic Capstone Lifecycle**: `capstone-lifecycle-orchestrator`
* **Verification & Test Loops**: `verification-loop`, `anti-regression-and-ci-governance`
* **Production & Infrastructure**: `sre-engineer`, `docker-compose-production`, `devops-iac-engineer`
* **Cognitive Purity & Anti-Slop**: `anti-slop`

---

## 3. HERMES SELF-IMPROVING PIPELINE

The repository operates a self-improving execution loop:
```
User Request ──► Skill Trigger Check ──► Implementation ──► Skill Patch / Write ──► PTSS Archival
```

### 3.1 Skill Write or Patch (`skill-write-or-patch`)
Agents **MUST** patch or create a skill whenever:
1. The same sub-problem was solved twice without a backing skill.
2. An existing skill is missing a trigger phrase, CMS-V2 path, or workflow step.
3. A task reveals a repeatable pattern or institutional BukSU requirement not yet captured.
*Rule*: Use surgical CST diffs or `skill-write-or-patch`. Never wipe complete files.

### 3.2 Dual-Persistence Memory Architecture
Memory operates across two synchronized namespaces:
1. **Session State Trajectories (`.agents/ptss/`)**: Structured task snapshots saved under `.agents/ptss/sessions/YYYY-MM-DD_<slug>.json` and appended to `.agents/ptss/index.jsonl`.
2. **Durable HLLM Lessons & Runbooks (`memories/repo/`)**: Reusable prevention rules and runbooks stored in `memories/repo/CMS-V2-Technical-Context.md` and `memories/repo/lessons/` (requiring keywords: `lesson`, `learned`, `prevention`, `runbook`, `checklist`, `evidence`, `passed`).

### 3.3 Session Startup Recall
At the start of ANY new chat, agents **MUST** inspect the latest 2–3 entries in `.agents/ptss/index.jsonl` and `memories/repo/CMS-V2-Technical-Context.md` to restore architectural decisions and active prevention rules before acting.

### 3.4 Hermes Curator (`hermes-curator`)
Audits skill lifecycle on demand (`audit skills` or `run hermes curator`):
* **Active**: Used in PTSS within 30d $\rightarrow$ Retained.
* **Stale**: 30–44d since last PTSS hit $\rightarrow$ Tagged with `_STALE.md` marker.
* **Archived**: 45d+ since last PTSS hit $\rightarrow$ Moved to `.agents/skills/.archived/`.

### 3.5 Continuous Autonomous Skill Harvesting (CASS)
When a complex task is completed:
1. **Detect Novel Pattern**: Evaluate if the solution is a reusable pattern.
2. **Synthesize**: Create or patch `SKILL.md` under `.agents/skills/<name>/`.
3. **Register & Archive**: Log the session snapshot in `.agents/ptss/sessions/` and `.agents/ptss/index.jsonl`.
