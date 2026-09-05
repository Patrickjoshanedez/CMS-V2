# CMS-V2 Project Context & Directives

## Workspace Stack
- **Server**: Express.js 5 + Mongoose + Redis + BullMQ (`server/`)
- **Client**: React 18 + Vite + TailwindCSS + Zustand (`client/`)
- **Plagiarism Engine**: FastAPI + Celery + Chroma + PyTorch (`plagiarism_engine/`)

## Canonical Academic Capstone Workflow (Ground Truth)
The BukSU Information Technology Department capstone lifecycle operates under a strict **4-Phase Capstone Progression** preceded by Phase 0:
- **Phase 0: Team Formation & Roster Locking**: Teams of 2–4 members assemble, assign 5 standardized roles (`Project Lead & Systems Analyst`, `Frontend & UI/UX Developer`, `Backend & Database Developer`, `Full-Stack Developer`, `QA & Technical Documentor`), lock roster via `PATCH /api/teams/:id/lock`. Committee assigned by Instructor (Adviser, Chair, Secretary, Panelists).
- **Phase 1: Capstone 1 (Title Defense & Proposal Pre-Scan)**: Proponents submit 1..10 title proposals with SDG alignments (1..17). Live archive cosine similarity pre-scan. Proposal defense hearing rubrics determine title approval (`titleStatus = 'approved'`).
- **Phase 2: Capstone 2 (Chapters 1–3 Manuscript & Midterm Defense)**: Chapters 1–3 uploaded. Plagiarism Scan v1 (Winnowing + SentenceTransformers, `< 25%`). Midterm defense evaluation. Action Done Matrix (`ADM v1`) logs panel remarks and multi-signatory digital sign-off.
- **Phase 3: Capstone 3 (System Development & Progress Defense)**: Full prototype implementation with Interactive Gantt Chart (4 milestone sections), late justification gating (`isLate`), Chapter 4 (Results) & Chapter 5 (Conclusions), progress defense rubric evaluation, and `ADM v2` sign-off.
- **Phase 4: Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off & Archival)**: Full 5-chapter manuscript compilation, deep vector plagiarism scan, final oral defense hearing, 3-Tier Multi-Signatory ADM verification (Adviser, Panelists, Chair, Dean) gated by Secretary Compliance Verification Endorsement (`project.admSignatures.secretary.endorsed === true`), atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and sealed completion certificate PDF generation.

## Session Memory Continuity & Cross-Chat Recall Protocol
To prevent split-brain state desynchronization and ensure instant recall across every chat session:
- **Session Startup Recall (Stage 0 Preflight)**: At the beginning of EVERY chat, inspect `.agents/ptss/index.jsonl` (latest 2-3 sessions) and `memories/repo/CMS-V2-Technical-Context.md` to load recent architecture decisions, resolved blockers, and user directives.
- **Durable Memory Dual-Persistence (Stage 8 Task Closure)**: Upon task completion, record learned patterns:
  1. Append a structured record to `.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json` and `.agents/ptss/index.jsonl`.
  2. Update `memories/repo/CMS-V2-Technical-Context.md` and/or write a targeted lesson in `memories/repo/lessons/` (using keywords: `lesson`, `learned`, `prevention`, `runbook`, `checklist`).

## Operational & Architectural Directives
- **Compliance Standard**: ASDLC [v2.0] — follow 8-stage bounded execution.
- **Skill-First Lookup**: Always read relevant skills under `.agents/skills/` before code edits.
- **Context-Gathering Efficiency**: Use targeted AST/symbol search and bounded line ranges (`StartLine`/`EndLine`). Never dump entire large files into prompt.
- **Surgical CST Editing**: Never overwrite complete files for minor edits. Preserve developer comments and JSDoc annotations.
- **No Direct DB Mutations**: State changes must flow strictly through the official API service layer.
- **Quality Gates**: Pass all verification gates (`validate:governance`, `validate:agentic`, `check:endpoints`, client/server tests, `workspace_guardrail.py`).
- **Protected Boundaries**: Never modify `.env*`, database seeders (`server/seeders/`), or core deployment scripts without explicit instruction.


