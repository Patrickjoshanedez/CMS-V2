# Supreme Agentic System Architecture & Automation Hooks

To transcend human cognitive limitations (fatigue, context forgetting, emotional attachment to bad code, and unverified assumptions), the multi-agent system relies on a hyper-structured directory architecture and deterministic lifecycle hooks. This enforces extreme verification, semantic durability, and continuous self-correction.

## 1. Absolute File Directory Architecture

The system uses the following strict paths to separate working context, historical lessons, and diagnostic truth:

- \`/context/working/\`: **(Volatile Memory)** Short-term memory for active error codes, iteration loop counters, and active payloads. Wiped frequently by the \`context-manager\`.
- \`/context/session/\`: **(Durable Session)** Structured session logs, tool call results, chronological decision pathways for the current multi-agent run.
- \`/context/checkpoints/\`: **(State Compression)** Whenever token limits approach 80%. Checkpoints are generated to prevent context drift/amnesia.
- \`/memories/repo/lessons/\`: **(The HLLM Vault)** Immutable repository of Historic Lesson Learning Mechanism (HLLM) files. Stores UUID-tagged XML/Markdown files of previously failed fixes and blacklisted coding patterns. Prevents agents from making the same algorithmic mistake twice.
- \`/diagnostics/traces/\`: **(Execution Evidence)** Unfiltered programmatic stack traces, Python profiling results, and raw API responses. Bypasses the need for human console copy-pasting.
- \`/.github/hooks/\`: **(Autonomous Triggers)** Workspace hook registry and deterministic lifecycle automation.
- \`/.github/hooks/scripts/\`: **(Hook Runtime Scripts)** Executable Python/JS hook handlers invoked by lifecycle events.
- \`/.github/hooks/copilot-runtime-hooks.json\`: **(Active Runtime Registry)** Native lifecycle hooks for \`PreToolUse\` and \`PostToolUse\` that execute fail-closed validations.

---

## 2. Supreme Agentic Hooks

Human coders often forget to run linting, tests, or security scans until the very end. The Orchestrator enforces these hooks programmatically.

### Currently Enforced Runtime Hooks
**Registry:** \`/.github/hooks/copilot-runtime-hooks.json\` and \`/.github/hooks/orchestrator-automation.json\`

- **PreToolUse Public Exposure Gate:** Blocks Docker + ngrok public exposure commands unless strict production-gate evidence is satisfied.
- **PostToolUse Test Failure Tracking:** Records failing test commands and requires fix-attempt + same-command retest before completion is allowed.
- **Task Completion Checkpoint:** Enforces evidence language for fix/retest/pass flows and continual-learning terms (for example: lesson, learned, prevention, runbook, checklist).
- **Public Exposure Evidence Contract:** Requires explicit \`Public Internet Exposure Gate: PASS\` plus \`GATE-1\` through \`GATE-10\` mapping when exposure validation is in scope.

### Advanced Hooks (Planned / Optional Extensions)
- **Static Gatekeeper Check:** Run \`eslint\`, \`phpstan\`, \`ruff\`, or \`mypy\` before major refactors.
- **HLLM Pattern Gate:** Reject proposed fixes matching blacklisted regex patterns in \`/memories/repo/lessons/\`.
- **Micro-Verification Loop:** Auto-run focused unit/integration bounds immediately after logic mutation.
- **Payload Boundary Validation:** Auto-validate API/JSON boundaries using schema validators (for example: Zod/Pydantic).

---

## 3. Instructions for Eradicating Human Limitations

To operate purely as a Supreme A.I.:

1. **Eradicate "Hope Driven Development"**: Humans write code and *hope* it works. You must utilize the **Programmatic Python Hypothesis Testing** (from `Thinker pro`) to write small simulation scripts natively before you touch the real source code. Prove the math/logic first.
2. **Eradicate Context Drift (Amnesia)**: Humans forget what they wrote 3 files ago. You rely strictly on the `context-manager` compression cycle. If context gets too large, you pause, checkpoint into \`state.json\`, and read from it deterministically.
3. **Eradicate Emotional Fixation**: If an applied fix fails twice, humans tend to stubbornly tweak the same line of code over and over. You are bound by the **3-cycle strict fix loop**. On the third failure, you immediately revert to baseline and swap to the \`logic-debugger\` for deep trace injection.
4. **Eradicate Superficial Review**: The \`100x Code Reviewer\` prevents any code from passing simply because it "functions." It must function, scale, be fully typed, be secure, and be completely agnostic to the host environment.