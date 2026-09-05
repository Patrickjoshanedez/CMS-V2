#!/usr/bin/env python3
"""IHSA Completion Keyword & Termination Guard.

Enforces mandated termination protocols:
- Blocks premature 'task_complete' when unresolved test failures remain pending.
- Mandates continual-learning keywords in completion summaries (lesson, learned, prevention, etc.).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
STATE_FILE = WORKSPACE_ROOT / ".github" / "hooks" / "state" / "test_fix_state.json"

REQUIRED_KEYWORDS = (
    "lesson",
    "learned",
    "prevention",
    "retrospective",
    "runbook",
    "checklist",
    "evidence",
    "passed",
)

COMPLETION_TOOL_TOKENS = (
    "task_complete",
    "complete_task",
    "finish_task",
    "taskcompleted",
    "done",
)


def _load_pending_failures() -> list[dict[str, Any]]:
    if not STATE_FILE.exists():
        return []
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("pendingFailures", [])
    except Exception:
        return []


def is_completion_event(tool: str) -> bool:
    tool_clean = tool.strip().lower()
    return any(tok in tool_clean for tok in COMPLETION_TOOL_TOKENS)


def has_continual_learning_keyword(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in REQUIRED_KEYWORDS)


def evaluate_completion_keywords(payload: dict[str, Any]) -> dict[str, Any]:
    """In-process evaluator for task completion and continual learning keywords."""
    tool = str(payload.get("tool") or payload.get("toolName") or "")
    args = payload.get("arguments") or payload.get("args") or {}
    if not isinstance(args, dict):
        args = {}

    summary = str(payload.get("summary") or args.get("summary") or "")

    if not is_completion_event(tool):
        return {
            "gate": "completion_guard",
            "allow": True,
            "status": "ok",
            "message": "Event is not a task completion signal.",
        }

    # 1. Check for continual learning keywords
    if not has_continual_learning_keyword(summary):
        return {
            "gate": "completion_guard",
            "allow": False,
            "status": "blocked",
            "message": (
                "BLOCKED: Task completion summary must include at least one continual learning keyword: "
                + ", ".join(REQUIRED_KEYWORDS)
            ),
        }

    # 2. Check for pending unresolved test failures
    pending = _load_pending_failures()
    if pending:
        unfixed = [f for f in pending if f.get("fixAttempts", 0) == 0]
        if unfixed:
            cmd = unfixed[0].get("commandLabel", "unknown")[:60]
            return {
                "gate": "completion_guard",
                "allow": False,
                "status": "blocked",
                "message": (
                    f"BLOCKED: Cannot complete task while failed tests are pending fix+retest. "
                    f"Pending failure: {cmd}"
                ),
            }

    return {
        "gate": "completion_guard",
        "allow": True,
        "status": "passed",
        "message": "Task completion validated. Continual-learning evidence verified.",
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
    res = evaluate_completion_keywords(payload)
    print(json.dumps(res, indent=2))
    return 0 if res.get("allow", True) else 2


if __name__ == "__main__":
    sys.exit(main())
