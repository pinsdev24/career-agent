"""Centralized configuration via pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- OpenAI (embeddings require a real OpenAI-compatible embeddings API) ---
    openai_api_key: str = ""
    openai_base_url: str | None = None  # e.g. https://api.openai.com/v1
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # --- Tavily ---
    tavily_api_key: str = ""

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_key: str = ""

    # --- Redis ---
    redis_url: str = "redis://localhost:6379"

    # --- App ---
    frontend_url: str = "http://localhost:3000"
    service_name: str = "job-engine"
    log_level: str = "INFO"
    recommend_cache_ttl_seconds: int = 60
    http_timeout_seconds: float = 10.0
    ats_rate_limit_per_second: float = 2.0
    freshness_stale_days: int = 3
    min_extract_chars: int = 100

    # --- Ranking weights (must sum conceptually; normalized at runtime) ---
    weight_semantic: float = 0.40
    weight_skills: float = 0.25
    weight_recency: float = 0.15
    weight_source_trust: float = 0.10
    weight_novelty: float = 0.10

    # --- Admin ---
    admin_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
