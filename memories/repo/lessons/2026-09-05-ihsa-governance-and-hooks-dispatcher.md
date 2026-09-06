# Lesson Learned: Interconnected Harness Scaling Architecture (IHSA) & In-Process Hooks Dispatcher

## Incident & Architectural Context
A comprehensive architectural audit of the CMS-V2 agentic governance system identified four non-negotiable structural flaws:
1. **Static Gatekeeper Deadlock**: In `static_gatekeeper.py`, running ESLint over target files *before* a code-mutation tool executes caused a chicken-and-egg deadlock: if a file had an existing syntax error, the agent was blocked from applying the fix.
2. **Domain Boundary Contamination**: Application-specific target paths and forbidden additions (`CreateProjectPage.jsx` archive helper tokens) were hardcoded inside the generic static gatekeeper hook script.
3. **Ollama Model Lock-In**: The prefetch hook hardcoded a local Ollama instance (`qwen2.5-coder:7b` at `localhost:11434`), logging critical errors and risking failure in environments without a local GPU daemon.
4. **Monolithic Hook Bloat**: `continual_learning_checkpoint.py` grew into a 2,551-line monolith combining test tracking, public exposure blocking, ngrok regexes, and keyword matching.
5. **Spawning Latency**: Executing 6-7 separate Python processes sequentially on every single tool call incurred ~1,800ms of process spawning latency on Windows.

## Lesson Learned
1. **Dynamic Buffer-Based Static Gatekeeping**:
   - PreToolUse gatekeeping must never evaluate on-disk syntax for un-mutated files if a file currently contains syntax debt, as this prevents agents from repairing broken files.
   - Dynamic validation checks proposed patch buffers and externalizes domain policies to `.github/hooks/state/feature_policies.json`.
2. **Provider-Agnostic Cloud AI Runtime (DeepSeek)**:
   - Replaced hardcoded Ollama with high-accuracy cloud reasoning model configuration (DeepSeek API `https://api.deepseek.com`, model `deepseek-chat` as alternative to GPT-4o).
   - Read credentials from `.github/hooks/state/runtime_config.json` or `DEEPSEEK_API_KEY` without committing raw keys into version control.
3. **Monolithic Hook Decomposition**:
   - Decomposed into single-responsibility gates:
     - `test_tracking_gate.py`: Enforces binary fail-to-pass / pass-to-pass gates.
     - `public_exposure_gate.py`: Scans for unauthorized Docker/ngrok exposure vectors.
     - `completion_keyword_guard.py`: Enforces continual-learning keywords and failure clearance.
   - Preserved `continual_learning_checkpoint.py` as a lightweight backward-compatible facade.
4. **In-Process Sequential Dispatcher (<175ms)**:
   - `hooks_dispatcher.py` loads `hook_registry.json` and executes lifecycle gates sequentially in-process.
   - In-memory module caching via `sys.modules` eliminates repeated Python interpreter startup costs, dropping latency by over 90%.

## Prevention Checklist
- [x] In `static_gatekeeper.py`, never block an edit because the target file on disk currently has syntax debt; allow mutation if the tool call is repairing the file.
- [x] Externalize domain constraints into `.github/hooks/state/feature_policies.json`.
- [x] Keep `runtime_config.json` provider-agnostic, supporting `deepseek` and `openai` endpoints.
- [x] Decompose lifecycle scripts to < 250 lines each with dedicated responsibilities.
- [x] Enforce Tiered Test Scoping (TTS) and Tiered Test Execution Protocol (TTEP): reject monolithic `npm test` runs during inner loops and mandate targeted `npm test --workspace=<target> -- <spec> --watchAll=false`.
- [x] Maintain 60/60 passing checks in `npm run validate:agentic` and clean pass in `npm run validate:governance`.

## Runbook for IHSA Maintenance
1. When adding or modifying hooks, update `.github/hooks/hook_registry.json`.
2. Synchronize all agent and hook states by executing `python .github/hooks/scripts/generate_registries.py`.
3. Validate overall agentic governance by running `npm run validate:agentic` and `npm run validate:governance`.
4. Check endpoint parity with `npm run check:endpoints` and ensure `UNMATCHED_COUNT = 0`.
5. Enforce Tiered Test Execution Protocol (TTEP): Inner-loop worker agents use `npm run test:client -- <spec>` or `npm run test:server -- <spec>`; full workspace regression suites are strictly invoked by gatekeeper validation.
6. Consult the authoritative specification in `docs/specs/ihsa-specification.md`.
7. Run `python scripts/workspace_guardrail.py` to confirm zero workspace clutter.
