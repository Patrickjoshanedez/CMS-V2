# Research & Governance Framework: Mitigating Agentic Looping in Multi-Agent Workspaces

## 1. Problem Statement
Autonomous AI pair-programming and multi-agent systems frequently succumb to **Agentic Looping**—a pathological failure state where the agent repeatedly cycles through the same sequence of actions without making forward progress.

In the CMS-V2 workspace, specific structural factors contributed to loops:
1. **Tool Timeouts**: Integration test suites running >2 minutes triggered premature task aborts, leading agents to assume tests failed and repeatedly modify functional code.
2. **Fail-Closed Gate Deadlocks**: PreToolUse hook blocks (`public-internet-exposure-gate`, missing state files) without clear remediation instructions prompted repetitive command retries.
3. **Context Window Degradation**: Accumulation of verbose hook states and logs caused semantic attention drift.

---

## 2. The 4-Pillar Anti-Looping Framework

```
                    ┌──────────────────────────────────────────────┐
                    │        Agentic Request & Task Entry          │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ PILLAR 1: Targeted Fast-Fail Verification    │
                    │   - Unit test first (<15s)                   │
                    │   - Scoped integration test                  │
                    │   - Fast bcrypt work factor (cost = 4)       │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ PILLAR 2: Hard Iteration Convergence Caps    │
                    │   - Max 3 edit-test cycles per subagent      │
                    │   - Loop breaker escalation to user          │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ PILLAR 3: Transparent Gate Remediation       │
                    │   - Return exact missing state prerequisites │
                    │   - Pre-seed required hook state files       │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ PILLAR 4: Context Compaction & Token Budget  │
                    │   - Truncate repetitive test logs            │
                    │   - Summarize hook DAG & prefetch reports    │
                    └──────────────────────────────────────────────┘
```

---

## 3. Concrete Governance Policies for CMS-V2

### Policy 1: Test Suite Tiering
* Agents must run fast unit test targets first:
  ```bash
  npx vitest run tests/unit
  ```
* When testing a specific module, agents must target the exact test file (e.g. `npx vitest run tests/integration/auth.test.js`) rather than executing the entire workspace test suite on every code edit.

### Policy 2: Fail-Closed Hook Remediation Schema
PreToolUse hooks must output actionable guidance alongside denial messages:
```json
{
  "allow": false,
  "status": "error",
  "message": "Blocked by public-internet-exposure-gate: Ngrok or production exposure requires active verification evidence.",
  "actionable_remedy": "Run 'node scripts/validate-agentic-system.js' or ensure test mode is active."
}
```

### Policy 3: Hook State Invariance
All state files in `.github/hooks/state/` (including `hllm_blacklist_patterns.json`, `agent_prefetch_registry.json`, `agent_communication_dag.json`) must be checked into version control or generated on workspace bootstrap.
