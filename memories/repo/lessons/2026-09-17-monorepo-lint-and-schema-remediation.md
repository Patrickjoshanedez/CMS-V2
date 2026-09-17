# Monorepo Zero-Warning Lint Hygiene, VS Code MCP Schema & React Hook Dependency Governance Rule

## Architecture & Implementation Details

### 1. Workspace IDE & Agent Schema Normalization
- **Lesson learned**: VS Code Copilot agent frontmatter files (`.agent.md`) enforce strict matching against registered tools and configured `.vscode/mcp.json` servers. Including unsupported tool names (`edit`, `search`, `web`) or unconfigured MCP server prefixes triggers persistent IDE warnings. Pruning `tools` to exact registered identifiers (`[agent, execute, read, 'oraios/serena/*']`) eliminates schema errors while keeping agent behavior robust.
- **Lesson learned**: `.vscode/mcp.json` schemas disallow arbitrary metadata fields like `gallery` and `version`. Pruning them keeps server definitions standard and error-free.
- **Lesson learned**: In Tailwind CSS projects, VS Code CSS validation flags `@config`, `@tailwind`, and `@apply` unless `"css.lint.unknownAtRules": "ignore"` is configured in `.vscode/settings.json`.

### 2. React Hook Referential Stability & Unused Identifiers
- **Lesson learned**: In component render scopes, computing default array literals via logical expressions (`const teams = data?.teams || []`) creates a fresh array reference on every render, triggering exhaustive-deps warnings on downstream `useEffect` and `useMemo` hooks. Wrapping in `useMemo(() => data?.teams || [], [data?.teams])` stabilizes reference identity.
- **Lesson learned**: In ES2022 / Node.js 20+, catch blocks with unused error bindings should use optional catch syntax (`try { ... } catch { ... }`) to eliminate `_error` / `_err` unused-variable warnings.

## Prevention, Runbook & Checklist

### 1. Prevention Rules
- **Prevention rule**: When configuring `.agent.md` and `.vscode/mcp.json`, adhere strictly to schemas and register only valid, active tool tokens.
- **Prevention rule**: Always memoize fallback array/object expressions when passed into `useCallback`, `useMemo`, or `useEffect` dependency arrays.
- **Prevention rule**: In Express services and Vitest test setups, use optional catch bindings for catch blocks that silently swallow or discard error instances.

### 2. Runbook & Checklist
- **Checklist**: Run `npm run check:endpoints` and verify `UNMATCHED_COUNT = 0`.
- **Checklist**: Run `npm run validate:agentic` and verify all 60/60 checks pass.
- **Checklist**: Run `npm run validate:governance` and verify 0 errors, 0 warnings.
- **Checklist**: Run targeted vitest suites on modified components to ensure zero behavioral regression.

### 3. Evidence & Verification Passed
- All 36 IDE-reported warnings across 17 files resolved.
- 60/60 agentic validation checks passed (`npm run validate:agentic`).
- 204 server / 182 client endpoints verified with 0 mismatches (`npm run check:endpoints`).
- Governance validation passed (0 errors, 0 warnings across DAG and decision coherence).
- Targeted tests evidence passed: `archiveComponents.test.jsx` (13/13 passed), `CreateProjectPage.test.jsx` (19/19 passed), `submission.service.plagiarism.test.js` (19/19 passed).
