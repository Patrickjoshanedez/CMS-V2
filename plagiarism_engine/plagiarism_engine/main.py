"""
FastAPI application — HTTP entry-point for the plagiarism engine microservice.

Endpoints
---------

``POST /check``
    Submit a document for async plagiarism checking.  Returns a ``task_id``
    immediately.  Poll ``GET /result/{task_id}`` for the final report.

``GET /result/{task_id}``
    Poll the status / retrieve the result of a previously submitted check.

``POST /index``
    Add (or update) a document in the ChromaDB corpus index.

``DELETE /index/{document_id}``
    Remove a document from the corpus index.

``GET /health``
    Service health check (model loaded, collection count, settings summary).

Integration with Node.js CMS
-----------------------------
The Node.js plagiarism worker (``server/jobs/plagiarism.job.js``) calls this
service **after** the Winnowing corpus analysis, or can offload the entire
check.  Recommended flow:

    1. CMS worker calls ``POST /index`` for every approved submission to keep
       the Python corpus in sync with MongoDB.
    2. When a new submission needs checking, the worker calls ``POST /check``
       with the document text, then polls ``GET /result/{task_id}`` until
       ``status == "completed"``.
    3. Worker stores ``result.matches[].start_index`` etc. in MongoDB.

Start the service::

    uvicorn plagiarism_engine.main:app --host 0.0.0.0 --port 8001 --workers 1

Or via Docker Compose (see ``docker-compose.yml``).
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from celery.result import AsyncResult
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .engine import PlagiarismEngine
from .models import (
    CheckRequest,
    CheckResponse,
    DeleteResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
    PlagiarismReport,
    ResultResponse,
    SourceMetadata,
    TaskStatus,
)
from .tasks import celery_app, check_document_task, index_document_task

logger = logging.getLogger(__name__)
_cfg = get_settings()


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan — warm up model on startup so first request is fast
# ─────────────────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    """Perform startup / shutdown tasks."""
    logger.info("Plagiarism engine API starting up — warming up embedding model...")
    # Instantiate the engine singleton which triggers model loading
    engine = PlagiarismEngine()
    _ = engine._model  # noqa: SLF001  (access triggers load)
    logger.info("Embedding model ready.  API is accepting requests.")
    yield
    logger.info("Plagiarism engine API shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────


app = FastAPI(
    title="Plagiarism Engine",
    description=(
        "High-performance hybrid plagiarism detection microservice. "
        "Combines Sentence-Transformer semantic search (ChromaDB HNSW) with "
        "Winnowing exact-match fingerprinting to detect both paraphrased and "
        "verbatim plagiarism at character-level precision."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cfg.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@app.post(
    "/check",
    response_model=CheckResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a document for plagiarism checking (async)",
    tags=["Plagiarism Check"],
)
async def submit_check(body: CheckRequest) -> CheckResponse:
    """Queue an async plagiarism check and return a ``task_id``.

    The client should poll ``GET /result/{task_id}`` every few seconds until
    ``status`` is ``"completed"`` or ``"failed"``.

    Body:
    ```json
    {
        "document_id": "sub_01JX…",
        "text": "The full extracted plain text of the submitted paper…",
        "metadata": {
            "title": "Inventory Management System",
            "author": "Jane Reyes",
            "chapter": 1,
            "project_id": "proj_abc123",
            "year": 2024
        }
    }
    ```
    """
    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'text' is required and must not be empty.",
        )

    task = check_document_task.delay(
        document_id=body.document_id,
        text=body.text,
        metadata=body.metadata.model_dump() if body.metadata else {},
    )

    logger.info("Enqueued check task %s for document '%s'.", task.id, body.document_id)

    return CheckResponse(
        task_id=task.id,
        document_id=body.document_id,
        status=TaskStatus.PENDING,
        message="Plagiarism check queued. Poll /result/{task_id} for the result.",
    )


@app.get(
    "/result/{task_id}",
    response_model=ResultResponse,
    summary="Poll the result of a check task",
    tags=["Plagiarism Check"],
)
async def get_result(task_id: str) -> ResultResponse:
    """Return the current status and result of a plagiarism check task.

    Possible ``status`` values:
    - ``"pending"``    — queued, not yet started.
    - ``"processing"`` — worker is running the analysis.
    - ``"completed"``  — result is available in the ``result`` field.
    - ``"failed"``     — an error occurred; ``error`` field contains the message.
    """
    async_result: AsyncResult = AsyncResult(task_id, app=celery_app)

    celery_state = async_result.state

    if celery_state == "PENDING":
        return ResultResponse(task_id=task_id, status=TaskStatus.PENDING)

    if celery_state == "STARTED" or celery_state == "RETRY":
        return ResultResponse(task_id=task_id, status=TaskStatus.PROCESSING)

    if celery_state == "SUCCESS":
        raw = async_result.result
        if isinstance(raw, dict):
            report = PlagiarismReport.model_validate(raw)
        else:
            report = raw  # Already a PlagiarismReport
        return ResultResponse(task_id=task_id, status=TaskStatus.COMPLETED, result=report)

    if celery_state == "FAILURE":
        err = async_result.result
        error_msg = str(err) if err else "Unknown error"
        return ResultResponse(task_id=task_id, status=TaskStatus.FAILED, error=error_msg)

    # REVOKED or other states
    return ResultResponse(
        task_id=task_id,
        status=TaskStatus.FAILED,
        error=f"Task in unexpected state: {celery_state}",
    )


@app.post(
    "/index",
    response_model=IndexResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Index a document into the corpus (async)",
    tags=["Corpus Index"],
)
async def index_document(body: IndexRequest) -> IndexResponse:
    """Queue indexing of a source document into the ChromaDB corpus.

    Call this endpoint whenever an adviser approves a chapter or when the CMS
    bulk-imports historical capstone records.

    Body:
    ```json
    {
        "document_id": "sub_01JX…",
        "text": "The full extracted plain text of the approved chapter…",
        "metadata": {
            "title": "Network Monitoring Tool",
            "author": "Juan dela Cruz",
            "chapter": 2,
            "project_id": "proj_xyz987",
            "year": 2023,
            "url": "https://cms.buksu.edu.ph/view/sub_01JX"
        }
    }
    ```

    The task runs in the background.  The endpoint returns immediately with a
    preliminary ``segments_indexed: 0`` placeholder; the real count will be
    visible once the worker completes.  You do **not** need to poll for
    indexing jobs — they are fire-and-forget from the CMS's perspective.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'text' is required and must not be empty.",
        )

    meta_dict = body.metadata.model_dump() if body.metadata else {"document_id": body.document_id}
    index_document_task.delay(
        document_id=body.document_id,
        text=body.text,
        metadata=meta_dict,
    )

    return IndexResponse(
        document_id=body.document_id,
        segments_indexed=0,
        message="Indexing task queued. Document will be available shortly.",
    )


@app.delete(
    "/index/{document_id}",
    response_model=DeleteResponse,
    summary="Remove a document from the corpus index",
    tags=["Corpus Index"],
)
async def delete_from_index(document_id: str) -> DeleteResponse:
    """Synchronously remove a document and all its embedded segments from ChromaDB.

    Call this when a submission is permanently deleted or de-listed from the
    CMS archive so it no longer influences future plagiarism checks.
    """
    engine = PlagiarismEngine()
    deleted_count = engine.remove_document(document_id)
    return DeleteResponse(
        document_id=document_id,
        deleted_segments=deleted_count,
        success=True,
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """Return the health status of the plagiarism engine service.

    Useful for Docker / Kubernetes liveness probes.
    """
    engine = PlagiarismEngine()
    info = engine.health()
    return HealthResponse(**info)
