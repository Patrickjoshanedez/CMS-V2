#!/usr/bin/env bash
# ==============================================================================
# BukSU Capstone Management System V2 (CMS-V2)
# Institutional Submission Packaging Automation Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_ZIP="${WORKSPACE_ROOT}/CMS-V2-Final-Submission.zip"

echo "======================================================================"
echo " CMS-V2 Institutional Submission Packaging Routine"
echo "======================================================================"
echo "Workspace: ${WORKSPACE_ROOT}"
echo "Target Archive: ${OUTPUT_ZIP}"

cd "${WORKSPACE_ROOT}"

# 1. Run Workspace Guardrail Purification Preflight
echo ""
echo "[Step 1/4] Running Workspace Cleanliness & Guardrail Audit..."
python3 scripts/workspace_guardrail.py --purge || python scripts/workspace_guardrail.py --purge

# 2. Remove any previous archive
if [ -f "${OUTPUT_ZIP}" ]; then
    echo "[Step 2/4] Removing previous submission archive..."
    rm -f "${OUTPUT_ZIP}"
fi

# 3. Package repository into clean, audit-safe zip archive
echo ""
echo "[Step 3/4] Packaging clean monorepo into submission zip archive..."
python3 -c "
import zipfile, os
from pathlib import Path

root = Path(r'${WORKSPACE_ROOT}')
target = Path(r'${OUTPUT_ZIP}')

EXCLUDE_DIRS = {
    'node_modules', '.venv', '.git', '.husky', '__pycache__',
    'dist', 'build', 'tmp', 'coverage', '.tempmediaStorage', '.agents/ptss/scratch'
}

EXCLUDE_EXTS = {'.pyc', '.log', '.tmp', '.DS_Store'}
EXCLUDE_FILES = {'CMS-V2-Final-Submission.zip'}

print('Scanning and adding files to archive...')
count = 0
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zf:
    for foldername, subfolders, filenames in os.walk(root):
        # Filter subfolders in-place to avoid descending into excluded directories
        subfolders[:] = [d for d in subfolders if d not in EXCLUDE_DIRS and not d.startswith('.git')]
        rel_dir = os.path.relpath(foldername, root)
        
        # Check if any parent component is in EXCLUDE_DIRS
        parts = Path(rel_dir).parts
        if any(p in EXCLUDE_DIRS for p in parts):
            continue

        for filename in filenames:
            if filename in EXCLUDE_FILES or filename.startswith('.'):
                if filename not in {'.gitignore', '.dockerignore', '.editorconfig', '.prettierrc', '.eslintrc.cjs'}:
                    continue
            ext = os.path.splitext(filename)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue

            filepath = Path(foldername) / filename
            arcname = os.path.relpath(filepath, root)
            zf.write(filepath, arcname)
            count += 1

print(f'Archive successfully built! Added {count} files.')
"

# 4. Verification and Checksum Calculation
echo ""
echo "[Step 4/4] Verifying Submission Archive Integrity..."
if [ -f "${OUTPUT_ZIP}" ]; then
    SIZE=$(python3 -c "import os; print(f'{os.path.getsize(r\"${OUTPUT_ZIP}\") / (1024*1024):.2f} MB')")
    echo " Archive created successfully!"
    echo " Size: ${SIZE}"
    echo " Path: ${OUTPUT_ZIP}"
    echo "======================================================================"
    echo " Submission packaging complete and ready for panel transmittal."
    echo "======================================================================"
else
    echo "❌ Error: Failed to create submission zip archive."
    exit 1
fi
