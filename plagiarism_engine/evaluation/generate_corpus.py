#!/usr/bin/env python3
"""
generate_corpus.py — Automated Plagiarism Ground-Truth Corpus Generator.

Generates controlled suspicious documents with known character-level injection spans
across four primary manipulation categories:
  1. Verbatim Copying (1:1 identical reproduction)
  2. Synonym Swapping (NLTK WordNet substitution)
  3. Semantic Paraphrasing (syntactic restructuring and connector modulation)
  4. Structural Changes (sentence reordering and clause shuffling)

Outputs:
  - corpus/sources/*.txt       (Original source documents)
  - corpus/suspicious/*.txt    (Synthesized suspicious documents)
  - corpus/ground_truth.json   (Machine-readable character spans)
  - corpus/ground_truth.xml    (PAN standard XML format)
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Tuple

# Configure UTF-8 encoding on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure NLTK resources are available
try:
    import nltk
    from nltk.corpus import wordnet
    for res in ("punkt", "wordnet", "omw-1.4"):
        try:
            nltk.data.find(f"corpora/{res}" if res != "punkt" else f"tokenizers/{res}")
        except LookupError:
            nltk.download(res, quiet=True)
except ImportError:
    print("[WARNING] NLTK is not installed. Fallback rule-based transformations will be used.")
    nltk = None
    wordnet = None

try:
    import nlpaug.augmenter.word as naw
    NLPAUG_AVAILABLE = True
except ImportError:
    NLPAUG_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────────
# Text Manipulation Functions
# ─────────────────────────────────────────────────────────────────────────────

def manipulate_verbatim(text: str) -> str:
    """Technique 1: Verbatim Copying (1:1 direct reproduction)."""
    return text.strip()


def manipulate_synonym_swap(text: str, swap_prob: float = 0.30) -> str:
    """Technique 2: Synonym Swapping using WordNet or heuristic synonyms."""
    if not nltk or not wordnet:
        # Simple heuristic fallback
        replacements = {
            "system": "framework", "methodology": "approach", "documents": "manuscripts",
            "plagiarism": "academic copying", "evaluate": "assess", "algorithm": "procedure",
            "detect": "identify", "database": "data repository", "research": "investigation"
        }
        words = text.split()
        return " ".join(replacements.get(w.lower(), w) for w in words)

    words = nltk.word_tokenize(text)
    augmented_words = []
    
    for word in words:
        if random.random() < swap_prob and word.isalpha() and len(word) > 3:
            synonyms = []
            for syn in wordnet.synsets(word):
                for lemma in syn.lemmas():
                    name = lemma.name().replace("_", " ")
                    if name.lower() != word.lower():
                        synonyms.append(name)
            if synonyms:
                augmented_words.append(random.choice(synonyms))
                continue
        augmented_words.append(word)
        
    return " ".join(augmented_words)


def manipulate_paraphrase(text: str) -> str:
    """Technique 3: Semantic Paraphrasing.
    Uses contextual word embeddings if nlpaug is present, with heuristic fallback.
    """
    if NLPAUG_AVAILABLE:
        try:
            aug = naw.SynonymAug(aug_src="wordnet", aug_p=0.35)
            res = aug.augment(text)
            return res[0] if isinstance(res, list) else res
        except Exception:
            pass

    # Heuristic syntax inversion & connector swapping
    if nltk:
        sentences = nltk.sent_tokenize(text)
    else:
        sentences = [s.strip() for s in text.split(".") if s.strip()]

    paraphrased_sents = []
    connectors = ["Furthermore, ", "Consequently, ", "In particular, ", "Specifically, "]
    
    for s in sentences:
        s_clean = s.strip()
        if random.random() < 0.4:
            s_clean = random.choice(connectors) + s_clean[0].lower() + s_clean[1:]
        paraphrased_sents.append(manipulate_synonym_swap(s_clean, swap_prob=0.25))
        
    return " ".join(paraphrased_sents)


def manipulate_structural(text: str) -> str:
    """Technique 4: Structural Changes (Sentence shuffling & clause inversion)."""
    if nltk:
        sentences = nltk.sent_tokenize(text)
    else:
        sentences = [s.strip() for s in text.split(".") if s.strip()]

    if len(sentences) > 2:
        random.shuffle(sentences)
    return " ".join(sentences)


MANIPULATION_DISPATCH = {
    "verbatim": manipulate_verbatim,
    "synonym_swap": manipulate_synonym_swap,
    "paraphrase": manipulate_paraphrase,
    "structural": manipulate_structural,
}


# ─────────────────────────────────────────────────────────────────────────────
# Background Non-Plagiarized Text (Negative Controls)
# ─────────────────────────────────────────────────────────────────────────────

FILLER_PARAGRAPHS = [
    (
        "Academic research methodologies require strict adherence to standardized data collection "
        "protocols and institutional ethics compliance. In capstone software engineering workflows, "
        "requirements traceability ensures that functional specifications directly align with user stories."
    ),
    (
        "The development environment consists of distributed microservices communicating over REST APIs. "
        "Asynchronous task brokers decouple heavy natural language processing pipelines from user-facing "
        "submission portals, ensuring high platform availability and responsive interface rendering."
    ),
    (
        "Database normalization eliminates operational redundancy while preserving transactional integrity. "
        "In document-oriented databases, compound indexes optimize filter queries across academic years and "
        "department classifications, allowing fast lookup during defense scheduling periods."
    )
]


# ─────────────────────────────────────────────────────────────────────────────
# Corpus Assembly
# ─────────────────────────────────────────────────────────────────────────────

def create_suspicious_document(
    sources: List[Tuple[str, str]],
    target_injections: int = 3,
) -> Tuple[str, List[Dict]]:
    """Builds a single suspicious document with interleaved original and plagiarized text."""
    assembled_parts = []
    annotations = []
    current_char_offset = 0

    # Start with original background filler
    intro = random.choice(FILLER_PARAGRAPHS) + "\n\n"
    assembled_parts.append(intro)
    current_char_offset += len(intro)

    for i in range(target_injections):
        source_id, source_text = random.choice(sources)
        
        if nltk:
            src_sentences = nltk.sent_tokenize(source_text)
        else:
            src_sentences = [s.strip() for s in source_text.split(".") if s.strip()]

        if not src_sentences:
            continue
            
        start_sent = random.randint(0, max(0, len(src_sentences) - 3))
        snippet = " ".join(src_sentences[start_sent : start_sent + 2]).strip()
        
        if len(snippet) < 60:
            continue

        technique = random.choice(["verbatim", "synonym_swap", "paraphrase", "structural"])
        manipulated = MANIPULATION_DISPATCH[technique](snippet)

        # Record precise character boundaries
        plag_start = current_char_offset
        plag_end = plag_start + len(manipulated)

        assembled_parts.append(manipulated)
        assembled_parts.append("\n\n")
        current_char_offset += len(manipulated) + 2

        annotations.append({
            "passage_id": f"plag_{i+1}",
            "source_id": source_id,
            "technique": technique,
            "suspicious_start": plag_start,
            "suspicious_end": plag_end,
            "original_snippet": snippet[:100] + "...",
        })

        # Add intervening original text
        filler = random.choice(FILLER_PARAGRAPHS) + "\n\n"
        assembled_parts.append(filler)
        current_char_offset += len(filler)

    full_text = "".join(assembled_parts)
    return full_text, annotations


def export_ground_truth_xml(annotations_by_doc: Dict[str, List[Dict]], output_path: Path):
    """Exports ground truth annotations to standard PAN XML format."""
    root = ET.Element("document_corpus")
    for doc_id, passages in annotations_by_doc.items():
        doc_node = ET.SubElement(root, "document", id=doc_id)
        for p in passages:
            ET.SubElement(
                doc_node,
                "plagiarism",
                source_id=p["source_id"],
                technique=p["technique"],
                start=str(p["suspicious_start"]),
                end=str(p["suspicious_end"]),
            )
    tree = ET.ElementTree(root)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description="Generate controlled plagiarism test corpus.")
    script_dir = Path(__file__).resolve().parent
    parser.add_argument("--sources-dir", type=Path, default=script_dir / "corpus" / "sources", help="Folder containing source .txt files")
    parser.add_argument("--output-dir", type=Path, default=script_dir / "corpus", help="Output directory for generated dataset")
    parser.add_argument("--num-docs", type=int, default=10, help="Number of suspicious documents to synthesize")
    args = parser.parse_args()

    args.sources_dir.mkdir(parents=True, exist_ok=True)
    suspicious_dir = args.output_dir / "suspicious"
    suspicious_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load or synthesize source documents
    sources = []
    source_files = list(args.sources_dir.glob("*.txt"))
    if not source_files:
        print("[INFO] No source files found. Creating 5 synthetic baseline source archives...")
        for idx in range(1, 6):
            doc_id = f"source_thesis_{idx:03d}"
            text = (
                f"The BukSU Research Archive Document #{idx}. "
                "This study investigates machine learning applications in natural language processing. "
                "The algorithm utilizes n-gram character fingerprinting and Karp-Rabin hashing algorithms. "
                "Sliding window minimum selection suppresses noise while providing deterministic match bounds. "
                "Sentence transformers project text segments into 384-dimensional dense vector embeddings. "
                "Cosine similarity calculation evaluates conceptual paraphrasing across institutional theses."
            )
            src_file = args.sources_dir / f"{doc_id}.txt"
            src_file.write_text(text, encoding="utf-8")
            sources.append((doc_id, text))
    else:
        for f in source_files:
            sources.append((f.stem, f.read_text(encoding="utf-8")))

    # 2. Generate suspicious documents
    annotations_by_doc = {}
    print(f"[INFO] Generating {args.num_docs} suspicious documents with known injected plagiarism...")
    
    for i in range(1, args.num_docs + 1):
        doc_id = f"suspicious_doc_{i:03d}"
        doc_text, annotations = create_suspicious_document(sources, target_injections=random.randint(2, 4))
        
        doc_path = suspicious_dir / f"{doc_id}.txt"
        doc_path.write_text(doc_text, encoding="utf-8")
        annotations_by_doc[doc_id] = annotations

    # 3. Export ground truth files
    gt_json = args.output_dir / "ground_truth.json"
    gt_xml = args.output_dir / "ground_truth.xml"
    
    with open(gt_json, "w", encoding="utf-8") as f:
        json.dump(annotations_by_doc, f, indent=2)
        
    export_ground_truth_xml(annotations_by_doc, gt_xml)

    print("[SUCCESS] Corpus created successfully:")
    print(f"  - Suspicious Documents: {suspicious_dir} ({args.num_docs} files)")
    print(f"  - Ground Truth JSON:   {gt_json}")
    print(f"  - Ground Truth XML:    {gt_xml}")


if __name__ == "__main__":
    main()
