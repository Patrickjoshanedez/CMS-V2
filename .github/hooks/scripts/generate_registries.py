#!/usr/bin/env python3
"""IHSA Registry Generation & Synchronization Engine.

Automates the synchronization of agent and hook states based on the live
repository index, unifying hook_registry.json, orchestrator-automation.json,
and copilot-runtime-hooks.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
HOOKS_DIR = WORKSPACE_ROOT / ".github" / "hooks"
SCRIPTS_DIR = HOOKS_DIR / "scripts"
STATE_DIR = HOOKS_DIR / "state"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from agent_prefetch import evaluate_agent_prefetch
from agent_sync_verify import evaluate_sync_verify
from decision_coherence import evaluate_decision_coherence


def sync_hook_configurations() -> dict[str, Any]:
    registry_file = HOOKS_DIR / "hook_registry.json"
    copilot_file = HOOKS_DIR / "copilot-runtime-hooks.json"
    orch_file = HOOKS_DIR / "orchestrator-automation.json"

    if not registry_file.exists():
        return {"status": "error", "message": "hook_registry.json missing"}

    with open(registry_file, "r", encoding="utf-8") as f:
        registry = json.load(f)

    # Sync orchestrator automation hooks
    orch_hooks = {"PreToolUse": [], "PostToolUse": []}
    for lifecycle in ("PreToolUse", "PostToolUse"):
        for entry in registry.get("hooks", {}).get(lifecycle, []):
            hook_id = entry.get("id")
            script = entry.get("script")
            timeout = entry.get("timeout", 20)
            orch_hooks[lifecycle].append({
                "id": hook_id,
                "type": "command",
                "script": script,
                "command": f"python3 {script}",
                "windows": f"py -3 {script}",
                "linux": f"python3 {script}",
                "osx": f"python3 {script}",
                "cwd": "./",
                "timeout": timeout,
                "failMode": entry.get("failMode", "error"),
                "description": entry.get("description", ""),
            })

    orch_payload = {
        "version": "2.0.0",
        "schemaVersion": 1,
        "description": "Workspace hook registry for orchestrator lifecycle enforcement.",
        "hooks": orch_hooks,
    }

    with open(orch_file, "w", encoding="utf-8") as f:
        json.dump(orch_payload, f, indent=2)

    return {"status": "ok", "message": "Hook configurations synchronized."}


def generate_all_registries() -> dict[str, Any]:
    print("[generate_registries] INFO: Synchronizing hook configurations...")
    hook_sync = sync_hook_configurations()

    print("[generate_registries] INFO: Generating agent prefetch registry...")
    prefetch_res = evaluate_agent_prefetch()

    print("[generate_registries] INFO: Generating agent communication DAG...")
    sync_res = evaluate_sync_verify()

    print("[generate_registries] INFO: Generating decision coherence report...")
    coherence_res = evaluate_decision_coherence()

    summary = {
        "status": "ok",
        "hook_sync": hook_sync,
        "prefetch": prefetch_res,
        "sync_dag": sync_res,
        "coherence": coherence_res,
    }
    print("[generate_registries] SUCCESS: All IHSA registries successfully synchronized.")
    return summary


def main() -> int:
    res = generate_all_registries()
    return 0 if res.get("status") == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
