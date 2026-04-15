#!/usr/bin/env python3
"""Agent Prefetching Hook - Loads and validates all agent metadata.

This hook runs FIRST in PreToolUse to build an in-memory agent registry,
validate tool references, and output deterministic JSON for orchestrator
consumption. Fails closed if any agent is malformed.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import tempfile
import time
from datetime import datetime, timezone
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
AGENTS_DIR = WORKSPACE_ROOT / ".github" / "agents"
INSTRUCTIONS_DIR = WORKSPACE_ROOT / ".github" / "instructions"
SKILLS_DIR = WORKSPACE_ROOT / ".github" / "skills"
HOOKS_DIR = WORKSPACE_ROOT / ".github" / "hooks"
HOOKS_SCRIPTS_DIR = HOOKS_DIR / "scripts"
HOOKS_STATE_DIR = HOOKS_DIR / "state"
COPILOT_HOOKS_FILE = HOOKS_DIR / "copilot-runtime-hooks.json"
ORCHESTRATOR_HOOKS_FILE = HOOKS_DIR / "orchestrator-automation.json"
WORKSPACE_INSTRUCTIONS_FILE = WORKSPACE_ROOT / ".github" / "copilot-instructions.md"
ROOT_INSTRUCTIONS_FILE = WORKSPACE_ROOT / "copilot-instructions.md"
STATE_DIR = WORKSPACE_ROOT / ".github" / "hooks" / "state"
STATE_FILE = STATE_DIR / "agent_prefetch_registry.json"
VSCODE_DIR = WORKSPACE_ROOT / ".vscode"
MCP_CONFIG_FILE = VSCODE_DIR / "mcp.json"
ORCHESTRATOR_AGENT_FILE = AGENTS_DIR / "orchestrator.agent.md"
SERENA_PROJECT_FILE = WORKSPACE_ROOT / ".serena" / "project.yml"

REQUIRED_ORCHESTRATOR_TOOLS = {
    "vscode/askQuestions",
    "agent",
    "execute",
    "read",
    "edit",
    "search",
    "web",
    "todo",
}

REQUIRED_MCP_SERVERS = {
    "io.github.chromedevtools/chrome-devtools-mcp",
    "io.github.github/github-mcp-server",
    "io.github.upstash/context7",
    "microsoft/markitdown",
    "microsoft/playwright-mcp",
    "microsoftdocs/mcp",
    "oraios/serena",
}

INLINE_SECRET_PATTERNS = [
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"(?:api[_-]?key|token|secret)\s*=\s*(?!\$\{(?:input|env):)[^\s\"']+", re.IGNORECASE),
]

logging.basicConfig(
    level=logging.INFO,
    format="[agent_prefetch] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class AgentMetadata:
    """Represents parsed agent metadata."""
    name: str
    file: str
    description: str
    tools: list[str] = field(default_factory=list)
    argument_hint: str = ""
    validation_status: str = "valid"
    validation_errors: list[str] = field(default_factory=list)


def extract_yaml_frontmatter(content: str) -> dict[str, Any] | None:
    """Extract YAML frontmatter from markdown file."""
    match = re.match(r'^---\r?\n([\s\S]*?)\r?\n---', content)
    if not match:
        return None
    
    frontmatter_text = match.group(1)
    frontmatter = {}
    
    for line in frontmatter_text.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            # Handle quoted strings
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Handle arrays: [item1, item2, ...]
            if value.startswith('[') and value.endswith(']'):
                # Simple array parsing
                array_content = value[1:-1]
                items = []
                for item in array_content.split(','):
                    item = item.strip()
                    if item.startswith('"') and item.endswith('"'):
                        items.append(item[1:-1])
                    elif item.startswith("'") and item.endswith("'"):
                        items.append(item[1:-1])
                    else:
                        items.append(item)
                value = items
            
            frontmatter[key] = value
    
    return frontmatter if frontmatter else None


def parse_agent_file(agent_path: Path) -> AgentMetadata | None:
    """Parse agent .agent.md file and extract metadata."""
    try:
        content = agent_path.read_text(encoding='utf-8')
    except Exception as e:
        logger.error(f"Failed to read {agent_path}: {e}")
        return None
    
    frontmatter = extract_yaml_frontmatter(content)
    if not frontmatter:
        logger.error(f"No frontmatter found in {agent_path}")
        return None
    
    name = frontmatter.get('name', '').strip()
    if not name:
        logger.error(f"Missing 'name' field in {agent_path}")
        return None
    
    description = frontmatter.get('description', '').strip()
    argument_hint = frontmatter.get('argument-hint', '').strip()
    tools = frontmatter.get('tools', [])
    
    if not isinstance(tools, list):
        tools = [tools] if tools else []
    
    metadata = AgentMetadata(
        name=name,
        file=str(agent_path.relative_to(WORKSPACE_ROOT)),
        description=description,
        tools=tools,
        argument_hint=argument_hint,
    )
    
    return metadata


def normalize_tool_token(tool: str) -> str:
    """Normalize tool token for comparison."""
    return tool.strip().lower()


def validate_tool_references(agent: AgentMetadata, agent_tools_by_name: dict[str, list[str]]) -> tuple[bool, list[str]]:
    """Validate that all tools referenced in agent exist or are wildcards."""
    errors = []
    
    for tool in agent.tools:
        tool_norm = normalize_tool_token(tool)
        
        # Wildcard patterns are allowed
        if '*' in tool_norm or tool_norm.startswith('io.github.') or tool_norm.startswith('microsoft/'):
            continue
        
        # Check if it's a top-level tool (like 'read', 'execute', etc.)
        if '/' not in tool_norm and tool_norm not in ['agent', 'execute', 'read', 'edit', 'search', 'web', 'todo', 'browser/openBrowserPage', 'vscode/askQuestions', 'vscode.mermaid-chat-features/renderMermaidDiagram', 'ms-azuretools.vscode-containers/containerToolsConfig', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment']:
            # Allow unknown tools for now; they may be MCP or future tools
            pass
    
    return len(errors) == 0, errors


def load_all_agents() -> dict[str, AgentMetadata]:
    """Load all agent metadata from .github/agents/*.agent.md files."""
    if not AGENTS_DIR.exists():
        logger.error(f"Agents directory not found: {AGENTS_DIR}")
        sys.exit(1)
    
    agents = {}
    agent_files = sorted(AGENTS_DIR.glob('*.agent.md'))
    
    if not agent_files:
        logger.error(f"No agent files found in {AGENTS_DIR}")
        sys.exit(1)
    
    logger.info(f"Found {len(agent_files)} agent files")
    
    for agent_file in agent_files:
        metadata = parse_agent_file(agent_file)
        if metadata:
            agents[metadata.name] = metadata
            logger.info(f"Loaded agent: {metadata.name}")
        else:
            logger.warning(f"Failed to parse {agent_file}")
            sys.exit(1)
    
    return agents


def validate_agents(agents: dict[str, AgentMetadata]) -> bool:
    """Validate agent metadata integrity."""
    all_valid = True
    
    # Check required agents
    required_agents = {
        'context-manager',
        'researcher',
        'Thinker pro',
        'product-design-handoff',
        'coder',
        'logic-debugger',
        'test-automation',
        '100x Code Reviewer',
    }
    
    found_agents = set(agents.keys())
    missing = required_agents - found_agents
    extra = found_agents - required_agents
    
    if missing:
        logger.warning(f"Missing required agents: {missing}")
        all_valid = False
    
    if extra:
        logger.info(f"Found extra agents: {extra}")
    
    # Validate each agent
    for name, agent in agents.items():
        if not agent.name:
            logger.error(f"Agent {name} has empty name")
            agent.validation_status = "invalid"
            agent.validation_errors.append("Empty name field")
            all_valid = False
        
        if not agent.description:
            logger.warning(f"Agent {name} has empty description")
            agent.validation_errors.append("Empty description field")
        
        if not agent.tools:
            logger.warning(f"Agent {name} has no tools")
            agent.validation_errors.append("No tools defined")
        
        # Validate tool references
        valid, errors = validate_tool_references(agent, {})
        if not valid:
            agent.validation_status = "invalid"
            agent.validation_errors.extend(errors)
            all_valid = False
    
    return all_valid


def _load_json_file(path: Path) -> dict[str, Any] | None:
    """Load a JSON file and return parsed object or None if invalid."""
    try:
        content = path.read_text(encoding='utf-8')
        return json.loads(content)
    except Exception as exc:
        logger.error(f"Failed to parse JSON file {path}: {exc}")
        return None


def _extract_hook_commands(hooks_config: dict[str, Any]) -> list[str]:
    """Extract command script paths from hook configuration."""
    commands: list[str] = []
    hooks = hooks_config.get("hooks", {})
    if not isinstance(hooks, dict):
        return commands

    for lifecycle in ("PreToolUse", "PostToolUse"):
        entries = hooks.get(lifecycle, [])
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            for key in ("script", "command", "windows", "linux", "osx"):
                raw = entry.get(key)
                if isinstance(raw, str) and raw.strip():
                    commands.append(raw.strip())
    return commands


def _extract_hook_ids(hooks_config: dict[str, Any]) -> set[str]:
    """Extract hook IDs across PreToolUse and PostToolUse."""
    ids: set[str] = set()
    hooks = hooks_config.get("hooks", {})
    if not isinstance(hooks, dict):
        return ids

    for lifecycle in ("PreToolUse", "PostToolUse"):
        entries = hooks.get(lifecycle, [])
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            hook_id = entry.get("id")
            if isinstance(hook_id, str) and hook_id.strip():
                ids.add(hook_id.strip())
    return ids


def _extract_python_script_paths(commands: list[str]) -> list[Path]:
    """Extract referenced python script paths from hook commands."""
    script_paths: list[Path] = []
    for cmd in commands:
        match = re.search(r"(\.github/hooks/scripts/[\w.-]+\.py)", cmd)
        if not match:
            continue
        rel = match.group(1)
        script_paths.append(WORKSPACE_ROOT / rel)
    return script_paths


def _normalize_tokens(values: list[str] | set[str]) -> set[str]:
    """Normalize token list/set for case-insensitive comparisons."""
    return {
        normalize_tool_token(value)
        for value in values
        if isinstance(value, str) and value.strip()
    }


def _extract_yaml_list_values(content: str, key: str) -> list[str]:
    """Extract top-level YAML list values for a given key with a lightweight parser."""
    lines = content.splitlines()
    key_index = -1

    for i, line in enumerate(lines):
        if line.strip() == f"{key}:":
            key_index = i
            break

    if key_index == -1:
        return []

    values: list[str] = []
    for line in lines[key_index + 1:]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            value = stripped[2:].strip().strip('"').strip("'")
            if value:
                values.append(value)
            continue
        break

    return values


def _contains_inline_secret(value: str) -> bool:
    """Detect likely inline secrets in config strings."""
    if not value:
        return False
    for pattern in INLINE_SECRET_PATTERNS:
        if pattern.search(value):
            return True
    return False


def validate_preflight_surface() -> tuple[bool, dict[str, Any]]:
    """Validate preflight dependencies: agents, instructions, skills, hooks, directories."""
    checks: dict[str, Any] = {
        "directories": {
            "required": [
                str(AGENTS_DIR.relative_to(WORKSPACE_ROOT)),
                str(INSTRUCTIONS_DIR.relative_to(WORKSPACE_ROOT)),
                str(SKILLS_DIR.relative_to(WORKSPACE_ROOT)),
                str(HOOKS_DIR.relative_to(WORKSPACE_ROOT)),
                str(HOOKS_SCRIPTS_DIR.relative_to(WORKSPACE_ROOT)),
                str(HOOKS_STATE_DIR.relative_to(WORKSPACE_ROOT)),
            ],
            "missing": [],
        },
        "instructions": {
            "workspace_instruction_present": WORKSPACE_INSTRUCTIONS_FILE.exists(),
            "root_instruction_present": ROOT_INSTRUCTIONS_FILE.exists(),
            "instructions_dir_entries": 0,
        },
        "skills": {
            "skill_directories": 0,
            "skill_md_files": 0,
        },
        "hooks": {
            "copilot_hooks_present": COPILOT_HOOKS_FILE.exists(),
            "orchestrator_hooks_present": ORCHESTRATOR_HOOKS_FILE.exists(),
            "missing_hook_scripts": [],
        },
        "tool_activation": {
            "orchestrator_agent_present": ORCHESTRATOR_AGENT_FILE.exists(),
            "required_orchestrator_tools": sorted(REQUIRED_ORCHESTRATOR_TOOLS),
            "missing_orchestrator_tools": [],
            "mcp_registry_present": MCP_CONFIG_FILE.exists(),
            "mcp_registry_parse_ok": False,
            "required_mcp_servers": sorted(REQUIRED_MCP_SERVERS),
            "missing_mcp_servers": [],
        },
        "serena_activation": {
            "project_file_present": SERENA_PROJECT_FILE.exists(),
            "project_name_present": False,
            "base_modes": [],
            "default_modes": [],
        },
        "errors": [],
        "warnings": [],
    }

    # Required directory validation (fail-closed)
    required_dirs = [
        AGENTS_DIR,
        INSTRUCTIONS_DIR,
        SKILLS_DIR,
        HOOKS_DIR,
        HOOKS_SCRIPTS_DIR,
        HOOKS_STATE_DIR,
    ]
    for required_dir in required_dirs:
        if not required_dir.exists() or not required_dir.is_dir():
            checks["directories"]["missing"].append(str(required_dir.relative_to(WORKSPACE_ROOT)))

    if checks["directories"]["missing"]:
        checks["errors"].append(
            f"Missing required directories: {checks['directories']['missing']}"
        )

    # Instructions validation (must have at least one workspace/root instruction source)
    if INSTRUCTIONS_DIR.exists() and INSTRUCTIONS_DIR.is_dir():
        entries = [p for p in INSTRUCTIONS_DIR.iterdir() if p.is_file()]
        checks["instructions"]["instructions_dir_entries"] = len(entries)

    if not checks["instructions"]["workspace_instruction_present"] and not checks["instructions"]["root_instruction_present"]:
        checks["errors"].append(
            "No copilot instruction file found (expected .github/copilot-instructions.md or copilot-instructions.md)"
        )
    if checks["instructions"]["instructions_dir_entries"] == 0:
        checks["errors"].append("No instruction files found in .github/instructions/")

    # Skills validation (must contain at least one SKILL.md)
    if SKILLS_DIR.exists() and SKILLS_DIR.is_dir():
        skill_dirs = [p for p in SKILLS_DIR.iterdir() if p.is_dir()]
        checks["skills"]["skill_directories"] = len(skill_dirs)
        skill_md_files = list(SKILLS_DIR.glob("*/SKILL.md"))
        checks["skills"]["skill_md_files"] = len(skill_md_files)

    if checks["skills"]["skill_md_files"] == 0:
        checks["errors"].append("No skill definitions found under .github/skills/*/SKILL.md")

    # Hook registry + referenced script validation
    if not checks["hooks"]["copilot_hooks_present"]:
        checks["errors"].append("Missing hook registry: .github/hooks/copilot-runtime-hooks.json")
    if not checks["hooks"]["orchestrator_hooks_present"]:
        checks["warnings"].append("Missing orchestrator hook registry: .github/hooks/orchestrator-automation.json")

    for hooks_file in [COPILOT_HOOKS_FILE, ORCHESTRATOR_HOOKS_FILE]:
        if not hooks_file.exists():
            continue
        parsed = _load_json_file(hooks_file)
        if parsed is None:
            checks["errors"].append(f"Invalid JSON in hook registry: {hooks_file.relative_to(WORKSPACE_ROOT)}")
            continue

        commands = _extract_hook_commands(parsed)
        script_paths = _extract_python_script_paths(commands)
        for script_path in script_paths:
            if not script_path.exists() or not script_path.is_file():
                missing = str(script_path.relative_to(WORKSPACE_ROOT))
                checks["hooks"]["missing_hook_scripts"].append(missing)

    if checks["hooks"]["missing_hook_scripts"]:
        checks["errors"].append(
            f"Hook registry references missing scripts: {checks['hooks']['missing_hook_scripts']}"
        )

    # Critical hook parity guard: active runtime hooks must include core preflight IDs.
    critical_preflight_ids = {"agent-prefetch", "agent-sync-verify", "decision-coherence"}
    copilot_cfg = _load_json_file(COPILOT_HOOKS_FILE) if COPILOT_HOOKS_FILE.exists() else None
    orch_cfg = _load_json_file(ORCHESTRATOR_HOOKS_FILE) if ORCHESTRATOR_HOOKS_FILE.exists() else None

    if copilot_cfg and orch_cfg:
        copilot_ids = _extract_hook_ids(copilot_cfg)
        orch_ids = _extract_hook_ids(orch_cfg)

        missing_in_copilot = sorted(list(critical_preflight_ids - copilot_ids))
        missing_in_orchestrator = sorted(list(critical_preflight_ids - orch_ids))
        if missing_in_copilot:
            checks["errors"].append(
                f"copilot-runtime-hooks.json missing critical preflight hook IDs: {missing_in_copilot}"
            )
        if missing_in_orchestrator:
            checks["errors"].append(
                f"orchestrator-automation.json missing critical preflight hook IDs: {missing_in_orchestrator}"
            )

    # Tool activation guard: verify orchestrator has required core tool tokens
    # and required MCP servers are registered in .vscode/mcp.json.
    if not checks["tool_activation"]["orchestrator_agent_present"]:
        checks["errors"].append(
            "Tool activation preflight failed: missing orchestrator agent manifest (.github/agents/orchestrator.agent.md)"
        )
    else:
        orchestrator_meta = parse_agent_file(ORCHESTRATOR_AGENT_FILE)
        if orchestrator_meta is None:
            checks["errors"].append(
                "Tool activation preflight failed: unable to parse .github/agents/orchestrator.agent.md"
            )
        else:
            active_tools = _normalize_tokens(orchestrator_meta.tools)
            missing_tools = sorted(
                [
                    token
                    for token in REQUIRED_ORCHESTRATOR_TOOLS
                    if normalize_tool_token(token) not in active_tools
                ]
            )
            checks["tool_activation"]["missing_orchestrator_tools"] = missing_tools
            if missing_tools:
                checks["errors"].append(
                    "Tool activation preflight failed: orchestrator tools missing required tokens: "
                    f"{missing_tools}"
                )

    if not checks["tool_activation"]["mcp_registry_present"]:
        checks["errors"].append(
            "Tool activation preflight failed: missing MCP registry (.vscode/mcp.json)"
        )
    else:
        mcp_cfg = _load_json_file(MCP_CONFIG_FILE)
        if mcp_cfg is None:
            checks["errors"].append(
                "Tool activation preflight failed: invalid JSON in .vscode/mcp.json"
            )
        else:
            checks["tool_activation"]["mcp_registry_parse_ok"] = True
            servers = mcp_cfg.get("servers")
            if not isinstance(servers, dict):
                checks["errors"].append(
                    "Tool activation preflight failed: .vscode/mcp.json missing object field 'servers'"
                )
            else:
                active_servers = _normalize_tokens(list(servers.keys()))
                missing_servers = sorted(
                    [
                        server
                        for server in REQUIRED_MCP_SERVERS
                        if normalize_tool_token(server) not in active_servers
                    ]
                )
                checks["tool_activation"]["missing_mcp_servers"] = missing_servers
                if missing_servers:
                    checks["errors"].append(
                        "Tool activation preflight failed: missing required MCP server registrations: "
                        f"{missing_servers}"
                    )

                # Secret hygiene: block inline secrets in MCP server definitions.
                for server_name, server_cfg in servers.items():
                    if not isinstance(server_cfg, dict):
                        continue
                    args = server_cfg.get("args", [])
                    env = server_cfg.get("env", {})

                    if isinstance(args, list):
                        for arg in args:
                            if isinstance(arg, str) and _contains_inline_secret(arg):
                                checks["errors"].append(
                                    "Tool activation preflight failed: inline credential detected in "
                                    f".vscode/mcp.json server '{server_name}' args"
                                )

                    if isinstance(env, dict):
                        for env_value in env.values():
                            if isinstance(env_value, str) and _contains_inline_secret(env_value):
                                checks["errors"].append(
                                    "Tool activation preflight failed: inline credential detected in "
                                    f".vscode/mcp.json server '{server_name}' env"
                                )

    # Serena activation readiness guard
    if not checks["serena_activation"]["project_file_present"]:
        checks["errors"].append(
            "Serena activation preflight failed: missing .serena/project.yml"
        )
    else:
        try:
            serena_project = SERENA_PROJECT_FILE.read_text(encoding="utf-8")
        except Exception as exc:
            checks["errors"].append(
                f"Serena activation preflight failed: unable to read .serena/project.yml ({exc})"
            )
            serena_project = ""

        if serena_project:
            project_name_match = re.search(r"^project_name\s*:\s*.+$", serena_project, re.MULTILINE)
            checks["serena_activation"]["project_name_present"] = project_name_match is not None

            base_modes = _extract_yaml_list_values(serena_project, "base_modes")
            default_modes = _extract_yaml_list_values(serena_project, "default_modes")
            checks["serena_activation"]["base_modes"] = base_modes
            checks["serena_activation"]["default_modes"] = default_modes

            if not checks["serena_activation"]["project_name_present"]:
                checks["errors"].append(
                    "Serena activation preflight failed: .serena/project.yml must define project_name"
                )
            if not base_modes:
                checks["errors"].append(
                    "Serena activation preflight failed: .serena/project.yml must define non-empty base_modes"
                )
            if not default_modes:
                checks["errors"].append(
                    "Serena activation preflight failed: .serena/project.yml must define non-empty default_modes"
                )

    is_valid = len(checks["errors"]) == 0
    return is_valid, checks


def write_json_atomically(target_path: Path, payload: dict[str, Any]) -> None:
    """Write JSON safely with retries for transient Windows file locks."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload_text = json.dumps(payload, indent=2)

    last_error: Exception | None = None
    for attempt in range(6):
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w',
                encoding='utf-8',
                delete=False,
                dir=target_path.parent,
                suffix='.tmp',
            ) as temp_file:
                temp_file.write(payload_text)
                temp_file.flush()
                os.fsync(temp_file.fileno())
                temp_path = Path(temp_file.name)

            os.replace(temp_path, target_path)
            return
        except PermissionError as exc:
            last_error = exc
            # Best effort: clear readonly flag if set, then retry with backoff.
            try:
                if target_path.exists():
                    os.chmod(target_path, 0o666)
            except OSError:
                pass
            time.sleep(0.05 * (2 ** attempt))
        finally:
            if temp_path and temp_path.exists() and temp_path != target_path:
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to atomically write {target_path}")


def build_registry(agents: dict[str, AgentMetadata]) -> dict[str, Any]:
    """Build agent registry for orchestrator consumption."""
    registry = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "agent_count": len(agents),
        "agents": {},
        "validation_summary": {
            "total": len(agents),
            "valid": 0,
            "invalid": 0,
            "missing_required": [],
        }
    }
    
    for name, agent in agents.items():
        registry["agents"][name] = {
            "name": agent.name,
            "file": agent.file,
            "description": agent.description,
            "tools": agent.tools,
            "argument_hint": agent.argument_hint,
            "validation_status": agent.validation_status,
            "validation_errors": agent.validation_errors,
        }
        
        if agent.validation_status == "valid":
            registry["validation_summary"]["valid"] += 1
        else:
            registry["validation_summary"]["invalid"] += 1
    
    # Check for required agents
    required_agents = {
        'context-manager',
        'researcher',
        'Thinker pro',
        'product-design-handoff',
        'coder',
        'logic-debugger',
        'test-automation',
        '100x Code Reviewer',
    }
    
    found_agents = set(agents.keys())
    missing = required_agents - found_agents
    if missing:
        registry["validation_summary"]["missing_required"] = list(missing)
    
    return registry


def main():
    """Main entry point."""
    try:
        logger.info("Starting agent prefetch...")
        
        # Load all agents
        agents = load_all_agents()
        logger.info(f"Loaded {len(agents)} agents")
        
        # Validate agents
        all_valid = validate_agents(agents)

        # Validate non-agent preflight dependencies (instructions, skills, hooks, directories)
        surface_valid, preflight_surface = validate_preflight_surface()
        
        # Build registry
        registry = build_registry(agents)
        registry["preflight_surface"] = preflight_surface
        
        # Ensure state directory exists
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write registry to state file atomically
        write_json_atomically(STATE_FILE, registry)
        
        logger.info(f"Agent registry written to {STATE_FILE}")
        logger.info(f"Agent prefetch complete: {registry['validation_summary']['valid']} valid agents")
        
        if (
            not all_valid
            or registry["validation_summary"]["invalid"] > 0
            or not surface_valid
        ):
            logger.error(f"Agent validation failed: {registry['validation_summary']['invalid']} invalid agents")
            if registry["validation_summary"]["missing_required"]:
                logger.error(f"Missing required agents: {registry['validation_summary']['missing_required']}")
            if preflight_surface.get("errors"):
                logger.error(f"Preflight surface errors: {preflight_surface['errors']}")
            sys.exit(1)
        
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Prefetch failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
