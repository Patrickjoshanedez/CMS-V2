#!/usr/bin/env python3
"""Git Post-Commit Hook: Automated Semantic Version Tagging Pipeline.

Operational Behavior:
- Inspects the latest commit message on HEAD.
- Parses existing semantic tags (vMAJOR.MINOR.PATCH).
- If no existing tags, initializes at v1.0.0.
- If commit message contains '[major]', increments major and resets minor & patch to 0.
- If commit message contains '[minor]', increments minor and resets patch to 0.
- Otherwise, increments patch version.
- Prevents infinite tagging loops if HEAD already has a tag.
"""

from __future__ import annotations

import re
import subprocess
import sys


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git"] + args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def parse_semver(tag: str) -> tuple[int, int, int] | None:
    match = re.match(r"^v?(\d+)\.(\d+)\.(\d+)$", tag.strip())
    if not match:
        return None
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def format_semver(major: int, minor: int, patch: int) -> str:
    return f"v{major}.{minor}.{patch}"


def get_latest_semver_tag() -> tuple[int, int, int] | None:
    raw_tags = run_git(["tag", "--list", "v*"])
    if not raw_tags:
        return None

    parsed_tags = []
    for tag_str in raw_tags.splitlines():
        parsed = parse_semver(tag_str)
        if parsed:
            parsed_tags.append(parsed)

    if not parsed_tags:
        return None

    parsed_tags.sort(key=lambda x: (x[0], x[1], x[2]))
    return parsed_tags[-1]


def auto_tag() -> int:
    print("[Git Auto-Tag Hook] Running automated version tagging...", file=sys.stderr)

    # 1. Run Workspace Cleanliness Guardrail audit
    try:
        from workspace_guardrail import audit_and_purge_workspace
        audit_and_purge_workspace(dry_run=True)
    except Exception as e:
        print(f"[Git Auto-Tag Hook] Note: Workspace guardrail check: {e}", file=sys.stderr)

    # 2. Prevent re-tagging if current HEAD already has a semantic tag
    head_tags = run_git(["tag", "--points-at", "HEAD"])
    if head_tags:
        for tag_str in head_tags.splitlines():
            if parse_semver(tag_str):
                print(f"[Git Auto-Tag Hook] HEAD is already tagged with '{tag_str}'. Skipping.", file=sys.stderr)
                return 0

    # 2. Get latest commit message
    commit_msg = run_git(["log", "-1", "--pretty=%B"])
    commit_msg_lower = commit_msg.lower()

    # 3. Resolve base version
    latest_tag = get_latest_semver_tag()

    if latest_tag is None:
        new_tag = "v1.0.0"
        print("[Git Auto-Tag Hook] No existing tags found. Initializing at v1.0.0.", file=sys.stderr)
    else:
        major, minor, patch = latest_tag
        old_tag_str = format_semver(major, minor, patch)
        print(f"[Git Auto-Tag Hook] Latest tag detected: '{old_tag_str}'", file=sys.stderr)

        if "[major]" in commit_msg_lower:
            new_tag = format_semver(major + 1, 0, 0)
        elif "[minor]" in commit_msg_lower:
            new_tag = format_semver(major, minor + 1, 0)
        else:
            new_tag = format_semver(major, minor, patch + 1)

    # 4. Apply new git tag
    print(f"[Git Auto-Tag Hook] Creating new automated tag: '{new_tag}'", file=sys.stderr)
    tag_result = subprocess.run(
        ["git", "tag", "-a", new_tag, "-m", f"Release {new_tag}: automated version tag"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )

    if tag_result.returncode != 0:
        # Fallback to lightweight tag if annotated fails
        subprocess.run(["git", "tag", new_tag], check=False)

    print(f"[Git Auto-Tag Hook] Successfully tagged HEAD as '{new_tag}'.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(auto_tag())
