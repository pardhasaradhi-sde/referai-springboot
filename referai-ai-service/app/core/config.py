from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "referai-ai-service"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8010
    log_level: str = "INFO"

    internal_api_key: str = Field(
        default="change-me",
        validation_alias=AliasChoices("X_INTERNAL_KEY", "PYTHON_INTERNAL_KEY"),
    )

    postgres_url: str | None = None
    redis_url: str | None = None

    run_migrations: bool = False
    migrations_path: str = "migrations/sql"

    # Groq (OpenAI-compatible API) for all generation/streaming tasks.
    groq_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("GROQ_API_KEY"),
    )
    groq_base_url: str = Field(
        default="https://api.groq.com/openai/v1",
        validation_alias=AliasChoices("GROQ_BASE_URL"),
    )
    groq_model: str = Field(
        default="llama-3.1-8b-instant",
        validation_alias=AliasChoices("GROQ_MODEL"),
    )

    # Gemini is restricted to embedding generation only.
    gemini_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("GEMINI_API_KEY"),
    )
    gemini_embedding_model: str = Field(
        default="gemini-embedding-001",
        validation_alias=AliasChoices("GEMINI_EMBEDDING_MODEL"),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
