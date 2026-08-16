# CMS-V2 Project Context & Directives

## Workspace Stack
- **Server**: Express.js 5 + Mongoose + Redis + BullMQ (`server/`)
- **Client**: React 18 + Vite + TailwindCSS + Zustand (`client/`)
- **Plagiarism Engine**: FastAPI + Celery + Chroma + PyTorch (`plagiarism_engine/`)

## Operational Rules
- Use `npm` for all node dependencies and test runs.
- Run `npm test --workspace=server` or `npm test --workspace=client` to verify code changes.
- Never modify `.env*`, database seeders (`server/seeders/`), or core deployment scripts without explicit instruction.
