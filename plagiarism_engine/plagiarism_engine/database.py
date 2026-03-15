"""
ChromaDB client for the Plagiarism Detection Engine.

Responsibilities
----------------
*  Initialise (or reopen) a persistent ChromaDB collection with an
   HNSW index configured for cosine similarity.
*  ``add_document()``   — index one document's paragraph embeddings.
*  ``query_candidates()``  — retrieve top-K candidate document IDs via ANN.
*  ``get_document_text()`` — retrieve stored text segments for Winnowing.
*  ``delete_document()``  — remove a document from the index.

Data model
----------
Each paragraph segment is stored as one ChromaDB entry:

    id        :  ``"{document_id}__seg{n}"``   (unique within collection)
    embedding :  384-dim float32 vector
    document  :  paragraph text (stored as the ``documents`` field)
    metadata  :  {
        "document_id"  : str   — parent document ID
        "title"        : str
        "author"       : str
        "url"          : str | ""
        "chapter"      : int | 0
        "project_id"   : str | ""
        "year"         : int | 0
        "seg_idx"      : int   — segment index within document
        "char_start"   : int   — character offset in cleaned text
        "char_end"     : int
    }

HNSW configuration
------------------
ChromaDB's HNSW variant supports these per-collection settings:

    ``hnsw:space``            — distance metric ("cosine", "l2", "ip")
    ``hnsw:M``                — number of bi-directional links per node
    ``hnsw:ef_construction``  — quality of build-time index
    ``hnsw:ef``               — quality of search-time lookup

These are set **once at collection creation** and cannot be changed
without recreating the collection.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

from .models import SourceMetadata
from .preprocessing import TextSegment

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# ChromaDB client wrapper
# ─────────────────────────────────────────────────────────────────────────────


class ChromaStore:
    """Wrapper around a ChromaDB persistent collection.

    Args:
        persist_dir:      Directory where Chroma stores its data files.
        collection_name:  Name of the Chroma collection.
        hnsw_space:       Distance metric — "cosine" | "l2" | "ip".
        hnsw_m:           HNSW M parameter.
        hnsw_ef_construction: HNSW ef_construction.
        hnsw_ef_search:   HNSW ef at query time.

    Usage::

        store = ChromaStore(persist_dir=Path("./chroma_store"))
        store.add_document("doc001", segments, metadata, embeddings)
        doc_ids = store.query_candidates([embedding], top_k=5)
    """

    def __init__(
        self,
        persist_dir: Path,
        collection_name: str = "cms_documents",
        hnsw_space: str = "cosine",
        hnsw_m: int = 16,
        hnsw_ef_construction: int = 200,
        hnsw_ef_search: int = 100,
        host: str | None = None,
        port: int | None = None,
    ) -> None:
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
        except ImportError as exc:
            raise ImportError(
                "chromadb is required.  Install with: pip install chromadb"
            ) from exc

        if host:
            self._client = chromadb.HttpClient(
                host=host,
                port=port or 8000,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        else:
            persist_dir.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=str(persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False),
            )

        # HNSW metadata is applied at *collection creation time* only.
        # If the collection already exists, the existing HNSW config is used.
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={
                "hnsw:space": hnsw_space,
                "hnsw:M": hnsw_m,
                "hnsw:construction_ef": hnsw_ef_construction,
                "hnsw:search_ef": hnsw_ef_search,
            },
        )
        self._collection_name = collection_name
        logger.info(
            "ChromaStore ready. Collection: '%s', count: %d",
            collection_name,
            self._collection.count(),
        )

    # ─── Read-only properties ─────────────────────────────────────────────────

    @property
    def collection_name(self) -> str:
        return self._collection_name

    @property
    def count(self) -> int:
        """Total number of stored paragraph segments."""
        return self._collection.count()

    # ─── Indexing ─────────────────────────────────────────────────────────────

    def add_document(
        self,
        document_id: str,
        segments: list[TextSegment],
        metadata: SourceMetadata,
        embeddings: np.ndarray,
    ) -> int:
        """Add (or re-add) all segments of a document to the collection.

        Any pre-existing entries for ``document_id`` are removed first so that
        re-indexing after a document edit produces clean results.

        Args:
            document_id: Unique identifier for the document.
            segments:    List of :class:`TextSegment` objects from preprocessing.
            metadata:    :class:`SourceMetadata` for the document.
            embeddings:  Float32 matrix of shape ``(len(segments), dim)``.

        Returns:
            Number of segments stored.

        Raises:
            ValueError: If ``len(segments) != embeddings.shape[0]``.
        """
        if len(segments) != embeddings.shape[0]:
            raise ValueError(
                f"segments count ({len(segments)}) must match "
                f"embeddings rows ({embeddings.shape[0]})."
            )

        if not segments:
            return 0

        # Remove stale entries for this document_id
        self.delete_document(document_id)

        ids: list[str] = []
        texts: list[str] = []
        metas: list[dict[str, Any]] = []
        vecs: list[list[float]] = []

        for i, seg in enumerate(segments):
            ids.append(f"{document_id}__seg{i}")
            texts.append(seg.text)
            metas.append(
                {
                    "document_id": document_id,
                    "title": metadata.title,
                    "author": metadata.author,
                    "url": metadata.url or "",
                    "chapter": metadata.chapter or 0,
                    "project_id": metadata.project_id or "",
                    "year": metadata.year or 0,
                    "seg_idx": i,
                    "char_start": seg.char_start,
                    "char_end": seg.char_end,
                }
            )
            vecs.append(embeddings[i].tolist())

        # ChromaDB upsert in batches of 512 to avoid memory spikes
        batch_size = 512
        for start in range(0, len(ids), batch_size):
            end = start + batch_size
            self._collection.add(
                ids=ids[start:end],
                embeddings=vecs[start:end],
                documents=texts[start:end],
                metadatas=metas[start:end],
            )

        logger.debug("Indexed %d segments for document '%s'.", len(segments), document_id)
        return len(segments)

    # ─── Querying ─────────────────────────────────────────────────────────────

    def query_candidates(
        self,
        query_embeddings: np.ndarray,
        top_k: int = 5,
        similarity_threshold: float = 0.45,
        exclude_document_ids: list[str] | None = None,
    ) -> list[str]:
        """Find the top-K most similar *documents* for a set of query vectors.

        Each row in ``query_embeddings`` is one paragraph embedding from the
        submitted document.  We query ChromaDB with ALL of them (in one call)
        and aggregate the results into a de-duplicated, ranked list of
        document IDs sorted by their best similarity score.

        Args:
            query_embeddings:      2-D float32 array of shape ``(n_queries, dim)``.
            top_k:                 Max number of unique document IDs to return.
            similarity_threshold:  Minimum similarity to consider a hit (0–1).
            exclude_document_ids:  Document IDs to exclude from results
                                   (e.g. the submitted document's own ID if it
                                   is already in the index).

        Returns:
            Ordered list of document ID strings (most similar first), length ≤ ``top_k``.
        """
        if self.count == 0:
            return []

        if query_embeddings.ndim == 1:
            query_embeddings = query_embeddings.reshape(1, -1)

        n_queries = query_embeddings.shape[0]

        # Request more results per query to have room after de-duplication
        n_results = min(top_k * 3, self.count)

        results = self._collection.query(
            query_embeddings=query_embeddings.tolist(),
            n_results=n_results,
            include=["metadatas", "distances"],
        )

        # Aggregate: doc_id → best (lowest distance) across all queries
        # ChromaDB uses distance (lower = more similar).
        # For cosine space: distance = 1 - cosine_similarity
        best_score: dict[str, float] = {}
        exclude_set = set(exclude_document_ids or [])

        for q_idx in range(n_queries):
            metadatas_row = results["metadatas"][q_idx]
            distances_row = results["distances"][q_idx]

            for meta, dist in zip(metadatas_row, distances_row):
                doc_id = meta.get("document_id", "")
                if not doc_id or doc_id in exclude_set:
                    continue

                similarity = 1.0 - dist  # convert distance to similarity
                if similarity < similarity_threshold:
                    continue

                if doc_id not in best_score or similarity > best_score[doc_id]:
                    best_score[doc_id] = similarity

        # Sort by best similarity descending, take top_k
        ranked = sorted(best_score.items(), key=lambda x: x[1], reverse=True)
        return [doc_id for doc_id, _ in ranked[:top_k]]

    # ─── Text retrieval ───────────────────────────────────────────────────────

    def get_document_texts(self, document_id: str) -> tuple[str, SourceMetadata | None]:
        """Retrieve and reconstruct the full text of a stored document.

        Segment texts are concatenated in segment-index order, separated by
        double newlines (to approximately restore paragraph boundaries).

        Args:
            document_id: Document ID to look up.

        Returns:
            Tuple of ``(combined_text, source_metadata)``.
            ``combined_text`` is an empty string if the document is not found.
            ``source_metadata`` is ``None`` if the document is not found.
        """
        results = self._collection.get(
            where={"document_id": {"$eq": document_id}},
            include=["documents", "metadatas"],
        )

        if not results["ids"]:
            return "", None

        # Sort by seg_idx to restore paragraph order
        entries = sorted(
            zip(results["metadatas"], results["documents"]),
            key=lambda x: x[0].get("seg_idx", 0),
        )

        combined_text = "\n\n".join(doc for _, doc in entries)
        first_meta = entries[0][0]

        meta = SourceMetadata(
            document_id=document_id,
            title=first_meta.get("title", "Unknown Title"),
            author=first_meta.get("author", "Unknown Author"),
            url=first_meta.get("url") or None,
            chapter=first_meta.get("chapter") or None,
            project_id=first_meta.get("project_id") or None,
            year=first_meta.get("year") or None,
        )

        return combined_text, meta

    def get_multiple_texts(
        self, document_ids: list[str]
    ) -> dict[str, tuple[str, SourceMetadata | None]]:
        """Batch-retrieve texts for multiple document IDs.

        Args:
            document_ids: List of document ID strings.

        Returns:
            Dict mapping ``document_id → (combined_text, metadata)``.
        """
        return {doc_id: self.get_document_texts(doc_id) for doc_id in document_ids}

    # ─── Deletion ─────────────────────────────────────────────────────────────

    def delete_document(self, document_id: str) -> int:
        """Remove all segments for a document from the collection.

        Args:
            document_id: ID of the document to remove.

        Returns:
            Number of segments that were deleted (0 if not found).
        """
        results = self._collection.get(
            where={"document_id": {"$eq": document_id}},
            include=[],
        )

        ids_to_delete = results["ids"]
        if not ids_to_delete:
            return 0

        self._collection.delete(ids=ids_to_delete)
        logger.debug("Deleted %d segments for document '%s'.", len(ids_to_delete), document_id)
        return len(ids_to_delete)

    # ─── Diagnostics ─────────────────────────────────────────────────────────

    def list_document_ids(self) -> list[str]:
        """Return a sorted list of all unique document IDs in the collection."""
        if self.count == 0:
            return []

        results = self._collection.get(include=["metadatas"])
        doc_ids = {m.get("document_id", "") for m in results["metadatas"]}
        doc_ids.discard("")
        return sorted(doc_ids)

