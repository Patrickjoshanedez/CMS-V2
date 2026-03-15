# ─────────────────────────────────────────────────────────────────────────────
# Plagiarism Engine — Production Dockerfile
#
# Multi-stage build:
#   builder — installs all Python deps including PyTorch (large)
#   runtime — slim image with only installed packages + app code
#
# Build:
#   docker build -t plagiarism-engine:latest .
#
# Run API:
#   docker run -p 8001:8001 --env-file .env plagiarism-engine:latest \
#     uvicorn plagiarism_engine.main:app --host 0.0.0.0 --port 8001
#
# Run Worker:
#   docker run --env-file .env plagiarism-engine:latest \
#     celery -A plagiarism_engine.tasks.celery_app worker --loglevel=info
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# System libraries required to compile some wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only requirements first so Docker caches this layer
COPY requirements.txt .

# Install into /app/.venv so script shebang paths stay valid in runtime stage
RUN python -m venv /app/.venv \
    && /app/.venv/bin/pip install --upgrade pip \
    && /app/.venv/bin/pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Minimal runtime dependencies (libgomp is needed by some torch kernels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy application source
# Cache busted 1
COPY plagiarism_engine/ /app/plagiarism_engine/

# Create directories for ChromaDB persistence and model cache
RUN mkdir -p /app/chroma_store /app/.cache/torch/sentence_transformers \
    && chown -R appuser:appuser /app

# Make the venv the default Python
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME="/app/.cache/huggingface" \
    TORCH_HOME="/app/.cache/torch"

# Switch to non-root user
USER appuser

# Port the API listens on
EXPOSE 8001

# Health check (uses the /health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Default command — override in docker-compose.yml per service role
CMD ["uvicorn", "plagiarism_engine.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]

# Dummy cache breaker 1

