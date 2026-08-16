# Capstone Management System (CMS-V2) Agent Guidelines

## 1. Overview & Conventions
- Monorepo structure with npm workspaces (`server`, `client`, `shared`) and Python FastAPI engine (`plagiarism_engine`).
- Always use `npm` for Node.js package management.
- Python virtual environment is located in `.venv/`.

## 2. Test Verification Requirement
- Run appropriate test suites (`npm test --workspace=server`, `npm test --workspace=client`) before marking any work complete.

## 3. Restricted Files
- Do not edit or overwrite environment secret files (`.env*`).
- Do not modify database seeders (`server/seeders/*`) or deployment automation scripts (`docker-compose*.yml`, `deploy.ps1`, `lan-deploy.ps1`, `infra/*`) without explicit confirmation.
