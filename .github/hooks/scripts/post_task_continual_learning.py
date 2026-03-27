#!/usr/bin/env python3
"""Post-task hook to enforce continual-learning checkpoints.

This script is safe to run as a warning-level hook. It checks whether the
continual-learning skill file and workspace acknowledgement are both present.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SKILL_PATH = ROOT / ".agents" / "skills" / "continual-learning" / "SKILL.md"
INSTRUCTIONS_PATH = ROOT / ".github" / "copilot-instructions.md"


def _instructions_acknowledge_continual_learning(text: str) -> bool:
    return "`continual-learning`" in text


def main() -> int:
    results = {
        "hook": "continual-learning-checkpoint",
        "skillFileExists": SKILL_PATH.exists(),
        "instructionsFileExists": INSTRUCTIONS_PATH.exists(),
        "acknowledgedInInstructions": False,
        "status": "warn",
        "message": "Continual-learning checkpoint incomplete.",
    }

    if INSTRUCTIONS_PATH.exists():
        content = INSTRUCTIONS_PATH.read_text(encoding="utf-8", errors="ignore")
        results["acknowledgedInInstructions"] = _instructions_acknowledge_continual_learning(content)

    if results["skillFileExists"] and results["acknowledgedInInstructions"]:
        results["status"] = "ok"
        results["message"] = "Continual-learning checkpoint passed."

    print(json.dumps(results, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
