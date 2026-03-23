from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.migration_runner import run_startup_migrations
from app.db.postgres import close_postgres_pool, init_postgres_pool
from app.db.redis import close_redis_client, init_redis_client
from app.middleware.internal_auth import InternalApiKeyMiddleware


settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "app.startup.begin",
        app_name=settings.app_name,
        app_env=settings.app_env,
        run_migrations=settings.run_migrations,
    )

    try:
        await init_postgres_pool(settings.postgres_url)
    except Exception as exc:  # noqa: BLE001
        logger.exception("app.startup.postgres_failed", error=str(exc))

    try:
        await init_redis_client(settings.redis_url)
    except Exception as exc:  # noqa: BLE001
        logger.exception("app.startup.redis_failed", error=str(exc))

    if settings.run_migrations:
        try:
            await run_startup_migrations(settings.migrations_path)
        except Exception as exc:  # noqa: BLE001
            logger.exception("app.startup.migrations_failed", error=str(exc))
            raise
    else:
        logger.info("app.startup.migrations_skipped")

    # Initialize Groq (LLM) and Gemini (embeddings), then compile LangGraph agents.
    if settings.groq_api_key and settings.gemini_api_key:
        try:
            from app.services.llm_client import _ensure_configured as ensure_llm_configured
            from app.services.gemini_client import _ensure_configured as ensure_embedding_configured

            ensure_llm_configured()
            ensure_embedding_configured()
            logger.info("app.startup.ai_clients_configured", llm="groq", embeddings="gemini")

            # Import graph modules to trigger singleton compilation
            from app.agents.matching.graph import get_matching_graph  # noqa: F401
            from app.agents.coach.graph import get_coach_graph  # noqa: F401
            logger.info("app.startup.langgraph_agents_compiled")
        except Exception as exc:  # noqa: BLE001
            logger.exception("app.startup.ai_init_failed", error=str(exc))
    else:
        logger.warning(
            "app.startup.ai_not_configured",
            reason="GROQ_API_KEY and GEMINI_API_KEY are both required",
        )

    logger.info("app.startup.done")

    yield

    logger.info("app.shutdown.begin")
    await close_postgres_pool()
    await close_redis_client()
    logger.info("app.shutdown.done")


app = FastAPI(
    title="ReferAI AI Service",
    version="0.2.0",
    description="Standalone AI microservice for ReferAI — LangGraph agents, semantic matching, coaching",
    lifespan=lifespan,
)

app.add_middleware(InternalApiKeyMiddleware)
app.include_router(api_router)
