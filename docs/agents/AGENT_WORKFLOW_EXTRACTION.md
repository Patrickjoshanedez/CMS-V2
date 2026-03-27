# Agent Workflow Extraction Guide

**Version:** 1.0.0  
**Date:** March 26, 2026  
**Created by:** Patrick Josh Añedez

---

## 📋 Overview

Agent Workflow Extraction ensures that when you install the Orchestrator framework in a new workspace, all **agent instructions, agent definitions, and skills** are properly copied to the right locations in your target workspace.

This allows new workspaces to immediately access:
- ✅ Agent instructions (`.github/instructions/`)
- ✅ Agent definitions (`.github/agents/`)
- ✅ Skills library (`.github/skills/`)

---

## 🎯 Key Features

### Automated Extraction
When you run the CLI installer with agent workflow extraction enabled, it automatically:
1. Creates `.github/` subdirectories
2. Copies agent instructions from source to target
3. Copies agent definitions from source to target
4. Copies skills from source to target
5. Validates all files are in correct locations

### Installation Methods

#### **Method 1: npm CLI (Recommended)**

```bash
npx @anedezorchestrator/orchestrator-essentials-setup init \
  --target ~/my-project \
  --mode copy \
  --python \
  --extract-agents
```

The `--extract-agents` flag automatically handles workflow extraction.

#### **Method 2: Python Install Script**

```bash
python scripts/install.py \
  --target ~/my-project \
  --mode copy \
  --extract-agents \
  --force
```

#### **Method 3: PowerShell**

```powershell
./scripts/install.ps1 \
  -Target "C:\path\to\target" \
  -Mode copy \
  -ExtractAgents \
  -Force
```

---

## 📂 Directory Structure After Extraction

```
your-workspace/
├── .github/
│   ├── instructions/
│   │   ├── context-manager.instructions.md
│   │   ├── logic-debugger.instructions.md
│   │   ├── orchestrator.instructions.md
│   │   ├── python-agents.instructions.md
│   │   ├── socrates-vibecoding.instructions.md
│   │   └── ...
│   ├── agents/
│   │   ├── coder.agent.md
│   │   ├── orchestrator.agent.md
│   │   ├── context-manager.agent.md
│   │   └── ...
│   ├── skills/
│   │   ├── python/
│   │   ├── refactor/
│   │   └── ...
│   └── workflows/
├── src/
├── tests/
└── scripts/
```

---

## 🔧 Configuration

### CLI Installer Options

```bash
orchestrator-essentials-setup init [targetPath] [options]

Options:
  --extract-agents              Extract agent workflows (default: false)
  --extract-skills              Extract skills library (default: false)
  --extract-instructions        Extract instruction files (default: false)
  --no-extract                  Skip all workflow extraction
  --force                        Overwrite existing files
```

### Python Script Options

```bash
python scripts/install.py [options]

Options:
  --extract-agents             Extract .github files
  --force                       Overwrite destination
```

---

## 📝 What Gets Extracted

### Instructions (`.github/instructions/`)
- Agent behavior specifications
- Framework guidelines
- Operational protocols
- System prompts

**Files:**
- `context-manager.instructions.md`
- `orchestrator.instructions.md`
- `logic-debugger.instructions.md`
- `python-agents.instructions.md`
- `laravel-saas.instructions.md`
- `frontend-specialist.instructions.md`
- `socrates-vibecoding.instructions.md`

### Agents (`.github/agents/`)
- Agent definitions and configurations
- Agent-specific workflows
- Role specifications

**Files:**
- `orchestrator.agent.md`
- `coder.agent.md`
- `context-manager.agent.md`
- `logic-debugger.agent.md`
- `reviewer.agent.md`
- `researcher.agent.md`
- `project-manager.agent.md`

### Skills (`.github/skills/`)
- Reusable capability modules
- Domain-specific toolkits
- Pattern libraries

**Directories:**
- `python/` - Python development patterns
- `refactor/` - Code refactoring skills
- `mermaid-diagrams/` - Diagram generation
- `... [Many more]`

---

## ✅ Verification After Extraction

After installation, verify agent workflows are in place:

```bash
# Check if all directories exist
ls -la .github/instructions/
ls -la .github/agents/
ls -la .github/skills/

# Count extracted files
find .github/instructions -type f | wc -l
find .github/agents -type f | wc -l
find .github/skills -type f | wc -l
```

Expected output:
```
✅ .github/instructions/ → 7 .md files
✅ .github/agents/ → 7 .md files
✅ .github/skills/ → 20+ directories
```

---

## 🔄 Update Workflows

When Orchestrator updates are released, you can re-extract workflows:

```bash
# Re-extract with force flag
orchestrator-essentials-setup init . \
  --extract-agents \
  --force

# Or manually
python scripts/install.py \
  --target . \
  --extract-agents \
  --force
```

---

## ⚠️ Troubleshooting

### "Agent workflows not found"
- Verify Orchestrator source has `.github/` directory
- Check file permissions
- Ensure source path is correct

### "Permission denied" on macOS/Linux
```bash
sudo orchestrator-essentials-setup init \
  --target ~/my-project \
  --extract-agents
```

### Files not in target workspace
- Confirm `--extract-agents` flag was used
- Check target path exists and is writable
- Use `--force` to overwrite

### Older files not updated
```bash
# Force re-extract to get latest
orchestrator-essentials-setup init . \
  --extract-agents \
  --force
```

---

## 🚀 Usage Example

### Complete Setup with Agent Workflows

```bash
# Create new project
mkdir my-agentic-app
cd my-agentic-app

# Install with everything
npx @anedezorchestrator/orchestrator-essentials-setup init . \
  --mode copy \
  --python \
  --vscode \
  --extract-agents \
  --force

# Verify
ls -la .github/instructions/
ls -la .github/agents/
ls -la src/
```

**Result:**
```
✅ src/ → Source code directory
✅ tests/ → Test files
✅ scripts/ → Utility scripts
✅ .github/instructions/ → 7 agent instructions
✅ .github/agents/ → 7 agent definitions
✅ .github/skills/ → Full skills library
✅ .venv/ → Python virtual environment
✅ .vscode/ → VS Code configuration
```

---

## 📖 Reference

### Related Documentation
- [PYPI_TRUSTED_PUBLISHING_SETUP.md](./PYPI_TRUSTED_PUBLISHING_SETUP.md)
- [README.md](./agent-essentials-installer/README.md)
- [Orchestrator GitHub](https://github.com/its-patri/Orchestrator)

### Keys Files Involved
- **CLI Installer:** `/agent-essentials-installer/cli/setup.js`
- **Python Installer:** `/scripts/install.py`
- **PowerShell Installer:** `/scripts/install.ps1`
- **Bash Installer:** `/scripts/install.sh`

---

## 📞 Support

For issues with agent workflow extraction:
1. Check verification output above
2. Review Troubleshooting section
3. Ensure source Orchestrator is complete
4. Open GitHub issue with details

---

**Last Updated:** March 26, 2026  
**Maintainer:** Patrick Josh Añedez
