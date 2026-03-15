"""
Celery task definitions for the plagiarism engine.

Every task runs inside a Celery worker process.  A single ``PlagiarismEngine``
instance (and therefore a single ``EmbeddingModel`` + ``ChromaStore`` pair) is
shared across all tasks **within the same worker process** — creating it once
on first use and reusing it for subsequent tasks.

Task IDs
--------
Both ``check_document_task`` and ``index_document_task`` return their results
via the Celery result backend (Redis).  Callers can poll
``AsyncResult(task_id).get()`` or the ``GET /result/{task_id}`` FastAPI
endpoint.

Result format (check_document_task)
-------------------------------------
The Celery result is the serialised :class:`PlagiarismReport` as a plain
dict (``report.model_dump()``), making it JSON-serialisable without custom
back-end configuration.

Error handling
--------------
Any exception inside a task is caught, logged, and re-raised so that Celery
marks the task as ``FAILURE`` and stores the traceback in the result backend.
The FastAPI endpoint translates this into a ``TaskStatus.FAILED`` response
with the error message.
"""
from __future__ import annotations

import logging

from celery import Celery
from celery.utils.log import get_task_logger

from .config import get_settings
from .engine import PlagiarismEngine
from .models import IndexRequest, SourceMetadata

# ─────────────────────────────────────────────────────────────────────────────
# Celery application
# ─────────────────────────────────────────────────────────────────────────────

_cfg = get_settings()

celery_app = Celery(
    "plagiarism_engine",
    broker=_cfg.CELERY_BROKER_URL,
    backend=_cfg.CELERY_RESULT_BACKEND,
    include=["plagiarism_engine.tasks"],
)

celery_app.conf.update(
    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Reliability
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    task_reject_on_worker_lost=True,

    # Result TTL — keep results for 24 hours so the CMS can poll at leisure
    result_expires=86_400,

    # Logging
    worker_hijack_root_logger=False,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",

    # Routing (all tasks go to the default queue)
    task_default_queue="plagiarism",
)

task_logger = get_task_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Process-level engine singleton
# ─────────────────────────────────────────────────────────────────────────────

_engine: PlagiarismEngine | None = None


def _get_engine() -> PlagiarismEngine:
    """Return the process-level singleton engine, creating it if necessary."""
    global _engine
    if _engine is None:
        task_logger.info("Initialising PlagiarismEngine for worker process.")
        _engine = PlagiarismEngine()
    return _engine


# ─────────────────────────────────────────────────────────────────────────────
# Tasks
# ─────────────────────────────────────────────────────────────────────────────


@celery_app.task(
    name="plagiarism_engine.tasks.check_document",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    soft_time_limit=120,   # 2-minute soft limit → SoftTimeLimitExceeded
    time_limit=150,        # 2.5-minute hard kill
)
def check_document_task(
    self,  # noqa: ANN001  (Celery injects self when bind=True)
    document_id: str,
    text: str,
    metadata: dict | None = None,
) -> dict:
    """Check a document for plagiarism against the indexed corpus.

    Args:
        document_id: Stable unique ID for the submitted document.
        text:        Raw extracted text of the document.
        metadata:    Optional extra fields (author, chapter, project_id, …).

    Returns:
        A dict representation of :class:`PlagiarismReport` (``report.model_dump()``).

    Raises:
        :class:`celery.exceptions.Retry`: On transient errors (up to 2 retries).
        Exception: On permanent failures; stored in Celery result backend.
    """
    try:
        engine = _get_engine()
        task_logger.info("check_document_task started: document_id=%s", document_id)
        report = engine.check_document(
            document_id=document_id,
            text=text,
            metadata=metadata or {},
        )
        task_logger.info(
            "check_document_task completed: document_id=%s originality=%.1f%% matches=%d",
            document_id,
            report.originality_score,
            len(report.matches),
        )
        return report.model_dump()

    except Exception as exc:
        task_logger.exception("check_document_task failed: document_id=%s error=%s", document_id, exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="plagiarism_engine.tasks.index_document",
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    soft_time_limit=60,
    time_limit=90,
)
def index_document_task(
    self,
    document_id: str,
    text: str,
    metadata: dict | None = None,
) -> dict:
    """Index a document into the corpus (for future plagiarism checks).

    Args:
        document_id: Stable unique ID for the source document.
        text:        Full extracted text of the document.
        metadata:    Optional source metadata fields (title, author, url, …).

    Returns:
        Dict with ``document_id`` and ``segments_indexed`` count.
    """
    try:
        engine = _get_engine()
        task_logger.info("index_document_task started: document_id=%s", document_id)

        meta_obj = SourceMetadata(**(metadata or {})) if metadata else SourceMetadata(document_id=document_id)
        request = IndexRequest(document_id=document_id, text=text, metadata=meta_obj)
        response = engine.index_document(request)

        task_logger.info(
            "index_document_task completed: document_id=%s segments_indexed=%d",
            document_id,
            response.segments_indexed,
        )
        return response.model_dump()

    except Exception as exc:
        task_logger.exception("index_document_task failed: document_id=%s error=%s", document_id, exc)
        raise self.retry(exc=exc) from exc
