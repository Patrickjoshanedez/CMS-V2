"""
Winnowing Algorithm — Rabin-Karp Rolling Hash + Fingerprint Selection.

Theory
------
The Winnowing algorithm (Schleimer et al., 2003) is the gold standard for
exact-match plagiarism detection.  It works in two stages:

1.  **K-gram hashing (Rabin-Karp):** A sliding window of length ``k`` is
    moved one character at a time across the text.  Each position produces a
    hash value.  The Rabin-Karp recurrence lets us compute each new hash in
    O(1) by "rolling off" the leftmost character and "rolling in" the
    rightmost one.

2.  **Winnowing (fingerprint selection):** A second window of size ``w`` slides
    over the hash array.  We record the *minimum* hash in each window
    (with position tie-breaking to the rightmost occurrence) as a
    fingerprint.  Only those selected minima form the document's fingerprint
    set.  Because the same minimum will be chosen by both documents even when
    their window positions are offset, guaranteed-match properties hold.

Guaranteed property:
    If two documents share any substring of length ≥ k + w - 1, at least one
    common fingerprint will be detected.

Character-offset tracking
--------------------------
Every fingerprint carries the character start-position of its k-gram, which
lets us map each matching fingerprint directly back to
``[start_pos, start_pos + k)`` in the submitted text — the exact span that
will be highlighted.

Performance
-----------
* Time complexity:  O(n) for hashing, O(n) for windowing → O(n) overall.
* Space complexity: O(n / w) fingerprints per document (sub-linear).
* Python implementation uses a Mersenne prime modulus (2^61 − 1) to keep
  hashes collision-resistant without a bignum explosion.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# Rolling hash parameters
_BASE: int = 31
_MOD: int = (1 << 61) - 1  # Mersenne prime — efficient for large-modulus arithmetic


# ─────────────────────────────────────────────────────────────────────────────
# Data types
# ─────────────────────────────────────────────────────────────────────────────


class Fingerprint(NamedTuple):
    """A single selected fingerprint from the Winnowing pass.

    Attributes:
        hash_val:    Rabin-Karp hash integer for the k-gram.
        char_start:  Inclusive character start offset of the k-gram in the
                     original text.
    """

    hash_val: int
    char_start: int


@dataclass(slots=True)
class MatchSpan:
    """A contiguous matched span in the submitted document.

    After the Winnowing comparison, individual k-gram spans are merged into
    longer contiguous spans.  This struct represents one such merged region.

    Attributes:
        start:          Inclusive character start in the submitted text.
        end:            Exclusive character end in the submitted text.
        source_doc_id:  ID of the corpus document that produced this match.
        common_hashes:  Number of shared fingerprints that contributed to the span.
        jaccard:        Jaccard coefficient between the submitted text's full
                        fingerprint set and this source document's fingerprint set —
                        represents overall textual overlap.
    """

    start: int
    end: int
    source_doc_id: str
    common_hashes: int
    jaccard: float


# ─────────────────────────────────────────────────────────────────────────────
# Core Rabin-Karp rolling hash
# ─────────────────────────────────────────────────────────────────────────────


def compute_kgram_hashes(text: str, k: int) -> list[tuple[int, int]]:
    """Compute rolling Rabin-Karp hashes for all k-grams in ``text``.

    Returns a list of ``(hash_value, char_start)`` tuples — one per k-gram,
    in order.  The char_start is the 0-based character index where the k-gram
    begins in the original text.

    Args:
        text: Cleaned plain-text string.
        k:    K-gram length (number of characters).

    Returns:
        List of ``(hash_int, start_pos)`` pairs, length ``max(0, len(text) - k + 1)``.

    Implementation notes:
        We work with Unicode code points (``ord(c)``), so multi-byte characters
        are handled correctly without converting to bytes first.

        The recurrence is:
            h_new = ((h_old - ord(text[i-1]) * pk) * BASE + ord(text[i+k-1])) % MOD
        where pk = BASE^(k-1) % MOD (pre-computed once).
    """
    n = len(text)
    if n < k or k <= 0:
        return []

    results: list[tuple[int, int]] = []

    # Pre-compute BASE^(k-1) mod MOD for the "roll-off" step
    pk: int = pow(_BASE, k - 1, _MOD)

    # Compute initial hash for text[0:k]
    h: int = 0
    for c in text[:k]:
        h = (h * _BASE + ord(c)) % _MOD
    results.append((h, 0))

    # Slide the window one character at a time
    for i in range(1, n - k + 1):
        # Roll off text[i-1], roll in text[i + k - 1]
        h = (h - ord(text[i - 1]) * pk) % _MOD
        h = (h * _BASE + ord(text[i + k - 1])) % _MOD
        results.append((h, i))

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Winnowing fingerprint selection
# ─────────────────────────────────────────────────────────────────────────────


def winnow(hashes: list[tuple[int, int]], w: int) -> dict[int, int]:
    """Select fingerprints from ``hashes`` using the Winnowing algorithm.

    For each window of size ``w`` in the hash array, the *minimum* hash value
    is selected as a fingerprint.  When there are multiple positions with the
    same minimum, the rightmost one is selected (this ensures that any long
    common substring will always produce at least one shared fingerprint, even
    when the windows are misaligned between documents).

    Duplicate fingerprints (same hash value selected in overlapping windows)
    are collapsed — each unique hash is stored once with its *earliest*
    char_start position.  This de-duplicated dict is efficient for set
    intersection during corpus comparison.

    Args:
        hashes: Output of :func:`compute_kgram_hashes`.
        w:      Window size (number of k-gram hashes in each window).

    Returns:
        Dict mapping ``hash_value → char_start`` for every selected fingerprint.
        The dict is ordered by char_start (Python 3.7+ dict insertion order).
    """
    if not hashes:
        return {}

    n = len(hashes)
    fingerprints: dict[int, int] = {}  # hash_val → earliest char_start

    if n < w:
        # Text is shorter than one full window — select all hashes
        for h, pos in hashes:
            if h not in fingerprints:
                fingerprints[h] = pos
        return fingerprints

    # Slide a window of size w, selecting the rightmost minimum each time
    prev_min_idx: int = -1

    for i in range(n - w + 1):
        window = hashes[i : i + w]

        # Find the rightmost minimum in this window
        min_val, min_pos = window[-1]
        for h, pos in reversed(window[:-1]):
            if h <= min_val:
                min_val, min_pos = h, pos

        # Only add if this is a newly selected position
        if min_pos != prev_min_idx:
            if min_val not in fingerprints:
                fingerprints[min_val] = min_pos
            prev_min_idx = min_pos

    return fingerprints


# ─────────────────────────────────────────────────────────────────────────────
# Document fingerprint index
# ─────────────────────────────────────────────────────────────────────────────


def compute_document_fingerprints(text: str, k: int, w: int) -> dict[int, int]:
    """Compute the complete Winnowing fingerprint set for a document.

    This is the composition of :func:`compute_kgram_hashes` → :func:`winnow`,
    provided as a convenience helper.

    Args:
        text: Cleaned text string.
        k:    K-gram size.
        w:    Window size.

    Returns:
        Fingerprint dict ``{hash_val: char_start}``.
    """
    hashes = compute_kgram_hashes(text, k)
    return winnow(hashes, w)


# ─────────────────────────────────────────────────────────────────────────────
# Span matching and merging
# ─────────────────────────────────────────────────────────────────────────────


def _merge_spans(
    raw_spans: list[tuple[int, int]],
    merge_gap: int,
    min_span: int,
) -> list[tuple[int, int]]:
    """Merge overlapping or adjacent character spans.

    Two spans ``[a, b)`` and ``[c, d)`` are merged if ``c - b <= merge_gap``.
    Merged spans shorter than ``min_span`` characters are discarded.

    Args:
        raw_spans:  List of ``(start, end)`` tuples (may be unsorted).
        merge_gap:  Maximum gap in characters between spans to trigger merging.
        min_span:   Minimum character length to keep a span.

    Returns:
        Sorted, merged list of ``(start, end)`` tuples.
    """
    if not raw_spans:
        return []

    sorted_spans = sorted(raw_spans)
    merged: list[tuple[int, int]] = []
    cur_start, cur_end = sorted_spans[0]

    for start, end in sorted_spans[1:]:
        if start - cur_end <= merge_gap:
            cur_end = max(cur_end, end)
        else:
            if cur_end - cur_start >= min_span:
                merged.append((cur_start, cur_end))
            cur_start, cur_end = start, end

    if cur_end - cur_start >= min_span:
        merged.append((cur_start, cur_end))

    return merged


def compare_fingerprints(
    submitted_fps: dict[int, int],
    corpus_fps: dict[int, int],
    corpus_doc_id: str,
    k: int,
    merge_gap: int = 20,
    min_span: int = 30,
) -> MatchSpan | None:
    """Detect matching spans between a submitted document and one corpus document.

    Algorithm:
        1. Compute the intersection of the two fingerprint hash-sets.
        2. For each common hash, record ``(start, start + k)`` from the
           *submitted* fingerprint's char_start as a raw span.
        3. Merge overlapping / near-adjacent spans.
        4. Compute Jaccard similarity over the full fingerprint sets.
        5. Return the *single* representative :class:`MatchSpan` describing
           the largest contiguous matched region (or ``None`` if no match).

    Note: This function is called *once per corpus document* — the outer loop
    over corpus documents lives in :class:`PlagiarismEngine`.

    Args:
        submitted_fps:  Fingerprint dict for the submitted document.
        corpus_fps:     Fingerprint dict for one corpus document.
        corpus_doc_id:  ID of the corpus document.
        k:              K-gram length (used to compute span ends).
        merge_gap:      Passed to :func:`_merge_spans`.
        min_span:       Passed to :func:`_merge_spans`.

    Returns:
        :class:`MatchSpan` encompassing the best match, or ``None`` if there
        is no meaningful overlap.
    """
    submitted_set = set(submitted_fps.keys())
    corpus_set = set(corpus_fps.keys())

    common = submitted_set & corpus_set
    if not common:
        return None

    # Jaccard over full fingerprint sets
    jaccard = len(common) / len(submitted_set | corpus_set)

    # Build raw spans in submitted text
    raw: list[tuple[int, int]] = [
        (submitted_fps[h], submitted_fps[h] + k) for h in common
    ]

    merged = _merge_spans(raw, merge_gap, min_span)
    if not merged:
        return None

    # Return the span covering the widest matched region
    best_start = merged[0][0]
    best_end = merged[-1][1]

    return MatchSpan(
        start=best_start,
        end=best_end,
        source_doc_id=corpus_doc_id,
        common_hashes=len(common),
        jaccard=jaccard,
    )


def get_all_match_spans(
    submitted_fps: dict[int, int],
    corpus_fps: dict[int, int],
    k: int,
    merge_gap: int = 20,
    min_span: int = 30,
) -> list[tuple[int, int]]:
    """Return ALL merged match spans between a submitted doc and one corpus doc.

    Unlike :func:`compare_fingerprints`, this returns the full list of merged
    spans instead of collapsing them into one.  Used when the engine wants to
    highlight multiple non-contiguous regions against the same source.

    Args:
        submitted_fps:  Fingerprints of the submitted document.
        corpus_fps:     Fingerprints of one corpus document.
        k:              K-gram length.
        merge_gap:      Gap tolerance for merging, in characters.
        min_span:       Minimum span length to report.

    Returns:
        Sorted list of ``(start, end)`` character tuples.
    """
    common = set(submitted_fps.keys()) & set(corpus_fps.keys())
    if not common:
        return []

    raw: list[tuple[int, int]] = [
        (submitted_fps[h], submitted_fps[h] + k) for h in common
    ]
    return _merge_spans(raw, merge_gap, min_span)


def count_unique_matched_chars(
    all_spans: list[tuple[int, int]],
    text_length: int,
) -> int:
    """Count the number of unique character positions covered by ``all_spans``.

    Overlapping spans are de-duplicated by working with a coverage array.
    This gives the true number of matched characters for the overall
    originality score calculation.

    Args:
        all_spans:    List of ``(start, end)`` tuples (may overlap).
        text_length:  Total length of the submitted text.

    Returns:
        Integer character count unique to all match spans combined.
    """
    if not all_spans or text_length <= 0:
        return 0

    covered = bytearray(text_length)  # 0 or 1 per character position
    for start, end in all_spans:
        s = max(0, start)
        e = min(text_length, end)
        for i in range(s, e):
            covered[i] = 1

    return sum(covered)
