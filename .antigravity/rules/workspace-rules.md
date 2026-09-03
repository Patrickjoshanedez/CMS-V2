# CMS-V2 Workspace Architecture & Project Conventions

This document outlines the architectural guidelines, directory structures, and conventions for the Capstone Management System (CMS-V2) project.

---

## 1. Project Architecture Overview

CMS-V2 is a hybrid Node.js and Python monorepo consisting of:
1. **Server (`server/`)**: Express 5 REST API, Mongoose ODM (MongoDB), Redis caching & BullMQ message queues, Socket.IO real-time updates, S3/LocalStack storage.
2. **Client (`client/`)**: React 18 SPA built with Vite, TailwindCSS, Zustand state management, TanStack React Query, and Lucide icons.
3. **Plagiarism Engine (`plagiarism_engine/`)**: FastAPI microservice, Celery workers with Redis broker, Chroma vector database, PyTorch/Sentence-Transformers embeddings (`all-MiniLM-L6-v2`), and winnowing fingerprinting algorithms.
4. **Shared Package (`shared/`)**: Common constants, types, schemas, and shared utilities consumed across client and server.
5. **Infrastructure (`docker-compose.yml`, `infra/`)**: Docker Compose orchestrating MongoDB, Redis, LocalStack S3, Ollama, Plagiarism Worker & API, CMS Server, and Client.

---

## 2. Package Manager & Tooling Defaults

### Node.js Monorepo
- **Package Manager**: Always use `npm` (`npm >= 9`, `Node.js >= 18`).
- **Workspace Commands**:
  - Run server dev: `npm run dev:server` or `npm run dev --workspace=server`
  - Run client dev: `npm run dev:client` or `npm run dev --workspace=client`
  - Run all dev: `npm run dev`
  - Seed database: `npm run seed`
  - Run tests: `npm test --workspace=server` / `npm test --workspace=client`
  - Linting & Formatting: `npm run lint`, `npm run format`

### Python Services
- **Environment**: Use project virtual environment `.venv/` (`.venv\Scripts\python.exe` on Windows).
- **Package Manager**: Use `pip` inside the virtual environment.
- **Python Version**: Python 3.11+.
- **Plagiarism Engine Directory**: `plagiarism_engine/` contains standalone `requirements.txt` and `Dockerfile`.

---

## 3. Directory Layout & Module Structure

```text
CMS-V2/
├── .agents/                 # Agent configuration, rules, and MCP definitions
│   ├── mcp_config.json     # MCP server integrations
│   └── rules/              # Agent behavior rules
├── .antigravity/           # Antigravity rules & customization manifests
│   └── rules/              # Project and safety rules
├── client/                 # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/     # UI and domain components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Application views/routes
│   │   ├── services/       # Axios API client services
│   │   ├── store/          # Zustand state stores
│   │   └── utils/          # Client utility helpers
├── server/                 # Express.js backend
│   ├── config/             # Environment, DB, S3, and Redis config
│   ├── middleware/         # Auth, RBAC, rate limiting, error handling
│   ├── models/             # Mongoose schemas & data models
│   ├── modules/            # Domain-driven modules (routes, controllers, services)
│   ├── seeders/            # Database seeder scripts
│   └── services/           # External integration services (Drive, S3, Email)
├── plagiarism_engine/      # Python FastAPI + Celery plagiarism engine
│   └── plagiarism_engine/  # Engine source (winnowing, embeddings, database, API)
├── scripts/                # Administrative, orchestration, and utility scripts
├── shared/                 # Shared validation schemas and constants
└── docker-compose.yml      # Local development container orchestration
```

---

## 4. Coding Conventions & Best Practices

1. **Backend (Node.js/Express)**:
   - Use ES Modules (`import`/`export`).
   - Wrap async controllers with error-handling middleware or `AppError`.
   - Validate request bodies with Zod schemas.
   - Use centralized environment configuration in `server/config/env.js`.

2. **Frontend (React)**:
   - Functional components with React hooks.
   - TailwindCSS for styling with consistent design tokens.
   - Use TanStack Query for server state caching and optimistic updates.
   - Zustand stores for global client state (e.g. auth, modal toggles).

3. **Plagiarism Engine (Python)**:
   - Type hints on all function signatures (`typing`, `pydantic`).
   - Asynchronous FastAPI endpoints with Pydantic request/response models.
   - Offload heavy compute tasks to Celery background workers.
