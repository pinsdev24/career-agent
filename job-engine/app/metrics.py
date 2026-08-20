"""Prometheus metrics for API and ingest."""

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

REQUEST_COUNT = Counter(
    "job_engine_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "job_engine_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 1.5, 3.0, 5.0),
)

INGEST_UPSERTS = Counter(
    "job_engine_ingest_upserts_total",
    "Jobs upserted by ingest",
    ["source"],
)

INGEST_ERRORS = Counter(
    "job_engine_ingest_errors_total",
    "Ingest errors",
    ["source"],
)

RECOMMEND_CACHE_HITS = Counter(
    "job_engine_recommend_cache_hits_total",
    "Recommend feed cache hits",
)


def metrics_payload() -> tuple[bytes, str]:
    """Return Prometheus exposition payload and content type."""
    return generate_latest(), CONTENT_TYPE_LATEST
