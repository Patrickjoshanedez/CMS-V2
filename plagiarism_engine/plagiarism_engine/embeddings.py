"""
Sentence-Transformers embedding wrapper for the Plagiarism Detection Engine.

Design principles
-----------------
* **Singleton model loader** — the ~90 MB ``all-MiniLM-L6-v2`` model is loaded
  exactly once per process and reused across all requests.  This makes the
  first request ~3 s slower but subsequent calls essentially free.
* **Batch encoding** — all paragraph segments from a document are encoded in
  a single ``model.encode()`` call, maximising GPU/CPU utilisation.
* **Normalised embeddings** — we always request ``normalize_embeddings=True``
  so that cosine similarity reduces to a dot product, making ChromaDB's
  distance calculation trivially fast.
* **CPU / GPU agnostic** — the code works on CPU, MPS (Apple Silicon), and
  CUDA without changes.

Usage::

    from plagiarism_engine.embeddings import get_embedding_model

    model = get_embedding_model()
    vectors = model.encode_batch(["paragraph one", "paragraph two"])
"""
from __future__ import annotations

import logging
import threading
from typing import TYPE_CHECKING

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)

# Type alias — a 2-D float32 array of shape (n_segments, embedding_dim)
EmbeddingMatrix = NDArray[np.float32]

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer


# ─────────────────────────────────────────────────────────────────────────────
# Thread-safe singleton loader
# ─────────────────────────────────────────────────────────────────────────────

_model_instance: "SentenceTransformer | None" = None
_model_lock = threading.Lock()


def get_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> "EmbeddingModel":
    """Return a cached :class:`EmbeddingModel` singleton.

    The underlying ``SentenceTransformer`` is loaded lazily on the first call
    and then reused.  Thread-safe via a module-level lock.

    Args:
        model_name: Any Sentence-Transformers model identifier (HuggingFace Hub
                    model ID).  Defaults to ``all-MiniLM-L6-v2`` (384-dim,
                    ~80 MB, excellent speed/accuracy trade-off).

    Returns:
        A fully initialised :class:`EmbeddingModel` instance.

    Raises:
        ImportError: If ``sentence-transformers`` is not installed.
        OSError:     If the model cannot be downloaded or loaded.
    """
    global _model_instance  # noqa: PLW0603

    if _model_instance is None:
        with _model_lock:
            if _model_instance is None:
                _model_instance = EmbeddingModel(model_name=model_name)

    return _model_instance


# ─────────────────────────────────────────────────────────────────────────────
# EmbeddingModel class
# ─────────────────────────────────────────────────────────────────────────────


class EmbeddingModel:
    """Thin, purpose-built wrapper around a Sentence-Transformers model.

    Manages model loading, batched encoding, and normalisation.

    Args:
        model_name:   HuggingFace model identifier.
        batch_size:   Maximum number of segments encoded per forward pass.
        show_progress: If ``True``, show a tqdm progress bar during encoding.
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        batch_size: int = 32,
        show_progress: bool = False,
    ) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ImportError(
                "sentence-transformers is required.  "
                "Install it with: pip install sentence-transformers"
            ) from exc

        logger.info("Loading embedding model '%s'…", model_name)
        self._model: SentenceTransformer = SentenceTransformer(model_name)
        self._model_name = model_name
        self._batch_size = batch_size
        self._show_progress = show_progress
        self._embedding_dim: int = self._model.get_sentence_embedding_dimension()
        logger.info(
            "Model '%s' loaded. Embedding dim: %d.",
            model_name,
            self._embedding_dim,
        )

    # ─── Properties ──────────────────────────────────────────────────────────

    @property
    def model_name(self) -> str:
        """The HuggingFace model name."""
        return self._model_name

    @property
    def embedding_dim(self) -> int:
        """Dimensionality of each output embedding vector."""
        return self._embedding_dim

    @property
    def is_loaded(self) -> bool:
        """Return ``True`` when the underlying model is ready."""
        return self._model is not None

    # ─── Encoding API ────────────────────────────────────────────────────────

    def encode_batch(self, texts: list[str]) -> EmbeddingMatrix:
        """Encode a list of text strings into normalised embedding vectors.

        All texts are encoded in a single batched inference call.  The result
        is L2-normalised so that cosine similarity = dot product.

        Args:
            texts: Non-empty list of text strings.  Empty strings are replaced
                   with a single space to avoid model errors.

        Returns:
            Float32 numpy array of shape ``(len(texts), embedding_dim)``.

        Raises:
            ValueError: If ``texts`` is empty.
        """
        if not texts:
            raise ValueError("texts must be a non-empty list.")

        # Guard against empty strings (some backends crash on them)
        sanitised = [t if t.strip() else " " for t in texts]

        vectors: EmbeddingMatrix = self._model.encode(
            sanitised,
            batch_size=self._batch_size,
            show_progress_bar=self._show_progress,
            normalize_embeddings=True,   # cosine sim = dot product
            convert_to_numpy=True,
        )
        return vectors.astype(np.float32)

    def encode_single(self, text: str) -> NDArray[np.float32]:
        """Encode a single text string.

        Equivalent to ``encode_batch([text])[0]`` but avoids allocating
        an unnecessary list wrapper.

        Args:
            text: Text string to encode.

        Returns:
            1-D float32 numpy array of length ``embedding_dim``.
        """
        sanitised = text if text.strip() else " "
        vector: NDArray[np.float32] = self._model.encode(
            sanitised,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return vector.astype(np.float32)

    # ─── Similarity helpers ──────────────────────────────────────────────────

    @staticmethod
    def cosine_similarity(
        vec_a: NDArray[np.float32],
        vec_b: NDArray[np.float32],
    ) -> float:
        """Compute cosine similarity between two L2-normalised vectors.

        Because both vectors are already L2-normalised (``normalize_embeddings=True``),
        cosine similarity is simply the dot product.

        Args:
            vec_a: 1-D float32 array.
            vec_b: 1-D float32 array of same length.

        Returns:
            Float in ``[-1.0, 1.0]`` (semantically similar → close to 1.0).
        """
        return float(np.dot(vec_a, vec_b))

    def max_similarity_to_set(
        self,
        query_vec: NDArray[np.float32],
        candidate_vecs: EmbeddingMatrix,
    ) -> float:
        """Return the maximum cosine similarity of ``query_vec`` to any row in ``candidate_vecs``.

        Useful for finding the "best paragraph match" between two documents
        at the semantic level.

        Args:
            query_vec:       1-D float32 query embedding.
            candidate_vecs:  2-D float32 matrix of candidate embeddings.

        Returns:
            Maximum dot product (cosine similarity) value.
        """
        if candidate_vecs.ndim == 1:
            candidate_vecs = candidate_vecs.reshape(1, -1)

        scores: NDArray[np.float32] = candidate_vecs @ query_vec
        return float(np.max(scores))
