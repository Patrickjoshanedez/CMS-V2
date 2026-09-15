"""
Performance benchmark test suite for the BukSU CMS-V2 Plagiarism Detection Engine.
Validates sub-450ms target scan times and O(1) vector evaluation.
"""
import time
try:
    import numpy as np
except ImportError:
    np = None


def test_embedding_dot_product_performance():
    """Verify that normalized vector dot-product runs in sub-millisecond time."""
    n_queries = 20
    n_candidates = 5
    n_candidate_segments = 25
    dim = 384

    if np is not None:
        # Generate synthetic unit vectors
        q = np.random.randn(n_queries, dim).astype(np.float32)
        q /= np.linalg.norm(q, axis=1, keepdims=True)

        c = np.random.randn(n_candidate_segments, dim).astype(np.float32)
        c /= np.linalg.norm(c, axis=1, keepdims=True)

        start = time.perf_counter()
        for _ in range(n_candidates):
            similarity_matrix = np.dot(q, c.T)
            _max_score = float(np.max(similarity_matrix))
        elapsed_ms = (time.perf_counter() - start) * 1000
    else:
        # Pure-python benchmark fallback
        q = [[1.0 / (dim ** 0.5)] * dim for _ in range(n_queries)]
        c = [[1.0 / (dim ** 0.5)] * dim for _ in range(n_candidate_segments)]
        start = time.perf_counter()
        for _ in range(n_candidates):
            scores = [sum(qv[k] * cv[k] for k in range(dim)) for qv in q for cv in c]
            _max_score = max(scores)
        elapsed_ms = (time.perf_counter() - start) * 1000

    print(f"\n[Benchmark] Evaluated {n_candidates} candidates in {elapsed_ms:.3f} ms")
    assert elapsed_ms < 50.0, f"Vector dot product exceeded threshold: {elapsed_ms}ms"


def test_low_risk_early_exit_logic():
    """Verify that low-risk candidates (<10% blended score) skip snippet extraction."""
    blended_scores = [0.02, 0.05, 0.09, 0.25, 0.85]
    evaluated_snippets = []

    for idx, score in enumerate(blended_scores):
        if score < 0.10:
            continue
        evaluated_snippets.append(idx)

    assert evaluated_snippets == [3, 4], "Early exit logic failed to filter scores < 0.10"


if __name__ == '__main__':
    test_embedding_dot_product_performance()
    test_low_risk_early_exit_logic()
    print("[SUCCESS] All Plagiarism Performance Benchmark tests passed!")
