#!/usr/bin/env python3
"""IHSA Public Internet Exposure Gate.

Prevents unauthorized metadata or production port exposure via Docker and ngrok.
Enforces the 10-Gate Public Internet Exposure contract before public exposure
commands are allowed.
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
CANONICAL_PROD_ENV_FILE = WORKSPACE_ROOT / ".env.prod"

PUBLIC_EXPOSURE_COMMAND_PATTERNS = [
    re.compile(r"docker-compose\.prod\.yml", re.IGNORECASE),
    re.compile(r"docker\s+compose\s+-f\s+docker-compose\.prod\.yml", re.IGNORECASE),
    re.compile(r"ngrok\s+http", re.IGNORECASE),
    re.compile(r"docker:tunnel", re.IGNORECASE),
    re.compile(r"npm\s+run\s+(?:tunnel|dev:tunnel|docker:tunnel)", re.IGNORECASE),
    re.compile(r"scripts[\\/]docker-ngrok\.ps1", re.IGNORECASE),
]

REQUIRED_GATES = [f"GATE-{i}" for i in range(1, 11)]


def _load_state() -> JsonObject:
    if not STATE_FILE.exists():
        return {
            "pendingFailures": [],
            "observedTestActivity": False,
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
            data = json.load(f)
            if "publicExposureGate" not in data:
                data["publicExposureGate"] = {
                    "pending": False,
                    "pendingContext": None,
                    "passed": False,
                    "lastVerifiedAt": None,
                    "lastAttemptedCommand": "",
                    "lastBlockedAt": None,
                    "evidenceMap": {},
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                }
            return data
    except Exception:
        return {
            "pendingFailures": [],
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


def _save_state(state: JsonObject) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    peg = state.setdefault("publicExposureGate", {})
    peg["updatedAt"] = datetime.now(timezone.utc).isoformat()
    state["updatedAt"] = peg["updatedAt"]

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


def is_public_exposure_command(cmd: str) -> bool:
    if not cmd:
        return False
    return any(p.search(cmd) for p in PUBLIC_EXPOSURE_COMMAND_PATTERNS)


def verify_gate_evidence(evidence_text: str) -> tuple[bool, dict[str, bool]]:
    results = {}
    normalized = evidence_text.upper()
    has_pass = "PUBLIC INTERNET EXPOSURE GATE: PASS" in normalized or "PUBLIC EXPOSURE GATE: PASS" in normalized

    for gate in REQUIRED_GATES:
        results[gate] = gate in normalized

    all_gates_present = all(results.values()) and has_pass
    return all_gates_present, results


def evaluate_public_exposure(payload: dict[str, Any]) -> dict[str, Any]:
    """In-process evaluator for public internet exposure commands."""
    args = payload.get("arguments") or payload.get("args") or {}
    if not isinstance(args, dict):
        args = {}

    cmd = str(args.get("command") or args.get("CommandLine") or "").strip()
    summary = str(payload.get("summary") or args.get("summary") or "")

    if not is_public_exposure_command(cmd):
        return {
            "gate": "public_exposure",
            "allow": True,
            "status": "ok",
            "message": "Command is not a public exposure vector.",
        }

    state = _load_state()
    peg = state.setdefault("publicExposureGate", {})

    # Check if verified evidence exists in summary or pending verification
    evidence_passed, gate_map = verify_gate_evidence(summary)
    now = datetime.now(timezone.utc).isoformat()

    if evidence_passed:
        peg["passed"] = True
        peg["pending"] = False
        peg["lastVerifiedAt"] = now
        peg["evidenceMap"] = gate_map
        _save_state(state)
        return {
            "gate": "public_exposure",
            "allow": True,
            "status": "verified",
            "message": "Public Internet Exposure Gate contract verified (GATE-1 through GATE-10 satisfied).",
        }

    # If already verified within recent window (e.g. 5 minutes)
    if peg.get("passed") and peg.get("lastVerifiedAt"):
        return {
            "gate": "public_exposure",
            "allow": True,
            "status": "cached_verified",
            "message": "Public Internet Exposure Gate previously verified.",
        }

    # Block unauthorized exposure
    peg["pending"] = True
    peg["lastBlockedAt"] = now
    peg["lastAttemptedCommand"] = cmd[:200]
    _save_state(state)

    return {
        "gate": "public_exposure",
        "allow": False,
        "status": "blocked",
        "message": (
            "BLOCKED: Public Internet Exposure command detected without verified evidence. "
            "Mandates 'Public Internet Exposure Gate: PASS' with GATE-1 through GATE-10 verification."
        ),
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
    res = evaluate_public_exposure(payload)
    print(json.dumps(res, indent=2))
    return 0 if res.get("allow", True) else 2


if __name__ == "__main__":
    sys.exit(main())
