"""
plagiarism_engine
=================

Hybrid plagiarism detection microservice for the BukSU Capstone Management
System.

Public surface
--------------
The recommended way to use this package programmatically (outside the
FastAPI/Celery entry-points) is via the :class:`PlagiarismEngine` class::

    from plagiarism_engine import PlagiarismEngine

    engine = PlagiarismEngine()

    # Index a source document
    engine.index_document(IndexRequest(
        document_id="sub_001",
        text="Full text…",
        metadata=SourceMetadata(title="My Chapter", author="Alice"),
    ))

    # Check a new submission
    report = engine.check_document(
        document_id="sub_002",
        text="Submitted text…",
    )
    print(report.originality_score)

For production use, deploy via Docker Compose (see ``../docker-compose.yml``).
"""
from .engine import PlagiarismEngine
from .models import (
    IndexRequest,
    IndexResponse,
    MatchResult,
    PlagiarismReport,
    SourceMetadata,
    TaskStatus,
    TextSpan,
)

__all__ = [
    "PlagiarismEngine",
    "IndexRequest",
    "IndexResponse",
    "MatchResult",
    "PlagiarismReport",
    "SourceMetadata",
    "TaskStatus",
    "TextSpan",
]

__version__ = "1.0.0"
