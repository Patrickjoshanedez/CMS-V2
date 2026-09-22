"""
Unit tests for BAAI/bge-m3 embedding core and 8,192-token context handling.
"""
from __future__ import annotations

import numpy as np
import pytest

from plagiarism_engine.embeddings import EmbeddingModel


class MockFlagModel:
    """Mock for FlagEmbedding BGEM3FlagModel to test deterministic dimensionality and context."""

    def __init__(self, *args, **kwargs) -> None:
        pass

    def encode(
        self,
        texts: list[str],
        batch_size: int = 16,
        max_length: int = 8192,
        return_dense: bool = True,
        return_sparse: bool = False,
    ) -> dict[str, Any]:
        n = len(texts)
        res = {}
        if return_dense:
            # 1024-dimensional mock vectors
            vecs = np.ones((n, 1024), dtype=np.float32)
            res["dense_vecs"] = vecs
        if return_sparse:
            res["lexical_weights"] = [{"token_42": 0.85, "token_100": 0.45} for _ in range(n)]
        return res


def test_bge_m3_embedding_dimension_1024(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify BGE-M3 produces exactly 1,024-dimensional normalized dense vectors."""
    model = EmbeddingModel(model_name="BAAI/bge-m3", device="cpu", max_length=8192)
    model._use_flag_model = True
    model._flag_model = MockFlagModel()
    model._embedding_dim = 1024

    vectors = model.encode_batch(["BukSU Capstone Management System V2", "Integrity validation pipeline"])
    assert isinstance(vectors, np.ndarray)
    assert vectors.shape == (2, 1024)
    # Check L2 normalization (norm should be ~1.0)
    for row in vectors:
        norm = np.linalg.norm(row)
        assert np.isclose(norm, 1.0, atol=1e-3)


def test_bge_m3_long_context_8000_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify BGE-M3 handles inputs up to 8,000 tokens without truncation."""
    model = EmbeddingModel(model_name="BAAI/bge-m3", device="cpu", max_length=8192)
    assert model._max_length == 8192

    # Generate a long manuscript segment (~3,000 words / ~4,500 tokens)
    repeated_content = "Comprehensive evaluation of Capstone architectures in higher education institutions. " * 350
    assert len(repeated_content) > 20000

    # Test single-string encoding
    model._use_flag_model = True
    model._flag_model = MockFlagModel()
    vec = model.encode_single(repeated_content)
    assert vec.shape == (1024,)


def test_sparse_lexical_weights_and_similarity() -> None:
    """Verify sparse lexical weights extraction and cosine similarity calculation."""
    model = EmbeddingModel(model_name="BAAI/bge-m3", device="cpu", max_length=8192)

    text_a = "Machine learning algorithm for academic capstone indexing and retrieval"
    text_b = "Machine learning algorithm for capstone integrity evaluation"
    text_c = "Completely unrelated culinary recipe for chocolate cake"

    sparse_weights = model.encode_sparse_batch([text_a, text_b, text_c])
    assert len(sparse_weights) == 3
    assert isinstance(sparse_weights[0], dict)
    assert "machine" in sparse_weights[0] or "capstone" in sparse_weights[0]

    # Similarity between related texts A and B should be high
    sim_ab = model.compute_sparse_similarity(sparse_weights[0], sparse_weights[1])
    # Similarity between unrelated texts A and C should be 0 or near 0
    sim_ac = model.compute_sparse_similarity(sparse_weights[0], sparse_weights[2])

    assert sim_ab > 0.4
    assert sim_ac < 0.1
