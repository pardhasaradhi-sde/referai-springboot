from fastapi import APIRouter

from app.api.routes.coach import router as coach_router
from app.api.routes.document import router as document_router
from app.api.routes.health import router as health_router
from app.api.routes.indexing import router as indexing_router
from app.api.routes.matching import router as matching_router
from app.api.routes.outcomes import router as outcomes_router
from app.api.routes.outreach import router as outreach_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(document_router)
api_router.include_router(indexing_router)
api_router.include_router(matching_router)
api_router.include_router(outreach_router)
api_router.include_router(coach_router)
api_router.include_router(outcomes_router)
