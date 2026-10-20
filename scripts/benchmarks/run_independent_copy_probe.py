"""Official API exact-copy probe against an isolated, temporary collection.

Requires the full-source manifest produced by the retained provenance fetcher.
Uses independently published source excerpts, not independent plagiarism labels.
One source group is reserved for validation; two distinct groups for testing.
"""
import argparse
import hashlib
import json
import os
import threading
import time
import urllib.request
from pathlib import Path


COLLECTION = "cms_independent_review_20261015"


def api(path, payload=None):
    request = urllib.request.Request(
        "http://127.0.0.1:8002" + path,
        data=None if payload is None else json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=("index", "check"), required=True)
    parser.add_argument("--case", type=int, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report = {"phase": args.phase, "status": "running",
              "scope": "Exact copying of first5000 body characters from independently published CC-BY manuscripts; no general plagiarism accuracy claim."}

    def save():
        args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    def watchdog():
        report.update(status="timeout", error="Watchdog110s timeout")
        save()
        os._exit(124)

    timer = threading.Timer(110, watchdog)
    timer.daemon = True
    timer.start()
    try:
        case = json.loads(args.manifest.read_text())["cases"][args.case]
        raw = (args.manifest.parent / case["path"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != case["sha256"]:
            raise ValueError("source checksum mismatch")
        text = raw.decode("utf-8")[:5000]
        report.update(source=case, excerpt_sha256=hashlib.sha256(text.encode()).hexdigest(),
                      excerpt_characters=len(text), split="validation" if args.case == 0 else "test",
                      threshold_percent=25)
        health = api("/health")
        report["health_before"] = health
        if health.get("chroma_collection") != COLLECTION:
            raise ValueError("Refusing source indexing/check: collection isolation not established")
        save()
        start = time.perf_counter()
        if args.phase == "index":
            result = api("/index/sync", {"document_id": case["id"], "text": text,
                                        "metadata": {"document_id": case["id"],
                                                     "title": case["attribution"],
                                                     "url": case["source_url"]}})
        else:
            result = api("/check-sync", {"document_id": "copy-" + case["id"], "text": text})
            score = result["plagiarism_score"]
            report["detected_at_predeclared_threshold"] = score >= 25
            total = result.get("total_characters", 0)
            report["copied_cleaned_character_coverage"] = (
                result.get("matched_characters", 0) / total if total else None
            )
            report["coverage_definition"] = (
                "All input characters are copied from indexed source. Fraction uses API-cleaned "
                "text totals and unique matched characters, not raw manuscript offset spans."
            )
        report.update(status="completed", response=result,
                      wall_time_ms=(time.perf_counter() - start) * 1000,
                      health_after=api("/health"))
    except (OSError, ValueError, KeyError, IndexError) as exc:
        report.update(status="blocked", error=str(exc))
    finally:
        timer.cancel()
        save()
    print(json.dumps({"status": report["status"], "source": report.get("source", {}).get("id"),
                      "phase": args.phase, "output": str(args.output)}))
    return 0 if report["status"] == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
