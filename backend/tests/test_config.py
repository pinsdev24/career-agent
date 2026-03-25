"""Tests for Settings config — validation and defaults."""

import os
import pytest


class TestSettings:
    """Verify pydantic-settings reads env vars and applies defaults."""

    def test_settings_loads_from_env(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        # Keys are set in conftest.py via os.environ.setdefault
        assert settings.openai_api_key is not None
        assert settings.tavily_api_key is not None

    def test_default_llm_model(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        assert "gpt" in settings.llm_model.lower()

    def test_default_embedding_model(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        assert "text-embedding" in settings.embedding_model

    def test_default_embedding_dimensions(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        assert settings.embedding_dimensions in (512, 1536, 3072)

    def test_critic_threshold_is_valid_range(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        assert 0 <= settings.critic_threshold <= 100

    def test_max_revisions_is_positive(self) -> None:
        from app.config import get_settings
        settings = get_settings()
        assert settings.max_revisions >= 1

    def test_extra_env_vars_are_ignored(self, monkeypatch) -> None:
        """LANGSMITH_* and other unknown vars must not raise ValidationError."""
        monkeypatch.setenv("LANGSMITH_API_KEY", "lsv2_test_key")
        monkeypatch.setenv("LANGSMITH_TRACING", "true")
        monkeypatch.setenv("LANGSMITH_PROJECT", "TestProject")
        monkeypatch.setenv("SOME_RANDOM_VAR", "should be ignored")

        # Re-import with fresh cache to pick up monkeypatched env
        import importlib
        import app.config
        importlib.reload(app.config)
        from app.config import Settings
        settings = Settings()  # Should NOT raise ValidationError
        assert settings is not None

    def test_langsmith_fields_parsed_correctly(self, monkeypatch) -> None:
        monkeypatch.setenv("LANGSMITH_API_KEY", "lsv2_test_key_abc")
        monkeypatch.setenv("LANGSMITH_TRACING", "true")
        monkeypatch.setenv("LANGSMITH_PROJECT", "CareerAgentTest")

        import importlib
        import app.config
        importlib.reload(app.config)
        from app.config import Settings
        settings = Settings()
        assert settings.langsmith_api_key == "lsv2_test_key_abc"
        assert settings.langsmith_tracing is True
        assert settings.langsmith_project == "CareerAgentTest"
