from __future__ import annotations

from redis.asyncio import Redis

from app.core.logging import get_logger


logger = get_logger(__name__)
_redis_client: Redis | None = None


async def init_redis_client(redis_url: str | None) -> None:
    global _redis_client

    if _redis_client is not None:
        return

    if not redis_url:
        logger.warning("redis.init.skipped", reason="redis_url_not_configured")
        return

    logger.info("redis.init.start")
    client = Redis.from_url(redis_url, decode_responses=True)
    await client.ping()
    _redis_client = client
    logger.info("redis.init.done")


def get_redis_client() -> Redis | None:
    return _redis_client


async def close_redis_client() -> None:
    global _redis_client

    if _redis_client is None:
        return

    logger.info("redis.close.start")
    await _redis_client.close()
    _redis_client = None
    logger.info("redis.close.done")


async def check_redis_health() -> tuple[bool, str]:
    if _redis_client is None:
        return False, "not_initialized"

    try:
        await _redis_client.ping()
        return True, "ok"
    except Exception as exc:  # noqa: BLE001
        logger.exception("redis.health.failed", error=str(exc))
        return False, f"error:{exc.__class__.__name__}"
