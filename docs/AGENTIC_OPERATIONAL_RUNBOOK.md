# Agentic Operational Runbook

## Purpose
Single-page operational runbook mapping failure modes to the exact hook/agent catches in the CMS-V2 orchestration system.

## Runtime Guardrail Order
PreToolUse hooks execute in this order:
1. agent-prefetch
2. agent-sync-verify
3. decision-coherence
4. hllm-regex-preflight
5. static-gatekeeper
6. continual-learning-checkpoint (public-exposure gate stage)

PostToolUse:
1. continual-learning-checkpoint

## Failure Mode Mapping

### 1) Missing or malformed agent manifests
- Detection point: `agent-prefetch`
- Source: `.github/hooks/scripts/agent_prefetch.py`
- Fail mode: fail-closed (tool execution stops)
- Evidence artifact: `.github/hooks/state/agent_prefetch_registry.json`

### 2) Missing instructions/skills/hooks/directories
- Detection point: `agent-prefetch` preflight surface checks
- Source: `.github/hooks/scripts/agent_prefetch.py`
- Fail mode: fail-closed
- Evidence artifact: `preflight_surface.errors` in `.github/hooks/state/agent_prefetch_registry.json`

### 3) Required MCP servers not registered
- Detection point: `agent-prefetch` tool activation preflight
- Source: `.github/hooks/scripts/agent_prefetch.py`
- Fail mode: fail-closed
- Evidence artifact: `tool_activation.missing_mcp_servers`

### 4) Inline credentials in MCP config (secret leakage risk)
- Detection point: `agent-prefetch` secret-hygiene scan
- Source: `.github/hooks/scripts/agent_prefetch.py`
- Fail mode: fail-closed
- Evidence artifact: preflight error entry referencing `.vscode/mcp.json` server + field

### 5) Serena not activation-ready
- Detection point: preflight + orchestrator startup gate
- Sources:
  - `.github/hooks/scripts/agent_prefetch.py`
  - `.github/agents/orchestrator.agent.md`
- Fail mode: fail-closed before planning
- Evidence artifacts:
  - `serena_activation.*` in `.github/hooks/state/agent_prefetch_registry.json`
  - startup decision trace in orchestrator flow

### 6) Agent communication deadlocks/cycles
- Detection point: `agent-sync-verify`
- Source: `.github/hooks/scripts/agent_sync_verify.py`
- Fail mode: fail-closed
- Evidence artifact: `.github/hooks/state/agent_communication_dag.json`

### 7) Contradictory routing or missing fallback paths
- Detection point: `decision-coherence`
- Source: `.github/hooks/scripts/decision_coherence.py`
- Fail mode: fail-closed
- Evidence artifact: `.github/hooks/state/decision_coherence_report.json`

### 8) Repeated known-bad fix pattern
- Detection point: `hllm-regex-preflight`
- Source: `.github/hooks/scripts/hllm_regex_preflight.py`
- Fail mode: fail-closed
- Evidence artifacts:
  - lessons under `memories/repo/lessons/`
  - blacklist violation output in hook trace

### 9) Lint/type/static policy violations before mutation
- Detection point: `static-gatekeeper`
- Source: `.github/hooks/scripts/static_gatekeeper.py`
- Fail mode: fail-closed
- Evidence artifact: gatekeeper output + problems panel findings

### 10) Public exposure policy violations (docker/ngrok)
- Detection point: exposure gate stage + orchestrator policy
- Sources:
  - `.github/hooks/scripts/continual_learning_checkpoint.py`
  - `.github/agents/orchestrator.agent.md`
- Fail mode: fail-closed unless all exposure gates pass
- Evidence artifact: gate evidence map and checkpoint logs

### 11) Fix-loop deadlock / token burn risk
- Detection point: orchestrator global circuit breaker
- Source: `.github/agents/orchestrator.agent.md`
- Action: after max retries + logic-debugger intervention, stop autonomous loops and escalate with evidence bundle
- Evidence artifact: failing command history + retest outputs + escalation summary

## Fast-Path Rules (Latency Control)
For clearly low-complexity work (single-file non-behavioral edits, copy fixes, style-only updates):
- Skip strategic/research phases unless uncertainty is detected.
- Route directly to implementation + verification.
- Still enforce preflight and safety hooks.

## Operations Checklist
1. Verify preflight artifacts are fresh:
   - `.github/hooks/state/agent_prefetch_registry.json`
   - `.github/hooks/state/agent_communication_dag.json`
   - `.github/hooks/state/decision_coherence_report.json`
2. Confirm `preflight_surface.errors` is empty.
3. Confirm no inline secret findings are reported.
4. Confirm Serena activation readiness fields are populated.
5. Execute task via normal orchestrator pipeline (or fast path when eligible).
6. Require test evidence and final reviewer verdict before completion.

## Incident Recovery
If orchestration blocks unexpectedly:
1. Run `agent_prefetch.py` directly and inspect `preflight_surface.errors`.
2. Run `agent_sync_verify.py` and inspect cycle/deadlock report.
3. Run `decision_coherence.py` and inspect fallback/conflict report.
4. Resolve first failing gate only, rerun from step 1.

## Continual Learning
After every material failure mode:
- Record lesson in `memories/repo/lessons/`
- Add prevention rule to instructions if systemic
- Keep this runbook aligned with active hook registry and agent registry
