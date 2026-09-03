#!/usr/bin/env python3
"""Cross-Platform Monorepo Packaging Script for Panel Submissions.

Builds a clean, reproducible .zip archive of the CMS-V2 monorepo,
excluding dependency trees (node_modules, .venv), git metadata, secret files,
and temporary build artifacts.
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

# Setup UTF-8 encoding for Windows terminals
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = WORKSPACE_ROOT / "out"
OUTPUT_ZIP = OUTPUT_DIR / "CMS-V2-Panel-Submission.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".venv",
    ".git",
    ".husky",
    "dist",
    "build",
    "out",
    "tmp",
    "test-results",
    "__pycache__",
    ".localstack",
    ".idea",
    ".vscode",
    ".devcontainer",
    ".antigravity",
    ".claude",
    ".serena",
    ".sixth",
}

EXCLUDE_FILES = {
    ".env",
    ".env.local",
    ".env.prod",
    ".env.deploy",
    ".context_state.json",
}


def should_include(rel_path: Path) -> bool:
    # Check parts for excluded directory names
    for part in rel_path.parts[:-1]:
        if part in EXCLUDE_DIRS:
            return False
    # Check filename
    filename = rel_path.name
    if filename in EXCLUDE_FILES or filename.endswith(".pyc"):
        return False
    return True


def package_monorepo() -> int:
    print(f"\n[Packaging Engine] Initializing CMS-V2 Monorepo Packaging...")
    print(f"[Packaging Engine] Source root: {WORKSPACE_ROOT}")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    total_files = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(WORKSPACE_ROOT):
            # Prune excluded directories from traversal
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(WORKSPACE_ROOT)
                
                if should_include(rel_path):
                    zipf.write(full_path, arcname=str(rel_path).replace("\\", "/"))
                    total_files += 1
                    total_uncompressed_bytes += full_path.stat().st_size

    archive_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    raw_size_mb = total_uncompressed_bytes / (1024 * 1024)

    print(f"\n[Packaging Engine] ========================================================")
    print(f"[Packaging Engine] ✅ Archive generated successfully!")
    print(f"[Packaging Engine] Destination: {OUTPUT_ZIP}")
    print(f"[Packaging Engine] Files Packaged: {total_files}")
    print(f"[Packaging Engine] Uncompressed Size: {raw_size_mb:.2f} MB")
    print(f"[Packaging Engine] Compressed Size:   {archive_size_mb:.2f} MB")
    print(f"[Packaging Engine] ========================================================\n")
    return 0


if __name__ == "__main__":
    sys.exit(package_monorepo())
