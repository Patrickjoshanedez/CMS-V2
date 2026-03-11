"""
Pydantic models for the Plagiarism Detection Engine.

These models serve as the single source of truth for all request/response
schemas, validation, and serialization across the FastAPI layer and the
internal engine. They are intentionally kept framework-agnostic.
"""
from __future__ import annotations

import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────


class TaskStatus(str, Enum):
    """Lifecycle states for an async plagiarism check task."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ─────────────────────────────────────────────────────────────────────────────
# Source & Match models
# ─────────────────────────────────────────────────────────────────────────────


class SourceMetadata(BaseModel):
    """Metadata stored alongside a document vector in ChromaDB.

    All fields are optional to accommodate different ingestion sources
    (internal CMS submissions vs. future web-crawled documents).
    """

    document_id: str = Field(..., description="Unique identifier for the source document.")
    title: str = Field(default="Unknown Title", description="Document title.")
    author: str = Field(default="Unknown Author", description="Primary author or team name.")
    url: str | None = Field(
        default=None,
        description="External URL or CMS deep-link to the source document.",
    )
    chapter: int | None = Field(
        default=None,
        ge=1,
        le=10,
        description="Chapter number for CMS internal submissions.",
    )
    project_id: str | None = Field(
        default=None,
        description="CMS project ID for internal corpus documents.",
    )
    year: int | None = Field(
        default=None,
        ge=2000,
        description="Academic year the document was submitted.",
    )

    @field_validator("document_id", mode="before")
    @classmethod
    def coerce_document_id(cls, v: object) -> str:
        """Accept ObjectId, UUID, or string identifiers."""
        return str(v)


class TextSpan(BaseModel):
    """Character-level span within a piece of text.

    ``start_index`` is inclusive; ``end_index`` is exclusive
    (Python slice convention: ``text[start_index:end_index]``).
    """

    start_index: int = Field(..., ge=0, description="Inclusive character start offset.")
    end_index: int = Field(..., ge=0, description="Exclusive character end offset.")

    @model_validator(mode="after")
    def validate_span_order(self) -> "TextSpan":
        """Ensure start < end."""
        if self.start_index >= self.end_index:
            raise ValueError(
                f"start_index ({self.start_index}) must be less than "
                f"end_index ({self.end_index})."
            )
        return self


class MatchResult(BaseModel):
    """A single detected plagiarism match.

    This is the atomic unit returned by ``PlagiarismEngine.check_document``.
    It maps directly to what the React ``VirtualizedPlagiarismViewer`` needs
    to render a clickable highlight.
    """

    match_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique identifier for this match (stable within a report).",
    )
    match_text: str = Field(
        ...,
        description="The exact matched text segment from the submitted document.",
    )
    start_index: int = Field(..., ge=0, description="Character start offset in submitted text.")
    end_index: int = Field(..., ge=0, description="Character end offset in submitted text.")
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Blended similarity score (Winnowing Jaccard * weight + "
            "semantic cosine * weight). Range 0.0–1.0."
        ),
    )
    winnow_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Raw Winnowing Jaccard overlap for this span.",
    )
    semantic_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Semantic (cosine) similarity score for the containing paragraph.",
    )
    source_metadata: SourceMetadata = Field(
        ...,
        description="Metadata of the matched source document.",
    )
    source_snippet: str = Field(
        default="",
        description=(
            "Short excerpt (~200 chars) from the source document that "
            "produced this match, for display in the detail panel."
        ),
    )

    @model_validator(mode="after")
    def validate_match_span(self) -> "MatchResult":
        if self.start_index >= self.end_index:
            raise ValueError("start_index must be less than end_index.")
        return self


# ─────────────────────────────────────────────────────────────────────────────
# Report model
# ─────────────────────────────────────────────────────────────────────────────


class PlagiarismReport(BaseModel):
    """Full result of a plagiarism check for a single submitted document."""

    document_id: str = Field(..., description="ID of the submitted document that was checked.")
    originality_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description=(
            "Percentage of the submitted text estimated to be original. "
            "100 = fully original; 0 = fully plagiarised."
        ),
    )
    plagiarism_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="100 - originality_score.",
    )
    total_characters: int = Field(
        ...,
        ge=0,
        description="Total character count of the (cleaned) submitted text.",
    )
    matched_characters: int = Field(
        default=0,
        ge=0,
        description="Total unique matched character positions in submitted text.",
    )
    matches: list[MatchResult] = Field(
        default_factory=list,
        description="Ordered list of match results (sorted by start_index).",
    )
    candidates_evaluated: int = Field(
        default=0,
        ge=0,
        description="Number of corpus documents evaluated by Winnowing.",
    )
    processing_time_ms: float = Field(
        default=0.0,
        ge=0.0,
        description="Total engine processing time in milliseconds.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional extra metadata (chapter, project_id, etc.) supplied at check time.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# API Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────


class CheckRequest(BaseModel):
    """Request body for ``POST /check``."""

    document_id: str = Field(
        ...,
        description="Unique identifier for the document being checked (CMS submissionId).",
    )
    text: str = Field(
        ...,
        min_length=50,
        description="Full extracted plain-text content of the submitted document.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Optional metadata to attach to this check "
            "(e.g. chapter, projectId, submittedBy)."
        ),
    )

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class CheckResponse(BaseModel):
    """Response body for ``POST /check`` (async)."""

    task_id: str = Field(..., description="Celery task ID to poll with GET /result/{task_id}.")
    document_id: str
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    message: str = "Check enqueued successfully."


class ResultResponse(BaseModel):
    """Response body for ``GET /result/{task_id}``."""

    task_id: str
    status: TaskStatus
    report: PlagiarismReport | None = None
    error: str | None = None


class IndexRequest(BaseModel):
    """Request body for ``POST /index`` — adds a document to the corpus."""

    document_id: str = Field(..., description="Unique ID for the document.")
    text: str = Field(..., min_length=50, description="Full plain text of the document.")
    metadata: SourceMetadata = Field(..., description="Source metadata to persist in ChromaDB.")

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class IndexResponse(BaseModel):
    """Response body for ``POST /index``."""

    document_id: str
    segments_indexed: int = Field(..., description="Number of paragraph segments stored.")
    message: str = "Document indexed successfully."


class DeleteResponse(BaseModel):
    """Response body for ``DELETE /index/{document_id}``."""

    document_id: str
    segments_removed: int
    message: str = "Document removed from index."


class HealthResponse(BaseModel):
    """Response body for ``GET /health``."""

    status: str = "ok"
    chroma_collection: str
    collection_count: int
    model_loaded: bool
    version: str = "1.0.0"
