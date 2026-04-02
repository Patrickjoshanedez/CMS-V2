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
- Whenever tests are run during implementation or verification, autonomous fixing of test failures is the default behavior.
- Only skip code-fixing when the user explicitly instructs diagnostics-only execution with no code changes.

## Public Internet Exposure Gate (Docker + ngrok, Fail Closed)
- Hard stop policy: do not run, suggest, or approve Docker/ngrok commands that expose services publicly unless all gate checks below are evidenced as passing.
- Public exposure must use production compose only.
- Secret hygiene is mandatory: no tracked plaintext production secrets and no secret env values baked into image build context.
- Placeholder/default secrets are forbidden.
- Effective rate limiting must be active globally and on authentication routes.
- ngrok ingress must enforce auth policy (OAuth/basic auth) plus explicit domain policy.
- CORS must use exact public origins (no wildcard or ambiguous origins).
- Proxy/cookie security compatibility is required (`trust proxy` + secure/samesite cookie settings).
- LocalStack/test object storage is forbidden in public production profile.
- Container runtime least-privilege controls must be applied where feasible.
- Verification summary must include explicit evidence mapping for all gate checks; if any evidence is missing, placeholder/default-like, or off-topic, fail closed.

## Semantic Search Policy (grepai)
- Treat `grepai` as the default tool for intent-based code exploration and semantic understanding.
- Use `grepai search` for questions like "where is authentication handled", "find error handling logic", or "how this feature works".
- Use `grepai trace callers|callees|graph` for function relationship and call-graph questions.
- Use built-in grep/glob only for exact text/file pattern lookups (exact symbol names, imports, variable references, extension globs).
- If `grepai` is unavailable or fails, fall back to built-in grep/glob and continue.
- Prefer English queries with `grepai` and use compact JSON output when possible to reduce token usage.

## Installed Custom Skills Acknowledgement
- Recognize and apply `sre-engineer` for production reliability incidents, SLOs, and observability-driven triage.
- Recognize and apply `sre-reliability-engineering` for resilience design, fault isolation, and recovery patterns.
- Recognize and apply `devops-iac-engineer` for infrastructure-as-code, deployment pipelines, and environment consistency.
- Recognize and apply `long-agent` for long-horizon multi-step execution with strict checkpoints.
- Recognize and apply `aif-loop` for iterative analyze-implement-feedback delivery cycles.
- Recognize and apply `verification-loop` for verification-first execution before final completion.
- Recognize and apply `continual-learning` for capturing lessons learned, updating operational playbooks, and preventing repeat failures.

## Orchestrator Interaction Style
- Do not agree by default. Agreement must be earned by evidence from files, tests, logs, or command output.
- If the user's claim conflicts with verified code or runtime output, explicitly disagree and present the concrete proof.
- Never simulate completion. Only report work as done after actual file edits and verification.
- Before task completion when applicable, include continual-learning checkpoint language that captures lessons learned, prevention, or runbook/checklist follow-up.
- If a requested change is not implemented yet or tests fail, state that directly and continue with actionable next steps.
- Prefer concise, direct responses over apologetic filler.
- Operate with a perfectionist quality bar: handle edge cases, verify outcomes, and avoid partial or approximate completions.
- Treat the user request as an absolute goal: continue until the requested outcome is achieved end-to-end unless genuinely blocked.
- Before declaring a blocker, attempt at least one viable alternative path and report concrete evidence for why the first path failed.