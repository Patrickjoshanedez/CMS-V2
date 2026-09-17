"""
visualize.py — Thesis-Ready Diagrams for PAN Plagiarism Evaluation.

Produces 5 publication-quality figures from metrics.json and threshold_sweep.csv:
  - fig1_metric_bars.png: PAN Accuracy Metrics by Detection Tier
  - fig2_pr_curve.png: Precision-Recall Curve Across Thresholds
  - fig3_plagdet_threshold.png: PlagDet vs. Detection Threshold
  - fig4_confusion_chars.png: Character-Level Detection Breakdown (TP, FP, FN)
  - fig5_heatmap.png: PlagDet Heatmap — Tier × Threshold
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Configure UTF-8 on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

sns.set_theme(style="whitegrid", context="talk")
PALETTE = {"lexical": "#2E86AB", "semantic": "#E63946", "hybrid": "#06A77D"}


def fig1_metric_bars(summary: dict, out: Path) -> None:
    tiers = [t for t in ["lexical", "semantic", "hybrid"] if t in summary]
    metrics = ["precision", "recall", "f1", "plagdet"]
    labels = ["Precision", "Recall", "F1-Score", "PlagDet"]
    x = np.arange(len(metrics))
    width = 0.25
    fig, ax = plt.subplots(figsize=(10, 6))
    for i, tier in enumerate(tiers):
        vals = [summary[tier].get(m, summary[tier].get(f"{m}_score", 0.0)) for m in metrics]
        bars = ax.bar(x + i * width, vals, width, label=tier.capitalize(),
                      color=PALETTE.get(tier, "#555555"), edgecolor="black")
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + 0.015, f"{v:.3f}",
                    ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(x + width * (len(tiers) - 1) / 2)
    ax.set_xticklabels(labels, fontweight="bold")
    ax.set_ylim(0, 1.15)
    ax.set_ylabel("Score", fontweight="bold")
    ax.set_title("PAN Accuracy Metrics by Detection Tier", fontweight="bold", pad=15)
    ax.legend(title="Tier", frameon=True)
    fig.tight_layout()
    fig.savefig(out / "fig1_metric_bars.png", dpi=300)
    plt.close(fig)


def fig2_pr_curve(sweep_df: pd.DataFrame, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8, 7))
    for tier in ["lexical", "semantic", "hybrid"]:
        if tier not in sweep_df["tier"].values:
            continue
        d = sweep_df[sweep_df["tier"] == tier].sort_values("recall")
        ax.plot(d["recall"], d["precision"], marker="o", label=tier.capitalize(),
                color=PALETTE.get(tier, "#555555"), linewidth=2.5)
    ax.set_xlabel("Recall", fontweight="bold")
    ax.set_ylabel("Precision", fontweight="bold")
    ax.set_title("Precision–Recall Curve Across Thresholds", fontweight="bold", pad=15)
    ax.set_xlim(0, 1.05)
    ax.set_ylim(0, 1.05)
    ax.legend(title="Tier", frameon=True)
    fig.tight_layout()
    fig.savefig(out / "fig2_pr_curve.png", dpi=300)
    plt.close(fig)


def fig3_plagdet_vs_threshold(sweep_df: pd.DataFrame, out: Path, operating: float) -> None:
    fig, ax = plt.subplots(figsize=(10, 6))
    for tier in ["lexical", "semantic", "hybrid"]:
        if tier not in sweep_df["tier"].values:
            continue
        d = sweep_df[sweep_df["tier"] == tier].sort_values("threshold")
        ax.plot(d["threshold"], d["plagdet"], marker="s", label=tier.capitalize(),
                color=PALETTE.get(tier, "#555555"), linewidth=2.5)
    ax.axvline(operating, color="black", linestyle="--", alpha=0.8,
               linewidth=2, label=f"Operating Gate (S={operating:.2f})")
    ax.set_xlabel("Similarity Score Threshold", fontweight="bold")
    ax.set_ylabel("PlagDet Score", fontweight="bold")
    ax.set_title("PlagDet Score vs. Detection Threshold", fontweight="bold", pad=15)
    ax.legend(frameon=True)
    fig.tight_layout()
    fig.savefig(out / "fig3_plagdet_threshold.png", dpi=300)
    plt.close(fig)


def fig4_confusion_chars(summary: dict, out: Path) -> None:
    tiers = [t for t in ["lexical", "semantic", "hybrid"] if t in summary]
    tp = [summary[t].get("tp_chars", 0) for t in tiers]
    fp = [summary[t].get("fp_chars", 0) for t in tiers]
    fn = [summary[t].get("fn_chars", 0) for t in tiers]

    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(tiers))
    width = 0.28
    ax.bar(x - width, tp, width, label="True Positive (TP Chars)", color="#06A77D", edgecolor="black")
    ax.bar(x, fp, width, label="False Positive (FP Chars)", color="#E63946", edgecolor="black")
    ax.bar(x + width, fn, width, label="False Negative (FN Chars)", color="#F4A261", edgecolor="black")
    ax.set_xticks(x)
    ax.set_xticklabels([t.capitalize() for t in tiers], fontweight="bold")
    ax.set_ylabel("Total Character Count", fontweight="bold")
    ax.set_title("Character-Level Detection Breakdown", fontweight="bold", pad=15)
    ax.legend(frameon=True)
    fig.tight_layout()
    fig.savefig(out / "fig4_confusion_chars.png", dpi=300)
    plt.close(fig)


def fig5_heatmap(sweep_df: pd.DataFrame, out: Path) -> None:
    piv = sweep_df.pivot_table(index="tier", columns="threshold", values="plagdet")
    fig, ax = plt.subplots(figsize=(12, 4))
    sns.heatmap(piv, annot=True, fmt=".3f", cmap="YlGnBu", cbar_kws={"label": "PlagDet Score"}, ax=ax)
    ax.set_title("PlagDet Heatmap — Tier × Threshold Sensitivity", fontweight="bold", pad=15)
    ax.set_xlabel("Detection Threshold", fontweight="bold")
    ax.set_ylabel("Tier", fontweight="bold")
    fig.tight_layout()
    fig.savefig(out / "fig5_heatmap.png", dpi=300)
    plt.close(fig)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Generate thesis-ready evaluation diagrams.")
    parser.add_argument("--reports-dir", default=script_dir / "reports", type=Path, help="Reports folder with metrics.json and sweep.csv")
    args = parser.parse_args()
    args.reports_dir.mkdir(parents=True, exist_ok=True)

    metrics_file = args.reports_dir / "metrics.json"
    sweep_file = args.reports_dir / "threshold_sweep.csv"

    if not metrics_file.exists() or not sweep_file.exists():
        print(f"[ERROR] Required files not found in {args.reports_dir}: metrics.json, threshold_sweep.csv")
        sys.exit(1)

    metrics = json.loads(metrics_file.read_text(encoding="utf-8"))
    summary = metrics.get("summary", metrics)
    operating = metrics.get("at_threshold", 0.25)
    sweep_df = pd.read_csv(sweep_file)

    fig1_metric_bars(summary, args.reports_dir)
    fig2_pr_curve(sweep_df, args.reports_dir)
    fig3_plagdet_vs_threshold(sweep_df, args.reports_dir, operating)
    fig4_confusion_chars(summary, args.reports_dir)
    fig5_heatmap(sweep_df, args.reports_dir)

    print(f"[SUCCESS] All 5 thesis figures generated in {args.reports_dir.resolve()}")


if __name__ == "__main__":
    main()
