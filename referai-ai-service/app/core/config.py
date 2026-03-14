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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
