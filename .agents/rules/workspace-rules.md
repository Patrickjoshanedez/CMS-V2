# CMS-V2 Workspace Rules & Conventions

## Architecture
- **Server**: Express 5, Mongoose ODM, Redis, BullMQ (`server/`)
- **Client**: React 18, Vite, TailwindCSS, Zustand (`client/`)
- **Plagiarism Engine**: FastAPI, Celery, Chroma, PyTorch Sentence-Transformers (`plagiarism_engine/`)
- **Shared**: Shared schemas and constants (`shared/`)

## Package Manager & Tooling
- Node.js: `npm` (workspaces: `server`, `client`, `shared`)
- Python: `.venv` virtual environment (`.venv\Scripts\python.exe`)

## Verification Enforcement
- Require running test suites (`npm test --workspace=server`, `npm test --workspace=client`) before marking tasks complete.

## Protected Files (No Unauthorized Modifications)
- `.env*`
- `server/seeders/**`
- `docker-compose*.yml`
- `Dockerfile*`
- `infra/**`
- `deploy.ps1`, `lan-deploy.ps1`, `start-*.ps1`
