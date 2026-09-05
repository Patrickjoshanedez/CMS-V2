#!/usr/bin/env python3
"""IHSA Test Tracking Gate.

Enforces the binary test success condition:
- All FAIL_TO_PASS tests must be fixed and retested.
- Zero PASS_TO_PASS tests may regress.
- Prevents premature task completion while test failures remain pending.
"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

JsonObject = dict[str, Any]

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
STATE_DIR = WORKSPACE_ROOT / ".github" / "hooks" / "state"
STATE_FILE = STATE_DIR / "test_fix_state.json"

TEST_COMMAND_TOKENS = (
    "npm test",
    "npm run test",
    "pnpm test",
    "pnpm run test",
    "yarn test",
    "pytest",
    "vitest",
    "jest",
    "go test",
    "cargo test",
    "playwright test",
    "cypress run",
    "test:",
)

EDIT_TOOL_TOKENS = (
    "edit",
    "apply_patch",
    "create_file",
    "editfile",
    "editfiles",
    "write",
    "replace",
    "replace_file_content",
    "multi_replace_file_content",
    "write_to_file",
)


def _load_state() -> JsonObject:
    if not STATE_FILE.exists():
        return {
            "pendingFailures": [],
            "observedTestActivity": False,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "integrityAnomaly": None,
            "publicExposureGate": {
                "pending": False,
                "pendingContext": None,
                "passed": False,
                "lastVerifiedAt": None,
                "lastAttemptedCommand": "",
                "lastBlockedAt": None,
                "evidenceMap": {},
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            },
        }
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"pendingFailures": [], "observedTestActivity": False}


def _save_state_atomically(state: JsonObject) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state["updatedAt"] = datetime.now(timezone.utc).isoformat()
    data = json.dumps(state, indent=2)

    for _ in range(5):
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=STATE_DIR, suffix=".tmp") as tmp:
                tmp.write(data)
                tmp.flush()
                os.fsync(tmp.fileno())
                tmp_path = Path(tmp.name)
            os.replace(tmp_path, STATE_FILE)
            return
        except PermissionError:
            continue
        except Exception:
            break


def normalize_command_label(cmd: str) -> str:
    cleaned = re.sub(r"\s+", " ", cmd.strip().lower())
    return cleaned[:200]


def record_test_failure(command: str, exit_code: int = 1) -> None:
    state = _load_state()
    state["observedTestActivity"] = True
    norm = normalize_command_label(command)
    now = datetime.now(timezone.utc).isoformat()

    failures = state.setdefault("pendingFailures", [])
    for item in failures:
        if item.get("commandLabelNormalized") == norm:
            item["lastFailedAt"] = now
            item["lastExitCode"] = exit_code
            _save_state_atomically(state)
            return

    failures.append({
        "commandLabel": command[:250],
        "commandLabelNormalized": norm,
        "firstFailedAt": now,
        "lastFailedAt": now,
        "fixAttempts": 0,
        "lastExitCode": exit_code,
    })
    _save_state_atomically(state)


def record_fix_attempt() -> None:
    state = _load_state()
    failures = state.get("pendingFailures", [])
    if not failures:
        return
    for item in failures:
        item["fixAttempts"] = item.get("fixAttempts", 0) + 1
    _save_state_atomically(state)


def record_test_pass(command: str) -> None:
    state = _load_state()
    state["observedTestActivity"] = True
    norm = normalize_command_label(command)
    failures = state.get("pendingFailures", [])
    if not failures:
        return

    # Filter out resolved failure
    state["pendingFailures"] = [
        item for item in failures if item.get("commandLabelNormalized") != norm
    ]
    _save_state_atomically(state)


def evaluate_test_tracking(payload: dict[str, Any]) -> dict[str, Any]:
    """In-process evaluator for test tracking and fail-to-pass gates."""
    tool = str(payload.get("tool") or payload.get("toolName") or "").lower()
    args = payload.get("arguments") or payload.get("args") or {}
    if not isinstance(args, dict):
        args = {}

    cmd = str(args.get("command") or args.get("CommandLine") or "").strip()
    exit_code = payload.get("exitCode") or payload.get("code")

    # 1. If an edit tool is executing, log fix attempt
    if any(tok in tool for tok in EDIT_TOOL_TOKENS):
        record_fix_attempt()
        return {
            "gate": "test_tracking",
            "allow": True,
            "status": "ok",
            "message": "Recorded edit fix attempt against pending test failures.",
        }

    # 2. If a test command just finished execution (PostToolUse)
    if any(tok in cmd.lower() for tok in TEST_COMMAND_TOKENS):
        if exit_code is not None and int(exit_code) != 0:
            record_test_failure(cmd, int(exit_code))
            return {
                "gate": "test_tracking",
                "allow": False,
                "status": "test_failed",
                "message": f"Test failure recorded: {cmd[:80]}. Mandated fix-and-retest cycle initiated.",
            }
        elif exit_code == 0:
            record_test_pass(cmd)
            return {
                "gate": "test_tracking",
                "allow": True,
                "status": "test_passed",
                "message": f"Test passed: {cmd[:80]}. Cleared matching pending failure.",
            }

    state = _load_state()
    pending = state.get("pendingFailures", [])
    return {
        "gate": "test_tracking",
        "allow": True,
        "status": "ok",
        "pending_count": len(pending),
        "message": f"Test tracking active. Pending failures: {len(pending)}",
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
    res = evaluate_test_tracking(payload)
    print(json.dumps(res, indent=2))
    return 0 if res.get("allow", True) else 1


if __name__ == "__main__":
    sys.exit(main())
