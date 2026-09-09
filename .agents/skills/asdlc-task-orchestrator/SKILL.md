---
name: asdlc-task-orchestrator
version: 1.0.0
schema-version: 1
description: 3-Layer Task Architecture for multiple case scenarios under ASDLC (Hierarchical Statecharts, Progress Delta Circuit Breaker, and DAG Guard Predicates).
---

# ⚙️ ASDLC Multi-Scenario Task Orchestrator

## 1. Overview & Anti-Pattern Elimination
Flat, text-based prompt checklists suffer from **"hallucinated progress"** (agents marking tasks complete without deterministic verification) and **combinatorial state explosion ($O(2^N)$)** when navigating branching edge cases.

To execute multi-scenario tasks reliably, all agents operate under the **3-Layer Task Architecture**:
1. **Layer 1: Hierarchical Statecharts & Parallel Orthogonal Regions**: Formal Harel Statechart $M = (S, \Sigma, \delta, s_0, F)$ with OR-superstates, AND-orthogonal parallel regions, and Deep ($H^*$) / Shallow ($H$) history states.
2. **Layer 2: Durable Checkpoint Engine & Progress Delta Circuit Breaker**: External state storage outside the LLM prompt window, per-step progress delta validation ($\Delta \ge 1$), and a 2-cycle circuit breaker halting loops into `Reflecting` or `Human-Escalation`.
3. **Layer 3: Directed Acyclic Graphs (DAG) & Boolean Guard Predicates**: Topological sorting for deadlock-free execution, Boolean guard reduction via De Morgan's laws, and standard execution topology archetypes (T2 Route, T3 Fan-Out, T4 Orchestrator-Worker).

---

## 2. Layer 1: Hierarchical Statecharts & Parallel Orthogonal Regions

### Formal Tuple Definition
$$M = (S, \Sigma, \delta, s_0, F)$$
* $S$: Set of composite superstates and atomic leaf substates.
* $\Sigma$: Valid event alphabet (e.g., `EVAL_PASS`, `EVAL_FAIL`, `BREAK_TRIPPED`, `RESUME_H`).
* $\delta: S \times \Sigma \rightarrow S$: Transition function bounded by guard predicates.
* $s_0$: Initial state (e.g., `STAGE_0_STARTUP_PREFLIGHT`).
* $F$: Terminal accepting states (e.g., `STAGE_8_COMPLETED_AND_ARCHIVED`).

### Hierarchical OR-Decomposition (Composite Superstates)
* Group related scenario steps into superstates (e.g. `Scenario-Execution` $\rightarrow$ `[Unit-Testing, Integration-Testing, Edge-Case-Validation]`).
* Unhandled events in child substates automatically bubble up to the parent superstate, eliminating redundant handlers.

### Orthogonal Regions (AND-Decomposition for Parallel Scenarios)
* When evaluating multiple independent scenario cases concurrently (e.g., validating student, faculty, and instructor permission matrices), evaluate within **orthogonal state regions**.
* Prevents combinatorial state explosion ($O(2^N)$), keeping state bounds linear $O(N)$.

### Deep ($H^*$) & Shallow ($H$) History States
* When an agent pauses for HITL verification (e.g. ADM digital signature approval) or rate limits, history states save the exact active nested leaf configuration.
* Upon resumption, the agent returns directly to its exact nested sub-node without re-running previously validated scenarios.

---

## 3. Layer 2: Durable Checkpoint Engine & Circuit Breaker

### Checkpoint State Object Schema
Persisted outside the LLM prompt window in `.agents/ptss/tasks/<scenario_id>.json`:

```json
{
  "active_scenario_id": "SCENARIO-04-DEACTIVATED-USER",
  "completed_subgoals": [
    "auth_gating_check",
    "db_seed_verification"
  ],
  "remaining_subgoals": [
    "verify_403_forbidden_response",
    "audit_log_emission"
  ],
  "last_action_result": "Database seeded with isActive: false",
  "progress_delta": 1,
  "loop_count": 0
}
```

### Progress Delta Validation
On every iteration $t$, calculate progress delta:
$$\text{progress\_delta} = |\text{remaining\_subgoals}_{t-1}| - |\text{remaining\_subgoals}_t|$$

### Circuit Breaker Rule
* If $\text{progress\_delta} == 0$ for **two consecutive steps** (`loop_count >= 2`), the agent is declared looping.
* The statechart immediately halts the execution loop and shifts into a dedicated `Reflecting` or `Human-Escalation` state instead of burning context tokens.

---

## 4. Layer 3: DAG Dependencies & Guard Predicates

### Topological Sorting
Before dispatching tool actions, run a topological sort across task dependencies to guarantee a deterministic, deadlock-free sequence:
```python
import graphlib
ts = graphlib.TopologicalSorter(dependencies_graph)
execution_order = list(ts.static_order())
```

### Boolean Guard Predicate Reduction
Simplify transition conditions ($\delta: S \times \Sigma \rightarrow S$) using Boolean algebra (De Morgan's laws) to ensure transitions only fire on zero-error signals:
$$\neg (E_{\text{fail}} \lor E_{\text{timeout}}) \equiv \neg E_{\text{fail}} \land \neg E_{\text{timeout}}$$

---

## 5. Multi-Scenario Execution Topology Archetypes

| Topology Archetype | Multi-Scenario Application | Best Used For |
| :--- | :--- | :--- |
| **T2: Route (Classifier)** | Classifies incoming scenarios into specific domain buckets (e.g., student vs. faculty vs. admin edge cases) and dispatches to specialized subagents. | Intake triage & role-specific authorization boundaries. |
| **T3: Parallel Fan-Out** | Dispatches independent scenario tests concurrently across orthogonal regions and aggregates the results. | Bulk test execution & multi-profile validation matrices. |
| **T4: Orchestrator-Worker** | Central task statechart delegates individual scenario goals to worker subagents and updates global progress. | Complex multi-stage integration runs across the 4-phase capstone lifecycle. |

---

## 6. Execution Command & Verification
```bash
# Run ASDLC Task Orchestration Demo
python scripts/asdlc_task_orchestrator.py --demo

# Audit Active Persistent Scenario Checkpoints
python scripts/asdlc_task_orchestrator.py --verify-scenarios

# Run Automated Test Suite
python scratch/test_asdlc_task_orchestrator.py
```

## 7. Usage Triggers
- "multi-scenario"
- "case scenarios"
- "3-layer task architecture"
- "statechart orchestration"
- "orthogonal regions"
- "progress delta"
- "circuit breaker"
- "topological sort"
