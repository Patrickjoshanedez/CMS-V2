---
description: Mandatory preflight requirements for orchestrator planning-stage safety checks.
applyTo: "**"
---

# Orchestrator Preflight Contract

Before planning begins, preflight must validate all of the following:

- Agents: required orchestrator agent set resolves and metadata loads.
- Instructions: instruction sources are present and `.github/instructions/` is non-empty.
- Skills: `.github/skills/*/SKILL.md` catalog exists and is readable.
- Hooks: `.github/hooks/copilot-runtime-hooks.json` and `.github/hooks/orchestrator-automation.json` parse and reference existing scripts.
- Tool Activation: required orchestrator core tools are declared and required MCP server registrations are present in `.vscode/mcp.json`.
- Serena Activation: `.serena/project.yml` exists and defines `project_name`, `base_modes`, and `default_modes` so orchestrator can activate Serena predictably at session start.
- Secret Hygiene: no hardcoded credentials in config files and no logging/report artifacts may contain raw environment variable values (tokens, API keys, secrets).
- Directories: `.github/agents`, `.github/instructions`, `.github/skills`, `.github/hooks`, `.github/hooks/scripts`, `.github/hooks/state` all exist.

If any preflight check fails, stop before planning and report the blocker with evidence.
