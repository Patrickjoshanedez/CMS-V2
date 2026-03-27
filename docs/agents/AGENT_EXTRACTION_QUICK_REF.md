# Agent Workflow Extraction - Quick Reference

## ⚡ Quick Commands

### Extract Agent Workflows During Installation

```bash
# npm CLI (Recommended)
npx @anedezorchestrator/orchestrator-essentials-setup init \
  --target . \
  --mode copy \
  --extract-agents

# Python script
python scripts/install.py --target . --extract-agents

# PowerShell
./scripts/install.ps1 -Target . -ExtractAgents

# Bash
./scripts/install.sh --target . --extract-agents
```

### Re-extract with Force (Update)

```bash
orchestrator-essentials-setup init . --extract-agents --force
python scripts/install.py --target . --extract-agents --force
```

---

## 📂 What Gets Extracted

| Directory | Contains | Count |
|-----------|----------|-------|
| `.github/instructions/` | Agent behavior specs | 7 files |
| `.github/agents/` | Agent definitions | 7 files |
| `.github/skills/` | Reusable capabilities | 20+ dirs |

---

## ✅ Verify Extraction

```bash
# Check directories exist
test -d .github/instructions && echo "✅ Instructions"
test -d .github/agents && echo "✅ Agents"
test -d .github/skills && echo "✅ Skills"

# Count files
find .github/instructions -type f | wc -l
find .github/agents -type f | wc -l
find .github/skills -type d | wc -l
```

---

## 🔧 Installation Flags

```
--extract-agents        Extract .github workflows
--force                 Overwrite existing files
--target PATH           Target workspace path
--mode copy|submodule   Installation mode
```

---

## 📖 Full Documentation

See: [AGENT_WORKFLOW_EXTRACTION.md](./AGENT_WORKFLOW_EXTRACTION.md)

---

**Created by:** Patrick Josh Añedez  
**Date:** March 26, 2026
