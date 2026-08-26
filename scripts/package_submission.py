#!/usr/bin/env python3
"""BukSU Capstone Management System V2 (CMS-V2)
Institutional Submission Packaging Automation Script.

Packages the clean monorepo into an audit-safe, zipped archive (CMS-V2-Final-Submission.zip)
excluding build artifacts, node_modules, virtualenvs, git history, and caches.
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ZIP = WORKSPACE_ROOT / "CMS-V2-Final-Submission.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".venv",
    ".git",
    ".husky",
    "__pycache__",
    "dist",
    "build",
    "tmp",
    "coverage",
    ".tempmediaStorage",
}

EXCLUDE_EXTS = {".pyc", ".log", ".tmp", ".DS_Store"}
EXCLUDE_FILES = {"CMS-V2-Final-Submission.zip"}
WHITELIST_HIDDEN = {
    ".gitignore",
    ".dockerignore",
    ".editorconfig",
    ".prettierrc",
    ".prettierignore",
    ".eslintrc.cjs",
}


def create_submission_archive() -> Path:
    print("=" * 70)
    print(" CMS-V2 Institutional Submission Packaging Engine")
    print("=" * 70)
    print(f"Workspace root: {WORKSPACE_ROOT}")
    print(f"Destination:    {OUTPUT_ZIP}")

    if OUTPUT_ZIP.exists():
        print("Removing existing submission archive...")
        OUTPUT_ZIP.unlink()

    print("\nScanning files and assembling audit-safe archive...")
    file_count = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for foldername, subfolders, filenames in os.walk(WORKSPACE_ROOT):
            # Prune excluded directories
            subfolders[:] = [
                d
                for d in subfolders
                if d not in EXCLUDE_DIRS and not d.startswith(".git")
            ]

            rel_dir = os.path.relpath(foldername, WORKSPACE_ROOT)
            parts = Path(rel_dir).parts
            if any(p in EXCLUDE_DIRS for p in parts):
                continue

            for filename in filenames:
                if filename in EXCLUDE_FILES:
                    continue
                if filename.startswith(".") and filename not in WHITELIST_HIDDEN:
                    continue

                ext = os.path.splitext(filename)[1].lower()
                if ext in EXCLUDE_EXTS:
                    continue

                filepath = Path(foldername) / filename
                arcname = os.path.relpath(filepath, WORKSPACE_ROOT)
                zf.write(filepath, arcname)
                file_count += 1

    size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"\n[SUCCESS] Package successfully assembled!")
    print(f"[INFO] Total Files Included: {file_count}")
    print(f"[INFO] Archive File Size:    {size_mb:.2f} MB")
    print(f"[INFO] Archive Location:     {OUTPUT_ZIP}")
    print("=" * 70)
    return OUTPUT_ZIP


if __name__ == "__main__":
    create_submission_archive()
