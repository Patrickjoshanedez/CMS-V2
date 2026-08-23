# Agentic Software Development Lifecycle (ASDLC) Blueprint & Statechart Harness

## 1. Executive Summary
This document defines the production-grade **Agentic Software Development Lifecycle (ASDLC)** blueprint, architectural boundaries, and statechart execution harness for CMS-V2. It formalizes deterministic agent governance, prevents context rot, stops Infinite Agentic Loops (IALs), and automates semantic version tagging.

---

## 2. The 8-Stage Agentic SDLC Framework

```
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │   STAGE 1    │     │   STAGE 2    │     │   STAGE 3    │     │   STAGE 4    │
   │    RULES     │────►│  ANALYZING   │────►│  INSPECTING  │────►│ AGENT CALL   │
   │ Standing Ord.│     │Context Triage│     │ AST Traversal│     │  Statechart  │
   └──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                         │
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
   │   STAGE 8    │     │   STAGE 7    │     │   STAGE 6    │     ┌──────▼───────┐
   │  FIX AUDIT   │◄────│  FINALIZING  │◄────│  VERIFYING   │◄────│   STAGE 5    │
   │ IAL Watchdog │     │ MCP Pause/Res│     │Builder-Verif.│     │ CODE EDITING │
   └──────────────┘     └──────────────┘     └──────────────┘     │   CST Patch  │
                                                                  └──────────────┘
```

### Stage 1: Rules (Standing Orders & Gateway Boundary)
* **Steering Instructions**: In-prompt tone, conventions, and style preferences.
* **Survival Rules**: Deterministic write-boundaries, execution quotas, tool access restrictions, and fail-closed gates enforced by runtime hooks (`.github/hooks/`) outside the LLM prompt context to eliminate governance decay.

### Stage 2: Analyzing (Context Triage & Memory Segmentation)
* **Static Instructions**: Immutable repository principles (`AGENTS.md`, workspace invariants).
* **Dynamic Task Graph**: Stepwise state graphs tracking active node execution.
* **Ephemeral Scratchpads**: Per-turn execution memory discarded upon sub-task completion to prevent attention dilution and context rot.

### Stage 3: Inspecting (Universal AST Call-Chain Traversal)
* Replaces unbounded full-file reads and raw regex scanning with structural AST call-chain navigation ($O(\log N)$ token cost).
* Maps caller-callee relationships directly to focus edits only on targeted symbol declarations.

### Stage 4: Agent Calling (Moore Statechart Execution Harness)
* Agent transitions are governed by a mathematical statechart (Finite State Machine).
* The harness controls the state transitions; the model's role is restricted to proposing valid events within the allowed transitions of the active state.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AgentStatechartTransitionEvent",
  "type": "object",
  "properties": {
    "currentState": {
      "type": "string",
      "enum": ["ANALYZING", "INSPECTING", "EDITING", "VERIFYING", "AWAITING_APPROVAL", "FINALIZING"]
    },
    "event": {
      "type": "string",
      "enum": ["EVAL_PASS", "EVAL_FAIL", "HUMAN_APPROVED", "RETRY_DISPATCH", "ABORT"]
    },
    "payload": {
      "type": "object"
    },
    "stateHash": {
      "type": "string"
    }
  },
  "required": ["currentState", "event", "stateHash"]
}
```

### Stage 5: Code Editing (Incremental CST Patching)
* Targets specific syntax nodes using Concrete Syntax Trees (CST / Tree-Sitter).
* Performs atomic subtree replacement preserving comments, formatting, and adjacent declarations without full-file rewrites.

### Stage 6: Verifying (Builder-Verifier Chains)
* Pairs the generator agent with deterministic verifiers (unit tests, linters, static gatekeepers).
* Tasks are certified complete only when the independent verifier returns exit code `0`, eliminating silent gray failures.

### Stage 7: Finalizing (MCP-Based Pause & Resume)
* High-risk operations (production deploys, secret rotations) trigger non-blocking pauses using Model Context Protocol (MCP) Multi Round-Trip Requests (MRTR).
* Serializes state to disk, sleeps, and re-hydrates upon human signature validation.

### Stage 8: Fix Audit (Infinite Agentic Loop [IAL] Mitigation Watchdog)
* External execution watchdog monitors turn counts, wall-clock duration, and computes SHA-256 hashes of turn transactions.
* If a state hash matches a previous iteration within the same session, stagnation is detected and the harness triggers an immediate fail-safe abort.

---

## 3. Automated Git Semantic Tagging Pipeline
The workspace includes a post-commit hook ([`scripts/git-auto-tag.py`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/scripts/git-auto-tag.py)) that inspects commit messages and automates semantic version tagging:

* `[major]` $\rightarrow$ Increments Major version, resets minor/patch (`v1.1.0` $\rightarrow$ `v2.0.0`).
* `[minor]` $\rightarrow$ Increments Minor version, resets patch (`v1.0.0` $\rightarrow$ `v1.1.0`).
* Default $\rightarrow$ Increments Patch version (`v1.1.0` $\rightarrow$ `v1.1.1`).
* **Loop Prevention**: Checks `git tag --points-at HEAD` to prevent duplicate tagging loops.
