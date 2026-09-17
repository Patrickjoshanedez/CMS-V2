#!/usr/bin/env python3
"""
scripts/run_plagiarism_evaluation.py — Root-level runner for the PAN evaluation suite.

Executes the complete 3-step quantitative evaluation pipeline:
  1. python plagiarism_engine/evaluation/generate_corpus.py
  2. python plagiarism_engine/evaluation/run_detection.py
  3. python plagiarism_engine/evaluation/evaluate.py
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

# Configure UTF-8 output on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    parser = argparse.ArgumentParser(description="Run the complete plagiarism accuracy evaluation pipeline.")
    parser.add_argument("--num-docs", type=int, default=10, help="Number of suspicious documents to synthesize")
    parser.add_argument("--api-url", default="http://localhost:8001", help="Plagiarism API endpoint URL")
    parser.add_argument("--threshold", type=float, default=0.25, help="Similarity threshold for detection evaluation")
    parser.add_argument("--min-plagdet", type=float, default=0.70, help="Minimum PlagDet score required to pass")
    parser.add_argument("--in-process", action="store_true", help="Run detection using local in-process Python fallback")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    eval_dir = repo_root / "plagiarism_engine" / "evaluation"

    if not eval_dir.exists():
        print(f"[ERROR] Evaluation directory not found: {eval_dir}")
        sys.exit(1)

    print("====================================================================")
    print("  🔬 BUKSU CMS-V2 PLAGIARISM ACCURACY EVALUATION PIPELINE (PAN@CLEF) ")
    print("====================================================================\n")

    # Step 1: Generate Corpus
    print("[STEP 1/3] Synthesizing Controlled Ground-Truth Corpus...")
    cmd_gen = [sys.executable, str(eval_dir / "generate_corpus.py"), "--num-docs", str(args.num_docs)]
    res = subprocess.run(cmd_gen, cwd=str(eval_dir))
    if res.returncode != 0:
        print("[FAIL] Corpus generation failed.")
        sys.exit(res.returncode)

    # Step 2: Run Detection
    print("\n[STEP 2/3] Running Detection Pipeline...")
    cmd_det = [sys.executable, str(eval_dir / "run_detection.py"), "--api-url", args.api_url]
    if args.in_process:
        cmd_det.append("--in-process")
    res = subprocess.run(cmd_det, cwd=str(eval_dir))
    if res.returncode != 0:
        print("[FAIL] Detection execution failed.")
        sys.exit(res.returncode)

    # Step 3: Evaluate Metrics
    print("\n[STEP 3/4] Computing PAN-Standard Metrics & Quality Gate...")
    cmd_eval = [
        sys.executable,
        str(eval_dir / "evaluate.py"),
        "--threshold", str(args.threshold),
        "--min-plagdet", str(args.min_plagdet),
    ]
    res = subprocess.run(cmd_eval, cwd=str(eval_dir))
    if res.returncode != 0:
        print("[FAIL] Evaluation quality gate failed.")
        sys.exit(res.returncode)

    # Step 4: Generate Thesis Diagrams
    print("\n[STEP 4/4] Generating Publication-Quality Figures (fig1..fig5)...")
    cmd_viz = [
        sys.executable,
        str(eval_dir / "visualize.py"),
    ]
    res = subprocess.run(cmd_viz, cwd=str(eval_dir))
    if res.returncode != 0:
        print("[FAIL] Visualization generation failed.")
        sys.exit(res.returncode)

    print("\n[SUCCESS] All 4 evaluation stages completed successfully!")
    print(f"Report available at:  {eval_dir / 'reports' / 'report.md'}")
    print(f"Metrics available at: {eval_dir / 'reports' / 'metrics.json'}")
    print(f"Figures available at: {eval_dir / 'reports'}")


if __name__ == "__main__":
    main()
