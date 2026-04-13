#!/usr/bin/env python3
"""PreToolUse static gatekeeper for targeted lint/type checks.

This hook is intentionally fail-closed for syntax/lint/type failures on files that
are about to be mutated. It is optimized for targeted checks, not full-repo scans.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]

MUTATION_TOOL_TOKENS = (
    "apply_patch",
    "create_file",
    "edit_notebook_file",
    "editfiles",
    "edit_file",
    "rename",
    "vscode_renamesymbol",
)

CODE_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py"}
ESLINT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}
TS_EXTS = {".ts", ".tsx"}

ARCHIVE_ONLY_UI_TARGET = "client/src/pages/projects/CreateProjectPage.jsx"
ARCHIVE_ONLY_FORBIDDEN_ADDITIONS = (
    "proposal-pdf-autofill",
    "Import From PDF (Similarity Helper)",
    "extractPdfMetadata(",
)


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _as_dict(value: Any) -> dict[str, Any] | None:
    return value if isinstance(value, dict) else None


def _iter_nodes(value: Any):
    if isinstance(value, dict):
        for key, item in value.items():
            yield key, item
            yield from _iter_nodes(item)
    elif isinstance(value, list):
        for item in value:
            yield None, item
            yield from _iter_nodes(item)


def _read_payload() -> tuple[dict[str, Any] | None, str | None]:
    raw = sys.stdin.read().strip()
    if not raw:
        return None, "stdin payload is empty"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"stdin payload is not valid JSON: {exc.msg}"
    if not isinstance(data, dict):
        return None, f"stdin root must be object, got {type(data).__name__}"
    return data, None


def _first_string(value: Any) -> str:
    if isinstance(value, str):
        text = value.strip()
        return text if text else ""
    if isinstance(value, list):
        parts = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return " ".join(parts)
    return ""


def _tool_name(payload: dict[str, Any]) -> str:
    candidates = []
    candidates.append(_first_string(payload.get("tool")))
    candidates.append(_first_string(payload.get("toolName")))

    event = _as_dict(payload.get("event"))
    if event:
        candidates.append(_first_string(event.get("tool")))
        candidates.append(_first_string(event.get("toolName")))

    args = _as_dict(payload.get("arguments"))
    if args:
        candidates.append(_first_string(args.get("tool")))
        candidates.append(_first_string(args.get("toolName")))

    for _, value in _iter_nodes(payload):
        if isinstance(value, str) and value.strip():
            normalized = _normalize(value)
            if normalized in {"applypatch", "createfile", "editnotebookfile", "runinterminal"}:
                candidates.append(value.strip())

    for candidate in candidates:
        if candidate:
            return candidate
    return ""


def _event_name(payload: dict[str, Any]) -> str:
    for key in ("eventName", "lifecycleEvent", "hookEvent", "event"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    event = _as_dict(payload.get("event"))
    if event:
        for key in ("eventName", "lifecycleEvent", "hookEvent", "name"):
            value = event.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def _is_pretool_event(payload: dict[str, Any]) -> bool:
    event_name = _event_name(payload)
    if not event_name:
        # Registered as PreToolUse in config; default to true when lifecycle token is absent.
        return True
    return _normalize(event_name) == "pretooluse"


def _is_mutation_tool(tool: str) -> bool:
    lowered = tool.lower()
    normalized = _normalize(tool)
    return any(token in lowered or _normalize(token) in normalized for token in MUTATION_TOOL_TOKENS)


def _extract_patch_paths(text: str) -> list[str]:
    paths: list[str] = []
    for match in re.finditer(r"^\*\*\*\s+(?:Update|Add|Delete)\s+File:\s+(.+?)\s*$", text, flags=re.MULTILINE):
        paths.append(match.group(1).strip())
    return paths


def _extract_patch_texts(payload: dict[str, Any]) -> list[str]:
    patches: list[str] = []
    for _, value in _iter_nodes(payload):
        if isinstance(value, str) and "*** Begin Patch" in value:
            patches.append(value)
    return patches


def _normalize_rel(path_text: str) -> str:
    resolved = _resolve_path(path_text)
    if resolved is None:
        return ""
    return resolved.relative_to(WORKSPACE_ROOT).as_posix()


def _archive_scope_policy_violation(payload: dict[str, Any]) -> str | None:
    patch_texts = _extract_patch_texts(payload)
    if not patch_texts:
        return None

    for patch in patch_texts:
        current_file = ""
        for raw_line in patch.splitlines():
            line = raw_line.rstrip("\n")

            if line.startswith("*** Update File:"):
                current_file = _normalize_rel(line.split(":", 1)[1].strip())
                continue

            if not current_file:
                continue

            # Guard only additions, never removals.
            if line.startswith("+") and not line.startswith("+++"):
                if current_file == ARCHIVE_ONLY_UI_TARGET and any(
                    token in line for token in ARCHIVE_ONLY_FORBIDDEN_ADDITIONS
                ):
                    return (
                        "Denied by archive scope policy: PDF metadata autofill UI is archive-only and "
                        "must not be added to client/src/pages/projects/CreateProjectPage.jsx. "
                        "Use client/src/pages/archive/ExistingCapstoneUploadPage.jsx instead."
                    )

    return None


def _resolve_path(path_text: str) -> Path | None:
    candidate = path_text.strip().strip("\"'")
    if not candidate:
        return None
    if " -> " in candidate:
        candidate = candidate.split(" -> ", 1)[0].strip()

    p = Path(candidate)
    if not p.is_absolute():
        p = WORKSPACE_ROOT / p

    try:
        p = p.resolve()
    except OSError:
        return None

    try:
        p.relative_to(WORKSPACE_ROOT)
    except ValueError:
        return None

    return p


def _extract_target_paths(payload: dict[str, Any]) -> list[Path]:
    raw_paths: set[str] = set()
    keys = {"filePath", "filepath", "path", "targetPath", "oldPath", "newPath"}

    for key, value in _iter_nodes(payload):
        if isinstance(key, str) and key in keys and isinstance(value, str) and value.strip():
            raw_paths.add(value.strip())

        if isinstance(key, str) and key in {"filePaths", "paths"} and isinstance(value, list):
            for item in value:
                if isinstance(item, str) and item.strip():
                    raw_paths.add(item.strip())

        if isinstance(value, str) and "*** Update File:" in value:
            for patch_path in _extract_patch_paths(value):
                raw_paths.add(patch_path)

    resolved: list[Path] = []
    seen: set[str] = set()
    for item in raw_paths:
        path_obj = _resolve_path(item)
        if path_obj is None:
            continue
        key = os.path.normcase(str(path_obj))
        if key in seen:
            continue
        seen.add(key)
        resolved.append(path_obj)

    return resolved


def _run_command(command: list[str], cwd: Path, timeout: int = 60) -> tuple[int, str]:
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        output = (completed.stdout or "") + ("\n" + completed.stderr if completed.stderr else "")
        return completed.returncode, output.strip()
    except FileNotFoundError as exc:
        return 127, str(exc)
    except subprocess.TimeoutExpired:
        return 124, "command timed out"


def _trim_output(text: str, limit: int = 800) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= limit:
        return normalized
    return normalized[:limit] + " ..."


def _target_rel_paths(paths: list[Path], exts: set[str]) -> list[str]:
    rel_paths: list[str] = []
    for path in paths:
        if not path.exists() or not path.is_file():
            continue
        if path.suffix.lower() not in exts:
            continue
        rel_paths.append(path.relative_to(WORKSPACE_ROOT).as_posix())
    return rel_paths


def _run_eslint(paths: list[str]) -> tuple[bool, str]:
    if not paths:
        return True, "eslint skipped: no JS/TS targets"

    package_json = WORKSPACE_ROOT / "package.json"
    if not package_json.exists():
        return True, "eslint skipped: workspace package.json missing"

    code, output = _run_command(
        ["npm", "run", "lint", "--", "--no-error-on-unmatched-pattern", *paths],
        WORKSPACE_ROOT,
        timeout=90,
    )

    if code == 0:
        return True, f"eslint passed for {len(paths)} file(s)"

    return False, f"eslint failed: {_trim_output(output)}"


def _has_typescript_runner(project_dir: Path) -> bool:
    candidates = [
        project_dir / "node_modules" / ".bin" / "tsc",
        project_dir / "node_modules" / ".bin" / "tsc.cmd",
        WORKSPACE_ROOT / "node_modules" / ".bin" / "tsc",
        WORKSPACE_ROOT / "node_modules" / ".bin" / "tsc.cmd",
    ]
    return any(path.exists() for path in candidates)


def _run_typescript_checks(ts_paths: list[str]) -> tuple[bool, str]:
    if not ts_paths:
        return True, "typecheck skipped: no TS targets"

    has_client_targets = any(path.startswith("client/") for path in ts_paths)
    if not has_client_targets:
        return True, "typecheck skipped: no client TS targets"

    client_dir = WORKSPACE_ROOT / "client"
    if not (client_dir / "tsconfig.json").exists():
        return True, "typecheck skipped: client/tsconfig.json missing"

    if not _has_typescript_runner(client_dir):
        return True, "typecheck skipped: tsc not available in node_modules"

    code, output = _run_command(
        ["npm", "--prefix", "client", "exec", "--", "tsc", "--noEmit", "-p", "tsconfig.json"],
        WORKSPACE_ROOT,
        timeout=120,
    )

    if code == 0:
        return True, "typecheck passed (client/tsconfig.json)"

    lower_output = output.lower()
    if "could not determine executable" in lower_output or "not recognized" in lower_output:
        return True, "typecheck skipped: tsc executable unavailable"

    return False, f"typecheck failed: {_trim_output(output)}"


def _run_python_syntax_checks(py_paths: list[str]) -> tuple[bool, str]:
    if not py_paths:
        return True, "python syntax check skipped: no Python targets"

    for rel_path in py_paths:
        code, output = _run_command([sys.executable, "-m", "py_compile", rel_path], WORKSPACE_ROOT, 45)
        if code != 0:
            return False, f"python syntax check failed for {rel_path}: {_trim_output(output)}"

    return True, f"python syntax check passed for {len(py_paths)} file(s)"


def _result(decision: str, reason: str, tool: str) -> dict[str, Any]:
    allow = decision == "allow"
    return {
        "hook": "static-gatekeeper",
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
        print(json.dumps(_result("allow", "Static gatekeeper skipped for non-PreToolUse event.", ""), ensure_ascii=True))
        return 0

    tool = _tool_name(payload)
    if not _is_mutation_tool(tool):
        print(json.dumps(_result("allow", "Static gatekeeper skipped: tool is not a code-mutation tool.", tool), ensure_ascii=True))
        return 0

    scope_violation = _archive_scope_policy_violation(payload)
    if scope_violation:
        print(json.dumps(_result("deny", scope_violation, tool), ensure_ascii=True))
        return 2

    target_paths = _extract_target_paths(payload)
    code_targets = [path for path in target_paths if path.suffix.lower() in CODE_EXTS]
    if not code_targets:
        print(json.dumps(_result("allow", "Static gatekeeper skipped: no code files detected in payload.", tool), ensure_ascii=True))
        return 0

    eslint_targets = _target_rel_paths(code_targets, ESLINT_EXTS)
    ts_targets = [path for path in eslint_targets if Path(path).suffix.lower() in TS_EXTS]
    py_targets = _target_rel_paths(code_targets, {".py"})

    lint_ok, lint_msg = _run_eslint(eslint_targets)
    if not lint_ok:
        print(json.dumps(_result("deny", lint_msg, tool), ensure_ascii=True))
        return 2

    type_ok, type_msg = _run_typescript_checks(ts_targets)
    if not type_ok:
        print(json.dumps(_result("deny", type_msg, tool), ensure_ascii=True))
        return 2

    py_ok, py_msg = _run_python_syntax_checks(py_targets)
    if not py_ok:
        print(json.dumps(_result("deny", py_msg, tool), ensure_ascii=True))
        return 2

    summary = f"{lint_msg}; {type_msg}; {py_msg}."
    print(json.dumps(_result("allow", summary, tool), ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
