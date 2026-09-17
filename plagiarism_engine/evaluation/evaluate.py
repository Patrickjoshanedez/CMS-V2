#!/usr/bin/env python3
"""
evaluate.py — Official PAN-Standard Evaluation Harness for Plagiarism Detection.

Computes Character-Level Precision, Recall, F1-Measure, Granularity, and PlagDet Score
based on the international PAN@CLEF benchmarking standard.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Configure UTF-8 encoding on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────────
# PAN Interval Overlap Mathematics
# ─────────────────────────────────────────────────────────────────────────────

def compute_character_metrics(
    ground_truth_spans: List[Tuple[int, int]],  # [(start, end)]
    detected_spans: List[Tuple[int, int]],      # [(start, end)]
) -> Tuple[float, float, float, float, float, int, int, int]:
    """Computes PAN Character-Level Precision, Recall, F1, Granularity, PlagDet, and character counts."""
    if not ground_truth_spans and not detected_spans:
        return 1.0, 1.0, 1.0, 1.0, 1.0, 0, 0, 0
    if not ground_truth_spans and detected_spans:
        fp_count = sum(max(0, d[1] - d[0]) for d in detected_spans)
        return 0.0, 1.0, 0.0, 1.0, 0.0, 0, fp_count, 0
    if ground_truth_spans and not detected_spans:
        fn_count = sum(max(0, g[1] - g[0]) for g in ground_truth_spans)
        return 1.0, 0.0, 0.0, 1.0, 0.0, 0, 0, fn_count

    # Expand spans to discrete character index sets for exact overlap calculation
    gt_chars: Set[int] = set()
    for start, end in ground_truth_spans:
        gt_chars.update(range(start, end))

    det_chars: Set[int] = set()
    for start, end in detected_spans:
        det_chars.update(range(start, end))

    intersection_chars = gt_chars.intersection(det_chars)
    tp_chars = len(intersection_chars)
    fp_chars = len(det_chars - gt_chars)
    fn_chars = len(gt_chars - det_chars)

    precision = tp_chars / len(det_chars) if det_chars else 0.0
    recall = tp_chars / len(gt_chars) if gt_chars else 0.0

    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # ── Granularity Calculation ──
    # Measures over-fragmentation: how many detected intervals intersect each true passage
    overlapping_detections_per_gt = []
    for g_start, g_end in ground_truth_spans:
        overlaps = 0
        for d_start, d_end in detected_spans:
            if max(g_start, d_start) < min(g_end, d_end):  # Interval overlap condition
                overlaps += 1
        if overlaps > 0:
            overlapping_detections_per_gt.append(overlaps)

    granularity = (
        sum(overlapping_detections_per_gt) / len(overlapping_detections_per_gt)
        if overlapping_detections_per_gt
        else 1.0
    )

    # ── PlagDet Score Formulation ──
    # PlagDet = F1 / log2(1 + Granularity)
    plagdet = f1 / math.log2(1 + granularity) if granularity >= 1.0 else f1

    return precision, recall, f1, granularity, plagdet, tp_chars, fp_chars, fn_chars


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Runner
# ─────────────────────────────────────────────────────────────────────────────

def extract_detected_spans(
    report: Dict,
    tier: str = "hybrid",
    score_threshold: float = 0.25,
) -> List[Tuple[int, int]]:
    """Extracts detected character spans filtered by score threshold and tier."""
    matches = report.get("matches", [])
    spans = []

    for m in matches:
        start = m.get("start_index", m.get("suspicious_start"))
        end = m.get("end_index", m.get("suspicious_end"))
        if start is None or end is None:
            continue

        if tier == "hybrid":
            score = m.get("similarity_score", m.get("score", 0.0))
        elif tier == "lexical":
            score = m.get("winnow_score", m.get("similarity_score", 0.0))
        elif tier == "semantic":
            score = m.get("semantic_score", m.get("similarity_score", 0.0))
        else:
            score = m.get("similarity_score", 0.0)

        if score >= score_threshold:
            spans.append((int(start), int(end)))

    return spans


def run_evaluation(
    ground_truth_path: Path,
    results_dir: Path,
    threshold: float = 0.25,
) -> Dict:
    """Executes full evaluation across Hybrid, Lexical, and Semantic tiers."""
    with open(ground_truth_path, "r", encoding="utf-8") as f:
        ground_truth: Dict[str, List[Dict]] = json.load(f)

    tiers = ["lexical", "semantic", "hybrid"]
    tier_metrics = {}

    for t in tiers:
        p_list, r_list, f1_list, g_list, plag_list = [], [], [], [], []
        total_tp, total_fp, total_fn = 0, 0, 0

        for doc_id, gt_passages in ground_truth.items():
            result_file = results_dir / f"{doc_id}.json"
            if not result_file.exists():
                continue

            with open(result_file, "r", encoding="utf-8") as rf:
                report = json.load(rf)
                # Unwrap if wrapped inside a response envelope
                if "response" in report and isinstance(report["response"], dict):
                    report = report["response"].get("result", report["response"])

            gt_spans = [(p["suspicious_start"], p["suspicious_end"]) for p in gt_passages]
            det_spans = extract_detected_spans(report, tier=t, score_threshold=threshold)

            p, r, f1, g, plag, tp_c, fp_c, fn_c = compute_character_metrics(gt_spans, det_spans)
            p_list.append(p)
            r_list.append(r)
            f1_list.append(f1)
            g_list.append(g)
            plag_list.append(plag)
            total_tp += tp_c
            total_fp += fp_c
            total_fn += fn_c

        n = len(p_list) or 1
        tier_metrics[t] = {
            "precision": round(sum(p_list) / n, 4),
            "recall": round(sum(r_list) / n, 4),
            "f1": round(sum(f1_list) / n, 4),
            "granularity": round(sum(g_list) / n, 4),
            "plagdet": round(sum(plag_list) / n, 4),
            "tp_chars": total_tp,
            "fp_chars": total_fp,
            "fn_chars": total_fn,
            "evaluated_documents": len(p_list),
        }

    return tier_metrics


def generate_threshold_sweep(
    ground_truth_path: Path,
    results_dir: Path,
    output_csv: Path,
) -> None:
    """Sweeps thresholds and exports a CSV table across tiers."""
    thresholds = [round(x, 2) for x in [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]]
    rows = []

    for t in thresholds:
        m = run_evaluation(ground_truth_path, results_dir, threshold=t)
        for tier_name, metrics_dict in m.items():
            row = {
                "threshold": t,
                "tier": tier_name,
                "precision": metrics_dict["precision"],
                "recall": metrics_dict["recall"],
                "f1": metrics_dict["f1"],
                "granularity": metrics_dict["granularity"],
                "plagdet": metrics_dict["plagdet"],
                "tp_chars": metrics_dict["tp_chars"],
                "fp_chars": metrics_dict["fp_chars"],
                "fn_chars": metrics_dict["fn_chars"],
            }
            rows.append(row)

    if PANDAS_AVAILABLE:
        df = pd.DataFrame(rows)
        df.to_csv(output_csv, index=False)
    else:
        # Pure python csv export
        import csv
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    print(f"[SUCCESS] Exported threshold sweep data to {output_csv}")


def generate_markdown_report(metrics: Dict, threshold: float, output_path: Path, min_plagdet: float):
    """Exports structured Markdown report suitable for thesis Chapter 4/5."""
    hybrid = metrics["hybrid"]
    passed = hybrid["plagdet"] >= min_plagdet
    verdict = "PASSED (Production-Grade)" if passed else "FAILED (Below CI Gate)"

    md = f"""# 🔬 Plagiarism Detection Engine Accuracy Report
**Compliance Standard:** PAN@CLEF Character-Level Benchmark  
**Evaluation Threshold:** $S_{{\\text{{hybrid}}}} \\ge {threshold * 100:.1f}\\%$  
**Institutional Gate Status:** **{verdict}** (PlagDet: `{hybrid['plagdet']}` vs Target: `{min_plagdet}`)

---

## 1. Multi-Tier Ablation Study Matrix

| Detection Tier | Precision ($P$) | Recall ($R$) | $F_1$-Measure | Granularity ($G$) | PlagDet Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Lexical (Winnowing Only)** | `{metrics['lexical']['precision']}` | `{metrics['lexical']['recall']}` | `{metrics['lexical']['f1']}` | `{metrics['lexical']['granularity']}` | `{metrics['lexical']['plagdet']}` |
| **Semantic (MiniLM Only)** | `{metrics['semantic']['precision']}` | `{metrics['semantic']['recall']}` | `{metrics['semantic']['f1']}` | `{metrics['semantic']['granularity']}` | `{metrics['semantic']['plagdet']}` |
| **Hybrid ($S_{{\\text{{hybrid}}}}$ Formula)** | **`{hybrid['precision']}`** | **`{hybrid['recall']}`** | **`{hybrid['f1']}`** | **`{hybrid['granularity']}`** | **`{hybrid['plagdet']}`** |

---

## 2. Methodology & Mathematical Definitions

* **Precision:** $\\frac{{|\\bigcup (r \\cap s)|}}{{|r|}}$ (Proportion of flagged characters that are genuine plagiarism).
* **Recall:** $\\frac{{|\\bigcup (s \\cap r)|}}{{|s|}}$ (Proportion of genuine plagiarized passages successfully caught).
* **Granularity:** $\\frac{{1}}{{|S_{{\\text{{detected}}}}|}} \\sum |R_s|$ (Penalty for reporting fragmented passages).
* **PlagDet Score:** $\\frac{{F_1}}{{\\log_2(1 + G)}}$ (Harmonic balance of accuracy penalized by fragmentation).
"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(md, encoding="utf-8")


def main():
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Evaluate plagiarism checker accuracy using PAN metrics.")
    parser.add_argument("--ground-truth", type=Path, default=script_dir / "corpus" / "ground_truth.json", help="Ground truth JSON")
    parser.add_argument("--results-dir", type=Path, default=script_dir / "results", help="Folder of API output JSONs")
    parser.add_argument("--reports-dir", type=Path, default=script_dir / "reports", help="Output directory for reports & sweep")
    parser.add_argument("--threshold", type=float, default=0.25, help="Similarity threshold for detection")
    parser.add_argument("--min-plagdet", type=float, default=0.60, help="Minimum PlagDet required to pass")
    args = parser.parse_args()

    args.reports_dir.mkdir(parents=True, exist_ok=True)

    if not args.ground_truth.exists():
        print(f"[ERROR] Ground truth file not found: {args.ground_truth}")
        sys.exit(1)

    print(f"[INFO] Computing PAN accuracy metrics at threshold S_hybrid >= {args.threshold}...")
    metrics = run_evaluation(args.ground_truth, args.results_dir, threshold=args.threshold)

    output_json = args.reports_dir / "metrics.json"
    output_report = args.reports_dir / "report.md"
    output_sweep = args.reports_dir / "threshold_sweep.csv"

    # Save metrics JSON
    full_output = {
        "at_threshold": args.threshold,
        "summary": metrics,
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    # Generate Markdown Report
    generate_markdown_report(metrics, args.threshold, output_report, args.min_plagdet)

    # Generate Threshold Sweep CSV
    generate_threshold_sweep(args.ground_truth, args.results_dir, output_sweep)

    plagdet = metrics["hybrid"]["plagdet"]
    print("\n" + "=" * 55)
    print(f"  PAN PlagDet Score: {plagdet:.4f} (Required Gate: {args.min_plagdet:.4f})")
    print("=" * 55)
    print(f"[SUCCESS] Metrics exported to {output_json}, {output_report}, and {output_sweep}")

    if plagdet < args.min_plagdet:
        print(f"[GATE REJECTED] PlagDet score {plagdet} fell below {args.min_plagdet}.")
        sys.exit(1)
    else:
        print("[GATE APPROVED] Plagiarism engine satisfies institutional accuracy benchmark.")
        sys.exit(0)


if __name__ == "__main__":
    main()
