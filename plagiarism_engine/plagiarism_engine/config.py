"""
Configuration module for the Plagiarism Detection Engine.

All settings are read from environment variables with sensible defaults.
Use a .env file at the project root (or set env vars directly in production).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Winnowing Algorithm ───────────────────────────────────────────────────
    KGRAM_SIZE: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Character k-gram length for Rabin-Karp rolling hash.",
    )
    WINDOW_SIZE: int = Field(
        default=100,
        ge=10,
        le=500,
        description="Sliding window size for Winnowing fingerprint selection.",
    )
    MIN_MATCH_SPAN: int = Field(
        default=30,
        ge=5,
        description="Minimum character length for a merged match span to be reported.",
    )
    WINNOW_MERGE_GAP: int = Field(
        default=20,
        ge=0,
        description="Merge adjacent matched spans if gap between them is <= this value.",
    )

    # ─── Semantic Search ───────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence-Transformers model name to use for vector embeddings.",
    )
    EMBEDDING_BATCH_SIZE: int = Field(
        default=32,
        ge=1,
        description="Number of text segments to encode in a single batch.",
    )
    TOP_K_CANDIDATES: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of candidate documents to retrieve from ChromaDB.",
    )
    SEMANTIC_SIMILARITY_THRESHOLD: float = Field(
        default=0.45,
        ge=0.0,
        le=1.0,
        description=(
            "Minimum cosine similarity score to consider a ChromaDB result "
            "as a relevant candidate (lower = more relaxed)."
        ),
    )
    SEGMENT_MIN_WORDS: int = Field(
        default=12,
        ge=1,
        description="Minimum word count for a paragraph segment to be embedded.",
    )

    # ─── ChromaDB ─────────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: Path = Field(
        default=Path("./chroma_store"),
        description="Directory where ChromaDB persists its indexes.",
    )
    CHROMA_COLLECTION_NAME: str = Field(
        default="cms_documents",
        description="Name of the ChromaDB collection.",
    )
    # HNSW index parameters (larger M / ef_construction = more accurate but slower build)
    HNSW_SPACE: str = Field(default="cosine", description="Distance metric for HNSW index.")
    HNSW_M: int = Field(
        default=16,
        ge=2,
        description="HNSW M parameter — number of bi-directional links per node.",
    )
    HNSW_EF_CONSTRUCTION: int = Field(
        default=200,
        ge=10,
        description="HNSW ef_construction — controls index build quality.",
    )
    HNSW_EF_SEARCH: int = Field(
        default=100,
        ge=10,
        description="HNSW ef at query time — higher = more accurate search.",
    )

    # ─── Celery / Redis ────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/1",
        description="Redis URL used as Celery broker.",
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/1",
        description="Redis URL used to store Celery task results.",
    )
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=120,
        description="Soft time limit (seconds) before Celery raises SoftTimeLimitExceeded.",
    )
    CELERY_TASK_TIME_LIMIT: int = Field(
        default=180,
        description="Hard time limit (seconds) before Celery kills the task.",
    )
    CELERY_WORKER_CONCURRENCY: int = Field(
        default=4,
        ge=1,
        description="Number of parallel Celery worker processes.",
    )

    # ─── FastAPI ───────────────────────────────────────────────────────────────
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8001, ge=1, le=65535)
    API_RELOAD: bool = Field(default=False)
    API_LOG_LEVEL: str = Field(default="info")
    API_SECRET_KEY: str = Field(
        default="change-me-in-production-very-long-secret-key",
        min_length=16,
        description="Used for signing internal API tokens if needed.",
    )

    # ─── Scoring ───────────────────────────────────────────────────────────────
    PLAGIARISM_SCORE_WEIGHT_WINNOW: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Weight given to Winnowing (exact) score in final similarity.",
    )
    PLAGIARISM_SCORE_WEIGHT_SEMANTIC: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight given to semantic (vector) score in final similarity.",
    )

    @field_validator("CHROMA_PERSIST_DIR", mode="before")
    @classmethod
    def resolve_persist_dir(cls, v: object) -> Path:
        """Resolve the persist directory to an absolute path."""
        path = Path(str(v))
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton of Settings.

    Use ``get_settings.cache_clear()`` in tests to reset between runs.
    """
    return Settings()
