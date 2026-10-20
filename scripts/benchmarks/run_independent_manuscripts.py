"""Read-only independent manuscript checks against the official synchronous API.

Input JSON: {"dataset_id": str, "provenance": str, "permission": str,
"cases": [{"id": str, "path": str, "sha256": str, "source_group": str,
"expected_positive": bool (optional)}]}. Paths are relative to the manifest.
No source indexing, label creation, archive resets, or database writes occur.
Unlabelled manuscripts yield observations only, never accuracy estimates.
"""
import argparse
import hashlib
import json
import os
import threading
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def request_json(url, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--api-url", default="http://localhost:8001")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--threshold", type=float, required=True,
                        help="Predeclared document plagiarism_score threshold (percent).")
    args = parser.parse_args()
    if not 0 <= args.threshold <= 100:
        parser.error("threshold must be between 0 and 100")
    timer = threading.Timer(110, lambda: os._exit(124))
    timer.daemon = True
    timer.start()
    report = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "api_url": args.api_url, "threshold": args.threshold,
        "status": "blocked", "cases": [], "accuracy": None,
        "scope": "Official /check-sync API, no indexing or persistence mutation.",
    }
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        for key in ("dataset_id", "provenance", "permission", "cases"):
            if not manifest.get(key):
                raise ValueError(f"Missing manifest field: {key}")
        report["dataset"] = {k: manifest[k] for k in
                             ("dataset_id", "provenance", "permission")}
        prepared = []
        for case in manifest["cases"]:
            raw = (args.manifest.parent / case["path"]).read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest != case["sha256"]:
                raise ValueError(f"Checksum mismatch: {case['id']}")
            if not case.get("source_group"):
                raise ValueError(f"Missing source grouping: {case['id']}")
            label = case.get("expected_positive")
            if label is not None and not isinstance(label, bool):
                raise ValueError("expected_positive must be boolean or omitted")
            text = raw.decode("utf-8")
            if len(text.strip()) < 50:
                raise ValueError(f"API minimum length unmet: {case['id']}")
            prepared.append((case, text))
        report["health"] = request_json(args.api_url.rstrip("/") + "/health")
        for case, text in prepared:
            start = time.perf_counter()
            result = request_json(args.api_url.rstrip("/") + "/check-sync", {
                "document_id": case["id"], "text": text,
                "metadata": {"benchmark_dataset": manifest["dataset_id"]},
            })
            score = result["plagiarism_score"]
            if not isinstance(score, (int, float)) or not 0 <= score <= 100:
                raise ValueError("Invalid API plagiarism_score")
            report["cases"].append({
                "id": case["id"], "sha256": case["sha256"],
                "source_group": case["source_group"],
                "expected_positive": case.get("expected_positive"),
                "predicted_positive": score >= args.threshold,
                "wall_time_ms": (time.perf_counter() - start) * 1000,
                "response": result,
            })
        labelled = [c for c in report["cases"] if c["expected_positive"] is not None]
        if len(labelled) == len(report["cases"]):
            report["accuracy"] = sum(c["expected_positive"] == c["predicted_positive"]
                                     for c in labelled) / len(labelled)
        report["status"] = "completed"
        report["localization_metrics"] = None
        report["localization_note"] = (
            "Requires independently annotated spans in the engine's cleaned-text "
            "coordinate system; raw PAN offsets must not be compared directly."
        )
    except (OSError, ValueError, KeyError) as exc:
        report["error"] = str(exc)
    finally:
        timer.cancel()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "cases": len(report["cases"]),
                      "output": str(args.output)}))
    return 0 if report["status"] == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
