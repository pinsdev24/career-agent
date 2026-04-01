"""Centralized configuration via pydantic-settings.

All environment variables are loaded here. No os.getenv() elsewhere.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # silently skip unknown env vars (e.g. LANGSMITH_*, shell vars)
    )

    # --- OpenAI ---
    openai_api_key: str

    # --- Moonshot ---
    moonshot_api_key: str

    # --- Tavily ---
    tavily_api_key: str

    # --- Supabase ---
    supabase_url: str
    supabase_service_key: str
    supabase_db_url: str  # postgresql://... for checkpointer

    # --- LangSmith (optional tracing) ---
    langsmith_api_key: str | None = None
    langsmith_tracing: bool = False
    langsmith_project: str = "CareerAgent"

    # --- App ---
    frontend_url: str = "http://localhost:3000"

    # --- LLM (tiered model routing) ---
    # fast_model:   Routing, summaries, memory extraction (cheapest)
    # llm_model:    Matcher gap analysis (mid-tier, good structured output)
    # critic_model: Cover letter evaluation (mid-tier, calibrated scoring)
    # writer_model: Letter generation (best quality, core value)
    llm_model: str = "gpt-5-mini"
    fast_model: str = "gpt-5-nano"
    critic_model: str = "gpt-5-mini"
    writer_model: str = "kimi-k2.5"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # --- Pipeline ---
    max_revisions: int = 3
    critic_threshold: int = 75


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()  # type: ignore[call-arg]
