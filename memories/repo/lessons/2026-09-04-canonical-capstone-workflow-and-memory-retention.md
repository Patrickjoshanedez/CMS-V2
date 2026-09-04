# Lesson Learned & Prevention Runbook: Canonical 4-Phase Capstone Workflow and Cross-Session Memory Retention

## Problem Summary
When initializing a new chat conversation, AI agents in the repository frequently drifted into referencing legacy 6-phase or 3-phase workflows and failed to load recent memory context, causing repetitive mistakes and cognitive desynchronization.

## Root Cause
1. **Rule Incompletion**: Neither `GEMINI.md` nor `AGENTS.md` (which are injected into the system prompt of every new chat session) specified the authoritative 4-Phase Capstone / 5-Milestone progression or the requirement to recall memory before proposing actions.
2. **Obsolete Documentation**: Legacy documentation in `docs/cms-v2-comprehensive-workflow.md` still contained the historical 6-phase flow diagram.
3. **Memory Tier Separation**: Session archives lived under `.agents/ptss/` while HLLM lessons lived under `memories/repo/lessons/`, with contradictory shadow tree bans preventing cohesive discovery.

## Authoritative System Architecture & Ground Truth
The BukSU CMS-V2 system enforces a strictly sequenced **4-Phase Capstone Progression** (governed by `@cms/shared` constants `CAPSTONE_PHASES: { PHASE_1: 1, PHASE_2: 2, PHASE_3: 3, PHASE_4: 4 }` and `DEFENSE_TYPES: { PROPOSAL, MIDTERM, PAPER, FINAL }`), preceded by Phase 0:
- **Phase 0: Team Formation & Roster Locking**: 2–4 members, 5 standardized roles, locked via `PATCH /api/teams/:id/lock`. Committee assigned by Instructor.
- **Phase 1: Capstone 1 (Title Defense & Proposal Pre-Scan)**: 1..10 title proposals with SDG tagging (1..17). Live archive cosine similarity pre-scan. Proposal defense hearing rubrics (`DEFENSE_TYPES.PROPOSAL`), title approval (`titleStatus = 'approved'`).
- **Phase 2: Capstone 2 (Chapters 1–3 Manuscript & Midterm Defense)**: Chapters 1–3 uploaded, dual-engine plagiarism scan (<25%), midterm oral defense (`DEFENSE_TYPES.MIDTERM`), and Action Done Matrix (`ADM v1`) multi-signatory sign-off.
- **Phase 3: Capstone 3 (System Development & Progress Defense)**: Full prototype implementation with Interactive Gantt Chart (4 milestone sections), late justification interceptor (`isLate`), Chapters 4–5, progress defense rubric evaluation (`DEFENSE_TYPES.PAPER`), and `ADM v2` sign-off.
- **Phase 4: Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off & Archival)**: Full 5-chapter manuscript compilation, deep vector plagiarism scan, final oral defense hearing (`DEFENSE_TYPES.FINAL`), 3-Tier Multi-Signatory ADM verification (Adviser, Panelists, Chair, Dean), atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and sealed completion certificate PDF generation.

## Prevention Checklist & Runbook
1. **Stage 0 Startup Preflight**: When starting ANY new conversation, the agent MUST immediately inspect:
   - `.agents/ptss/index.jsonl` (last 2-3 sessions)
   - `memories/repo/CMS-V2-Technical-Context.md`
   - `memories/repo/lessons/` (relevant domain files)
2. **Stage 8 Completion Dual-Persistence**:
   - Save session snapshot to `.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json`.
   - Append single-line summary to `.agents/ptss/index.jsonl`.
   - Record prevention rules into `memories/repo/CMS-V2-Technical-Context.md` or a new lesson in `memories/repo/lessons/` using required keywords (`lesson`, `learned`, `prevention`, `runbook`, `checklist`).
3. **Zero Legacy Re-introduction**:
   - Reject any suggestion or documentation reference that proposes a 6-phase or 3-phase progression.
