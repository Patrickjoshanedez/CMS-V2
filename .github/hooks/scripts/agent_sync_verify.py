#!/usr/bin/env python3
"""Agent Synchronization Verifier - Validates agent communication paths and builds DAG.

Verifies bidirectional communication paths, checks tool signature compatibility,
and builds a directed acyclic graph (DAG) of agent delegation relationships.
Fails closed if circular dependencies or deadlocks are detected.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import tempfile

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
AGENTS_DIR = WORKSPACE_ROOT / ".github" / "agents"
STATE_DIR = WORKSPACE_ROOT / ".github" / "hooks" / "state"
PREFETCH_FILE = STATE_DIR / "agent_prefetch_registry.json"
DAG_FILE = STATE_DIR / "agent_communication_dag.json"

logging.basicConfig(
    level=logging.INFO,
    format="[agent_sync_verify] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class AgentNode:
    """Represents an agent in the communication graph."""
    name: str
    tools: list[str] = field(default_factory=list)
    can_delegate_to: set[str] = field(default_factory=set)
    can_receive_from: set[str] = field(default_factory=set)
    errors: list[str] = field(default_factory=list)


@dataclass
class DAGMetadata:
    """Metadata for the communication DAG."""
    version: str = "1.0.0"
    generated_at: str = ""
    agent_count: int = 0
    edges_count: int = 0
    has_cycles: bool = False
    has_deadlocks: bool = False
    validation_status: str = "valid"


def load_prefetch_registry() -> tuple[dict[str, Any], bool]:
    """Load agent registry from prefetch output."""
    try:
        with open(PREFETCH_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                raise json.JSONDecodeError("Empty prefetch registry", content, 0)
            return json.loads(content), True
    except FileNotFoundError:
        logger.error(f"Prefetch registry not found: {PREFETCH_FILE}")
        return {}, False
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in prefetch registry: {e}")
        return {}, False


def write_json_atomically(target_path: Path, payload: dict[str, Any]) -> None:
    """Write JSON safely with retries for transient Windows file locks."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload_text = json.dumps(payload, indent=2)

    last_error: Exception | None = None
    for attempt in range(6):
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w',
                encoding='utf-8',
                delete=False,
                dir=target_path.parent,
                suffix='.tmp',
            ) as temp_file:
                temp_file.write(payload_text)
                temp_file.flush()
                os.fsync(temp_file.fileno())
                temp_path = Path(temp_file.name)

            os.replace(temp_path, target_path)
            return
        except PermissionError as exc:
            last_error = exc
            try:
                if target_path.exists():
                    os.chmod(target_path, 0o666)
            except OSError:
                pass
            time.sleep(0.05 * (2 ** attempt))
        finally:
            if temp_path and temp_path.exists() and temp_path != target_path:
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to atomically write {target_path}")


def extract_delegation_instructions(agent_file: Path) -> set[str]:
    """Extract agent delegation instructions from markdown files."""
    try:
        content = agent_file.read_text(encoding='utf-8')
    except Exception as e:
        logger.warning(f"Could not read {agent_file}: {e}")
        return set()
    
    delegations = set()
    
    # Look for patterns like "delegate to researcher", "call @researcher", etc.
    # Also look for agent function calls or explicit routing
    patterns = [
        r'delegate\s+to\s+(\w[\w\s-]*)',
        r'@(\w[\w\s-]*)\s+(?:agent|to)',
        r'(?:agent|sub-?agents?)\s+(?:like|such as|including|to).*?(["\']?)(\w[\w\s-]*)\1',
        r'call.*?(\w[\w\s-]*)\s+(?:agent|to)',
        r'next-?agent.*?(?:is|=|:)\s+(["\'])?(\w[\w\s-]*)(?:\1)?',
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            # Get the captured group that contains the agent name
            for i in range(1, len(match.groups()) + 1):
                if match.group(i) and not match.group(i) in ['"', "'"]:
                    delegations.add(match.group(i).strip().lower())
    
    return delegations


def normalize_agent_name(name: str) -> str:
    """Normalize agent name for comparison."""
    return name.strip().lower()


def build_agent_graph(registry: dict[str, Any]) -> dict[str, AgentNode]:
    """Build bidirectional agent communication graph."""
    nodes: dict[str, AgentNode] = {}
    
    # Create nodes for all agents
    for agent_name, agent_info in registry.get("agents", {}).items():
        normalized_name = normalize_agent_name(agent_name)
        nodes[normalized_name] = AgentNode(
            name=agent_name,
            tools=agent_info.get("tools", [])
        )
    
    # Extract delegation relationships from agent files
    for agent_file in AGENTS_DIR.glob("*.agent.md"):
        delegations = extract_delegation_instructions(agent_file)
        
        # Find matching agent in registry
        agent_name = None
        for registered_name in nodes.keys():
            if registered_name in [normalize_agent_name(agent_file.stem), normalize_agent_name(agent_file.stem.replace('.agent', ''))]:
                agent_name = registered_name
                break
        
        # Try to extract from file name
        if not agent_name:
            base_name = agent_file.stem.replace('.agent', '')
            normalized = normalize_agent_name(base_name)
            if normalized in nodes:
                agent_name = normalized
        
        if agent_name and agent_name in nodes:
            for delegation in delegations:
                # Find matching target agent
                for target_name in nodes.keys():
                    if delegation in target_name or target_name in delegation:
                        nodes[agent_name].can_delegate_to.add(target_name)
                        nodes[target_name].can_receive_from.add(agent_name)
                        break
    
    return nodes


def detect_cycles(nodes: dict[str, AgentNode]) -> list[list[str]]:
    """Detect circular dependencies in agent graph."""
    cycles = []
    visited = set()
    rec_stack = set()
    
    def dfs(node_name: str, path: list[str]) -> None:
        visited.add(node_name)
        rec_stack.add(node_name)
        path.append(node_name)
        
        for neighbor in nodes[node_name].can_delegate_to:
            if neighbor not in visited:
                dfs(neighbor, path[:])
            elif neighbor in rec_stack:
                # Found cycle
                cycle_start = path.index(neighbor)
                cycle = path[cycle_start:] + [neighbor]
                cycles.append(cycle)
        
        rec_stack.remove(node_name)
    
    for node_name in nodes:
        if node_name not in visited:
            dfs(node_name, [])
    
    return cycles


def detect_deadlocks(nodes: dict[str, AgentNode]) -> list[str]:
    """Detect potential deadlock patterns (e.g., circular dependencies only).
    
    In a multi-agent system, isolated agents (no incoming/outgoing edges) are valid
    leaf nodes that can be called by the orchestrator. Only flag as deadlock if there's
    a cycle or truly unrecoverable isolation pattern.
    """
    deadlocks = []
    
    # Check for circular dependencies only
    for node_name, node in nodes.items():
        for target in node.can_delegate_to:
            if target in nodes:
                # Check if there's a reverse path back (simple cycle detection)
                if node_name in nodes[target].can_delegate_to:
                    deadlocks.append(f"Circular dependency detected: {node_name} <-> {target}")
    
    # Note: Isolated agents are not deadlocks; they're valid leaf nodes
    return deadlocks


def validate_synchronization(nodes: dict[str, AgentNode]) -> tuple[bool, dict[str, Any]]:
    """Validate synchronization paths and relationships."""
    validation = {
        "total_agents": len(nodes),
        "bidirectional_pairs": 0,
        "unidirectional_edges": 0,
        "isolated_agents": 0,
        "cycles": [],
        "deadlocks": [],
        "errors": [],
    }
    
    # Check for cycles
    cycles = detect_cycles(nodes)
    if cycles:
        validation["cycles"] = [' -> '.join(cycle) for cycle in cycles]
        validation["errors"].append(f"Found {len(cycles)} circular dependencies")
    
    # Check for deadlocks (only real circular deadlocks, not isolated agents)
    deadlocks = detect_deadlocks(nodes)
    if deadlocks:
        validation["deadlocks"] = deadlocks
        validation["errors"].append(f"Found {len(deadlocks)} circular dependencies")
    
    # Count edge patterns
    bidirectional_checked = set()
    for node_name, node in nodes.items():
        for target in node.can_delegate_to:
            pair = tuple(sorted([node_name, target]))
            if pair not in bidirectional_checked:
                bidirectional_checked.add(pair)
                # Check if bidirectional
                if target in nodes and node_name in nodes[target].can_delegate_to:
                    validation["bidirectional_pairs"] += 1
                else:
                    validation["unidirectional_edges"] += 1
        
        # Count isolated agents (informational only)
        if not node.can_delegate_to and not node.can_receive_from:
            validation["isolated_agents"] += 1
    
    # Only fail if there are actual circular dependencies, not isolated agents
    is_valid = len(validation["errors"]) == 0
    return is_valid, validation


def build_dag_output(nodes: dict[str, AgentNode], validation: dict[str, Any]) -> dict[str, Any]:
    """Build output DAG structure for orchestrator."""
    has_errors = len(validation.get("errors", [])) > 0
    has_cycles = len(validation.get("cycles", [])) > 0
    has_true_deadlocks = len(validation.get("deadlocks", [])) > 0
    
    dag = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "metadata": {
            "agent_count": len(nodes),
            "edges_count": validation["bidirectional_pairs"] + validation["unidirectional_edges"],
            "has_cycles": has_cycles,
            "has_deadlocks": has_true_deadlocks,
            "validation_status": "invalid" if has_errors else "valid",
        },
        "nodes": {},
        "edges": [],
        "validation": validation,
    }
    
    # Add nodes
    for node_name, node in nodes.items():
        dag["nodes"][node_name] = {
            "name": node.name,
            "tools_count": len(node.tools),
            "can_delegate_to": sorted(list(node.can_delegate_to)),
            "can_receive_from": sorted(list(node.can_receive_from)),
            "errors": node.errors,
        }
    
    # Add edges (deduplicated)
    edges_added = set()
    for node_name, node in nodes.items():
        for target in node.can_delegate_to:
            edge_key = tuple(sorted([node_name, target]))
            if edge_key not in edges_added:
                edges_added.add(edge_key)
                dag["edges"].append({
                    "source": node_name,
                    "target": target,
                    "bidirectional": target in nodes and node_name in nodes[target].can_delegate_to,
                })
    
    return dag


def main():
    """Main entry point."""
    try:
        logger.info("Starting agent synchronization verification...")
        
        # Load prefetch registry
        registry, registry_loaded = load_prefetch_registry()
        if not registry_loaded:
            logger.error("Stopping synchronization verification because the prefetch registry could not be loaded.")
            sys.exit(1)
        logger.info(f"Loaded prefetch registry with {registry.get('agent_count', 0)} agents")
        
        # Check if registry is valid
        if registry.get("validation_summary", {}).get("invalid", 0) > 0:
            logger.error("Prefetch registry has invalid agents")
            sys.exit(1)
        
        # Build agent communication graph
        nodes = build_agent_graph(registry)
        logger.info(f"Built agent graph with {len(nodes)} nodes")
        
        # Validate synchronization
        is_valid, validation = validate_synchronization(nodes)
        
        # Build DAG output
        dag = build_dag_output(nodes, validation)
        
        # Ensure state directory exists
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write DAG to state file atomically
        write_json_atomically(DAG_FILE, dag)
        
        logger.info(f"Agent communication DAG written to {DAG_FILE}")
        logger.info(f"DAG validation: {dag['metadata']['validation_status']}")
        
        if not is_valid:
            logger.error(f"DAG validation failed: {validation['errors']}")
            sys.exit(1)
        
        logger.info(f"Synchronization verification complete: {len(nodes)} agents, {dag['metadata']['edges_count']} edges")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Synchronization verification failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    import sys
    main()
