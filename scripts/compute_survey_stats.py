"""Compute Cronbach's alpha per subscale and overall from raw item-level Likert responses.

Usage:
    python scripts/compute_survey_stats.py responses.csv [out.json]

CSV layout: one row per respondent, a `group` column (student | instructor | faculty),
then 29 numeric item columns ordered by subscale (8, 6, 10, 5 items).
"""
import json
import sys

import pandas as pd

SUBSCALES = [
    ("Functional Suitability & Workflow Correctness", 8),
    ("AI Plagiarism Detection & Semantic Accuracy", 6),
    ("Usability & Interface Learnability (SUS)", 10),
    ("Security & Committee Role Isolation (RBAC)", 5),
]
MIN_RESPONDENTS = 30


def cronbach_alpha(items: pd.DataFrame) -> float:
    k = items.shape[1]
    item_var = items.var(axis=0, ddof=1).sum()
    total_var = items.sum(axis=1).var(ddof=1)
    return float(k / (k - 1) * (1 - item_var / total_var))


def interpret(alpha: float) -> str:
    if alpha >= 0.9:
        return "Excellent"
    if alpha >= 0.8:
        return "Good"
    if alpha >= 0.7:
        return "Acceptable"
    return "Questionable / Poor"


def main() -> None:
    df = pd.read_csv(sys.argv[1])
    out_path = sys.argv[2] if len(sys.argv) > 2 else "scratch/screenshots/ch4_story/survey_stats.json"
    item_cols = [c for c in df.columns if c != "group"]
    expected = sum(k for _, k in SUBSCALES)
    if len(item_cols) != expected:
        raise SystemExit(f"Expected {expected} item columns, found {len(item_cols)}")
    if len(df) < MIN_RESPONDENTS:
        raise SystemExit(f"Need at least {MIN_RESPONDENTS} respondents, found {len(df)}")

    items = df[item_cols].astype(float)
    result = {"n": int(len(df)), "groups": df["group"].value_counts().to_dict(), "subscales": []}
    start = 0
    for name, k in SUBSCALES:
        a = cronbach_alpha(items.iloc[:, start : start + k])
        result["subscales"].append({"name": name, "k": k, "alpha": round(a, 3), "interpretation": interpret(a)})
        start += k
    overall = cronbach_alpha(items)
    result["overall"] = {"k": expected, "alpha": round(overall, 3), "interpretation": interpret(overall)}

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
