#!/usr/bin/env python3
"""PreToolUse HLLM regex preflight hook.

Blocks code mutation attempts when the proposed patch/content matches a
blacklisted regex pattern loaded from lessons and hook state rules.
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
LESSONS_DIR = WORKSPACE_ROOT / "memories" / "repo" / "lessons"
PATTERN_FILE = WORKSPACE_ROOT / ".github" / "hooks" / "state" / "hllm_blacklist_patterns.json"

MUTATION_TOOL_TOKENS = (
    "apply_patch",
    "create_file",
    "edit_notebook_file",
    "editfiles",
    "edit_file",
    "rename",
    "vscode_renamesymbol",
)

PATCH_TEXT_KEYS = {
    "input",
    "content",
    "newString",
    "newCode",
    "command",
    "args",
    "replacement",
    "newName",
}


@dataclass
class PatternRule:
    pattern: str
    source: str
    rule_id: str
    reason: str


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _read_payload() -> tuple[dict[str, Any] | None, str | None]:
    raw = sys.stdin.read().strip()
    if not raw:
        return None, "stdin payload is empty"
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"stdin payload is not valid JSON: {exc.msg}"
    if not isinstance(payload, dict):
        return None, f"stdin root must be object, got {type(payload).__name__}"
    return payload, None


def _iter_nodes(value: Any):
    if isinstance(value, dict):
        for key, item in value.items():
            yield key, item
            yield from _iter_nodes(item)
    elif isinstance(value, list):
        for item in value:
            yield None, item
            yield from _iter_nodes(item)


def _first_text(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else ""
    if isinstance(value, list):
        parts = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return " ".join(parts)
    return ""


def _tool_name(payload: dict[str, Any]) -> str:
    for key in ("tool", "toolName"):
        value = _first_text(payload.get(key))
        if value:
            return value

    event = payload.get("event")
    if isinstance(event, dict):
        for key in ("tool", "toolName"):
            value = _first_text(event.get(key))
            if value:
                return value

    args = payload.get("arguments")
    if isinstance(args, dict):
        for key in ("tool", "toolName"):
            value = _first_text(args.get(key))
            if value:
                return value

    return ""


def _event_name(payload: dict[str, Any]) -> str:
    for key in ("eventName", "lifecycleEvent", "hookEvent"):
        value = _first_text(payload.get(key))
        if value:
            return value

    event = payload.get("event")
    if isinstance(event, dict):
        for key in ("eventName", "lifecycleEvent", "hookEvent", "name"):
            value = _first_text(event.get(key))
            if value:
                return value

    return ""


def _is_pretool_event(payload: dict[str, Any]) -> bool:
    event = _event_name(payload)
    if not event:
        return True
    return _normalize(event) == "pretooluse"


def _is_mutation_tool(tool: str) -> bool:
    normalized = _normalize(tool)
    lowered = tool.lower()
    return any(token in lowered or _normalize(token) in normalized for token in MUTATION_TOOL_TOKENS)


def _extract_candidate_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []

    for key, value in _iter_nodes(payload):
        if isinstance(key, str) and key in PATCH_TEXT_KEYS:
            text = _first_text(value)
            if text:
                parts.append(text)

        if isinstance(value, str) and "*** Begin Patch" in value:
            parts.append(value)

    if not parts:
        args = payload.get("arguments")
        if isinstance(args, dict):
            text = json.dumps(args, ensure_ascii=True)
            if text:
                parts.append(text)

    merged = "\n".join(parts)
    return merged[:2_000_000]


def _load_json_patterns() -> list[PatternRule]:
    if not PATTERN_FILE.exists():
        return []

    try:
        parsed = json.loads(PATTERN_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    raw_patterns = parsed.get("patterns") if isinstance(parsed, dict) else None
    if not isinstance(raw_patterns, list):
        return []

    patterns: list[PatternRule] = []
    for index, entry in enumerate(raw_patterns):
        if not isinstance(entry, dict):
            continue
        pattern = _first_text(entry.get("pattern"))
        if not pattern:
            continue
        rule_id = _first_text(entry.get("id")) or f"state-rule-{index + 1}"
        reason = _first_text(entry.get("reason")) or "Blocked by HLLM state blacklist"
        patterns.append(PatternRule(pattern=pattern, source=str(PATTERN_FILE), rule_id=rule_id, reason=reason))

    return patterns


def _extract_md_patterns(text: str) -> list[str]:
    patterns: list[str] = []

    patterns.extend(
        item.strip()
        for item in re.findall(r"<blacklisted_pattern>\s*(.*?)\s*</blacklisted_pattern>", text, flags=re.IGNORECASE | re.DOTALL)
        if item.strip()
    )

    patterns.extend(
        item.strip()
        for item in re.findall(
            r"blacklisted\s+pattern[^\n]*```(?:regex)?\s*(.*?)\s*```",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if item.strip()
    )

    line_matches = re.findall(
        r"^\s*(?:-|\*)?\s*blacklisted\s+pattern\s*[:=-]\s*(.+?)\s*$",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    patterns.extend(item.strip() for item in line_matches if item.strip())

    return patterns


def _load_lesson_patterns() -> list[PatternRule]:
    if not LESSONS_DIR.exists():
        return []

    rules: list[PatternRule] = []

    for lesson_path in sorted(LESSONS_DIR.glob("*.json")):
        try:
            parsed = json.loads(lesson_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(parsed, dict):
            continue

        raw_patterns: list[str] = []
        single = _first_text(parsed.get("blacklistedPattern"))
        if single:
            raw_patterns.append(single)

        list_value = parsed.get("blacklistedPatterns")
        if isinstance(list_value, list):
            raw_patterns.extend(item.strip() for item in list_value if isinstance(item, str) and item.strip())

        reason = _first_text(parsed.get("preventionRule")) or "Blocked by lesson blacklist"
        lesson_id = _first_text(parsed.get("id")) or lesson_path.stem

        for index, pattern in enumerate(raw_patterns):
            rules.append(
                PatternRule(
                    pattern=pattern,
                    source=str(lesson_path),
                    rule_id=f"{lesson_id}-{index + 1}",
                    reason=reason,
                )
            )

    for lesson_path in sorted(LESSONS_DIR.glob("*.md")):
        try:
            text = lesson_path.read_text(encoding="utf-8")
        except OSError:
            continue

        extracted = _extract_md_patterns(text)
        if not extracted:
            continue

        reason = "Blocked by markdown lesson regex"
        for index, pattern in enumerate(extracted):
            rules.append(
                PatternRule(
                    pattern=pattern,
                    source=str(lesson_path),
                    rule_id=f"{lesson_path.stem}-md-{index + 1}",
                    reason=reason,
                )
            )

    return rules


def _dedupe_rules(rules: list[PatternRule]) -> list[PatternRule]:
    seen: set[str] = set()
    deduped: list[PatternRule] = []
    for rule in rules:
        key = rule.pattern.strip()
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        deduped.append(rule)
    return deduped


def _find_match(text: str, rules: list[PatternRule]) -> tuple[PatternRule | None, str]:
    for rule in rules:
        try:
            match = re.search(rule.pattern, text, flags=re.IGNORECASE | re.MULTILINE)
        except re.error:
            continue

        if not match:
            continue

        snippet = match.group(0)[:200]
        return rule, snippet

    return None, ""


def _result(decision: str, reason: str, tool: str) -> dict[str, Any]:
    allow = decision == "allow"
    return {
        "hook": "hllm-regex-preflight",
        "allow": allow,
        "status": "ok" if allow else "error",
        "message": reason,
        "tool": tool,
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        },
    }


def main() -> int:
    payload, error = _read_payload()
    if payload is None:
        print(json.dumps(_result("deny", f"Invalid payload: {error}", ""), ensure_ascii=True))
        return 2

    if not _is_pretool_event(payload):
        print(json.dumps(_result("allow", "HLLM preflight skipped for non-PreToolUse event.", ""), ensure_ascii=True))
        return 0

    tool = _tool_name(payload)
    if not _is_mutation_tool(tool):
        print(json.dumps(_result("allow", "HLLM preflight skipped: tool is not a code-mutation tool.", tool), ensure_ascii=True))
        return 0

    candidate_text = _extract_candidate_text(payload)
    if not candidate_text:
        print(json.dumps(_result("allow", "HLLM preflight skipped: no candidate patch text found.", tool), ensure_ascii=True))
        return 0

    rules = _dedupe_rules(_load_json_patterns() + _load_lesson_patterns())
    if not rules:
        print(json.dumps(_result("allow", "HLLM preflight active: no blacklist patterns currently defined.", tool), ensure_ascii=True))
        return 0

    match_rule, snippet = _find_match(candidate_text, rules)
    if match_rule is None:
        print(json.dumps(_result("allow", f"HLLM preflight passed against {len(rules)} blacklist regex pattern(s).", tool), ensure_ascii=True))
        return 0

    reason = (
        f"Blocked by HLLM regex preflight ({match_rule.rule_id}): {match_rule.reason}. "
        f"Source={match_rule.source}. MatchSnippet={snippet}"
    )
    print(json.dumps(_result("deny", reason, tool), ensure_ascii=True))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
