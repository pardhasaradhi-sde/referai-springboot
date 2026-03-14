from datetime import datetime, timezone

from fastapi import APIRouter

from app.db.postgres import check_postgres_health
from app.db.redis import check_redis_health
from app.schemas.health import DependencyStatus, HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    db_ok, db_detail = await check_postgres_health()
    redis_ok, redis_detail = await check_redis_health()

    service_ok = db_ok and redis_ok

    return HealthResponse(
        service="ok" if service_ok else "degraded",
        db=DependencyStatus(status="ok" if db_ok else "degraded", detail=db_detail),
        redis=DependencyStatus(status="ok" if redis_ok else "degraded", detail=redis_detail),
        fallback_used=not service_ok,
        timestamp=datetime.now(tz=timezone.utc),
    )
