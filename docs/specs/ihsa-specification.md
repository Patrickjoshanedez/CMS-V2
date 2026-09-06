# Interconnected Harness Scaling Architecture (IHSA) Specification
**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Standard:** ASDLC v2.0-Ready Institutional Agentic Governance  
**Schema:** `ihsa-specification-v2.0`  

---

## 1. System Purpose & Core Architectural Principles

The **Interconnected Harness Scaling Architecture (IHSA)** provides deterministic operational guardrails, in-process lifecycle hooks, and latency-optimized execution pipelines for autonomous coding agents operating within the BukSU Capstone Management System V2 repository.

IHSA prevents:
- **Static Gatekeeper Deadlocks:** PreToolUse linters blocking agents from repairing broken files.
- **Domain Boundary Contamination:** Application-specific constraints hardcoded into generic hook scripts.
- **Model Lock-In:** Reliance on unmanaged local GPU daemons or single-provider runtimes.
- **Monolithic Hook Latency:** Multi-second interpreter cold-boot overhead across sequential tool calls.
- **Monolithic Test Loops:** Inner-loop developer and agent iteration stalling due to global test suite execution.

---

## 2. In-Process Hooks Dispatcher & Lifecycle Engine

The IHSA runtime is managed by `hooks_dispatcher.py`, which loads `hook_registry.json` and executes lifecycle gates in-process using Python module caching (`sys.modules`).

- **PreToolUse Stage:** Evaluates static boundary policies, command scopes, and file-mutation targets.
- **PostToolUse Stage:** Evaluates test execution outcomes, binary fail-to-pass state transitions, and public exposure indicators.
- **Stop / Teardown Stage:** Enforces completion keywords, failure clearance, and clean workspace state.

Latency target: **< 175ms** total dispatch overhead per turn (slashing previous 1,800ms process spawning latency by >90%).

---

## 3. Performance Engineering and Latency Mitigation

To preserve agent focus and prevent context compaction and runner timeouts, IHSA establishes hard constraints against latency vectors:

### Performance Bottlenecks vs. IHSA Optimisations

| Bottleneck | Impact on System | IHSA Optimisation Strategy |
| :--- | :--- | :--- |
| **Process Spawning Latency** | Sequential subprocess spawns add ~1,800ms per tool invocation. | In-Process Hooks Dispatcher: Execute hooks in a single interpreter runtime via dynamic module caching (`sys.modules`), cutting latency to <175ms. |
| **Static Gatekeeper Deadlock** | Evaluating on-disk linter passes over broken files blocks agent repairs. | Dynamic Patch Buffer Evaluation: Only inspect proposed mutation buffers; allow file mutations when repairing existing syntax debt. |
| **Unbounded File Dumps** | Running full-tree `cat` or recursive dumps exhausts context windows. | AST / Symbol Slicing: Enforce bounded line-range viewers (`StartLine`/`EndLine`) and symbol greps. |
| **Monolithic Test Loops** | Stalls agent turnaround time and exhausts Docker execution timeouts (30s limit). | Tiered Test Scoping (TTS): Enforce targeted file execution for inner-loop agent generation; defer full workspace regression suites strictly to final gatekeeper validation. |

---

## 4. Domain Boundary Enforcement & Policy Externalization

All domain policies and tenant constraints are externalized into `.github/hooks/state/feature_policies.json`. Generic gatekeepers must never hardcode repository-specific tokens.

Policies include:
- `execution_rules`: Mandates targeted-only agent testing scope and disallowed broad test commands.
- `archive_metadata_import`: Prevents unauthorized PDF extraction helpers from polluting proposal authoring studios.
- `committee_role_restrictions`: Rejects course instructors from defense committee appointments.
- `manuscript_template_gating`: Locks working manuscript templates until official Title Defense ratification.
- `adm_signature_gates`: Locks committee Action Done Matrix digital sign-offs until Secretary digital compliance endorsement is confirmed.

---

## 5. Provider-Agnostic Cloud AI Reasoning Runtime

IHSA mandates that AI reasoning layers operate without local GPU daemon dependencies:
- Configured via `.github/hooks/state/runtime_config.json` and environment variables (`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`).
- High-throughput reasoning models (DeepSeek API `deepseek-chat` / `deepseek-reasoner` as enterprise alternatives to GPT-4o).
- Secret scanning hygiene: Zero raw keys committed to git repositories.

---

## 6. Verification Protocols

### Docker Sandbox Constraints
All production verification must be capable of executing within containerized sandbox environments with bounded resource ceilings (CPU, memory, 30s timeout thresholds).

### 4. Tiered Test Execution Protocol (TTEP)
- **Phase 1 (Inner Loop / Worker Agent):** Working agents are strictly prohibited from executing global repository test commands (`npm test`). All iterative validation must run in targeted scope targeting only the directly touched module:
  ```bash
  npm test --workspace=<target> -- <path/to/spec.test.ts> --watchAll=false
  ```
  *Client targeted alias:* `npm run test:client -- <path-to-test-file>`  
  *Server targeted alias:* `npm run test:server -- <path-to-test-file>`
- **Phase 2 (Gatekeeper / Critic Agent):** The comprehensive workspace regression suite is invoked only once by `test_tracking_gate.py` upon code completion to enforce zero regressions on PASS_TO_PASS tests.

---

## 7. Maintenance, Registry Synchronization & Runbooks

1. **Registry Synchronization:** Run `python .github/hooks/scripts/generate_registries.py` to compile agent and hook configurations.
2. **Policy Updates:** Modify `.github/hooks/state/feature_policies.json` to declare new domain or execution constraints.
3. **Quality Gate Battery:**
   - `npm run check:endpoints` (Route parity verification)
   - `npm run validate:agentic` (60/60 governance checks)
   - `npm run validate:governance` (Pipeline communication check)
   - `python scripts/workspace_guardrail.py` (Zero workspace clutter check)
