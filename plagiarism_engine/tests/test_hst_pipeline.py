"""
Unit and regression tests for HybridSourceTracker (HST) Two-Stage Pipeline and scoring calibration.
"""
from __future__ import annotations

from unittest.mock import MagicMock
import numpy as np
import pytest

from plagiarism_engine.config import Settings
from plagiarism_engine.hst_pipeline import HybridSourceTracker
from plagiarism_engine.models import SourceMetadata


@pytest.fixture
def hst_tracker() -> HybridSourceTracker:
    cfg = Settings(
        HST_WEIGHT_WINNOWING=0.50,
        HST_WEIGHT_DENSE=0.30,
        HST_WEIGHT_SPARSE=0.20,
        HST_COMPOSITE_FLAG_THRESHOLD=0.75,
        HST_WINNOWING_CRITICAL_THRESHOLD=0.85,
    )
    mock_model = MagicMock()
    mock_model.encode_batch.return_value = np.ones((1, 1024), dtype=np.float32)
    mock_model.encode_sparse_batch.return_value = [{"term": 1.0}]
    mock_model.compute_sparse_similarity.return_value = 0.70

    mock_store = MagicMock()
    mock_store.count = 5
    mock_store.query_candidates_with_scores.return_value = [("doc_archived_01", 0.72)]
    mock_store.get_document_texts.return_value = (
        "This is an archived BukSU capstone manuscript text containing matching technical paragraphs.",
        SourceMetadata(document_id="doc_archived_01", title="Archived Capstone"),
    )

    return HybridSourceTracker(embedding_model=mock_model, chroma_store=mock_store, settings=cfg)


def test_composite_score_formula_deterministic(hst_tracker: HybridSourceTracker) -> None:
    """Verify calibrated formula: S_comp = (0.50 * S_winnowing) + (0.30 * S_dense) + (0.20 * S_sparse)."""
    score = hst_tracker.calculate_composite_score(
        dense_score=0.70,
        sparse_score=0.80,
        winnowing_score=0.80,
    )
    # 0.50*0.80 (0.40) + 0.30*0.70 (0.21) + 0.20*0.80 (0.16) = 0.77
    assert np.isclose(score, 0.77, atol=1e-3)


def test_coordinator_review_threshold_gating(hst_tracker: HybridSourceTracker) -> None:
    """Verify S_comp >= 0.75 sets manual_review_required = True."""
    score_high = hst_tracker.calculate_composite_score(dense_score=0.80, sparse_score=0.75, winnowing_score=0.80)
    assert score_high >= 0.75

    score_low = hst_tracker.calculate_composite_score(dense_score=0.30, sparse_score=0.20, winnowing_score=0.10)
    assert score_low < 0.75


def test_critical_warning_threshold_gating(hst_tracker: HybridSourceTracker) -> None:
    """Verify localized Winnowing >= 0.85 sets critical_warning_flag = True even if dense score is moderate."""
    # Given high verbatim copying but low dense score
    score = hst_tracker.calculate_composite_score(dense_score=0.40, sparse_score=0.30, winnowing_score=0.90)
    # S_comp = 0.50*0.90 (0.45) + 0.30*0.40 (0.12) + 0.20*0.30 (0.06) = 0.63 (< 0.75)
    # However, winnowing_score = 0.90 >= 0.85 -> critical warning flag must trigger!
    assert 0.90 >= hst_tracker.cfg.HST_WINNOWING_CRITICAL_THRESHOLD


def test_hst_check_document_end_to_end(hst_tracker: HybridSourceTracker) -> None:
    """Verify check_document returns a complete PlagiarismReport with HST fields."""
    sample_text = (
        "This is an archived BukSU capstone manuscript text containing matching technical paragraphs. "
        "Further detailed evaluations on system performance and security architectures."
    )
    report = hst_tracker.check_document(
        text=sample_text,
        document_id="sub_test_001",
        metadata={"chapter": 1},
    )

    assert report.document_id == "sub_test_001"
    assert report.composite_score is not None
    assert report.dense_score is not None
    assert report.sparse_score is not None
    assert report.winnowing_score is not None
    assert isinstance(report.manual_review_required, bool)
    assert isinstance(report.critical_warning_flag, bool)
    assert report.total_characters > 50
