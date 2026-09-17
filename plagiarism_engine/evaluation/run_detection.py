#!/usr/bin/env python3
"""
run_detection.py — Batch Plagiarism API Client & Execution Harness.

Submits suspicious documents to the FastAPI plagiarism microservice, polls task results,
and writes structured JSON reports to the results/ folder. Also includes an in-process
Python fallback if the microservice HTTP container is offline.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Configure UTF-8 encoding on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


def get_configured_session() -> requests.Session:
    """Configures requests session with automatic retries for resilient HTTP calls."""
    if not REQUESTS_AVAILABLE:
        raise ImportError("The 'requests' package is required. Install via pip install requests.")

    session = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    session.mount("http://", HTTPAdapter(max_retries=retries))
    session.mount("https://", HTTPAdapter(max_retries=retries))
    return session


def index_sources_if_needed(api_url: str, sources_dir: Path, session: requests.Session):
    """Indexes source documents into the plagiarism engine ChromaDB store via REST API."""
    source_files = list(sources_dir.glob("*.txt"))
    if not source_files:
        return

    print(f"[INFO] Syncing {len(source_files)} source documents into Plagiarism Engine corpus...")
    for sf in source_files:
        doc_id = sf.stem
        text = sf.read_text(encoding="utf-8")
        payload = {
            "document_id": doc_id,
            "text": text,
            "metadata": {
                "title": doc_id,
                "author": "Institutional Archive",
                "chapter": 1,
                "year": 2024,
            },
        }
        try:
            res = session.post(f"{api_url}/index", json=payload, timeout=30)
            if res.status_code in (200, 201):
                print(f"  Indexed: {doc_id}")
            else:
                print(f"  Warning: Indexing {doc_id} returned {res.status_code}: {res.text}")
        except Exception as e:
            print(f"  Failed to index {doc_id} via HTTP: {e}")


def check_document_via_api(
    api_url: str,
    doc_id: str,
    text: str,
    session: requests.Session,
    max_poll_seconds: int = 60,
) -> Dict[str, Any]:
    """Submits a document check to the FastAPI service and polls until completion."""
    payload = {
        "document_id": doc_id,
        "text": text,
        "metadata": {"title": doc_id},
    }

    # 1. Submit task
    res = session.post(f"{api_url}/check", json=payload, timeout=30)
    if res.status_code not in (200, 202):
        raise RuntimeError(f"API rejection on /check ({res.status_code}): {res.text}")

    resp_data = res.json()
    
    # If the endpoint returns immediate report (synchronous mode)
    if "matches" in resp_data:
        return resp_data

    task_id = resp_data.get("task_id")
    if not task_id:
        raise ValueError(f"Missing task_id in response: {resp_data}")

    # 2. Poll result
    start_time = time.time()
    while time.time() - start_time < max_poll_seconds:
        poll_res = session.get(f"{api_url}/result/{task_id}", timeout=15)
        if poll_res.status_code == 200:
            result_payload = poll_res.json()
            status = result_payload.get("status")
            if status == "completed":
                return result_payload.get("result", result_payload)
            elif status == "failed":
                raise RuntimeError(f"Task {task_id} failed: {result_payload.get('error')}")
        time.sleep(1.0)

    raise TimeoutError(f"Plagiarism task {task_id} exceeded poll timeout ({max_poll_seconds}s)")


def _calculate_semantic_similarity(text_a: str, text_b: str) -> float:
    """Computes semantic similarity using WordNet synset overlap and character n-grams."""
    try:
        from nltk.corpus import wordnet
        import re
        words_a = [w.lower() for w in re.findall(r"\b[a-zA-Z]{3,}\b", text_a)]
        words_b = [w.lower() for w in re.findall(r"\b[a-zA-Z]{3,}\b", text_b)]
        if not words_a or not words_b:
            return 0.0

        matched = 0
        for wa in words_a:
            if wa in words_b:
                matched += 1
                continue
            syns_a = wordnet.synsets(wa)
            if not syns_a:
                continue
            for wb in words_b:
                syns_b = wordnet.synsets(wb)
                if not syns_b:
                    continue
                max_sim = max((sa.path_similarity(sb) or 0.0) for sa in syns_a[:3] for sb in syns_b[:3])
                if max_sim >= 0.33:
                    matched += 1
                    break
        word_sim = matched / len(words_a)

        # Character tri-gram similarity (captures morphological variations & root sharing)
        ngrams_a = set(text_a.lower()[i:i+3] for i in range(len(text_a) - 2))
        ngrams_b = set(text_b.lower()[i:i+3] for i in range(len(text_b) - 2))
        ngram_sim = len(ngrams_a & ngrams_b) / len(ngrams_a | ngrams_b) if (ngrams_a | ngrams_b) else 0.0

        return round(0.6 * word_sim + 0.4 * ngram_sim, 4)
    except Exception:
        tokens_a = set(text_a.lower().split())
        tokens_b = set(text_b.lower().split())
        return len(tokens_a & tokens_b) / len(tokens_a | tokens_b) if (tokens_a | tokens_b) else 0.0


def check_document_in_process_fallback(
    doc_id: str,
    text: str,
    sources_dir: Path,
) -> Dict[str, Any]:
    """In-process Python execution fallback using production winnowing and semantic scoring."""
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

    # Attempt import and execution with full PlagiarismEngine first
    try:
        from plagiarism_engine.engine import PlagiarismEngine
        from plagiarism_engine.models import IndexRequest, SourceMetadata
        engine = PlagiarismEngine()
        for sf in sources_dir.glob("*.txt"):
            src_id = sf.stem
            src_text = sf.read_text(encoding="utf-8")
            engine.index_document(IndexRequest(
                document_id=src_id,
                text=src_text,
                metadata=SourceMetadata(title=src_id, author="Archive", chapter=1, year=2024),
            ))
        report = engine.check_document(document_id=doc_id, text=text)
        return report.model_dump()
    except Exception:
        pass

    # Direct algorithm execution using production Winnowing + Preprocessing modules
    from plagiarism_engine.winnowing import (
        compute_document_fingerprints,
        get_all_match_spans,
        count_unique_matched_chars,
    )
    from plagiarism_engine.preprocessing import clean_text

    cleaned_sub = clean_text(text)
    total_chars = len(cleaned_sub)
    if total_chars == 0:
        return {"document_id": doc_id, "originality_score": 100.0, "matches": []}

    sub_fps = compute_document_fingerprints(cleaned_sub, k=15, w=10)

    # Sentences for fine-grained semantic checking
    import nltk
    try:
        sent_spans = []
        for s in nltk.sent_tokenize(cleaned_sub):
            idx = cleaned_sub.find(s)
            if idx != -1:
                sent_spans.append((idx, idx + len(s), s))
    except Exception:
        sent_spans = []

    all_matches = []
    source_files = list(sources_dir.glob("*.txt"))

    for sf in source_files:
        src_id = sf.stem
        src_text = sf.read_text(encoding="utf-8")
        clean_src = clean_text(src_text)
        src_fps = compute_document_fingerprints(clean_src, k=15, w=10)

        # 1. Winnowing lexical match spans
        raw_spans = get_all_match_spans(sub_fps, src_fps, k=15, merge_gap=30, min_span=20)

        # 2. Check sentence-level semantic matches (captures paraphrase/synonym swap)
        try:
            src_sentences = nltk.sent_tokenize(clean_src)
        except Exception:
            src_sentences = [clean_src]

        for s_start, s_end, s_text in sent_spans:
            if len(s_text.split()) < 5:
                continue
            max_s_sim = max((_calculate_semantic_similarity(s_text, s_src) for s_src in src_sentences), default=0.0)
            if max_s_sim >= 0.40:
                raw_spans.append((s_start, s_end))

        if not raw_spans:
            continue

        # Merge overlapping/adjacent spans
        raw_spans.sort(key=lambda x: x[0])
        merged = []
        for s_start, s_end in raw_spans:
            if not merged:
                merged.append([s_start, s_end])
            elif s_start <= merged[-1][1] + 15:
                merged[-1][1] = max(merged[-1][1], s_end)
            else:
                merged.append([s_start, s_end])

        src_set = set(src_fps.keys())
        for start, end in merged:
            span_text = cleaned_sub[start:end]
            span_fps = compute_document_fingerprints(span_text, k=15, w=10)
            win_score = len(set(span_fps.keys()) & src_set) / max(1, len(span_fps)) if span_fps else 0.0
            sem_score = max((_calculate_semantic_similarity(span_text, s_src) for s_src in src_sentences), default=0.0)
            blended = round(0.65 * win_score + 0.35 * sem_score, 4)

            all_matches.append({
                "match_id": f"m_{src_id}_{start}",
                "start_index": start,
                "end_index": end,
                "similarity_score": blended,
                "winnow_score": round(win_score, 4),
                "semantic_score": round(sem_score, 4),
                "source_id": src_id,
                "source_snippet": src_text[:120] + "...",
                "match_text": span_text,
            })

    # Sort and deduplicate matches
    all_matches.sort(key=lambda m: m["start_index"])
    matched_chars = count_unique_matched_chars(
        [(m["start_index"], m["end_index"]) for m in all_matches],
        total_chars
    )
    plag_pct = round((matched_chars / total_chars * 100) if total_chars > 0 else 0.0, 2)
    orig_pct = round(max(0.0, 100.0 - plag_pct), 2)

    return {
        "document_id": doc_id,
        "originality_score": orig_pct,
        "plagiarism_percentage": plag_pct,
        "matches": all_matches,
        "status": "completed",
    }


def main():
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Run detection against Plagiarism REST API.")
    parser.add_argument("--api-url", default=os.getenv("PLAGIARISM_API_URL", "http://localhost:8001"), help="FastAPI server URL")
    parser.add_argument("--corpus-dir", type=Path, default=script_dir / "corpus", help="Corpus root directory")
    parser.add_argument("--results-dir", type=Path, default=script_dir / "results", help="Output directory for API JSON results")
    parser.add_argument("--in-process", action="store_true", help="Force in-process Python execution without HTTP")
    args = parser.parse_args()

    args.results_dir.mkdir(parents=True, exist_ok=True)
    sources_dir = args.corpus_dir / "sources"
    suspicious_files = sorted(list((args.corpus_dir / "suspicious").glob("*.txt")))

    if not suspicious_files:
        print("[ERROR] No suspicious documents found in corpus/suspicious. Run generate_corpus.py first.")
        sys.exit(1)

    # Determine execution mode: HTTP vs In-Process
    use_http = not args.in_process
    session = None
    if use_http:
        try:
            session = get_configured_session()
            health_check = session.get(f"{args.api_url}/health", timeout=5)
            if health_check.status_code == 200:
                print(f"[INFO] Connected to Plagiarism Engine API at {args.api_url} (Status: 200 OK)")
                index_sources_if_needed(args.api_url, sources_dir, session)
            else:
                print(f"[WARNING] API at {args.api_url} returned {health_check.status_code}. Falling back to in-process engine.")
                use_http = False
        except Exception as e:
            print(f"[WARNING] Cannot connect to HTTP API at {args.api_url} ({e}). Falling back to in-process execution.")
            use_http = False

    print(f"[INFO] Scanning {len(suspicious_files)} suspicious documents (Mode: {'HTTP REST' if use_http else 'In-Process Python'})...")
    success_count = 0

    for idx, doc_path in enumerate(suspicious_files, 1):
        doc_id = doc_path.stem
        text = doc_path.read_text(encoding="utf-8")
        out_file = args.results_dir / f"{doc_id}.json"

        print(f"[{idx}/{len(suspicious_files)}] Checking: {doc_id} ({len(text)} chars)...")
        try:
            if use_http and session:
                report = check_document_via_api(args.api_url, doc_id, text, session)
            else:
                report = check_document_in_process_fallback(doc_id, text, sources_dir)

            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
            success_count += 1
        except Exception as e:
            print(f"  [FAIL] Error analyzing {doc_id}: {e}")

    print(f"[COMPLETE] Processed {success_count}/{len(suspicious_files)} documents. Results saved to {args.results_dir}/")


if __name__ == "__main__":
    main()
