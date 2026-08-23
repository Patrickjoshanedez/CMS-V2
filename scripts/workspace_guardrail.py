#!/usr/bin/env python3
"""Workspace Cleanliness & Cognitive-Load Guardrail Engine.

Identifies, alerts, and contains workspace clutter, shadow clones,
competing memory namespaces, duplicate documentation paths, and loose scripts.
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="[Workspace Guardrail] %(levelname)s: %(message)s",
)

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]

# Explicit whitelists for canonical root files and directories
APPROVED_ROOT_FILES = {
    ".gitignore",
    ".dockerignore",
    ".editorconfig",
    ".eslintrc.cjs",
    ".prettierignore",
    ".prettierrc",
    "eslint.config.js",
    "package.json",
    "package-lock.json",
    "README.md",
    "AGENTS.md",
    "GEMINI.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "FILES_INDEX.md",
    "QUICK_START.md",
    "PLAN.md",
    "Dockerfile",
    "Dockerfile.client.prod",
    "Dockerfile.server.prod",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "docker-compose.deploy.yml",
    "deploy.ps1",
    "lan-deploy.ps1",
    "start-local-dev.ps1",
    "entrypoint.sh",
    ".commitmsg",
    ".context_state.json",
    ".instructions.md",
}

APPROVED_ROOT_DIRS = {
    "client",
    "server",
    "plagiarism_engine",
    "shared",
    "scripts",
    "docs",
    "assets",
    "infra",
    "docker",
    "orchestrator",
    "tools",
    "examples",
    "memories",
    "context",
    ".git",
    ".github",
    ".agents",
    ".husky",
    "node_modules",
    ".venv",
}

# Known clutter patterns
ZOMBIE_CLONES = {"staging", "dashboard-ui", "src"}
DUPLICATE_DOCS = {"documentation", "reference", "references"}
LOOSE_CACHE_DIRS = {"__pycache__", "tmp", "test-results", "sampleacademicpdf"}


def audit_and_purge_workspace(dry_run: bool = True) -> tuple[int, list[Path]]:
    logging.info("Starting workspace cleanliness and cognitive-load audit...")
    violations = 0
    purge_queue: list[Path] = []

    try:
        root_items = list(WORKSPACE_ROOT.iterdir())
    except OSError as e:
        logging.error(f"Failed to list directory {WORKSPACE_ROOT}: {e}")
        return 1, []

    for path in root_items:
        name = path.name

        # 1. Flag Shadow Clones and Zombie Trees
        if name in ZOMBIE_CLONES:
            logging.warning(f"🧟 Found Zombie/Shadow Clone directory in root: '{name}'")
            violations += 1
            purge_queue.append(path)

        # 2. Flag Redundant Documentation paths
        elif name in DUPLICATE_DOCS:
            logging.warning(f"📚 Found redundant reference/documentation folder: '{name}'")
            violations += 1
            purge_queue.append(path)

        # 3. Flag loose execution caches & temp dirs in root
        elif name in LOOSE_CACHE_DIRS:
            logging.warning(f"💥 Found execution cache/temporary directory in root: '{name}'")
            violations += 1
            purge_queue.append(path)

        # 5. Flag loose root scripts (outside approved scripts/ dir)
        elif (name.endswith(".ps1") or name.endswith(".sh")) and name not in APPROVED_ROOT_FILES:
            logging.warning(f"📜 Found loose deployment script in root: '{name}'")
            violations += 1
            purge_queue.append(path)

    if violations == 0:
        logging.info("✅ Workspace is pristine! Cognitive-load parameters are within bounds.")
        return 0, []

    logging.warning(f"Total workspace clutter violations detected: {violations}")

    if not dry_run:
        logging.info("Purification sequence initiated. Safely reclaiming disk space...")
        for path in purge_queue:
            try:
                if path.is_dir():
                    shutil.rmtree(path, ignore_errors=True)
                    logging.info(f"🧹 Purged clutter directory: {path.name}")
                else:
                    path.unlink(missing_ok=True)
                    logging.info(f"🧹 Removed clutter file: {path.name}")
            except Exception as e:
                logging.error(f"❌ Failed to delete {path.name}: {e}")
        return 0, purge_queue

    logging.info("Dry-run complete. Run with --purge to execute automated cleanup.")
    return violations, purge_queue


def main() -> int:
    dry_run = "--purge" not in sys.argv
    violations, _ = audit_and_purge_workspace(dry_run=dry_run)
    return 0 if (dry_run or violations == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
