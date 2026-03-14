from __future__ import annotations

from pathlib import Path

import asyncpg

from app.core.logging import get_logger


logger = get_logger(__name__)
_postgres_pool: asyncpg.Pool | None = None


async def init_postgres_pool(postgres_url: str | None) -> None:
    global _postgres_pool

    if _postgres_pool is not None:
        return

    if not postgres_url:
        logger.warning("postgres.init.skipped", reason="postgres_url_not_configured")
        return

    logger.info("postgres.init.start")
    _postgres_pool = await asyncpg.create_pool(
        dsn=postgres_url,
        min_size=1,
        max_size=10,
        command_timeout=30,
    )
    logger.info("postgres.init.done")


def get_postgres_pool() -> asyncpg.Pool | None:
    return _postgres_pool


async def close_postgres_pool() -> None:
    global _postgres_pool

    if _postgres_pool is None:
        return

    logger.info("postgres.close.start")
    await _postgres_pool.close()
    _postgres_pool = None
    logger.info("postgres.close.done")


async def check_postgres_health() -> tuple[bool, str]:
    if _postgres_pool is None:
        return False, "not_initialized"

    try:
        async with _postgres_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True, "ok"
    except Exception as exc:  # noqa: BLE001
        logger.exception("postgres.health.failed", error=str(exc))
        return False, f"error:{exc.__class__.__name__}"


async def ensure_migration_table_exists() -> None:
    if _postgres_pool is None:
        raise RuntimeError("Postgres pool is not initialized")

    query = """
        CREATE TABLE IF NOT EXISTS ai_service_schema_migrations (
            filename TEXT PRIMARY KEY,
            checksum TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """

    async with _postgres_pool.acquire() as conn:
        await conn.execute(query)


async def list_applied_migrations() -> set[str]:
    if _postgres_pool is None:
        raise RuntimeError("Postgres pool is not initialized")

    async with _postgres_pool.acquire() as conn:
        rows = await conn.fetch("SELECT filename FROM ai_service_schema_migrations")

    return {str(row["filename"]) for row in rows}


async def apply_migration_file(path: Path, checksum: str) -> None:
    if _postgres_pool is None:
        raise RuntimeError("Postgres pool is not initialized")

    sql = path.read_text(encoding="utf-8")

    async with _postgres_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO ai_service_schema_migrations (filename, checksum) VALUES ($1, $2)",
                path.name,
                checksum,
            )
