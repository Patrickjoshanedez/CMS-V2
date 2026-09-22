"""
HybridSourceTracker (HST) — Two-Stage Asymmetric Plagiarism Detection Pipeline.

Architecture:
-------------
Stage 1: Coarse Candidate Retrieval (ANN)
    BGE-M3 dense 1,024-dim vectors query ChromaDB HNSW index in O(log N) time
    to fetch top-K (K=50) candidate documents.

Stage 2: Fine-Grained Hybrid Re-Ranking
    Evaluates exclusively the top-K candidate set via:
    1. Exact Winnowing Rabin-Karp n-gram fingerprint overlap (syntactic matching).
    2. In-memory BGE-M3 sparse lexical term-salience dot product (domain jargon/keywords).
    3. Dense semantic cosine similarity from Stage 1.

Calibrated Composite Scoring Formula:
-------------------------------------
    S_comp = (0.50 * S_winnowing) + (0.30 * S_dense) + (0.20 * S_sparse)

Review & Warning Gating:
------------------------
    - S_comp >= 0.75   --> Triggers manual coordinator review (manual_review_required = True).
    - S_winnowing >= 0.85 --> Immediate critical warning flag (critical_warning_flag = True).
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

import numpy as np

from .config import Settings, get_settings
from .database import ChromaStore
from .embeddings import EmbeddingModel, get_embedding_model
from .models import MatchResult, PlagiarismReport, SourceMetadata
from .preprocessing import (
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


class CandidateEvaluation:
    """Evaluation metrics for a single candidate source document in Stage 2."""

    def __init__(
        self,
        document_id: str,
        dense_score: float,
        sparse_score: float,
        winnowing_score: float,
        composite_score: float,
        matched_spans: list[tuple[int, int]],
        source_metadata: SourceMetadata,
        source_text: str,
    ) -> None:
        self.document_id = document_id
        self.dense_score = float(dense_score)
        self.sparse_score = float(sparse_score)
        self.winnowing_score = float(winnowing_score)
        self.composite_score = float(composite_score)
        self.matched_spans = matched_spans
        self.source_metadata = source_metadata
        self.source_text = source_text


class HybridSourceTracker:
    """Asymmetric Two-Stage Hybrid Plagiarism Tracker."""

    def __init__(
        self,
        embedding_model: EmbeddingModel | None = None,
        chroma_store: ChromaStore | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.cfg = settings or get_settings()
        self.model = embedding_model or get_embedding_model(self.cfg.EMBEDDING_MODEL)
        self.store = chroma_store or ChromaStore(
            persist_dir=self.cfg.CHROMA_PERSIST_DIR,
            host=self.cfg.CHROMA_HOST,
            port=self.cfg.CHROMA_PORT,
            collection_name=self.cfg.CHROMA_COLLECTION_NAME,
            hnsw_space=self.cfg.HNSW_SPACE,
            hnsw_m=self.cfg.HNSW_M,
            hnsw_ef_construction=self.cfg.HNSW_EF_CONSTRUCTION,
            hnsw_ef_search=self.cfg.HNSW_EF_SEARCH,
        )

    def calculate_composite_score(
        self,
        dense_score: float,
        sparse_score: float,
        winnowing_score: float,
    ) -> float:
        """Compute the calibrated composite score:
        S_comp = (w_w * S_winnowing) + (w_d * S_dense) + (w_s * S_sparse)
        """
        w_w = self.cfg.HST_WEIGHT_WINNOWING
        w_d = self.cfg.HST_WEIGHT_DENSE
        w_s = self.cfg.HST_WEIGHT_SPARSE

        composite = (w_w * winnowing_score) + (w_d * dense_score) + (w_s * sparse_score)
        return float(max(0.0, min(1.0, round(composite, 4))))

    def check_document(
        self,
        text: str,
        document_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        exclude_document_ids: list[str] | None = None,
    ) -> PlagiarismReport:
        """Execute the two-stage HybridSourceTracker pipeline on a submitted document."""
        t_start = time.perf_counter()
        doc_id = document_id or str(uuid.uuid4())
        meta = metadata or {}

        # ── Step 1: Preprocess ────────────────────────────────────────────────
        cleaned = clean_text(text)
        total_chars = len(cleaned)

        if total_chars < 50:
            logger.info("Document '%s' too short (%d chars); scoring 100%% original.", doc_id, total_chars)
            return PlagiarismReport(
                document_id=doc_id,
                originality_score=100.0,
                plagiarism_score=0.0,
                total_characters=total_chars,
                matched_characters=0,
                matches=[],
                candidates_evaluated=0,
                processing_time_ms=round((time.perf_counter() - t_start) * 1000, 2),
                metadata=meta,
                composite_score=0.0,
                dense_score=0.0,
                sparse_score=0.0,
                winnowing_score=0.0,
                manual_review_required=False,
                critical_warning_flag=False,
            )

        segments = segment_paragraphs(cleaned, min_words=self.cfg.SEGMENT_MIN_WORDS)
        segment_texts = [seg.text for seg in segments] if segments else [cleaned]

        # ── Step 2: BGE-M3 Dense & Sparse Encoding ────────────────────────────
        dense_vectors = self.model.encode_batch(segment_texts)
        sparse_weights_list = self.model.encode_sparse_batch([cleaned])
        query_sparse_weights = sparse_weights_list[0] if sparse_weights_list else {}

        # Submitted document fingerprints for Winnowing
        submitted_fingerprints = compute_document_fingerprints(
            cleaned,
            k=self.cfg.KGRAM_SIZE,
            w=self.cfg.WINDOW_SIZE,
        )

        # ── Stage 1: Coarse Candidate Retrieval (ANN in ChromaDB) ─────────────
        exclude_list = list(exclude_document_ids or [])
        if doc_id not in exclude_list:
            exclude_list.append(doc_id)

        top_k = self.cfg.HST_COARSE_TOP_K
        candidates_with_scores = self.store.query_candidates_with_scores(
            query_embeddings=dense_vectors,
            top_k=top_k,
            similarity_threshold=self.cfg.SEMANTIC_SIMILARITY_THRESHOLD,
            exclude_document_ids=exclude_list,
        )

        logger.info(
            "HST Stage 1 (Coarse Retrieval) found %d candidate documents for '%s' (top_k=%d).",
            len(candidates_with_scores),
            doc_id,
            top_k,
        )

        if not candidates_with_scores:
            elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)
            return PlagiarismReport(
                document_id=doc_id,
                originality_score=100.0,
                plagiarism_score=0.0,
                total_characters=total_chars,
                matched_characters=0,
                matches=[],
                candidates_evaluated=0,
                processing_time_ms=elapsed_ms,
                metadata=meta,
                composite_score=0.0,
                dense_score=0.0,
                sparse_score=0.0,
                winnowing_score=0.0,
                manual_review_required=False,
                critical_warning_flag=False,
            )

        # ── Stage 2: Fine-Grained Hybrid Re-Ranking ───────────────────────────
        evaluations: list[CandidateEvaluation] = []
        all_match_results: list[MatchResult] = []
        all_unique_spans: list[tuple[int, int]] = []

        for candidate_id, dense_score in candidates_with_scores:
            candidate_text, source_meta = self.store.get_document_texts(candidate_id)
            if not candidate_text:
                continue

            if source_meta is None:
                source_meta = SourceMetadata(document_id=candidate_id)

            # In-memory sparse lexical term-salience similarity
            candidate_sparse_weights = self.model.encode_sparse_batch([candidate_text])[0]
            sparse_score = self.model.compute_sparse_similarity(query_sparse_weights, candidate_sparse_weights)

            # Winnowing exact n-gram overlap & match spans
            candidate_fingerprints = compute_document_fingerprints(
                candidate_text,
                k=self.cfg.KGRAM_SIZE,
                w=self.cfg.WINDOW_SIZE,
            )

            matched_spans = get_all_match_spans(
                submitted_fingerprints,
                candidate_fingerprints,
                k=self.cfg.KGRAM_SIZE,
                merge_gap=self.cfg.WINNOW_MERGE_GAP,
                min_span=self.cfg.MIN_MATCH_SPAN,
            )

            # Syntactic overlap ratio based on matched characters in submitted text
            matched_chars_for_candidate = count_unique_matched_chars(matched_spans, total_chars)
            winnowing_score = min(1.0, matched_chars_for_candidate / max(1, total_chars))

            # Calibrated composite score
            composite_score = self.calculate_composite_score(
                dense_score=dense_score,
                sparse_score=sparse_score,
                winnowing_score=winnowing_score,
            )

            evaluations.append(
                CandidateEvaluation(
                    document_id=candidate_id,
                    dense_score=dense_score,
                    sparse_score=sparse_score,
                    winnowing_score=winnowing_score,
                    composite_score=composite_score,
                    matched_spans=matched_spans,
                    source_metadata=source_meta,
                    source_text=candidate_text,
                )
            )

            # Create granular MatchResult objects for UI highlighting
            for span_start, span_end in matched_spans:
                all_unique_spans.append((span_start, span_end))
                match_text = cleaned[span_start:span_end]
                snippet = extract_source_snippet(candidate_text, match_text)

                all_match_results.append(
                    MatchResult(
                        match_id=str(uuid.uuid4()),
                        match_text=match_text,
                        start_index=span_start,
                        end_index=span_end,
                        similarity_score=composite_score,
                        winnow_score=winnowing_score,
                        semantic_score=dense_score,
                        source_metadata=source_meta,
                        source_snippet=snippet,
                    )
                )

        # Sort evaluations by composite score descending
        evaluations.sort(key=lambda x: x.composite_score, reverse=True)
        top_eval = evaluations[0] if evaluations else None

        top_dense = top_eval.dense_score if top_eval else 0.0
        top_sparse = top_eval.sparse_score if top_eval else 0.0
        top_winnowing = top_eval.winnowing_score if top_eval else 0.0
        top_composite = top_eval.composite_score if top_eval else 0.0

        # Review & Critical Alert Gates
        manual_review_required = top_composite >= self.cfg.HST_COMPOSITE_FLAG_THRESHOLD
        critical_warning_flag = any(
            e.winnowing_score >= self.cfg.HST_WINNOWING_CRITICAL_THRESHOLD for e in evaluations
        )

        # Calculate overall unique matched character coverage
        total_unique_matched_chars = count_unique_matched_chars(all_unique_spans, total_chars)
        plagiarism_percentage = min(100.0, (total_unique_matched_chars / max(1, total_chars)) * 100.0)
        originality_score = max(0.0, 100.0 - plagiarism_percentage)

        # Sort matches by start_index for frontend VirtualizedPlagiarismViewer
        all_match_results.sort(key=lambda m: m.start_index)

        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)
        logger.info(
            "HST Check completed for '%s' in %.2fms. S_comp=%.4f (Dense=%.4f, Sparse=%.4f, Winnow=%.4f). Review=%s, Critical=%s",
            doc_id,
            elapsed_ms,
            top_composite,
            top_dense,
            top_sparse,
            top_winnowing,
            manual_review_required,
            critical_warning_flag,
        )

        return PlagiarismReport(
            document_id=doc_id,
            originality_score=round(originality_score, 2),
            plagiarism_score=round(plagiarism_percentage, 2),
            total_characters=total_chars,
            matched_characters=total_unique_matched_chars,
            matches=all_match_results,
            candidates_evaluated=len(evaluations),
            processing_time_ms=elapsed_ms,
            metadata=meta,
            composite_score=top_composite,
            dense_score=top_dense,
            sparse_score=top_sparse,
            winnowing_score=top_winnowing,
            manual_review_required=manual_review_required,
            critical_warning_flag=critical_warning_flag,
        )
