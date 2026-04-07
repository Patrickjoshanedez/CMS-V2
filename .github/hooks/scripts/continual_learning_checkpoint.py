#!/usr/bin/env python3
"""Lifecycle hook for continual-learning checkpoint and public exposure gate.

Expected stdin payload shape is flexible. The hook looks for:
- tool name
- summary text

For task_complete:
- summary must contain at least one keyword:
    lesson, learned, prevention, retrospective, runbook, checklist
- completion is blocked when a failed test is still pending fix+retest

For Docker + ngrok public exposure commands:
- fail closed unless the Public Internet Exposure Gate is verified
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, cast

JsonObject = dict[str, Any]

KEYWORDS = (
    "lesson",
    "learned",
    "prevention",
    "retrospective",
    "runbook",
    "checklist",
)

TEST_FAILURE_TRIGGER_TERMS = ("test", "tests", "fail", "failed", "failing", "broken")
FIX_EVIDENCE_TERMS = ("fix", "fixed", "patch", "repair", "resolved")
RETEST_EVIDENCE_TERMS = ("retest", "rerun", "re-run")
PASS_EVIDENCE_TERMS = ("pass", "passed", "green")
COMMAND_EVIDENCE_TOKENS = (
    "npm test",
    "npm run test",
    "pytest",
    "vitest",
    "jest",
    "go test",
    "cargo test",
)

STATE_FILE = (
    Path(__file__).resolve().parent.parent / "state" / "test_fix_state.json"
)
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
CANONICAL_PROD_ENV_FILE = WORKSPACE_ROOT / ".env.prod"

EXECUTION_TOOL_TOKENS = (
    "run_in_terminal",
    "run_task",
    "execute",
    "terminal",
    "shell",
    "bash",
)

EDIT_TOOL_TOKENS = (
    "edit",
    "apply_patch",
    "create_file",
    "editfile",
    "editfiles",
    "write",
    "replace",
)

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
    "ctest",
    "dotnet test",
    "playwright test",
    "cypress run",
    "test:",
)

PUBLIC_EXPOSURE_GATES = tuple(range(1, 11))
PUBLIC_EXPOSURE_SUMMARY_TERMS = (
    "public exposure",
    "public internet exposure",
    "ngrok",
    "docker-compose.prod.yml",
    "public_exposure_gate",
)
PUBLIC_EXPOSURE_PASS_PATTERNS = (
    r"public\s+internet\s+exposure\s+gate\s*[:=]\s*pass",
    r"public\s+exposure\s+gate\s*[:=]\s*pass",
    r"public_exposure_gate\s*[:=]\s*pass",
)
PUBLIC_EXPOSURE_PLACEHOLDER_TERMS = (
    "tbd",
    "todo",
    "placeholder",
    "pending",
    "unknown",
    "n/a",
)
PUBLIC_EXPOSURE_GATE_FRESHNESS_HOURS = 8
PUBLIC_EXPOSURE_PENDING_TTL_HOURS = 6
PUBLIC_EXPOSURE_PROD_COMPOSE_FILES = (
    "docker-compose.prod.yml",
    "docker-compose.prod.yaml",
)
PUBLIC_EXPOSURE_RELATED_SUMMARY_TERMS = (
    "public exposure",
    "public internet exposure",
    "exposure gate",
    "ngrok",
    "docker compose",
    "docker-compose",
    "compose prod",
    "docker-compose.prod.yml",
)
PUBLIC_EXPOSURE_BLOCK_REQUIREMENTS = (
    "GATE-1 production compose only",
    "GATE-2 secret hygiene",
    "GATE-3 placeholder/default secrets blocked",
    "GATE-4 global + auth rate limiting active",
    "GATE-5 ngrok ingress auth + domain policy",
    "GATE-6 exact CORS origin (no wildcard)",
    "GATE-7 trust proxy + secure/samesite cookies",
    "GATE-8 LocalStack/test object storage forbidden",
    "GATE-9 least-privilege container runtime controls",
    "GATE-10 evidence mapping completeness",
)
PUBLIC_EXPOSURE_GATE_KEYWORDS: dict[int, tuple[str, ...]] = {
    1: ("docker-compose.prod.yml", "production compose", "compose prod"),
    2: ("secret", "plaintext", "image context", "dockerignore", ".env"),
    3: ("placeholder", "default", "changeme", "example", "dummy"),
    4: ("rate", "limit", "auth", "global", "express-rate-limit"),
    5: ("ngrok", "oauth", "basic auth", "domain policy", "ingress"),
    6: ("cors", "origin", "wildcard", "exact"),
    7: ("trust proxy", "secure", "samesite", "cookie"),
    8: ("localstack", "test object storage", "minio", "s3rver"),
    9: ("least privilege", "no-new-privileges", "read_only", "cap_drop", "user"),
    10: ("evidence", "mapping", "gate-1", "gate-10", "all 10"),
}
PUBLIC_EXPOSURE_REQUIRED_SECRET_ENV_VARS = (
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "REDIS_PASSWORD",
)
DEFAULT_LIKE_SECRET_VALUES = frozenset(
    {
        "changeme",
        "default",
        "dummy",
        "example",
        "exampletoken",
        "placeholder",
        "replace",
        "replacewithrealvalue",
        "token",
        "secret",
        "password",
        "test",
        "ngroktoken",
        "yourngroktoken",
        "none",
        "null",
        "undefined",
    }
)
COMMAND_LABEL_MAX_LENGTH = 240
PACKAGE_SCRIPTS_CACHE: dict[str, dict[str, str]] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _as_string_key_dict(value: Any) -> JsonObject | None:
    if not isinstance(value, dict):
        return None
    raw_dict = cast(dict[Any, Any], value)
    converted: JsonObject = {}
    for key, item in raw_dict.items():
        converted[str(key)] = item
    return converted


def _describe_json_type(value: Any) -> str:
    type_name = type(value).__name__
    if type_name == "dict":
        return "object"
    if type_name == "list":
        return "array"
    return type_name


def _read_payload() -> tuple[dict[str, Any] | None, str | None]:
    raw_payload = sys.stdin.read()
    raw = raw_payload.strip()
    if not raw:
        return None, "stdin payload is empty."

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return (
            None,
            (
                "stdin payload is not valid JSON "
                f"(line {exc.lineno}, column {exc.colno}): {exc.msg}."
            ),
        )

    as_dict = _as_string_key_dict(data)
    if as_dict is None:
        payload_type = _describe_json_type(data)
        return (
            None,
            f"stdin payload root must be a JSON object; received {payload_type}.",
        )

    return as_dict, None


def _first_non_empty_string(container: JsonObject | None, keys: tuple[str, ...]) -> str:
    if container is None:
        return ""
    for key in keys:
        value = container.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _tool_name(payload: dict[str, Any]) -> str:
    root_name = _first_non_empty_string(payload, ("tool", "toolName"))
    if root_name:
        return root_name

    root_tool = _as_string_key_dict(payload.get("tool"))
    if root_tool is not None:
        root_tool_name = _first_non_empty_string(root_tool, ("name", "toolName", "tool"))
        if root_tool_name:
            return root_tool_name

    root_args = _as_string_key_dict(payload.get("arguments"))
    args_name = _first_non_empty_string(root_args, ("tool", "toolName"))
    if args_name:
        return args_name

    if root_args is not None:
        args_tool = _as_string_key_dict(root_args.get("tool"))
        if args_tool is not None:
            args_tool_name = _first_non_empty_string(args_tool, ("name", "toolName", "tool"))
            if args_tool_name:
                return args_tool_name

    event = _as_string_key_dict(payload.get("event"))
    if event is not None:
        event_name = _first_non_empty_string(event, ("tool", "toolName"))
        if event_name:
            return event_name

        event_tool = _as_string_key_dict(event.get("tool"))
        if event_tool is not None:
            nested_name = _first_non_empty_string(event_tool, ("name", "toolName", "tool"))
            if nested_name:
                return nested_name

        event_args = _as_string_key_dict(event.get("arguments"))
        event_args_name = _first_non_empty_string(event_args, ("tool", "toolName"))
        if event_args_name:
            return event_args_name

        if event_args is not None:
            event_args_tool = _as_string_key_dict(event_args.get("tool"))
            if event_args_tool is not None:
                event_args_tool_name = _first_non_empty_string(
                    event_args_tool, ("name", "toolName", "tool")
                )
                if event_args_tool_name:
                    return event_args_tool_name
    return ""


def _normalize_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.strip().lower())


def _is_task_complete_token(value: str) -> bool:
    return _normalize_token(value) == "taskcomplete"


def _is_post_task_completion_event(value: str) -> bool:
    normalized = _normalize_token(value)
    return normalized == "posttaskcompletion"


def _is_pre_tool_use_event(value: str) -> bool:
    normalized = _normalize_token(value)
    return normalized == "pretooluse"


def _is_post_tool_use_event(value: str) -> bool:
    normalized = _normalize_token(value)
    return normalized == "posttooluse"


def _lifecycle_event_name(payload: dict[str, Any]) -> str:
    candidate_paths = (
        ("event",),
        ("name",),
        ("eventName",),
        ("lifecycleEvent",),
        ("hookEvent",),
        ("event", "eventName"),
        ("event", "lifecycleEvent"),
        ("event", "hookEvent"),
        ("event", "name"),
        ("arguments", "eventName"),
        ("arguments", "lifecycleEvent"),
        ("arguments", "hookEvent"),
        ("event", "arguments", "eventName"),
        ("event", "arguments", "lifecycleEvent"),
        ("event", "arguments", "hookEvent"),
        ("event", "payload", "eventName"),
        ("event", "payload", "lifecycleEvent"),
        ("event", "payload", "hookEvent"),
    )

    for path in candidate_paths:
        value = _get_path_value(payload, path)
        text = _coerce_text(value)
        if text:
            return text

    for value in _search_nested_values(
        payload, ("eventName", "lifecycleEvent", "hookEvent")
    ):
        text = _coerce_text(value)
        if text:
            return text

    return ""


def _arguments_indicate_completion(payload: dict[str, Any]) -> bool:
    argument_nodes = _search_nested_values(payload, ("arguments",))
    completion_flag_keys = (
        "taskComplete",
        "task_complete",
        "isTaskComplete",
        "is_task_complete",
    )
    completion_name_keys = (
        "tool",
        "toolName",
        "name",
        "invokedTool",
        "invocation",
        "action",
        "eventName",
        "lifecycleEvent",
        "hookEvent",
    )

    def _node_matches(node: Any) -> bool:
        node_dict = _as_string_key_dict(node)
        if node_dict is not None:
            for key in completion_name_keys:
                text = _coerce_text(node_dict.get(key))
                if text and (
                    _is_task_complete_token(text)
                    or _is_post_task_completion_event(text)
                ):
                    return True

            for key in completion_flag_keys:
                if node_dict.get(key) is True:
                    return True

            for value in node_dict.values():
                if _node_matches(value):
                    return True
            return False

        if isinstance(node, list):
            node_list = cast(list[Any], node)
            return any(_node_matches(item) for item in node_list)

        if isinstance(node, str):
            return _is_task_complete_token(node) or _is_post_task_completion_event(node)

        return False

    return any(_node_matches(node) for node in argument_nodes)


def _full_payload_completion_token_scan(payload: dict[str, Any]) -> bool:
    def _walk(node: Any) -> bool:
        if isinstance(node, str):
            return _is_task_complete_token(node) or _is_post_task_completion_event(node)

        node_dict = _as_string_key_dict(node)
        if node_dict is not None:
            for key, value in node_dict.items():
                if _is_task_complete_token(str(key)) or _is_post_task_completion_event(
                    str(key)
                ):
                    return True
                if _walk(value):
                    return True
            return False

        if isinstance(node, list):
            node_list = cast(list[Any], node)
            return any(_walk(item) for item in node_list)

        return False

    return _walk(payload)


def _should_run_completion_gate(
    payload: dict[str, Any], tool: str, lifecycle_event_name: str = ""
) -> bool:
    if _is_task_complete_token(tool):
        return True

    if lifecycle_event_name and _is_post_task_completion_event(lifecycle_event_name):
        return True

    if lifecycle_event_name and (
        _is_pre_tool_use_event(lifecycle_event_name)
        or _is_post_tool_use_event(lifecycle_event_name)
    ):
        return False

    if _arguments_indicate_completion(payload):
        return True

    return _full_payload_completion_token_scan(payload)


def _summary_text(payload: dict[str, Any]) -> str:
    candidate_paths = (
        ("summary",),
        ("message",),
        ("text",),
        ("arguments", "summary"),
        ("arguments", "message"),
        ("arguments", "text"),
        ("event", "summary"),
        ("event", "message"),
        ("event", "text"),
        ("event", "arguments", "summary"),
        ("event", "arguments", "message"),
        ("event", "arguments", "text"),
    )

    for path in candidate_paths:
        text = _coerce_text(_get_path_value(payload, path))
        if text:
            return text

    for value in _search_nested_values(payload, ("summary", "message", "text")):
        text = _coerce_text(value)
        if text:
            return text

    return ""


def _get_path_value(payload: Any, path: tuple[str, ...]) -> Any:
    current = payload
    for key in path:
        current_dict = _as_string_key_dict(current)
        if current_dict is None:
            return None
        current = current_dict.get(key)
    return current


def _search_nested_values(payload: Any, keys: tuple[str, ...]) -> list[Any]:
    matches: list[Any] = []
    key_set = {key.lower() for key in keys}

    def _walk(node: Any) -> None:
        node_dict = _as_string_key_dict(node)
        if node_dict is not None:
            for key, value in node_dict.items():
                if key.lower() in key_set:
                    matches.append(value)
                if isinstance(value, (dict, list)):
                    _walk(value)
        elif isinstance(node, list):
            list_items = cast(list[Any], node)
            for item in list_items:
                if isinstance(item, (dict, list)):
                    _walk(item)

    _walk(payload)
    return matches


def _coerce_text(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else ""
    if isinstance(value, list):
        value_list = cast(list[Any], value)
        parts: list[str] = []
        for item in value_list:
            if isinstance(item, str):
                stripped = item.strip()
                if stripped:
                    parts.append(stripped)
        return " ".join(parts) if parts else ""
    value_dict = _as_string_key_dict(value)
    if value_dict is not None:
        for key in ("command", "task", "taskLabel", "taskName", "label", "id", "name"):
            nested = _coerce_text(value_dict.get(key))
            if nested:
                return nested
    return ""


def _normalize_command_label(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def _extract_text_blob(payload: dict[str, Any]) -> str:
    chunks: list[str] = []
    summary = _summary_text(payload)
    if summary:
        chunks.append(summary)

    for value in _search_nested_values(
        payload,
        (
            "message",
            "text",
            "output",
            "stdout",
            "stderr",
            "combinedOutput",
            "log",
            "logs",
        ),
    ):
        text = _coerce_text(value)
        if text:
            chunks.append(text)

    if not chunks:
        try:
            chunks.append(json.dumps(payload, ensure_ascii=True))
        except TypeError:
            pass

    return "\n".join(chunks)


def _infer_command_from_text(text: str) -> str:
    if not text:
        return ""

    explicit_match = re.search(
        r"(?:command|task(?:\s*label)?|label)\s*[:=]\s*([^\r\n]+)",
        text,
        flags=re.IGNORECASE,
    )
    if explicit_match:
        return explicit_match.group(1).strip().strip("'\"")

    command_match = re.search(
        (
            r"((?:npm|pnpm|yarn|pytest|vitest|jest|go\s+test|cargo\s+test|ctest|"
            r"dotnet\s+test|python(?:\s+-m)?\s+\S*test\S*)[^\r\n]*)"
        ),
        text,
        flags=re.IGNORECASE,
    )
    if command_match:
        return command_match.group(1).strip().strip("'\"")

    return ""


def _append_unique_command_candidate(
    candidates: list[str], seen: set[str], candidate: str
) -> None:
    text = candidate.strip()
    if not text:
        return

    normalized = _normalize_command_label(text)
    if not normalized or normalized in seen:
        return

    seen.add(normalized)
    candidates.append(text)


def _extract_command_candidates(
    payload: dict[str, Any], *, include_inferred: bool = True
) -> list[str]:
    candidate_paths = (
        ("command",),
        ("task",),
        ("taskLabel",),
        ("taskName",),
        ("label",),
        ("arguments", "command"),
        ("arguments", "task"),
        ("arguments", "taskLabel"),
        ("arguments", "taskName"),
        ("arguments", "label"),
        ("arguments", "id"),
        ("event", "command"),
        ("event", "task"),
        ("event", "taskLabel"),
        ("event", "taskName"),
        ("event", "label"),
        ("event", "arguments", "command"),
        ("event", "arguments", "task"),
        ("event", "arguments", "taskLabel"),
        ("event", "arguments", "taskName"),
        ("event", "arguments", "label"),
        ("event", "arguments", "id"),
        ("result", "command"),
        ("result", "task"),
        ("event", "result", "command"),
        ("event", "result", "task"),
    )

    candidates: list[str] = []
    seen: set[str] = set()

    for path in candidate_paths:
        text = _coerce_text(_get_path_value(payload, path))
        _append_unique_command_candidate(candidates, seen, text)

    for value in _search_nested_values(
        payload, ("command", "task", "taskLabel", "taskName", "label")
    ):
        text = _coerce_text(value)
        _append_unique_command_candidate(candidates, seen, text)

    if include_inferred:
        inferred = _infer_command_from_text(_extract_text_blob(payload))
        _append_unique_command_candidate(candidates, seen, inferred)

    return candidates


def _extract_command_label(
    payload: dict[str, Any],
    *,
    max_length: int = COMMAND_LABEL_MAX_LENGTH,
    include_inferred: bool = True,
) -> str:
    candidates = _extract_command_candidates(payload, include_inferred=include_inferred)
    if not candidates:
        return ""

    command_label = candidates[0]
    if max_length <= 0:
        return command_label
    return command_label[:max_length]


def _extract_candidate_working_directories(payload: dict[str, Any] | None) -> list[Path]:
    directories: list[Path] = [WORKSPACE_ROOT]
    seen: set[str] = {os.path.normcase(str(WORKSPACE_ROOT))}

    if payload is None:
        return directories

    candidate_paths = (
        ("cwd",),
        ("workingDirectory",),
        ("workingDir",),
        ("options", "cwd"),
        ("arguments", "cwd"),
        ("arguments", "workingDirectory"),
        ("arguments", "workingDir"),
        ("arguments", "options", "cwd"),
        ("event", "cwd"),
        ("event", "workingDirectory"),
        ("event", "workingDir"),
        ("event", "options", "cwd"),
        ("event", "arguments", "cwd"),
        ("event", "arguments", "workingDirectory"),
        ("event", "arguments", "workingDir"),
        ("event", "arguments", "options", "cwd"),
        ("result", "cwd"),
        ("result", "workingDirectory"),
        ("event", "result", "cwd"),
        ("event", "result", "workingDirectory"),
    )

    def _append_directory(raw_value: str) -> None:
        text = raw_value.strip()
        if not text:
            return

        candidate = _resolve_env_file_path(text)
        if candidate.name.lower() == "package.json":
            candidate = candidate.parent
        elif candidate.exists() and candidate.is_file():
            candidate = candidate.parent

        normalized = os.path.normcase(str(candidate))
        if normalized in seen:
            return

        seen.add(normalized)
        directories.append(candidate)

    for path in candidate_paths:
        _append_directory(_coerce_text(_get_path_value(payload, path)))

    for value in _search_nested_values(payload, ("cwd", "workingDirectory", "workingDir")):
        _append_directory(_coerce_text(value))

    return directories


def _candidate_package_json_paths(payload: dict[str, Any] | None) -> list[Path]:
    paths: list[Path] = []
    seen: set[str] = set()

    for directory in _extract_candidate_working_directories(payload):
        current = directory
        while True:
            package_path = current / "package.json"
            normalized = os.path.normcase(str(package_path))
            if normalized not in seen:
                seen.add(normalized)
                paths.append(package_path)

            if os.path.normcase(str(current)) == os.path.normcase(str(WORKSPACE_ROOT)):
                break

            parent = current.parent
            if parent == current:
                break
            current = parent

    return paths


def _package_scripts_from_path(package_json_path: Path) -> dict[str, str]:
    cache_key = os.path.normcase(str(package_json_path))
    cached_scripts = PACKAGE_SCRIPTS_CACHE.get(cache_key)
    if cached_scripts is not None:
        return cached_scripts

    scripts: dict[str, str] = {}
    if package_json_path.exists() and package_json_path.is_file():
        try:
            parsed_raw = json.loads(package_json_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            PACKAGE_SCRIPTS_CACHE[cache_key] = scripts
            return scripts

        parsed = _as_string_key_dict(parsed_raw)
        if parsed is not None:
            raw_scripts = _as_string_key_dict(parsed.get("scripts"))
            if raw_scripts is not None:
                for script_name, script_command in raw_scripts.items():
                    if isinstance(script_command, str) and script_command.strip():
                        scripts[str(script_name).strip()] = script_command.strip()

    PACKAGE_SCRIPTS_CACHE[cache_key] = scripts
    return scripts


def _extract_wrapper_script_name(command_label: str) -> str:
    match = re.search(
        r"\b(?:npm|pnpm|yarn)\b[^\n\r]*?\brun(?:-script)?\s+(?P<script>\"[^\"]+\"|'[^']+'|[^\s|&;]+)",
        command_label,
        flags=re.IGNORECASE,
    )
    if match is not None:
        script_name = _strip_wrapping_quotes(match.group("script")).strip()
        if script_name and not script_name.startswith("-"):
            return script_name

    shorthand_match = re.search(
        r"\b(?:npm|pnpm|yarn)\b[^\n\r]*?\b(?P<script>start|test|stop|restart)\b",
        command_label,
        flags=re.IGNORECASE,
    )
    if shorthand_match is None:
        return ""

    return shorthand_match.group("script").strip()


def _resolve_wrapper_script_command(
    command_label: str, payload: dict[str, Any] | None = None
) -> str:
    script_name = _extract_wrapper_script_name(command_label)
    if not script_name:
        return ""

    for package_json_path in _candidate_package_json_paths(payload):
        script_command = _package_scripts_from_path(package_json_path).get(script_name)
        if script_command:
            return script_command

    return ""


def _is_public_exposure_task_hint(command_label: str) -> bool:
    lower = command_label.lower()
    if not re.search(r"(^|[^a-z0-9])docker[-_ ]run($|[^a-z0-9])", lower):
        return False
    return bool(re.search(r"\b(release|prod|production)\b", lower))


def _command_detection_candidates(
    command_label: str,
    payload: dict[str, Any] | None = None,
    *,
    include_inferred: bool = True,
) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()
    extracted_normalized: set[str] = set()

    if payload is not None:
        for extracted in _extract_command_candidates(
            payload, include_inferred=include_inferred
        ):
            normalized = _normalize_command_label(extracted)
            if normalized:
                extracted_normalized.add(normalized)
            _append_unique_command_candidate(candidates, seen, extracted)

    normalized_command_label = _normalize_command_label(command_label)
    should_append_command_label = bool(normalized_command_label)
    if not should_append_command_label and (payload is None or include_inferred):
        should_append_command_label = True

    if should_append_command_label:
        _append_unique_command_candidate(candidates, seen, command_label)

    index = 0
    while index < len(candidates):
        resolved_wrapper_command = _resolve_wrapper_script_command(candidates[index], payload)
        if resolved_wrapper_command:
            _append_unique_command_candidate(candidates, seen, resolved_wrapper_command)
        index += 1

    return candidates


def _coerce_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and re.fullmatch(r"\s*-?\d+\s*", value):
        return int(value.strip())
    return None


def _as_int(value: Any, default: int = 0) -> int:
    coerced = _coerce_int(value)
    return default if coerced is None else coerced


def _extract_exit_code(payload: dict[str, Any]) -> int | None:
    candidate_paths = (
        ("exitCode",),
        ("exit_code",),
        ("event", "exitCode"),
        ("event", "exit_code"),
        ("result", "exitCode"),
        ("result", "exit_code"),
        ("event", "result", "exitCode"),
        ("event", "result", "exit_code"),
        ("arguments", "exitCode"),
        ("arguments", "exit_code"),
        ("event", "arguments", "exitCode"),
        ("event", "arguments", "exit_code"),
        ("code",),
        ("event", "code"),
        ("result", "code"),
        ("event", "result", "code"),
    )

    for path in candidate_paths:
        coerced = _coerce_int(_get_path_value(payload, path))
        if coerced is not None:
            return coerced

    for value in _search_nested_values(payload, ("exitCode", "exit_code", "exitcode")):
        coerced = _coerce_int(value)
        if coerced is not None:
            return coerced

    text = _extract_text_blob(payload)
    text_match = re.search(
        r"\bexit\s*code\b\s*[:=]?\s*(-?\d+)", text, flags=re.IGNORECASE
    )
    if text_match:
        return int(text_match.group(1))

    return None


def _looks_test_related(command_label: str) -> bool:
    lower = command_label.lower()
    if re.search(r"\btest(s|ing)?\b", lower):
        return True
    return any(token in lower for token in TEST_COMMAND_TOKENS)


def _labels_match(label_a: str, label_b: str) -> bool:
    if not label_a or not label_b:
        return False
    return label_a == label_b


def _is_execution_event(tool_lower: str, command_label: str, exit_code: int | None) -> bool:
    if any(token in tool_lower for token in EXECUTION_TOOL_TOKENS):
        return True
    return bool(command_label) and exit_code is not None


def _is_edit_event(tool_lower: str) -> bool:
    return any(token in tool_lower for token in EDIT_TOOL_TOKENS)


def _parse_iso_datetime(value: str) -> datetime | None:
    text = value.strip()
    if not text:
        return None

    normalized = text
    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed


def _default_public_exposure_gate_state() -> dict[str, Any]:
    return {
        "pending": False,
        "pendingContext": None,
        "passed": False,
        "lastVerifiedAt": None,
        "lastAttemptedCommand": "",
        "lastBlockedAt": None,
        "evidenceMap": {},
        "updatedAt": None,
    }


def _normalize_public_exposure_gate_state(raw_gate: Any) -> dict[str, Any]:
    default_gate = _default_public_exposure_gate_state()
    gate = _as_string_key_dict(raw_gate)
    if gate is None:
        return default_gate

    pending_value = gate.get("pending")
    if isinstance(pending_value, bool):
        default_gate["pending"] = pending_value

    pending_context = _normalize_public_exposure_pending_context(gate.get("pendingContext"))
    if pending_context is not None:
        default_gate["pendingContext"] = pending_context

    passed_value = gate.get("passed")
    if isinstance(passed_value, bool):
        default_gate["passed"] = passed_value

    for key in ("lastVerifiedAt", "lastAttemptedCommand", "lastBlockedAt", "updatedAt"):
        value = gate.get(key)
        if value is None or isinstance(value, str):
            default_gate[key] = value

    raw_map = _as_string_key_dict(gate.get("evidenceMap"))
    if raw_map is not None:
        cleaned_map: dict[str, str] = {}
        for key, value in raw_map.items():
            if isinstance(value, str) and value.strip():
                cleaned_map[str(key)] = value.strip()
        default_gate["evidenceMap"] = cleaned_map

    return default_gate


def _normalize_public_exposure_pending_context(raw_context: Any) -> dict[str, str] | None:
    context = _as_string_key_dict(raw_context)
    if context is None:
        return None

    command_label_raw = context.get("commandLabel")
    command_label = (
        command_label_raw.strip()
        if isinstance(command_label_raw, str) and command_label_raw.strip()
        else ""
    )

    normalized_raw = context.get("commandLabelNormalized")
    normalized_label = (
        normalized_raw.strip()
        if isinstance(normalized_raw, str) and normalized_raw.strip()
        else ""
    )

    if not normalized_label and command_label:
        normalized_label = _normalize_command_label(command_label)

    if not command_label and normalized_label:
        command_label = normalized_label

    if not command_label and not normalized_label:
        return None

    normalized: dict[str, str] = {
        "commandLabel": command_label,
        "commandLabelNormalized": normalized_label,
    }

    for key in ("detectedAt", "expiresAt"):
        value = context.get(key)
        if isinstance(value, str) and value.strip():
            normalized[key] = value.strip()

    return normalized


def _mark_public_exposure_pending(
    gate_state: dict[str, Any], command_label: str, now: str
) -> None:
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=PUBLIC_EXPOSURE_PENDING_TTL_HOURS)
    ).isoformat(timespec="seconds")
    gate_state["pending"] = True
    gate_state["pendingContext"] = {
        "commandLabel": command_label,
        "commandLabelNormalized": _normalize_command_label(command_label)
        if command_label
        else "",
        "detectedAt": now,
        "expiresAt": expires_at,
    }


def _clear_public_exposure_pending(gate_state: dict[str, Any]) -> None:
    gate_state["pending"] = False
    gate_state["pendingContext"] = None


def _is_docker_compose_start_command(command_label: str) -> bool:
    lower = command_label.lower()
    return bool(
        re.search(
            r"\bdocker(?:\s+compose|-compose)\b[^\n\r]*\b(up|start)\b",
            lower,
        )
    )


def _looks_ambiguous_compose_stack_start(command_label: str) -> bool:
    match = re.search(
        r"\bdocker(?:\s+compose|-compose)\b[^\n\r]*\b(up|start)\b(?P<tail>[^\n\r]*)$",
        command_label.lower(),
    )
    if match is None:
        return False

    tail = match.group("tail").strip()
    if not tail:
        return True

    non_option_tokens = [
        token
        for token in re.split(r"\s+", tail)
        if token
        and not token.startswith("-")
        and token not in {"&&", "||", ";", "|"}
        and not re.fullmatch(r"\d+", token)
    ]
    return len(non_option_tokens) == 0


def _is_production_compose_command(command_label: str) -> bool:
    file_path_pattern = re.compile(
        r"(?:-f|--file)(?:=|\s+)(?P<path>\"[^\"]+\"|'[^']+'|[^\s|&;]+)",
        flags=re.IGNORECASE,
    )
    has_file_flag = bool(
        re.search(r"(?:^|\s)(?:-f|--file)(?:=|\s+)", command_label, flags=re.IGNORECASE)
    )
    compose_file_names_from_flags: list[str] = []

    for match in file_path_pattern.finditer(command_label):
        raw_path = _strip_wrapping_quotes(match.group("path")).replace("\\", "/")
        file_name = raw_path.rsplit("/", 1)[-1].lower()
        if file_name:
            compose_file_names_from_flags.append(file_name)

    if has_file_flag:
        if not compose_file_names_from_flags:
            return False
        return all(
            file_name in PUBLIC_EXPOSURE_PROD_COMPOSE_FILES
            for file_name in compose_file_names_from_flags
        )

    fallback_file_pattern = re.compile(
        r"(?<![a-z0-9_.-])(?P<path>\"[^\"]*docker-compose[^\"]*\.ya?ml\"|'[^']*docker-compose[^']*\.ya?ml'|[^\s|&;]*docker-compose[^\s|&;]*\.ya?ml)(?![a-z0-9_.-])",
        flags=re.IGNORECASE,
    )
    fallback_compose_file_names: list[str] = []
    for match in fallback_file_pattern.finditer(command_label):
        raw_path = _strip_wrapping_quotes(match.group("path")).replace("\\", "/")
        file_name = raw_path.rsplit("/", 1)[-1].lower()
        if file_name:
            fallback_compose_file_names.append(file_name)

    if not fallback_compose_file_names:
        return False

    return all(
        file_name in PUBLIC_EXPOSURE_PROD_COMPOSE_FILES
        for file_name in fallback_compose_file_names
    )


def _public_exposure_pending_is_active(gate_state: dict[str, Any]) -> bool:
    if gate_state.get("pending") is not True:
        return False

    context = _normalize_public_exposure_pending_context(gate_state.get("pendingContext"))
    now = datetime.now(timezone.utc)

    if context is not None:
        gate_state["pendingContext"] = context
        expires_at_raw = context.get("expiresAt", "")
        if expires_at_raw:
            expires_at = _parse_iso_datetime(expires_at_raw)
            if expires_at is not None and now <= expires_at:
                return True

        detected_at_raw = context.get("detectedAt", "")
        detected_at = _parse_iso_datetime(detected_at_raw)
        if detected_at is not None:
            age_seconds = (now - detected_at).total_seconds()
            if age_seconds <= PUBLIC_EXPOSURE_PENDING_TTL_HOURS * 3600:
                context["expiresAt"] = (
                    detected_at
                    + timedelta(hours=PUBLIC_EXPOSURE_PENDING_TTL_HOURS)
                ).isoformat(timespec="seconds")
                gate_state["pendingContext"] = context
                return True

        _clear_public_exposure_pending(gate_state)
        return False

    fallback_time_raw = ""
    for key in ("lastBlockedAt", "updatedAt"):
        value = gate_state.get(key)
        if isinstance(value, str) and value.strip():
            fallback_time_raw = value.strip()
            break

    fallback_time = _parse_iso_datetime(fallback_time_raw)
    if fallback_time is None:
        _clear_public_exposure_pending(gate_state)
        return False

    age_seconds = (now - fallback_time).total_seconds()
    if age_seconds <= PUBLIC_EXPOSURE_PENDING_TTL_HOURS * 3600:
        return True

    _clear_public_exposure_pending(gate_state)
    return False


def _summary_relates_to_pending_public_exposure(
    summary: str, gate_state: dict[str, Any]
) -> bool:
    lower = summary.lower()
    if any(term in lower for term in PUBLIC_EXPOSURE_RELATED_SUMMARY_TERMS):
        return True

    summary_normalized = _normalize_command_label(summary)
    context = _normalize_public_exposure_pending_context(gate_state.get("pendingContext"))
    if context is None:
        return False

    pending_command_normalized = context.get("commandLabelNormalized", "")
    if pending_command_normalized and pending_command_normalized in summary_normalized:
        return True

    if "command:" in lower and "docker compose" in lower and "docker compose" in pending_command_normalized:
        return True

    return False


def _public_exposure_gate_state(state: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_public_exposure_gate_state(state.get("publicExposureGate"))
    state["publicExposureGate"] = normalized
    return normalized


def _summary_mentions_public_exposure(summary: str) -> bool:
    lower = summary.lower()
    return any(term in lower for term in PUBLIC_EXPOSURE_SUMMARY_TERMS)


def _summary_has_public_exposure_pass_marker(summary: str) -> bool:
    if not summary:
        return False
    return any(
        re.search(pattern, summary, flags=re.IGNORECASE)
        for pattern in PUBLIC_EXPOSURE_PASS_PATTERNS
    )


def _extract_public_exposure_evidence_map(summary: str) -> dict[int, str]:
    evidence_map: dict[int, str] = {}
    line_pattern = re.compile(
        r"^\s*(?:[-*]\s*)?(?:gate|check)\s*[-_ ]?([1-9]|10)\s*[:=]\s*(.+?)\s*$",
        flags=re.IGNORECASE | re.MULTILINE,
    )
    for match in line_pattern.finditer(summary):
        gate_id = int(match.group(1))
        if gate_id in evidence_map:
            continue
        evidence = match.group(2).strip()
        if evidence:
            evidence_map[gate_id] = evidence
    return evidence_map


def _is_placeholder_evidence(evidence: str) -> bool:
    lower = evidence.lower()
    return any(
        re.search(rf"\b{re.escape(term)}\b", lower)
        for term in PUBLIC_EXPOSURE_PLACEHOLDER_TERMS
    )


def _evidence_has_required_topic(gate_id: int, evidence: str) -> bool:
    keywords = PUBLIC_EXPOSURE_GATE_KEYWORDS.get(gate_id, ())
    if not keywords:
        return True
    lower = evidence.lower()
    return any(keyword in lower for keyword in keywords)


def _validate_public_exposure_gate_summary(
    summary: str,
) -> tuple[bool, str, dict[str, str] | None]:
    if not _summary_has_public_exposure_pass_marker(summary):
        return (
            False,
            (
                "Missing public exposure gate pass marker. Include one of: "
                "'Public Internet Exposure Gate: PASS', "
                "'Public Exposure Gate: PASS', or 'public_exposure_gate=pass'."
            ),
            None,
        )

    evidence_by_id = _extract_public_exposure_evidence_map(summary)
    missing_ids = [gate_id for gate_id in PUBLIC_EXPOSURE_GATES if gate_id not in evidence_by_id]
    if missing_ids:
        return (
            False,
            "Missing evidence mapping for "
            + ", ".join(f"GATE-{gate_id}" for gate_id in missing_ids)
            + ".",
            None,
        )

    placeholder_ids = [
        gate_id
        for gate_id, evidence in evidence_by_id.items()
        if _is_placeholder_evidence(evidence)
    ]
    if placeholder_ids:
        return (
            False,
            "Placeholder evidence detected for "
            + ", ".join(f"GATE-{gate_id}" for gate_id in placeholder_ids)
            + ".",
            None,
        )

    topic_gap_ids = [
        gate_id
        for gate_id, evidence in evidence_by_id.items()
        if not _evidence_has_required_topic(gate_id, evidence)
    ]
    if topic_gap_ids:
        return (
            False,
            "Evidence topic mismatch for "
            + ", ".join(f"GATE-{gate_id}" for gate_id in topic_gap_ids)
            + ".",
            None,
        )

    normalized_map = {
        f"GATE-{gate_id}": evidence_by_id[gate_id] for gate_id in PUBLIC_EXPOSURE_GATES
    }
    return True, "Public exposure evidence map verified.", normalized_map


def _is_public_exposure_command(
    command_label: str, payload: dict[str, Any] | None = None
) -> bool:
    for candidate in _command_detection_candidates(
        command_label, payload, include_inferred=False
    ):
        lower = candidate.lower()
        compose_start = _is_docker_compose_start_command(candidate)

        if re.search(
            r"\bdocker(?:\s+compose|-compose)\b[^\n\r]*\b(up|start|run)\b[^\n\r]*\bngrok\b",
            lower,
        ):
            return True
        if re.search(r"\bngrok\b[^\n\r]*\b(http|start|tcp)\b", lower):
            return True

        if compose_start and _is_production_compose_command(candidate):
            return True

        if compose_start and _looks_ambiguous_compose_stack_start(candidate):
            return True

        if _is_public_exposure_task_hint(candidate):
            return True

    return False


def _violates_production_compose_requirement(
    command_label: str, payload: dict[str, Any] | None = None
) -> bool:
    candidates = _command_detection_candidates(
        command_label, payload, include_inferred=False
    )
    if not candidates:
        return True

    saw_public_exposure_signal = False
    saw_production_compose_start = False

    for candidate in candidates:
        lower = candidate.lower()
        compose_start = _is_docker_compose_start_command(candidate)

        if _is_public_exposure_task_hint(candidate):
            saw_public_exposure_signal = True
            continue

        if re.search(r"\bngrok\b[^\n\r]*\b(http|start|tcp)\b", lower):
            return True

        if compose_start:
            saw_public_exposure_signal = True
            if not _is_production_compose_command(candidate):
                return True
            saw_production_compose_start = True
            continue

        if re.search(r"\bdocker(?:\s+compose|-compose)\b", lower):
            saw_public_exposure_signal = True
            return True

    if saw_public_exposure_signal and not saw_production_compose_start:
        return True

    return False


def _uses_forbidden_localstack_profile(
    command_label: str, payload: dict[str, Any] | None = None
) -> bool:
    for candidate in _command_detection_candidates(
        command_label, payload, include_inferred=False
    ):
        lower = candidate.lower()
        if "localstack" in lower or "test object storage" in lower:
            return True
    return False


def _is_default_like_secret(raw_value: str | None) -> bool:
    if raw_value is None:
        return True

    normalized_value = _normalize_token(raw_value)
    if not normalized_value:
        return True

    if normalized_value in DEFAULT_LIKE_SECRET_VALUES:
        return True

    if len(normalized_value) < 8:
        return True

    if normalized_value.startswith("your") and normalized_value.endswith(
        ("token", "secret", "password", "key")
    ):
        return True

    if normalized_value.startswith("test"):
        suffix = normalized_value[4:]
        if not suffix or suffix.isdigit():
            return True

    if len(normalized_value) >= 8 and len(set(normalized_value)) == 1:
        return True

    return False


def _secret_violation_reason(
    variable_name: str, raw_value: str | None, *, required: bool
) -> str:
    if raw_value is None or not raw_value.strip():
        if required:
            return f"{variable_name} is missing or empty"
        return ""

    if _is_default_like_secret(raw_value):
        return f"{variable_name} is placeholder/default-like"

    return ""


def _ngrok_authtoken_violation_reason(raw_value: str | None) -> str:
    return _secret_violation_reason("NGROK_AUTHTOKEN", raw_value, required=True)


def _strip_wrapping_quotes(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] in {"'", '"'} and value[-1] == value[0]:
        return value[1:-1].strip()
    return value


def _resolve_env_file_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = WORKSPACE_ROOT / candidate
    try:
        return candidate.resolve()
    except OSError:
        return candidate


def _env_file_paths_from_command(command_label: str) -> list[Path]:
    if not command_label:
        return []

    env_file_paths: list[Path] = []
    pattern = re.compile(
        r"--env-file(?:=|\s+)(?P<path>\"[^\"]+\"|'[^']+'|[^\s|&;]+)",
        flags=re.IGNORECASE,
    )
    for match in pattern.finditer(command_label):
        raw_path = _strip_wrapping_quotes(match.group("path"))
        if not raw_path:
            continue
        env_file_paths.append(_resolve_env_file_path(raw_path))

    return env_file_paths


def _parse_env_assignment_value(raw_value: str) -> str:
    value = raw_value.strip()
    if not value:
        return ""

    if value[0] in {"'", '"'}:
        return _strip_wrapping_quotes(value)

    comment_split_index = value.find(" #")
    if comment_split_index >= 0:
        value = value[:comment_split_index].rstrip()

    return value


def _read_env_file_variable(env_file_path: Path, variable_name: str) -> str | None:
    if not env_file_path.exists() or not env_file_path.is_file():
        return None

    try:
        raw_text = env_file_path.read_text(encoding="utf-8-sig")
    except OSError:
        return None

    resolved_value: str | None = None
    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.lower().startswith("export "):
            line = line[7:].strip()
            if not line:
                continue

        if "=" not in line:
            continue

        key, raw_value = line.split("=", 1)
        if key.strip() != variable_name:
            continue

        resolved_value = _parse_env_assignment_value(raw_value)

    return resolved_value


def _production_compose_command_candidates(
    command_label: str, payload: dict[str, Any] | None = None
) -> list[str]:
    production_candidates: list[str] = []
    seen: set[str] = set()

    for candidate in _command_detection_candidates(
        command_label, payload, include_inferred=False
    ):
        lower = candidate.lower()
        if not re.search(r"\bdocker(?:\s+compose|-compose)\b", lower):
            continue
        if not _is_production_compose_command(candidate):
            continue
        _append_unique_command_candidate(production_candidates, seen, candidate)

    return production_candidates


def _evaluate_production_candidate_secrets(
    command_label: str,
    variable_name: str,
    *,
    required: bool,
    payload: dict[str, Any] | None = None,
) -> tuple[str, bool, str | None]:
    production_candidates = _production_compose_command_candidates(command_label, payload)
    if not production_candidates:
        return "", False, None

    canonical_env_exists = (
        CANONICAL_PROD_ENV_FILE.exists() and CANONICAL_PROD_ENV_FILE.is_file()
    )
    saw_resolved_env_context = False
    saw_unresolved_production_candidate = False
    resolved_value: str | None = None

    for candidate in production_candidates:
        explicit_env_file_paths = _env_file_paths_from_command(candidate)
        if explicit_env_file_paths:
            saw_resolved_env_context = True
            explicit_resolved_value: str | None = None
            for env_file_path in explicit_env_file_paths:
                candidate_value = _read_env_file_variable(env_file_path, variable_name)
                if candidate_value is not None:
                    explicit_resolved_value = candidate_value

            violation_reason = _secret_violation_reason(
                variable_name, explicit_resolved_value, required=required
            )
            if violation_reason:
                return violation_reason, True, explicit_resolved_value

            resolved_value = explicit_resolved_value
            continue

        canonical_value = _read_env_file_variable(CANONICAL_PROD_ENV_FILE, variable_name)
        if canonical_value is not None:
            saw_resolved_env_context = True
            violation_reason = _secret_violation_reason(
                variable_name, canonical_value, required=required
            )
            if violation_reason:
                return violation_reason, True, canonical_value
            resolved_value = canonical_value
            continue

        if canonical_env_exists:
            saw_resolved_env_context = True
            violation_reason = _secret_violation_reason(
                variable_name, "", required=required
            )
            if violation_reason:
                return violation_reason, True, ""
            resolved_value = ""
            continue

        saw_unresolved_production_candidate = True

    if saw_unresolved_production_candidate and saw_resolved_env_context:
        return (
            _secret_violation_reason(variable_name, "", required=required),
            True,
            "",
        )

    return "", saw_resolved_env_context, resolved_value


def _resolve_secret_from_env_file_context(
    command_label: str, variable_name: str, payload: dict[str, Any] | None = None
) -> str | None:
    violation_reason, env_context_resolved, resolved_value = (
        _evaluate_production_candidate_secrets(
            command_label,
            variable_name,
            required=False,
            payload=payload,
        )
    )
    if not env_context_resolved:
        return None
    if violation_reason:
        return ""
    if resolved_value is not None:
        return resolved_value
    return ""


def _resolve_ngrok_token_from_env_file_context(
    command_label: str, payload: dict[str, Any] | None = None
) -> str | None:
    return _resolve_secret_from_env_file_context(
        command_label, "NGROK_AUTHTOKEN", payload
    )


def _invalid_secret_violation_reason(
    command_label: str,
    variable_name: str,
    *,
    required: bool,
    payload: dict[str, Any] | None = None,
) -> str:
    violation_reason, env_context_resolved, _ = _evaluate_production_candidate_secrets(
        command_label,
        variable_name,
        required=required,
        payload=payload,
    )
    if violation_reason:
        return violation_reason
    if env_context_resolved:
        return ""

    return _secret_violation_reason(
        variable_name, os.environ.get(variable_name), required=required
    )


def _invalid_ngrok_authtoken_reason(
    command_label: str, payload: dict[str, Any] | None = None
) -> str:
    return _invalid_secret_violation_reason(
        command_label, "NGROK_AUTHTOKEN", required=True, payload=payload
    )


def _should_require_ngrok_secret(
    command_label: str, payload: dict[str, Any] | None = None
) -> bool:
    for candidate in _command_detection_candidates(
        command_label, payload, include_inferred=False
    ):
        if "ngrok" in candidate.lower():
            return True
        if _is_production_compose_command(candidate):
            return True
    return False


def _invalid_required_public_exposure_secret_reason(
    command_label: str, payload: dict[str, Any] | None = None
) -> str:
    for variable_name in PUBLIC_EXPOSURE_REQUIRED_SECRET_ENV_VARS:
        violation_reason = _invalid_secret_violation_reason(
            command_label,
            variable_name,
            required=True,
            payload=payload,
        )
        if violation_reason:
            return violation_reason

    if _should_require_ngrok_secret(command_label, payload):
        return _invalid_ngrok_authtoken_reason(command_label, payload)

    return ""


def _public_exposure_gate_is_open(gate_state: dict[str, Any]) -> bool:
    passed = gate_state.get("passed") is True
    if not passed:
        return False

    verified_at_raw = gate_state.get("lastVerifiedAt")
    if not isinstance(verified_at_raw, str) or not verified_at_raw.strip():
        return False

    verified_at = _parse_iso_datetime(verified_at_raw)
    if verified_at is None:
        return False

    age_seconds = (datetime.now(timezone.utc) - verified_at).total_seconds()
    max_age_seconds = PUBLIC_EXPOSURE_GATE_FRESHNESS_HOURS * 3600
    return age_seconds <= max_age_seconds


def _should_require_public_exposure_gate_summary(summary: str, state: dict[str, Any]) -> bool:
    gate_state = _public_exposure_gate_state(state)
    if _public_exposure_pending_is_active(gate_state):
        return True
    if _summary_mentions_public_exposure(summary):
        return True
    return _summary_has_public_exposure_pass_marker(summary)


def _public_exposure_block_message(command_label: str, reason: str) -> str:
    requirements = "; ".join(PUBLIC_EXPOSURE_BLOCK_REQUIREMENTS)
    return (
        "Blocked public Internet exposure command '"
        + command_label
        + "': "
        + reason
        + ". Fail closed until task_complete includes 'Public Internet Exposure Gate: PASS' "
        + "and a full evidence map (GATE-1..GATE-10). Required checks: "
        + requirements
        + "."
    )


def _default_test_fix_state() -> dict[str, Any]:
    return {
        "pendingFailures": [],
        "observedTestActivity": False,
        "updatedAt": None,
        "integrityAnomaly": None,
        "publicExposureGate": _default_public_exposure_gate_state(),
    }


def _normalize_integrity_anomaly(raw_anomaly: Any) -> dict[str, Any] | None:
    anomaly = _as_string_key_dict(raw_anomaly)
    if anomaly is None:
        return None

    detail = str(anomaly.get("detail", anomaly.get("message", ""))).strip()
    if not detail:
        return None

    code = str(anomaly.get("code", "state-integrity-anomaly")).strip()
    if not code:
        code = "state-integrity-anomaly"

    detected_at = str(anomaly.get("detectedAt", "")).strip()
    if not detected_at:
        detected_at = _utc_now_iso()

    return {
        "code": code,
        "detail": detail,
        "detectedAt": detected_at,
    }


def _set_integrity_anomaly(state: dict[str, Any], code: str, detail: str) -> None:
    detail_text = detail.strip()
    if not detail_text:
        return

    existing = _normalize_integrity_anomaly(state.get("integrityAnomaly"))
    if existing is None:
        state["integrityAnomaly"] = {
            "code": code,
            "detail": detail_text,
            "detectedAt": _utc_now_iso(),
        }
        return

    existing_detail = str(existing.get("detail", "")).strip()
    if detail_text not in existing_detail:
        if existing_detail:
            existing["detail"] = f"{existing_detail} | {detail_text}"
        else:
            existing["detail"] = detail_text

    existing_code = str(existing.get("code", "")).strip()
    existing_codes = [token for token in existing_code.split("|") if token]
    if code and code not in existing_codes:
        existing_codes.append(code)
        existing["code"] = "|".join(existing_codes)

    state["integrityAnomaly"] = existing


def _integrity_anomaly(state: dict[str, Any]) -> dict[str, Any] | None:
    normalized = _normalize_integrity_anomaly(state.get("integrityAnomaly"))
    state["integrityAnomaly"] = normalized
    return normalized


def _normalize_pending_entry(
    raw_entry: dict[str, Any], fallback_time: str
) -> dict[str, Any] | None:
    command_label = str(raw_entry.get("commandLabel", "")).strip()
    if not command_label:
        command_label = str(raw_entry.get("command", "")).strip()

    normalized_label = str(raw_entry.get("commandLabelNormalized", "")).strip()
    if not normalized_label and command_label:
        normalized_label = _normalize_command_label(command_label)
    if not normalized_label:
        return None

    if not command_label:
        command_label = normalized_label

    first_failed_at = str(raw_entry.get("firstFailedAt", fallback_time))
    last_failed_at = str(raw_entry.get("lastFailedAt", first_failed_at))
    fix_attempts = max(0, _as_int(raw_entry.get("fixAttempts"), 0))
    last_exit_code = _coerce_int(raw_entry.get("lastExitCode"))
    if last_exit_code is None:
        last_exit_code = 1

    normalized: dict[str, Any] = {
        "commandLabel": command_label,
        "commandLabelNormalized": normalized_label,
        "firstFailedAt": first_failed_at,
        "lastFailedAt": last_failed_at,
        "fixAttempts": fix_attempts,
        "lastExitCode": last_exit_code,
    }

    last_fix_attempt = raw_entry.get("lastFixAttemptAt")
    if isinstance(last_fix_attempt, str) and last_fix_attempt.strip():
        normalized["lastFixAttemptAt"] = last_fix_attempt.strip()

    return normalized


def _save_test_fix_state(state: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=True, indent=2), encoding="utf-8"
    )


def _load_test_fix_state() -> dict[str, Any]:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    default_state = _default_test_fix_state()

    if not STATE_FILE.exists():
        _save_test_fix_state(default_state)
        return default_state

    try:
        raw_content = STATE_FILE.read_text(encoding="utf-8")
    except OSError as exc:
        _set_integrity_anomaly(
            default_state,
            "state-read-error",
            f"Unable to read existing state file: {exc}",
        )
        return default_state

    try:
        parsed_raw = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        _set_integrity_anomaly(
            default_state,
            "state-json-invalid",
            (
                "Existing state file is not valid JSON "
                f"(line {exc.lineno}, column {exc.colno})."
            ),
        )
        return default_state

    parsed = _as_string_key_dict(parsed_raw)
    if parsed is None:
        _set_integrity_anomaly(
            default_state,
            "state-shape-invalid",
            "Existing state file root value must be a JSON object.",
        )
        return default_state

    state = _default_test_fix_state()
    state["integrityAnomaly"] = _normalize_integrity_anomaly(
        parsed.get("integrityAnomaly")
    )

    now = _utc_now_iso()
    migrated_failures: list[dict[str, Any]] = []

    pending_failures_raw = parsed.get("pendingFailures")
    if "pendingFailures" not in parsed:
        _set_integrity_anomaly(
            state,
            "pending-failures-missing",
            "pendingFailures key is missing in the existing state file.",
        )
    elif pending_failures_raw is None:
        _set_integrity_anomaly(
            state,
            "pending-failures-null",
            "pendingFailures must be a list in the existing state file; got null.",
        )
    elif isinstance(pending_failures_raw, list):
        pending_failures_list = cast(list[Any], pending_failures_raw)
        dropped_entries = 0
        for raw_entry in pending_failures_list:
            entry = _as_string_key_dict(raw_entry)
            if entry is None:
                dropped_entries += 1
                continue

            normalized_entry = _normalize_pending_entry(entry, now)
            if normalized_entry is None:
                dropped_entries += 1
                continue

            migrated_failures.append(normalized_entry)

        if dropped_entries:
            _set_integrity_anomaly(
                state,
                "pending-failures-entry-dropped",
                (
                    "Dropped "
                    f"{dropped_entries} malformed pendingFailures entr"
                    f"{'y' if dropped_entries == 1 else 'ies'} while loading state."
                ),
            )
    else:
        _set_integrity_anomaly(
            state,
            "pending-failures-type-invalid",
            (
                "pendingFailures must be a list in the existing state file; "
                f"got {type(pending_failures_raw).__name__}."
            ),
        )

    legacy_pending_raw = parsed.get("pendingFailure")
    if legacy_pending_raw is not None:
        legacy_pending = _as_string_key_dict(legacy_pending_raw)
        if legacy_pending is None:
            _set_integrity_anomaly(
                state,
                "legacy-pending-failure-invalid",
                "Legacy pendingFailure value is malformed and could not be migrated.",
            )
        else:
            normalized_legacy = _normalize_pending_entry(legacy_pending, now)
            if normalized_legacy is None:
                _set_integrity_anomaly(
                    state,
                    "legacy-pending-failure-invalid",
                    "Legacy pendingFailure entry is malformed and could not be migrated.",
                )
            else:
                legacy_normalized = str(
                    normalized_legacy.get("commandLabelNormalized", "")
                )
                if legacy_normalized and not any(
                    _labels_match(
                        legacy_normalized,
                        str(item.get("commandLabelNormalized", "")),
                    )
                    for item in migrated_failures
                ):
                    migrated_failures.append(normalized_legacy)

    state["pendingFailures"] = migrated_failures

    if "observedTestActivity" not in parsed:
        _set_integrity_anomaly(
            state,
            "observed-test-activity-missing",
            "observedTestActivity key is missing in the existing state file.",
        )
        state["observedTestActivity"] = False
    else:
        observed_test_activity = parsed.get("observedTestActivity")
        if isinstance(observed_test_activity, bool):
            state["observedTestActivity"] = observed_test_activity
        else:
            _set_integrity_anomaly(
                state,
                "observed-test-activity-type-invalid",
                (
                    "observedTestActivity must be a boolean in the existing state file; "
                    f"got {type(observed_test_activity).__name__}."
                ),
            )
            state["observedTestActivity"] = False

    if "updatedAt" not in parsed:
        _set_integrity_anomaly(
            state,
            "updated-at-missing",
            "updatedAt key is missing in the existing state file.",
        )
        state["updatedAt"] = None
    else:
        updated_at = parsed.get("updatedAt")
        if updated_at is None or isinstance(updated_at, str):
            state["updatedAt"] = updated_at
        else:
            _set_integrity_anomaly(
                state,
                "updated-at-type-invalid",
                (
                    "updatedAt must be a string or null in the existing state file; "
                    f"got {type(updated_at).__name__}."
                ),
            )
            state["updatedAt"] = None

    state["publicExposureGate"] = _normalize_public_exposure_gate_state(
        parsed.get("publicExposureGate")
    )
    return state


def _save_state_if_changed(state: dict[str, Any], before: str) -> str:
    after = json.dumps(state, ensure_ascii=True, sort_keys=True)
    if after != before:
        _save_test_fix_state(state)
    return after


def _pending_failures(state: dict[str, Any]) -> list[dict[str, Any]]:
    pending = state.get("pendingFailures")
    if not isinstance(pending, list):
        _set_integrity_anomaly(
            state,
            "pending-failures-runtime-type-invalid",
            "pendingFailures in memory is not a list.",
        )
        state["pendingFailures"] = []
        return []

    pending_list = cast(list[Any], pending)
    normalized_entries: list[dict[str, Any]] = []
    fallback_time = _utc_now_iso()
    dropped_entries = 0
    for raw_entry in pending_list:
        entry = _as_string_key_dict(raw_entry)
        if entry is None:
            dropped_entries += 1
            continue

        normalized_entry = _normalize_pending_entry(entry, fallback_time)
        if normalized_entry is None:
            dropped_entries += 1
            continue

        normalized_entries.append(normalized_entry)

    if dropped_entries:
        _set_integrity_anomaly(
            state,
            "pending-failures-runtime-entry-dropped",
            (
                "Dropped "
                f"{dropped_entries} malformed pendingFailures entr"
                f"{'y' if dropped_entries == 1 else 'ies'} during runtime normalization."
            ),
        )
        state["pendingFailures"] = normalized_entries

    return normalized_entries


def _entry_index_for_label(
    pending: list[dict[str, Any]], normalized_label: str
) -> int | None:
    if not normalized_label:
        return None
    for index, entry in enumerate(pending):
        if _labels_match(normalized_label, str(entry.get("commandLabelNormalized", ""))):
            return index
    return None


def _resolve_tracking_command_label(
    payload: dict[str, Any],
    tool_lower: str,
    command_label: str,
    exit_code: int | None,
) -> str:
    if command_label:
        return command_label

    # Fast path: skip inferred blob scanning unless command detection is still needed.
    extracted_label = _extract_command_label(payload, include_inferred=False)
    if extracted_label:
        return extracted_label

    lifecycle_event_name = _lifecycle_event_name(payload)
    # Policy-safe inferred fallback: only when command label is still empty and
    # the event is likely execution-relevant (pre-tool intent, concrete exit code,
    # or execution-shaped tool name).
    should_fallback_to_inferred = (
        _is_pre_tool_use_event(lifecycle_event_name)
        or exit_code is not None
        or any(token in tool_lower for token in EXECUTION_TOOL_TOKENS)
    )
    if should_fallback_to_inferred:
        return _extract_command_label(payload, include_inferred=True)

    return ""


def _track_test_failure_state(
    payload: dict[str, Any],
    tool_lower: str,
    state: dict[str, Any],
    *,
    command_label: str = "",
    exit_code: int | None = None,
) -> str:
    now = _utc_now_iso()
    pending = _pending_failures(state)

    if exit_code is None:
        exit_code = _extract_exit_code(payload)
    command_label = _resolve_tracking_command_label(
        payload, tool_lower, command_label, exit_code
    )
    normalized_label = _normalize_command_label(command_label) if command_label else ""

    is_execution = _is_execution_event(tool_lower, command_label, exit_code)
    is_edit = _is_edit_event(tool_lower)

    if is_execution and command_label and _looks_test_related(command_label):
        state["observedTestActivity"] = True

    pending_index = _entry_index_for_label(pending, normalized_label)
    same_as_pending = pending_index is not None
    pending_entry = pending[pending_index] if pending_index is not None else None

    if is_execution and command_label and _looks_test_related(command_label):
        if exit_code is not None and exit_code != 0:
            preserved_attempts = 0
            first_failed_at = now
            if same_as_pending and pending_entry is not None:
                preserved_attempts = _as_int(pending_entry.get("fixAttempts"), 0)
                first_failed_at = str(pending_entry.get("firstFailedAt", now))

            next_entry: dict[str, Any] = {
                "commandLabel": command_label,
                "commandLabelNormalized": normalized_label,
                "firstFailedAt": first_failed_at,
                "lastFailedAt": now,
                "fixAttempts": preserved_attempts,
                "lastExitCode": exit_code,
            }

            if pending_index is None:
                pending.append(next_entry)
            else:
                pending[pending_index] = next_entry

            state["pendingFailures"] = pending
            state["updatedAt"] = now
            return (
                f"Recorded pending failed test command '{command_label}' "
                f"(exit code {exit_code})."
            )

        if exit_code == 0 and pending_entry is not None and pending_index is not None:
            fix_attempts = max(0, _as_int(pending_entry.get("fixAttempts"), 0))
            if fix_attempts < 1:
                pending_entry["lastExitCode"] = exit_code
                state["pendingFailures"] = pending
                state["updatedAt"] = now
                return (
                    f"Observed passing retest for '{command_label}' but kept pending "
                    "because no fix attempt is recorded yet."
                )

            del pending[pending_index]
            state["pendingFailures"] = pending
            state["updatedAt"] = now
            return (
                f"Cleared pending failed test command '{command_label}' "
                "after passing retest."
            )

    if is_edit and pending:
        for entry in pending:
            next_attempt = max(0, _as_int(entry.get("fixAttempts"), 0)) + 1
            entry["fixAttempts"] = next_attempt
            entry["lastFixAttemptAt"] = now
        state["pendingFailures"] = pending
        state["updatedAt"] = now
        max_attempt = max(max(0, _as_int(entry.get("fixAttempts"), 0)) for entry in pending)
        return (
            "Recorded fix attempt for all pending failed test commands; "
            f"highest attempt count is now {max_attempt}."
        )

    return "Hook skipped for non-completion event."


def _contains_checkpoint_terms(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in KEYWORDS)


def _contains_term(text: str, terms: tuple[str, ...]) -> bool:
    lower = text.lower()
    return any(re.search(rf"\b{re.escape(term)}\b", lower) for term in terms)


def _contains_command_evidence(text: str) -> bool:
    lower = text.lower()
    if "command:" in lower:
        return True
    return any(token in lower for token in COMMAND_EVIDENCE_TOKENS)


def _integrity_remediation_message(anomaly: dict[str, Any]) -> str:
    code = str(anomaly.get("code", "state-integrity-anomaly")).strip()
    detail = str(anomaly.get("detail", "state integrity issue detected")).strip()
    if not detail:
        detail = "state integrity issue detected"
    return (
        "Blocked completion: state integrity anomaly detected "
        f"({code}): {detail}. "
        "Remediation: inspect and repair .github/hooks/state/test_fix_state.json, "
        "preserve any real pending failed test commands, and retry completion."
    )


def main() -> int:
    payload, payload_anomaly = _read_payload()

    if payload_anomaly is not None or payload is None:
        result: dict[str, Any] = {
            "hook": "continual-learning-checkpoint",
            "allow": False,
            "status": "error",
            "message": (
                "Blocked completion checkpoint: invalid hook payload: "
                f"{payload_anomaly or 'unknown payload anomaly.'}"
            ),
            "tool": "",
        }
        print(json.dumps(result, ensure_ascii=True))
        return 2

    tool = _tool_name(payload)
    tool_lower = tool.lower()
    lifecycle_event_name = _lifecycle_event_name(payload)
    should_run_completion_gate = _should_run_completion_gate(
        payload, tool, lifecycle_event_name
    )
    # Compute completion intent first so unknown lifecycle labels cannot bypass
    # completion gating when task-complete tokens are present in payload data.
    if (
        lifecycle_event_name
        and not should_run_completion_gate
        and not (
            _is_pre_tool_use_event(lifecycle_event_name)
            or _is_post_tool_use_event(lifecycle_event_name)
            or _is_post_task_completion_event(lifecycle_event_name)
        )
    ):
        result: dict[str, Any] = {
            "hook": "continual-learning-checkpoint",
            "allow": True,
            "status": "ok",
            "message": "Hook skipped for irrelevant lifecycle event.",
            "tool": tool,
        }
        print(json.dumps(result, ensure_ascii=True))
        return 0

    summary = _summary_text(payload)
    is_pre_tool_use = _is_pre_tool_use_event(lifecycle_event_name)

    command_label = ""
    if is_pre_tool_use:
        command_label = _extract_command_label(payload, include_inferred=False)
        if not command_label:
            command_label = _extract_command_label(payload, include_inferred=True)
    exit_code = _extract_exit_code(payload)

    result: dict[str, Any] = {
        "hook": "continual-learning-checkpoint",
        "allow": True,
        "status": "ok",
        "message": "Hook skipped for non-completion event.",
        "tool": tool,
    }

    state = _load_test_fix_state()
    state_snapshot = json.dumps(state, ensure_ascii=True, sort_keys=True)

    if not should_run_completion_gate:
        gate_message = ""
        if is_pre_tool_use and _is_public_exposure_command(command_label, payload):
            gate_state = _public_exposure_gate_state(state)
            now = _utc_now_iso()
            _mark_public_exposure_pending(gate_state, command_label, now)
            gate_state["lastAttemptedCommand"] = command_label
            gate_state["updatedAt"] = now
            state["updatedAt"] = now
            secret_violation = _invalid_required_public_exposure_secret_reason(
                command_label, payload
            )

            violation_reason = ""
            if _violates_production_compose_requirement(command_label, payload):
                violation_reason = (
                    "public exposure must run only through docker compose with "
                    "docker-compose.prod.yml"
                )
            elif _uses_forbidden_localstack_profile(command_label, payload):
                violation_reason = (
                    "LocalStack/test object storage profiles are forbidden in "
                    "public production exposure"
                )
            elif secret_violation:
                violation_reason = secret_violation
            elif not _public_exposure_gate_is_open(gate_state):
                violation_reason = (
                    "no fresh verified Public Internet Exposure Gate state was found"
                )

            if violation_reason:
                gate_state["passed"] = False
                gate_state["lastBlockedAt"] = now
                gate_state["updatedAt"] = now
                state["updatedAt"] = now
                _save_state_if_changed(state, state_snapshot)

                result["allow"] = False
                result["status"] = "error"
                result["message"] = _public_exposure_block_message(
                    command_label, violation_reason
                )
                print(json.dumps(result, ensure_ascii=True))
                return 2

            _clear_public_exposure_pending(gate_state)
            gate_state["updatedAt"] = now
            state["updatedAt"] = now
            gate_message = (
                "Public Internet exposure gate check passed for command "
                f"'{command_label}'."
            )

        tracking_message = _track_test_failure_state(
            payload,
            tool_lower,
            state,
            command_label=command_label,
            exit_code=exit_code,
        )
        state_snapshot = _save_state_if_changed(state, state_snapshot)

        result["message"] = gate_message if gate_message else tracking_message
        print(json.dumps(result, ensure_ascii=True))
        return 0

    pending_failures = _pending_failures(state)
    integrity_anomaly = _integrity_anomaly(state)
    if integrity_anomaly is not None:
        result["allow"] = False
        result["status"] = "error"
        result["message"] = _integrity_remediation_message(integrity_anomaly)
        print(json.dumps(result, ensure_ascii=True))
        return 2

    if pending_failures:
        pending_labels = [
            str(entry.get("commandLabel", "unknown test command"))
            for entry in pending_failures
        ]
        max_attempts = max(
            max(0, _as_int(entry.get("fixAttempts"), 0)) for entry in pending_failures
        )

        result["allow"] = False
        result["status"] = "error"
        if max_attempts >= 3:
            result["message"] = (
                "Blocked task_complete: unresolved failed test command(s) "
                + ", ".join(f"'{label}'" for label in pending_labels)
                + " reached 3+ fix attempts without passing retest. "
                "Escalation to logic-debugger is required before completion."
            )
        elif all(max(0, _as_int(entry.get("fixAttempts"), 0)) == 0 for entry in pending_failures):
            result["message"] = (
                "Blocked task_complete: pending failed test command(s) "
                + ", ".join(f"'{label}'" for label in pending_labels)
                + " "
                "has no recorded fix attempt. Apply a fix and rerun the same "
                "test command/task until it exits 0."
            )
        else:
            result["message"] = (
                "Blocked task_complete: pending failed test command(s) "
                + ", ".join(f"'{label}'" for label in pending_labels)
                + " remain unresolved; a passing retest for each same command/task "
                "has not been observed yet."
            )
        print(json.dumps(result, ensure_ascii=True))
        return 2

    if not summary:
        result["allow"] = False
        result["status"] = "error"
        result["message"] = "task_complete summary missing."
        print(json.dumps(result, ensure_ascii=True))
        return 2

    public_exposure_gate_validated = False
    if _should_require_public_exposure_gate_summary(summary, state):
        is_valid, validation_message, evidence_map = _validate_public_exposure_gate_summary(
            summary
        )
        if not is_valid:
            result["allow"] = False
            result["status"] = "error"
            result["message"] = (
                "Blocked task_complete: public exposure verification summary failed: "
                + validation_message
            )
            print(json.dumps(result, ensure_ascii=True))
            return 2

        gate_state = _public_exposure_gate_state(state)
        now = _utc_now_iso()
        gate_state["passed"] = True
        _clear_public_exposure_pending(gate_state)
        gate_state["lastVerifiedAt"] = now
        gate_state["updatedAt"] = now
        gate_state["evidenceMap"] = evidence_map or {}
        state["updatedAt"] = now
        public_exposure_gate_validated = True

    observed_test_activity = bool(state.get("observedTestActivity"))
    should_require_test_evidence = observed_test_activity or _contains_term(
        summary, TEST_FAILURE_TRIGGER_TERMS
    )
    if should_require_test_evidence:
        missing_evidence: list[str] = []

        if not _contains_term(summary, FIX_EVIDENCE_TERMS):
            missing_evidence.append("fix evidence")
        if not _contains_term(summary, RETEST_EVIDENCE_TERMS):
            missing_evidence.append("retest evidence")
        if not _contains_term(summary, PASS_EVIDENCE_TERMS):
            missing_evidence.append("pass evidence")
        if not _contains_command_evidence(summary):
            missing_evidence.append("command evidence")

        if missing_evidence:
            result["allow"] = False
            result["status"] = "error"
            if observed_test_activity:
                result["message"] = (
                    "Summary is missing required test-work evidence categories after "
                    "observed test activity: "
                    + ", ".join(missing_evidence)
                    + "."
                )
            else:
                result["message"] = (
                    "Summary mentions test/failure context but is missing required evidence categories: "
                    + ", ".join(missing_evidence)
                    + "."
                )
            print(json.dumps(result, ensure_ascii=True))
            return 2

    if not _contains_checkpoint_terms(summary):
        result["allow"] = False
        result["status"] = "error"
        result["message"] = (
            "Summary must include at least one continual-learning term: "
            "lesson, learned, prevention, retrospective, runbook, checklist."
        )
        print(json.dumps(result, ensure_ascii=True))
        return 2

    state_snapshot = _save_state_if_changed(state, state_snapshot)

    if public_exposure_gate_validated:
        result["message"] = (
            "Continual-learning checkpoint passed with verified Public Internet "
            "Exposure Gate evidence map."
        )
    else:
        result["message"] = "Continual-learning checkpoint passed."
    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
