"""
Text preprocessing utilities for the Plagiarism Detection Engine.

Preprocessing is applied BEFORE both Winnowing and embedding so that
both algorithms work on clean, normalised text. Operations are:

1. Strip HTML/boilerplate artefacts
2. Normalise unicode (NFKC decomposition)
3. Collapse whitespace
4. Split into paragraph segments (used for embedding)

All functions are pure and stateless — safe to call from threads/processes.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


# ─────────────────────────────────────────────────────────────────────────────
# Constants & compiled patterns
# ─────────────────────────────────────────────────────────────────────────────

# Boilerplate phrases often found in capstone title pages.  These are stripped
# early so they don't pollute similarity scores.
_BOILERPLATE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"all\s+rights?\s+reserved", re.IGNORECASE),
    re.compile(r"submitted\s+in\s+partial\s+fulfillment", re.IGNORECASE),
    re.compile(r"bachelor\s+of\s+science\s+in", re.IGNORECASE),
    re.compile(r"in\s+partial\s+fulfillment\s+of\s+the\s+requirements", re.IGNORECASE),
    re.compile(r"table\s+of\s+contents", re.IGNORECASE),
    re.compile(r"list\s+of\s+(figures|tables|abbreviations)", re.IGNORECASE),
    re.compile(r"chapter\s+\d+", re.IGNORECASE),
    re.compile(r"references?\s*$", re.IGNORECASE | re.MULTILINE),
]

# HTML / XML tags
_HTML_TAG_RE = re.compile(r"<[^>]+>", re.DOTALL)

# Excessive whitespace (3+ spaces, 3+ newlines)
_MULTI_SPACE_RE = re.compile(r"[ \t]{3,}")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")

# Non-printable control characters (except \n and \t)
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")

# Paragraph splitter — blank line(s) between text blocks
_PARAGRAPH_SPLIT_RE = re.compile(r"\n{2,}")

# Reference / bibliography detection — stop indexing after this marker
_REFERENCES_MARKER_RE = re.compile(
    r"^\s*(references|bibliography|works\s+cited)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


# ─────────────────────────────────────────────────────────────────────────────
# Paragraph segment dataclass
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(slots=True)
class TextSegment:
    """A single paragraph segment with its character position in the cleaned text.

    Attributes:
        text:        The paragraph text (already cleaned).
        char_start:  Inclusive start offset in the parent cleaned string.
        char_end:    Exclusive end offset in the parent cleaned string.
        word_count:  Pre-computed word count for fast filtering.
    """

    text: str
    char_start: int
    char_end: int
    word_count: int


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


def clean_text(raw: str) -> str:
    """Return a normalised, stripped version of ``raw`` suitable for hashing.

    Pipeline:
        1. Unicode NFKC normalisation (handles ligatures, full-width chars, etc.)
        2. Strip HTML/XML tags
        3. Remove control characters
        4. Strip boilerplate phrases
        5. Truncate at the references section (not part of original work)
        6. Collapse whitespace
        7. Strip leading/trailing whitespace

    Args:
        raw: Arbitrary string (extracted from PDF, DOCX, etc.).

    Returns:
        Cleaned plain-text string, ready for Winnowing and embedding.
    """
    if not raw:
        return ""

    # Step 1: Unicode normalisation
    text = unicodedata.normalize("NFKC", raw)

    # Step 2: Strip HTML tags
    text = _HTML_TAG_RE.sub(" ", text)

    # Step 3: Remove control characters
    text = _CONTROL_CHAR_RE.sub("", text)

    # Step 4: Strip boilerplate phrases (replace with single space)
    for pattern in _BOILERPLATE_PATTERNS:
        text = pattern.sub(" ", text)

    # Step 5: Truncate at references/bibliography section
    ref_match = _REFERENCES_MARKER_RE.search(text)
    if ref_match:
        text = text[: ref_match.start()]

    # Step 6: Collapse excessive whitespace
    text = _MULTI_SPACE_RE.sub(" ", text)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)

    # Step 7: Final strip
    return text.strip()


def segment_paragraphs(
    cleaned_text: str,
    min_words: int = 12,
) -> list[TextSegment]:
    """Split ``cleaned_text`` into paragraph segments, tracking char offsets.

    Only paragraphs with at least ``min_words`` words are returned. This
    filters out headings, one-liners, and page-number artefacts that would
    produce noisy embeddings.

    Args:
        cleaned_text: Output of :func:`clean_text`.
        min_words:    Minimum word count for a segment to be included.

    Returns:
        Ordered list of :class:`TextSegment` objects.
    """
    if not cleaned_text:
        return []

    segments: list[TextSegment] = []
    cursor = 0

    for raw_para in _PARAGRAPH_SPLIT_RE.split(cleaned_text):
        para = raw_para.strip()
        if not para:
            # Skip empty paragraphs but advance cursor
            # (find the actual position in the cleaned_text)
            idx = cleaned_text.find(raw_para, cursor)
            if idx != -1:
                cursor = idx + len(raw_para)
            continue

        word_count = len(para.split())
        if word_count < min_words:
            idx = cleaned_text.find(para, cursor)
            if idx != -1:
                cursor = idx + len(para)
            continue

        # Find where this paragraph sits in the cleaned_text
        idx = cleaned_text.find(para, cursor)
        if idx == -1:
            # Fallback — shouldn't happen on well-formed input
            cursor += len(para)
            continue

        char_start = idx
        char_end = idx + len(para)
        cursor = char_end

        segments.append(
            TextSegment(
                text=para,
                char_start=char_start,
                char_end=char_end,
                word_count=word_count,
            )
        )

    return segments


def extract_source_snippet(
    source_text: str,
    match_text: str,
    context_chars: int = 200,
) -> str:
    """Extract a contextual snippet from ``source_text`` around ``match_text``.

    Searches for the first occurrence of ``match_text`` (first 40 chars are
    used as an anchor to handle partial matches against longer source docs).
    Returns up to ``context_chars`` characters centred around the match.

    Args:
        source_text:   The full text of the matching source document.
        match_text:    The matched passage we want context for.
        context_chars: Total character width to include before + after match.

    Returns:
        A 1-line string snippet, safe for display in the detail panel.
    """
    if not source_text or not match_text:
        return ""

    # Use first 40 characters as anchor to tolerate minor differences
    anchor = match_text[:40].strip()
    pos = source_text.lower().find(anchor.lower())

    if pos == -1:
        # Fallback: return beginning of the source
        snippet = source_text[:context_chars]
    else:
        half = context_chars // 2
        start = max(0, pos - half)
        end = min(len(source_text), pos + len(anchor) + half)
        snippet = source_text[start:end]

        # Add ellipsis markers
        if start > 0:
            snippet = "…" + snippet.lstrip()
        if end < len(source_text):
            snippet = snippet.rstrip() + "…"

    # Collapse internal newlines for single-line display
    return " ".join(snippet.split())
