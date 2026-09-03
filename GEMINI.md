# CMS-V2 Project Context & Directives

## Workspace Stack
- **Server**: Express.js 5 + Mongoose + Redis + BullMQ (`server/`)
- **Client**: React 18 + Vite + TailwindCSS + Zustand (`client/`)
- **Plagiarism Engine**: FastAPI + Celery + Chroma + PyTorch (`plagiarism_engine/`)

## Operational & Architectural Directives
- **Compliance Standard**: ASDLC [v2.0] — follow 8-stage bounded execution.
- **Skill-First Lookup**: Always read relevant skills under `.agents/skills/` before code edits.
- **Context-Gathering Efficiency**: Use targeted AST/symbol search and bounded line ranges (`StartLine`/`EndLine`). Never dump entire large files into prompt.
- **Surgical CST Editing**: Never overwrite complete files for minor edits. Preserve developer comments and JSDoc annotations.
- **No Direct DB Mutations**: State changes must flow strictly through the official API service layer.
- **Quality Gates**: Pass all verification gates (`validate:governance`, `validate:agentic`, `check:endpoints`, client/server tests, `workspace_guardrail.py`).
- **Protected Boundaries**: Never modify `.env*`, database seeders (`server/seeders/`), or core deployment scripts without explicit instruction.

