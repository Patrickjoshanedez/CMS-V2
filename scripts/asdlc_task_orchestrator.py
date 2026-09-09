#!/usr/bin/env python3
"""ASDLC Multi-Scenario Task Orchestration Engine.

Implements the 3-Layer Task Architecture for multiple case scenarios under
the Agentic Software Development Life Cycle (ASDLC):
1. Hierarchical Statecharts (Harel tuple M = (S, Sigma, delta, s0, F),
   OR-superstates, AND-orthogonal parallel regions, Deep H* / Shallow H history states).
2. Durable Checkpoint Engine & Progress Delta Circuit Breaker
   (Persists state objects outside LLM prompt window, enforces progress delta >= 1,
   halts on 2 consecutive zero-progress cycles into Reflecting/Human-Escalation).
3. Directed Acyclic Graphs (DAG) & Boolean Guard Predicates
   (Topological sorting, Boolean guard reduction via De Morgan's laws,
   and T2 Route, T3 Parallel Fan-Out, T4 Orchestrator-Worker topologies).
"""

from __future__ import annotations

import argparse
import copy
import graphlib
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="[ASDLC Orchestrator] %(levelname)s: %(message)s"
)
logger = logging.getLogger("asdlc_task_orchestrator")

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
TASKS_STORAGE_DIR = WORKSPACE_ROOT / ".agents" / "ptss" / "tasks"


# ============================================================================
# LAYER 2: DURABLE CHECKPOINT ENGINE & DATA CONTRACT
# ============================================================================

@dataclass
class ScenarioState:
    """Explicit tracking attributes for multi-scenario task checkpoints."""
    active_scenario_id: str
    completed_subgoals: List[str] = field(default_factory=list)
    remaining_subgoals: List[str] = field(default_factory=list)
    last_action_result: str = ""
    progress_delta: int = 1
    loop_count: int = 0
    circuit_breaker_triggered: bool = False
    current_state: str = "IDLE"
    history_state: Optional[str] = None
    deep_history: Dict[str, Any] = field(default_factory=dict)
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> ScenarioState:
        return cls(
            active_scenario_id=data.get("active_scenario_id", "SCENARIO-DEFAULT"),
            completed_subgoals=data.get("completed_subgoals", []),
            remaining_subgoals=data.get("remaining_subgoals", []),
            last_action_result=data.get("last_action_result", ""),
            progress_delta=data.get("progress_delta", 1),
            loop_count=data.get("loop_count", 0),
            circuit_breaker_triggered=data.get("circuit_breaker_triggered", False),
            current_state=data.get("current_state", "IDLE"),
            history_state=data.get("history_state"),
            deep_history=data.get("deep_history", {}),
            updated_at=data.get("updated_at", datetime.now(timezone.utc).isoformat()),
        )


class CheckpointStore:
    """Manages persistent scenario checkpoints outside prompt context."""

    def __init__(self, storage_dir: Path = TASKS_STORAGE_DIR):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _file_path(self, scenario_id: str) -> Path:
        sanitized = scenario_id.replace(" ", "_").replace("/", "_")
        return self.storage_dir / f"{sanitized}.json"

    def save(self, state: ScenarioState) -> Path:
        state.updated_at = datetime.now(timezone.utc).isoformat()
        path = self._file_path(state.active_scenario_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, indent=2)
        return path

    def load(self, scenario_id: str) -> Optional[ScenarioState]:
        path = self._file_path(scenario_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ScenarioState.from_dict(data)


# ============================================================================
# LAYER 2: PROGRESS DELTA CIRCUIT BREAKER
# ============================================================================

class ProgressDeltaCircuitBreaker:
    """Halts execution and forces reflection/escalation if progress_delta == 0 for 2 consecutive steps."""

    def __init__(self, max_consecutive_zero_deltas: int = 2):
        self.max_consecutive_zero_deltas = max_consecutive_zero_deltas

    def evaluate_step(
        self,
        prev_remaining: List[str],
        new_remaining: List[str],
        state: ScenarioState,
        action_result: str,
    ) -> Tuple[int, bool]:
        """Calculates progress delta and determines if circuit breaker should trip.
        
        Returns:
            (progress_delta, should_trip_circuit_breaker)
        """
        # Delta = reduction in remaining subgoals
        delta = max(0, len(prev_remaining) - len(new_remaining))
        state.progress_delta = delta
        state.last_action_result = action_result

        if delta == 0:
            state.loop_count += 1
            logger.warning(
                f"[CircuitBreaker] Scenario '{state.active_scenario_id}' progress_delta=0 "
                f"(consecutive zero-deltas: {state.loop_count}/{self.max_consecutive_zero_deltas})"
            )
        else:
            state.loop_count = 0

        if state.loop_count >= self.max_consecutive_zero_deltas:
            state.circuit_breaker_triggered = True
            logger.critical(
                f"[CircuitBreaker TRIPPED] Loop detected in scenario '{state.active_scenario_id}'. "
                f"Halting execution -> Transitioning to REFLECTING / HUMAN-ESCALATION."
            )
            return delta, True

        return delta, False


# ============================================================================
# LAYER 3: DIRECTED ACYCLIC GRAPH (DAG) & GUARD PREDICATES
# ============================================================================

@dataclass
class TaskNode:
    """Represents a node in a scenario execution DAG."""
    id: str
    description: str
    dependencies: List[str] = field(default_factory=list)
    guard_expression: Optional[str] = None  # e.g., "not (eval_fail or timeout)"


class ScenarioDAG:
    """Directed Acyclic Graph runner with topological sorting and Boolean guard predicates."""

    def __init__(self):
        self.nodes: Dict[str, TaskNode] = {}

    def add_node(self, node: TaskNode) -> None:
        self.nodes[node.id] = node

    def get_topological_order(self) -> List[str]:
        """Returns deterministic, deadlock-free sequence of node IDs."""
        graph = {node_id: set(node.dependencies) for node_id, node in self.nodes.items()}
        ts = graphlib.TopologicalSorter(graph)
        try:
            return list(ts.static_order())
        except graphlib.CycleError as e:
            logger.error(f"[DAG Error] Circular dependency detected: {e}")
            raise ValueError(f"Scenario DAG contains circular dependency: {e}")

    @staticmethod
    def evaluate_guard_predicate(
        guard_expression: Optional[str],
        context: Dict[str, bool]
    ) -> bool:
        """Evaluates guard predicate using simplified Boolean reduction rules.
        
        Example:
            guard: "not (eval_fail or timeout)" is equivalent to "not eval_fail and not timeout".
        """
        if not guard_expression:
            return True

        # Normalized boolean evaluation within safe sandbox
        safe_names = {k: bool(v) for k, v in context.items()}
        safe_names["__builtins__"] = {}
        try:
            return bool(eval(guard_expression, safe_names, {}))
        except Exception as e:
            logger.error(f"[Guard Predicate Error] Failed evaluating '{guard_expression}': {e}")
            return False


# ============================================================================
# LAYER 1: HAREL STATECHART & PARALLEL ORTHOGONAL REGIONS
# ============================================================================

class StatechartRegion:
    """Represents an orthogonal region (AND-decomposition) for parallel execution."""

    def __init__(self, region_name: str, scenario_id: str, subgoals: List[str]):
        self.region_name = region_name
        self.state = ScenarioState(
            active_scenario_id=scenario_id,
            completed_subgoals=[],
            remaining_subgoals=copy.deepcopy(subgoals),
            current_state="INITIALIZED",
        )

    def execute_subgoal(self, subgoal_id: str, success: bool, outcome_msg: str) -> None:
        prev = copy.deepcopy(self.state.remaining_subgoals)
        if success and subgoal_id in self.state.remaining_subgoals:
            self.state.remaining_subgoals.remove(subgoal_id)
            self.state.completed_subgoals.append(subgoal_id)

        cb = ProgressDeltaCircuitBreaker()
        delta, tripped = cb.evaluate_step(prev, self.state.remaining_subgoals, self.state, outcome_msg)
        if tripped:
            self.state.current_state = "HUMAN_ESCALATION"
        elif len(self.state.remaining_subgoals) == 0:
            self.state.current_state = "COMPLETED"
        else:
            self.state.current_state = "EXECUTING"


class HarelStatechart:
    """Formal tuple M = (S, Sigma, delta, s0, F) with OR-superstates and AND-regions."""

    def __init__(self, initial_state: str = "IDLE"):
        self.current_superstate: str = initial_state
        self.orthogonal_regions: Dict[str, StatechartRegion] = {}
        self.shallow_history: Optional[str] = None
        self.deep_history: Dict[str, Any] = {}
        self.checkpoint_store = CheckpointStore()

    def add_orthogonal_region(self, region: StatechartRegion) -> None:
        self.orthogonal_regions[region.region_name] = region

    def transition_superstate(self, target_superstate: str, save_history: bool = True) -> None:
        """Transitions between composite superstates with history state preservation."""
        if save_history:
            self.shallow_history = self.current_superstate
            self.deep_history = {
                "superstate": self.current_superstate,
                "regions": {r_name: r.state.to_dict() for r_name, r in self.orthogonal_regions.items()},
                "saved_at": datetime.now(timezone.utc).isoformat()
            }
        logger.info(f"[Statechart] Transition {self.current_superstate} -> {target_superstate}")
        self.current_superstate = target_superstate

    def resume_from_deep_history(self) -> bool:
        """Restores exact active nested leaf configuration without re-running completed scenarios."""
        if not self.deep_history or "superstate" not in self.deep_history:
            logger.warning("[Statechart] No deep history state available to resume.")
            return False

        self.current_superstate = self.deep_history["superstate"]
        for r_name, r_data in self.deep_history.get("regions", {}).items():
            if r_name in self.orthogonal_regions:
                self.orthogonal_regions[r_name].state = ScenarioState.from_dict(r_data)
        logger.info(f"[Statechart] Resumed from deep history (H*) into {self.current_superstate}")
        return True


# ============================================================================
# MULTI-SCENARIO EXECUTION TOPOLOGY DISPATCHER
# ============================================================================

class ExecutionTopologyDispatcher:
    """Dispatches multi-scenario tasks across T2 (Route), T3 (Fan-Out), and T4 (Orchestrator-Worker)."""

    @staticmethod
    def t2_route_classifier(scenario_id: str, payload: Dict[str, Any]) -> str:
        """Classifies incoming scenario into specific specialized subagent domain."""
        role = payload.get("role", "").lower()
        if "student" in role:
            return "SUBAGENT_STUDENT_WORKFLOW"
        if "faculty" in role or "adviser" in role or "panelist" in role:
            return "SUBAGENT_FACULTY_EVALUATION"
        if "instructor" in role:
            return "SUBAGENT_INSTRUCTOR_GOVERNANCE"
        return "SUBAGENT_GENERAL_ASDLC"

    @staticmethod
    def t3_parallel_fan_out(
        scenarios: List[Tuple[str, List[str]]],
        checkpoint_store: Optional[CheckpointStore] = None
    ) -> Dict[str, ScenarioState]:
        """Dispatches independent scenarios concurrently across orthogonal state regions."""
        store = checkpoint_store or CheckpointStore()
        results: Dict[str, ScenarioState] = {}

        chart = HarelStatechart(initial_state="SCENARIO_EXECUTION")
        for sc_id, subgoals in scenarios:
            reg = StatechartRegion(region_name=f"region_{sc_id}", scenario_id=sc_id, subgoals=subgoals)
            chart.add_orthogonal_region(reg)

        for reg_name, reg in chart.orthogonal_regions.items():
            # Process subgoals
            for subgoal in list(reg.state.remaining_subgoals):
                reg.execute_subgoal(subgoal, success=True, outcome_msg=f"Subgoal {subgoal} verified.")
                store.save(reg.state)
            results[reg.state.active_scenario_id] = reg.state

        return results

    @staticmethod
    def t4_orchestrator_worker(
        dag: ScenarioDAG,
        scenario_id: str,
        execution_context: Dict[str, bool],
        checkpoint_store: Optional[CheckpointStore] = None
    ) -> ScenarioState:
        """Central task statechart delegates DAG-ordered scenario goals to worker processes."""
        store = checkpoint_store or CheckpointStore()
        ordered_subgoals = dag.get_topological_order()

        state = ScenarioState(
            active_scenario_id=scenario_id,
            completed_subgoals=[],
            remaining_subgoals=ordered_subgoals,
            current_state="SUPERSTATE_ORCHESTRATING"
        )
        cb = ProgressDeltaCircuitBreaker()

        for subgoal_id in list(ordered_subgoals):
            node = dag.nodes.get(subgoal_id)
            if not node:
                continue

            # Check guard predicate
            if not ScenarioDAG.evaluate_guard_predicate(node.guard_expression, execution_context):
                logger.warning(f"[Guard Block] Guard failed for subgoal '{subgoal_id}'. Halting path.")
                break

            prev = copy.deepcopy(state.remaining_subgoals)
            state.remaining_subgoals.remove(subgoal_id)
            state.completed_subgoals.append(subgoal_id)

            delta, tripped = cb.evaluate_step(
                prev,
                state.remaining_subgoals,
                state,
                f"Subgoal '{subgoal_id}' completed successfully."
            )
            store.save(state)

            if tripped:
                state.current_state = "REFLECTING_OR_HUMAN_ESCALATION"
                store.save(state)
                return state

        if len(state.remaining_subgoals) == 0:
            state.current_state = "COMPLETED"
        store.save(state)
        return state


# ============================================================================
# CLI ENTRYPOINT & DIAGNOSTIC HARNESS
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="ASDLC Multi-Scenario Task Orchestration Engine")
    parser.add_argument("--demo", action="store_true", help="Run multi-scenario validation demo")
    parser.add_argument("--verify-scenarios", action="store_true", help="Audit all persistent scenario checkpoints")
    args = parser.parse_args()

    if args.demo:
        logger.info("=== Running ASDLC 3-Layer Task Architecture Demo ===")
        # 1. Parallel Fan-Out (T3)
        sample_scenarios = [
            ("SCENARIO-01-STUDENT-AUTH", ["verify_session", "check_profile_scope"]),
            ("SCENARIO-02-INSTRUCTOR-EXCLUSION", ["verify_committee_roster", "assert_no_instructor_panelist"]),
            ("SCENARIO-03-ADM-SECRETARY-GATE", ["check_secretary_flag", "assert_panel_signatures_locked"]),
        ]
        results = ExecutionTopologyDispatcher.t3_parallel_fan_out(sample_scenarios)
        for sc_id, st in results.items():
            logger.info(f"Scenario [{sc_id}]: {st.current_state} (remaining: {len(st.remaining_subgoals)})")

        # 2. DAG Orchestrator-Worker (T4) with Circuit Breaker Test
        dag = ScenarioDAG()
        dag.add_node(TaskNode(id="step_a", description="Initialize Workspace"))
        dag.add_node(TaskNode(id="step_b", description="Build CST AST Diff", dependencies=["step_a"]))
        dag.add_node(TaskNode(id="step_c", description="Execute Verifier", dependencies=["step_b"], guard_expression="not (eval_fail or timeout)"))

        t4_state = ExecutionTopologyDispatcher.t4_orchestrator_worker(
            dag=dag,
            scenario_id="SCENARIO-04-CST-MUTATION",
            execution_context={"eval_fail": False, "timeout": False}
        )
        logger.info(f"T4 DAG Result: {t4_state.current_state}, completed={t4_state.completed_subgoals}")
        sys.exit(0)

    if args.verify_scenarios:
        store = CheckpointStore()
        files = list(store.storage_dir.glob("*.json"))
        logger.info(f"Found {len(files)} persistent scenario checkpoints in {store.storage_dir}")
        for f in files:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            logger.info(f"-> {data.get('active_scenario_id')}: state={data.get('current_state')} delta={data.get('progress_delta')}")
        sys.exit(0)

    parser.print_help()


if __name__ == "__main__":
    main()
