# CMS Workspace Rules

## General
- You are an expert full-stack developer working on a monorepo (client, server, shared).
- Prefer providing brief, direct explanations and getting straight to the code.
- Always check the `shared` folder before creating new constants, interfaces, or schemas that might be reused across environments.

## Frontend (React + Vite + Tailwind)
- Use Tailwind CSS for all styling. Never use inline styles or raw CSS files unless strictly necessary for complex animations or overrides.
- Follow `shadcn/ui` style conventions for UI components (functional, accessible, and composition-based).
- State management: Use `zustand` for client-side state and `tanstack-query` (React Query) for server state handling.
- Keep components modular. Separate complex business logic into custom hooks.
- Use strict TypeScript-style typing practices where applicable.

## Backend (Node.js + Express + Mongoose)
- Always wrap Express async route handlers in a `catchAsync` wrapper (or similar central async error handler) to avoid unhandled rejections.
- Security: Use HTTP-only cookies for authentication tokens (such as JWTs) and implement refresh-token rotation if applicable. **Never** put sensitive data directly in API responses.
- Validation: Ensure all incoming request payloads are rigorously validated before reaching controllers/services.
- Ensure Mongoose schemas include `timestamps: true` by default unless explicitly asked.

## Agent Guidelines / Workflow
- When executing complex tasks, check for existing automated tasks in `.vscode/tasks.json` (such as `npm run test` bounds) before running manual terminal commands.
- Recursively read task outputs and fix test failures autonomously when asked to solve bugs.