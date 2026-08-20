# =============================================================================
# CareerAgent Backend — Production Dockerfile
# =============================================================================
# Strategy: two-stage build
#   • builder  — installs dependencies into an isolated virtualenv with uv
#   • runtime  — copies only the virtualenv + app source; no build tooling
#
# Runtime: Python 3.11 on Debian Bookworm slim
# Package manager: uv (fast, lock-file aware)
# User: non-root `appuser` (UID 1001) — security best practice
# Port: 8000 (uvicorn)
# =============================================================================

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS builder

# Prevents .pyc files and enables real-time log flushing
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install uv — the fast Python package / project manager
# Pin the version for reproducible builds; bump deliberately when upgrading
COPY --from=ghcr.io/astral-sh/uv:0.6.14 /uv /usr/local/bin/uv

WORKDIR /build

# Tell uv to create the virtualenv at /app/.venv so paths match the runtime stage
ENV UV_PROJECT_ENVIRONMENT=/app/.venv

# Copy dependency manifests first → Docker layer cache is reused when only
# source code changes (not dependencies).
COPY pyproject.toml uv.lock ./

# Sync *only* the main group (no dev extras) into /build/.venv
# --frozen       → fail if lock file is outdated (CI safety)
# --no-install-project → don't install the editable root package yet
# --no-cache     → keep the layer lean
RUN uv sync \
        --frozen \
        --no-dev \
        --no-install-project \
        --no-cache

# ── Stage 2: minimal runtime ─────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Make the virtualenv the active Python environment
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

# Create a non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd  --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy the pre-built virtualenv from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application source
COPY app/ ./app/
COPY pyproject.toml ./

# Fix ownership so the non-root user can access everything
RUN chown -R appuser:appgroup /app

USER appuser

# Railway exposes $PORT dynamically; default to 8000 for local docker run
EXPOSE 8000

# Health check — Railway / Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health')"

# Entrypoint: API process. Run the ARQ worker separately:
#   arq app.workers.settings.WorkerSettings
# $PORT is injected by Railway at runtime; falls back to 8000 locally
CMD uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "${PORT:-8000}" \
        --workers 1 \
        --log-level info \
        --access-log
