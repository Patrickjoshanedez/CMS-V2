"""
PlagiarismEngine — the orchestrating class that ties together all components.

Detection pipeline for ``check_document()``
-------------------------------------------

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                     PlagiarismEngine.check_document(text)               │
    │                                                                         │
    │  1. PREPROCESS                                                          │
    │     clean_text()  →  segment_paragraphs()                               │
    │                                                                         │
    │  2. EMBED (batch, normalised)                                           │
    │     EmbeddingModel.encode_batch(segments)  →  query_vectors             │
    │                                                                         │
    │  3. CANDIDATE SELECTION (ANN)                                           │
    │     ChromaStore.query_candidates(query_vectors, top_k=5)                │
    │     → [doc_id_1, doc_id_2, …, doc_id_5]                                │
    │                                                                         │
    │  4. DEEP ANALYSIS (per candidate)                                       │
    │     for candidate_doc_id in candidates:                                 │
    │        a. Retrieve candidate text + metadata from ChromaDB              │
    │        b. Compute submitted_fingerprints  via Winnowing                 │
    │        c. Compute candidate_fingerprints  via Winnowing                 │
    │        d. get_all_match_spans() → list of (start, end) in submitted text│
    │        e. Compute Jaccard similarity                                    │
    │        f. Look up semantic score from step 2                            │
    │        g. Build MatchResult objects                                     │
    │                                                                         │
    │  5. AGGREGATION                                                         │
    │     Merge all MatchResults, deduplicate overlapping spans               │
    │     Compute originality_score from unique matched chars                 │
    │                                                                         │
    │  6. RETURN PlagiarismReport                                             │
    └─────────────────────────────────────────────────────────────────────────┘

Thread safety
-------------
``PlagiarismEngine`` is stateless between calls (all runtime state lives in
local variables).  The shared objects — ``EmbeddingModel`` and ``ChromaStore``
— are themselves thread-safe for reads, so a single engine instance can be
used from a multi-threaded web server without locking.
"""
from __future__ import annotations

import logging
import time
import uuid
from functools import lru_cache
from typing import Any

from .config import get_settings
from .database import ChromaStore
from .embeddings import EmbeddingModel, get_embedding_model
from .models import (
    IndexRequest,
    IndexResponse,
    MatchResult,
    PlagiarismReport,
    SourceMetadata,
    TaskStatus,
)
from .preprocessing import (
    TextSegment,
    clean_text,
    extract_source_snippet,
    segment_paragraphs,
)
from .winnowing import (
    compute_document_fingerprints,
    count_unique_matched_chars,
    get_all_match_spans,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Singleton helpers
# ─────────────────────────────────────────────────────────────────────────────


@lru_cache(maxsize=1)
def _get_chroma_store() -> ChromaStore:
    """Return a process-level singleton ChromaStore."""
    cfg = get_settings()
    return ChromaStore(
        persist_dir=cfg.CHROMA_PERSIST_DIR,
        host=cfg.CHROMA_HOST,
        port=cfg.CHROMA_PORT,
        collection_name=cfg.CHROMA_COLLECTION_NAME,
        hnsw_space=cfg.HNSW_SPACE,
        hnsw_m=cfg.HNSW_M,
        hnsw_ef_construction=cfg.HNSW_EF_CONSTRUCTION,
        hnsw_ef_search=cfg.HNSW_EF_SEARCH,
    )


# ─────────────────────────────────────────────────────────────────────────────
# PlagiarismEngine
# ─────────────────────────────────────────────────────────────────────────────


class PlagiarismEngine:
    """High-performance hybrid plagiarism detection engine.

    Combines:
    * **Semantic vector search** (Sentence-Transformers → ChromaDB HNSW) for
      fast retrieval of the most relevant candidate documents from the corpus.
    * **Winnowing exact-match fingerprinting** (Rabin-Karp rolling hash) for
      precise character-level span detection against those candidates.

    Usage::

        engine = PlagiarismEngine()
        report = engine.check_document(
            document_id="sub_001",
            text="The extracted plain text…",
            metadata={"chapter": 1, "project_id": "proj_123"},
        )

        for match in report.matches:
            print(match.start_index, match.end_index, match.source_metadata.title)

    Note:
        Both ``EmbeddingModel`` and ``ChromaStore`` are lazy-loaded singletons
        (thread-safe).  The first call to ``check_document()`` or
        ``index_document()`` will trigger model loading (~3 s on first run).
    """

    def __init__(self) -> None:
        self._cfg = get_settings()

    # ─── Internal accessors (lazy singleton) ─────────────────────────────────

    @property
    def _model(self) -> EmbeddingModel:
        return get_embedding_model(self._cfg.EMBEDDING_MODEL)

    @property
    def _store(self) -> ChromaStore:
        return _get_chroma_store()

    # ─── Core public API ──────────────────────────────────────────────────────

    def check_document(
        self,
        document_id: str,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> PlagiarismReport:
        """Run a full plagiarism check against the indexed corpus.

        Args:
            document_id: Unique identifier for the submitted document.
            text:        Raw extracted text (will be cleaned internally).
            metadata:    Optional dict of extra metadata fields stored in the
                         report (e.g. ``{"chapter": 1, "project_id": "…"}``).

        Returns:
            :class:`PlagiarismReport` with all detected matches and scores.

        The returned report is suitable for serialising to JSON and caching
        in the Node.js Submission document as ``plagiarismResult``.
        """
        t_start = time.perf_counter()
        metadata = metadata or {}

        # ── Step 1: Preprocess ─────────────────────────────────────────────
        logger.info("[Engine] Starting check for document '%s'.", document_id)
        cleaned = clean_text(text)
        total_chars = len(cleaned)

        if total_chars < 50:
            logger.warning("[Engine] Document '%s' too short after cleaning (%d chars).", document_id, total_chars)
            return PlagiarismReport(
                document_id=document_id,
                originality_score=100.0,
                plagiarism_score=0.0,
                total_characters=total_chars,
                matched_characters=0,
                matches=[],
                candidates_evaluated=0,
                processing_time_ms=_elapsed_ms(t_start),
                metadata=metadata,
            )

        segments: list[TextSegment] = segment_paragraphs(
            cleaned, min_words=self._cfg.SEGMENT_MIN_WORDS
        )

        if not segments:
            # Entire text is a single block shorter than SEGMENT_MIN_WORDS
            return PlagiarismReport(
                document_id=document_id,
                originality_score=100.0,
                plagiarism_score=0.0,
                total_characters=total_chars,
                matched_characters=0,
                matches=[],
                candidates_evaluated=0,
                processing_time_ms=_elapsed_ms(t_start),
                metadata=metadata,
            )

        # ── Step 2: Embed all segments in one batch ────────────────────────
        seg_texts = [s.text for s in segments]
        query_vectors = self._model.encode_batch(seg_texts)

        # ── Step 3: ANN candidate selection ───────────────────────────────
        candidate_ids = self._store.query_candidates(
            query_embeddings=query_vectors,
            top_k=self._cfg.TOP_K_CANDIDATES,
            similarity_threshold=self._cfg.SEMANTIC_SIMILARITY_THRESHOLD,
            exclude_document_ids=[document_id],
        )
        logger.info(
            "[Engine] Document '%s': %d candidates selected for deep analysis.",
            document_id,
            len(candidate_ids),
        )

        if not candidate_ids:
            return PlagiarismReport(
                document_id=document_id,
                originality_score=100.0,
                plagiarism_score=0.0,
                total_characters=total_chars,
                matched_characters=0,
                matches=[],
                candidates_evaluated=0,
                processing_time_ms=_elapsed_ms(t_start),
                metadata=metadata,
            )

        # ── Step 4: Compute submitted text fingerprints (once) ────────────
        submitted_fps = compute_document_fingerprints(
            cleaned, self._cfg.KGRAM_SIZE, self._cfg.WINDOW_SIZE
        )

        # Pre-build a per-segment semantic lookup for score blending:
        # For each query segment, we can get the semantic score later via
        # Chroma distances — here we build a simple {seg_idx → embedding} map.

        # ── Step 5: Deep Winnowing analysis per candidate ─────────────────
        all_match_results: list[MatchResult] = []
        candidates_evaluated = 0

        for cand_doc_id in candidate_ids:
            corpus_text, corpus_meta = self._store.get_document_texts(cand_doc_id)

            if not corpus_text:
                logger.debug("[Engine] Candidate '%s' returned empty text, skipping.", cand_doc_id)
                continue

            corpus_cleaned = clean_text(corpus_text)
            corpus_fps = compute_document_fingerprints(
                corpus_cleaned, self._cfg.KGRAM_SIZE, self._cfg.WINDOW_SIZE
            )
            candidates_evaluated += 1

            # Get all matched spans in submitted text
            spans = get_all_match_spans(
                submitted_fps=submitted_fps,
                corpus_fps=corpus_fps,
                k=self._cfg.KGRAM_SIZE,
                merge_gap=self._cfg.WINNOW_MERGE_GAP,
                min_span=self._cfg.MIN_MATCH_SPAN,
            )

            if not spans:
                continue

            # Compute Jaccard for this candidate
            sub_set = set(submitted_fps.keys())
            corp_set = set(corpus_fps.keys())
            common_count = len(sub_set & corp_set)
            jaccard = common_count / len(sub_set | corp_set) if (sub_set | corp_set) else 0.0

            # Compute semantic score — max cosine similarity of any submitted
            # segment vs any corpus segment embedding
            corpus_segs = segment_paragraphs(corpus_cleaned, min_words=self._cfg.SEGMENT_MIN_WORDS)
            if corpus_segs:
                corpus_vecs = self._model.encode_batch([s.text for s in corpus_segs])
                semantic_score = float(max(
                    self._model.max_similarity_to_set(qv, corpus_vecs)
                    for qv in query_vectors
                ))
            else:
                semantic_score = 0.0

            # Blended similarity
            blended = (
                jaccard * self._cfg.PLAGIARISM_SCORE_WEIGHT_WINNOW
                + semantic_score * self._cfg.PLAGIARISM_SCORE_WEIGHT_SEMANTIC
            )

            for start, end in spans:
                match_text = cleaned[start:end]
                snippet = extract_source_snippet(corpus_text, match_text)

                all_match_results.append(
                    MatchResult(
                        match_id=str(uuid.uuid4()),
                        match_text=match_text,
                        start_index=start,
                        end_index=end,
                        similarity_score=round(min(blended, 1.0), 4),
                        winnow_score=round(jaccard, 4),
                        semantic_score=round(semantic_score, 4),
                        source_metadata=corpus_meta or SourceMetadata(document_id=cand_doc_id),
                        source_snippet=snippet,
                    )
                )

        # ── Step 6: Deduplicate overlapping spans across all sources ───────
        all_match_results = _deduplicate_matches(all_match_results)

        # ── Step 7: Compute aggregate originality score ────────────────────
        all_spans = [(m.start_index, m.end_index) for m in all_match_results]
        matched_chars = count_unique_matched_chars(all_spans, total_chars)
        plagiarism_pct = (matched_chars / total_chars * 100) if total_chars > 0 else 0.0
        originality_pct = max(0.0, 100.0 - plagiarism_pct)

        logger.info(
            "[Engine] Document '%s': originality %.1f%% (%d matches, %d candidates in %.0f ms).",
            document_id,
            originality_pct,
            len(all_match_results),
            candidates_evaluated,
            _elapsed_ms(t_start),
        )

        return PlagiarismReport(
            document_id=document_id,
            originality_score=round(originality_pct, 2),
            plagiarism_score=round(plagiarism_pct, 2),
            total_characters=total_chars,
            matched_characters=matched_chars,
            matches=all_match_results,
            candidates_evaluated=candidates_evaluated,
            processing_time_ms=round(_elapsed_ms(t_start), 1),
            metadata=metadata,
        )

    def index_document(self, request: IndexRequest) -> IndexResponse:
        """Add or update a document in the corpus index.

        Cleans the text, segments it into paragraphs, generates embeddings,
        and stores them in ChromaDB.

        Args:
            request: :class:`IndexRequest` with ``document_id``, ``text``,
                     and ``metadata``.

        Returns:
            :class:`IndexResponse` with the count of stored segments.
        """
        cleaned = clean_text(request.text)
        segments = segment_paragraphs(cleaned, min_words=self._cfg.SEGMENT_MIN_WORDS)

        if not segments:
            logger.warning(
                "[Engine] Document '%s' produced no segments after cleaning — not indexed.",
                request.document_id,
            )
            return IndexResponse(
                document_id=request.document_id,
                segments_indexed=0,
                message="Document too short to index (no paragraph segments found).",
            )

        embeddings = self._model.encode_batch([s.text for s in segments])

        stored = self._store.add_document(
            document_id=request.document_id,
            segments=segments,
            metadata=request.metadata,
            embeddings=embeddings,
        )

        return IndexResponse(
            document_id=request.document_id,
            segments_indexed=stored,
        )

    def remove_document(self, document_id: str) -> int:
        """Remove a document from the corpus index.

        Args:
            document_id: ID of the document to remove.

        Returns:
            Number of segments deleted (0 if document was not in index).
        """
        return self._store.delete_document(document_id)

    def health(self) -> dict[str, Any]:
        """Return health/diagnostic information for the ``/health`` endpoint."""
        return {
            "status": "ok",
            "chroma_collection": self._store.collection_name,
            "collection_count": self._store.count,
            "model_loaded": self._model.is_loaded,
            "model_name": self._model.model_name,
            "embedding_dim": self._model.embedding_dim,
            "settings": {
                "kgram_size": self._cfg.KGRAM_SIZE,
                "window_size": self._cfg.WINDOW_SIZE,
                "top_k_candidates": self._cfg.TOP_K_CANDIDATES,
                "semantic_threshold": self._cfg.SEMANTIC_SIMILARITY_THRESHOLD,
            },
        }


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────


def _elapsed_ms(t_start: float) -> float:
    """Return milliseconds elapsed since ``t_start`` (from ``time.perf_counter``)."""
    return (time.perf_counter() - t_start) * 1000


def _deduplicate_matches(matches: list[MatchResult]) -> list[MatchResult]:
    """Remove overlapping MatchResult objects across different sources.

    When two different corpus documents both match an overlapping region in the
    submitted text, we keep only the match with the higher ``similarity_score``.
    The output is sorted by ``start_index`` ascending.

    Args:
        matches: List of :class:`MatchResult` objects (unsorted, may overlap).

    Returns:
        De-duplicated, sorted list with no overlapping spans.
    """
    if not matches:
        return []

    # Sort by start_index, then by similarity descending for tie-breaking
    sorted_matches = sorted(
        matches,
        key=lambda m: (m.start_index, -m.similarity_score),
    )

    result: list[MatchResult] = []
    last_end = -1

    for match in sorted_matches:
        if match.start_index >= last_end:
            # No overlap — accept
            result.append(match)
            last_end = match.end_index
        elif match.end_index > last_end and match.similarity_score > (
            result[-1].similarity_score if result else 0.0
        ):
            # Overlapping but current match is stronger — extend + replace
            result[-1] = MatchResult(
                match_id=result[-1].match_id,
                match_text=match.match_text,
                start_index=result[-1].start_index,
                end_index=match.end_index,
                similarity_score=max(match.similarity_score, result[-1].similarity_score),
                winnow_score=max(match.winnow_score, result[-1].winnow_score),
                semantic_score=max(match.semantic_score, result[-1].semantic_score),
                source_metadata=match.source_metadata,
                source_snippet=match.source_snippet,
            )
            last_end = match.end_index

    return result
