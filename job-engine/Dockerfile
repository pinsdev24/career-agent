FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY app ./app
COPY companies.seed.yaml ./companies.seed.yaml

RUN uv pip install --system -e .

ENV PYTHONUNBUFFERED=1
EXPOSE 8001

# Railway injects $PORT. Health lives at /v1/health.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://localhost:%s/v1/health' % os.environ.get('PORT','8001'))"

CMD uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}"
