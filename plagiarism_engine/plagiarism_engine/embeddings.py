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
import os
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


def get_loaded_embedding_model() -> "EmbeddingModel | None":
    """Return the already-loaded embedding model without triggering load."""
    global _model_instance  # noqa: PLW0603
    return _model_instance


def get_embedding_model(model_name: str | None = None) -> "EmbeddingModel":
    """Return a cached :class:`EmbeddingModel` singleton.

    The underlying model is loaded lazily on the first call
    and then reused. Thread-safe via a module-level lock.

    Args:
        model_name: Model identifier (defaults to BAAI/bge-m3, 1024-dim).

    Returns:
        A fully initialised :class:`EmbeddingModel` instance.
    """
    global _model_instance  # noqa: PLW0603

    if model_name is None:
        model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

    if _model_instance is None:
        with _model_lock:
            if _model_instance is None:
                _model_instance = EmbeddingModel(
                    model_name=model_name,
                    device=os.getenv("EMBEDDING_DEVICE", "auto"),
                    batch_size=int(os.getenv("EMBEDDING_BATCH_SIZE", "16")),
                    max_length=int(os.getenv("BGE_M3_MAX_LENGTH", "8192")),
                )

    return _model_instance


# ─────────────────────────────────────────────────────────────────────────────
# EmbeddingModel class
# ─────────────────────────────────────────────────────────────────────────────


class EmbeddingModel:
    """Enterprise wrapper around BAAI/bge-m3 for dense and sparse lexical representations.

    Supports dense semantic vectors (1024-dim), sparse lexical term-salience weights,
    and long-context windows up to 8,192 tokens under a ~1.2 GB memory footprint.

    Args:
        model_name:   HuggingFace model identifier (default: BAAI/bge-m3).
        batch_size:   Maximum number of segments encoded per forward pass.
        device:       Compute backend ('auto', 'cpu', 'cuda', 'mps').
        show_progress: If ``True``, show a tqdm progress bar during encoding.
        max_length:   Maximum token sequence length (up to 8,192).
    """

    def __init__(
        self,
        model_name: str = "BAAI/bge-m3",
        batch_size: int = 16,
        device: str = "auto",
        show_progress: bool = False,
        max_length: int = 8192,
    ) -> None:
        import torch

        resolved_device = self._resolve_device(device=device, torch_module=torch)

        if resolved_device == "cpu":
            torch.set_num_threads(int(os.getenv("TORCH_NUM_THREADS", "2")))
            torch.set_num_interop_threads(1)

        self._model_name = model_name
        self._batch_size = batch_size
        self._device = resolved_device
        self._show_progress = show_progress
        self._max_length = min(8192, max(256, max_length))
        self._use_flag_model = False
        self._model = None
        self._flag_model = None

        logger.info(
            "Loading BGE-M3 embedding core '%s' on device '%s' (max_length=%d)...",
            model_name,
            resolved_device,
            self._max_length,
        )

        # Attempt to load native FlagEmbedding BGEM3FlagModel if available
        try:
            from FlagEmbedding import BGEM3FlagModel

            use_fp16 = resolved_device == "cuda"
            self._flag_model = BGEM3FlagModel(
                model_name,
                use_fp16=use_fp16,
                device=resolved_device,
            )
            self._use_flag_model = True
            self._embedding_dim = 1024
            logger.info("BGEM3FlagModel successfully initialized with dense and sparse heads.")
        except Exception as flag_err:
            logger.info(
                "FlagEmbedding unavailable or fallback requested (%s); loading via SentenceTransformer.",
                flag_err,
            )
            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(model_name, device=resolved_device)
                if hasattr(self._model, "max_seq_length"):
                    self._model.max_seq_length = self._max_length
                self._embedding_dim = self._model.get_sentence_embedding_dimension()
            except Exception as st_err:
                raise RuntimeError(
                    f"Failed to load embedding model '{model_name}' via both FlagEmbedding and SentenceTransformer: {st_err}"
                ) from st_err

        logger.info(
            "Model '%s' ready. Embedding dimension: %d. Backend: %s. Active device: %s.",
            model_name,
            self._embedding_dim,
            "FlagEmbedding" if self._use_flag_model else "SentenceTransformer",
            self._device,
        )

    @staticmethod
    def _resolve_device(device: str, torch_module: "object") -> str:
        """Resolve the target compute backend for sentence-transformers.

        auto: prefers CUDA, then MPS, then CPU.
        """
        requested = (device or "auto").strip().lower()

        if requested != "auto":
            return requested

        try:
            if getattr(torch_module, "cuda").is_available():
                return "cuda"
            if hasattr(torch_module.backends, "mps") and torch_module.backends.mps.is_available():
                return "mps"
        except Exception:
            pass

        return "cpu"

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
        return (self._flag_model is not None) or (self._model is not None)

    # ─── Encoding API ────────────────────────────────────────────────────────

    def encode_batch(self, texts: list[str]) -> EmbeddingMatrix:
        """Encode a list of text strings into normalised 1,024-dim embedding vectors.

        All texts are encoded in a single batched inference call with up to 8,192
        tokens context without truncation. The result is L2-normalised so that
        cosine similarity = dot product.

        Args:
            texts: Non-empty list of text strings. Empty strings are replaced
                   with a single space to avoid model errors.

        Returns:
            Float32 numpy array of shape ``(len(texts), embedding_dim)``.

        Raises:
            ValueError: If ``texts`` is empty.
        """
        if not texts:
            raise ValueError("texts must be a non-empty list.")

        # Guard against empty strings
        sanitised = [t if t.strip() else " " for t in texts]

        if self._use_flag_model and self._flag_model is not None:
            res = self._flag_model.encode(
                sanitised,
                batch_size=self._batch_size,
                max_length=self._max_length,
                return_dense=True,
                return_sparse=False,
            )
            dense_vecs = res["dense_vecs"]
            # Ensure L2 normalization
            norms = np.linalg.norm(dense_vecs, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            return (dense_vecs / norms).astype(np.float32)

        vectors: EmbeddingMatrix = self._model.encode(
            sanitised,
            batch_size=self._batch_size,
            show_progress_bar=self._show_progress,
            normalize_embeddings=True,   # cosine sim = dot product
            convert_to_numpy=True,
        )
        return vectors.astype(np.float32)

    def encode_single(self, text: str) -> NDArray[np.float32]:
        """Encode a single text string into a 1,024-dim dense vector.

        Args:
            text: Text string to encode.

        Returns:
            1-D float32 numpy array of length ``embedding_dim``.
        """
        return self.encode_batch([text])[0]

    def encode_sparse_batch(self, texts: list[str]) -> list[dict[str, float]]:
        """Extract normalized BGE-M3 sparse lexical term-salience weights.

        Returns a dictionary mapping token identifiers / terms to positive salience
        scores, suitable for in-memory hybrid re-ranking.

        Args:
            texts: Non-empty list of text strings.

        Returns:
            List of sparse term-weight mappings: ``[{token_id: weight, ...}, ...]``.
        """
        if not texts:
            return []

        sanitised = [t if t.strip() else " " for t in texts]

        if self._use_flag_model and self._flag_model is not None:
            res = self._flag_model.encode(
                sanitised,
                batch_size=self._batch_size,
                max_length=self._max_length,
                return_dense=False,
                return_sparse=True,
            )
            lexical_weights = res.get("lexical_weights", [])
            output = []
            for item in lexical_weights:
                if isinstance(item, dict):
                    output.append({str(k): float(v) for k, v in item.items()})
                else:
                    output.append({})
            return output

        # Fallback lexical weight generator using sub-token term frequency
        output = []
        import re
        for text in sanitised:
            tokens = re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", text.lower())
            if not tokens:
                output.append({})
                continue
            freq: dict[str, float] = {}
            for tok in tokens:
                freq[tok] = freq.get(tok, 0.0) + 1.0
            total = sum(freq.values()) or 1.0
            # Normalize term frequencies
            output.append({k: round(v / total, 5) for k, v in freq.items()})
        return output

    @staticmethod
    def compute_sparse_similarity(
        weights_a: dict[str, float],
        weights_b: dict[str, float],
    ) -> float:
        """Compute cosine similarity between two sparse lexical term-weight vectors.

        Args:
            weights_a: First sparse dictionary {token: weight}.
            weights_b: Second sparse dictionary {token: weight}.

        Returns:
            Normalized dot product in [0.0, 1.0].
        """
        if not weights_a or not weights_b:
            return 0.0

        common_keys = set(weights_a.keys()) & set(weights_b.keys())
        if not common_keys:
            return 0.0

        dot_product = sum(weights_a[k] * weights_b[k] for k in common_keys)
        norm_a = np.sqrt(sum(v ** 2 for v in weights_a.values()))
        norm_b = np.sqrt(sum(v ** 2 for v in weights_b.values()))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        score = dot_product / (norm_a * norm_b)
        return float(max(0.0, min(1.0, score)))

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
