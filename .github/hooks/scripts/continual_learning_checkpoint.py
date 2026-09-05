#!/usr/bin/env python3
"""IHSA Modular Continual-Learning Checkpoint & Facade.

Delegates lifecycle events to specialized single-responsibility gates:
- public_exposure_gate: Scans for unauthorized Docker/ngrok exposure.
- test_tracking_gate: Tracks test failures and fail-to-pass / pass-to-pass gates.
- completion_keyword_guard: Mandates continual-learning keywords upon task completion.

Maintains 100% backward compatibility for all CLI and orchestrator callers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from public_exposure_gate import evaluate_public_exposure, is_public_exposure_command
    from test_tracking_gate import evaluate_test_tracking
    from completion_keyword_guard import evaluate_completion_keywords, is_completion_event
except ImportError:
    # Fallback to absolute workspace imports if invoked from elsewhere
    WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
    sys.path.insert(0, str(WORKSPACE_ROOT / ".github" / "hooks" / "scripts"))
    from public_exposure_gate import evaluate_public_exposure, is_public_exposure_command
    from test_tracking_gate import evaluate_test_tracking
    from completion_keyword_guard import evaluate_completion_keywords, is_completion_event


def evaluate_checkpoint(payload: dict[str, Any]) -> dict[str, Any]:
    """Unified in-process evaluator combining the modular gates."""
    tool = str(payload.get("tool") or payload.get("toolName") or "")
    args = payload.get("arguments") or payload.get("args") or {}
    if not isinstance(args, dict):
        args = {}

    cmd = str(args.get("command") or args.get("CommandLine") or "").strip()

    # 1. Evaluate public internet exposure gate
    if is_public_exposure_command(cmd):
        exp_res = evaluate_public_exposure(payload)
        if not exp_res.get("allow", True):
            return {
                "hook": "continual-learning-checkpoint",
                "allow": False,
                "status": "blocked",
                "message": exp_res.get("message", "Public exposure gate blocked command."),
                "subgate": "public_exposure",
            }

    # 2. Evaluate test tracking on test commands or code edits
    tracking_res = evaluate_test_tracking(payload)
    if not tracking_res.get("allow", True):
        return {
            "hook": "continual-learning-checkpoint",
            "allow": False,
            "status": "blocked",
            "message": tracking_res.get("message", "Test tracking gate blocked event."),
            "subgate": "test_tracking",
        }

    # 3. Evaluate task completion keyword guard
    if is_completion_event(tool):
        comp_res = evaluate_completion_keywords(payload)
        if not comp_res.get("allow", True):
            return {
                "hook": "continual-learning-checkpoint",
                "allow": False,
                "status": "blocked",
                "message": comp_res.get("message", "Completion keyword guard blocked event."),
                "subgate": "completion_guard",
            }

    return {
        "hook": "continual-learning-checkpoint",
        "allow": True,
        "status": "ok",
        "message": "All continual learning and exposure checkpoints satisfied.",
    }


def _safe_parse_payload(raw: str) -> dict[str, Any]:
    if not raw or not raw.strip():
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        try:
            fixed = raw.strip().replace("'", '"')
            data = json.loads(fixed)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}


def main() -> int:
    raw = sys.stdin.read().strip()
    payload = _safe_parse_payload(raw)
    res = evaluate_checkpoint(payload)
    print(json.dumps(res, indent=2))
    return 0 if res.get("allow", True) else 2


if __name__ == "__main__":
    sys.exit(main())
