#!/usr/bin/env python3
"""
Hermes Curator — Skill Staleness Audit Script
Reads .agents/ptss/index.jsonl, computes per-skill last-used dates,
and writes a staleness report to .agents/ptss/audit_report.json.

Usage:
    python .agents/skills/hermes-curator/scripts/audit_skills.py [--workspace <path>]

Output:
    .agents/ptss/audit_report.json
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


# ── Configuration ──────────────────────────────────────────────────────────────
STALE_DAYS = 30       # Days since last PTSS hit → stale
ARCHIVE_DAYS = 45     # Days since last PTSS hit → ready to archive
SKILLS_DIR = ".agents/skills"
ARCHIVED_DIR = ".agents/skills/.archived"
PTSS_INDEX = ".agents/ptss/index.jsonl"
CURATOR_SKIP_FILE = ".agents/skills/_CURATOR_SKIP"
REPORT_OUTPUT = ".agents/ptss/audit_report.json"


def find_workspace_root(start: Path) -> Path:
    """Walk up from start until we find .agents/skills."""
    current = start.resolve()
    for _ in range(10):
        if (current / ".agents" / "skills").exists():
            return current
        current = current.parent
    raise FileNotFoundError("Could not locate workspace root (no .agents/skills found)")


def load_skip_list(workspace: Path) -> set[str]:
    skip_path = workspace / CURATOR_SKIP_FILE
    if not skip_path.exists():
        return set()
    lines = skip_path.read_text(encoding="utf-8").splitlines()
    return {line.strip() for line in lines if line.strip() and not line.startswith("#")}


def load_ptss_index(workspace: Path) -> list[dict]:
    index_path = workspace / PTSS_INDEX
    if not index_path.exists():
        return []
    records = []
    for line in index_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return records


def compute_skill_activity(records: list[dict]) -> dict[str, dict]:
    """
    Returns a dict keyed by skill name with:
      - last_used: ISO string or None
      - triggered_count: int
      - written_count: int
      - patched_count: int
    """
    activity: dict[str, dict] = {}

    def touch(name: str, date_str: str, kind: str) -> None:
        if name not in activity:
            activity[name] = {
                "last_used": None,
                "triggered_count": 0,
                "written_count": 0,
                "patched_count": 0,
            }
        entry = activity[name]
        entry[f"{kind}_count"] = entry.get(f"{kind}_count", 0) + 1
        current = entry["last_used"]
        if current is None or date_str > current:
            entry["last_used"] = date_str

    for rec in records:
        date_str = rec.get("date", "")
        for skill in rec.get("skills_triggered", []):
            touch(skill, date_str, "triggered")
        for skill in rec.get("skills_written", []):
            touch(skill, date_str, "written")
        for patch in rec.get("skills_patched", []):
            skill = patch if isinstance(patch, str) else patch.get("name", "")
            if skill:
                touch(skill, date_str, "patched")

    return activity


def classify_skill(last_used_str: str | None, now: datetime) -> str:
    if last_used_str is None:
        return "never_used"
    try:
        last_used = datetime.fromisoformat(last_used_str.replace("Z", "+00:00"))
        if last_used.tzinfo is None:
            last_used = last_used.replace(tzinfo=timezone.utc)
        age_days = (now - last_used).days
        if age_days >= ARCHIVE_DAYS:
            return "archived"
        elif age_days >= STALE_DAYS:
            return "stale"
        else:
            return "active"
    except ValueError:
        return "unknown"


def scan_installed_skills(workspace: Path) -> list[str]:
    skills_path = workspace / SKILLS_DIR
    if not skills_path.exists():
        return []
    return [
        d.name
        for d in sorted(skills_path.iterdir())
        if d.is_dir() and not d.name.startswith(".") and not d.name.startswith("_")
    ]


def main() -> None:
    # Resolve workspace
    if "--workspace" in sys.argv:
        idx = sys.argv.index("--workspace")
        workspace = Path(sys.argv[idx + 1])
    else:
        workspace = find_workspace_root(Path.cwd())

    print(f"[hermes-curator] Workspace: {workspace}")

    now = datetime.now(tz=timezone.utc)
    skip_list = load_skip_list(workspace)
    records = load_ptss_index(workspace)
    activity = compute_skill_activity(records)
    installed_skills = scan_installed_skills(workspace)

    report_entries = []
    summary = {"active": 0, "stale": 0, "archived": 0, "never_used": 0, "skipped": 0}

    for skill_name in installed_skills:
        if skill_name in skip_list:
            summary["skipped"] += 1
            report_entries.append({
                "skill": skill_name,
                "state": "skipped",
                "last_used": None,
                "triggered_count": 0,
                "written_count": 0,
                "patched_count": 0,
                "age_days": None,
                "action_recommended": "none — in _CURATOR_SKIP",
            })
            continue

        info = activity.get(skill_name, {})
        last_used_str = info.get("last_used")
        state = classify_skill(last_used_str, now)

        age_days = None
        if last_used_str:
            try:
                lu = datetime.fromisoformat(last_used_str.replace("Z", "+00:00"))
                if lu.tzinfo is None:
                    lu = lu.replace(tzinfo=timezone.utc)
                age_days = (now - lu).days
            except ValueError:
                pass

        action = {
            "active": "none",
            "stale": f"add _STALE.md marker (will archive in {ARCHIVE_DAYS - (age_days or 0)}d)",
            "archived": "move to .agents/skills/.archived/",
            "never_used": "review manually — never appeared in PTSS logs",
            "unknown": "review manually — bad date format in PTSS",
        }.get(state, "none")

        summary[state] = summary.get(state, 0) + 1
        report_entries.append({
            "skill": skill_name,
            "state": state,
            "last_used": last_used_str,
            "triggered_count": info.get("triggered_count", 0),
            "written_count": info.get("written_count", 0),
            "patched_count": info.get("patched_count", 0),
            "age_days": age_days,
            "action_recommended": action,
        })

    report = {
        "generated_at": now.isoformat(),
        "workspace": str(workspace),
        "thresholds": {"stale_days": STALE_DAYS, "archive_days": ARCHIVE_DAYS},
        "summary": summary,
        "ptss_sessions_indexed": len(records),
        "skills": report_entries,
    }

    output_path = workspace / REPORT_OUTPUT
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\n[hermes-curator] Audit complete -> {output_path}")
    print(f"  Active:     {summary['active']}")
    print(f"  Stale:      {summary['stale']}")
    print(f"  Archived:   {summary['archived']}")
    print(f"  Never used: {summary['never_used']}")
    print(f"  Skipped:    {summary['skipped']}")
    print(f"\nFull report: {output_path}")


if __name__ == "__main__":
    main()
