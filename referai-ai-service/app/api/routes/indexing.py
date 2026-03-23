"""Referrer profile indexing endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.logging import get_logger
from app.schemas.indexing import IndexReferrerRequest, IndexReferrerResponse
from app.services.indexing_service import index_referrer_profile

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["indexing"])


@router.post("/index-referrer", response_model=IndexReferrerResponse)
async def index_referrer(request: IndexReferrerRequest) -> IndexReferrerResponse:
    """
    Index a referrer profile for semantic search.

    Called by the Java backend when a referrer saves/updates their profile.
    Generates a 768-dim embedding and stores it in the pgvector column.
    """
    logger.info(
        "index_referrer.start",
        referrer_id=request.referrer_id,
        skills_count=len(request.skills),
    )

    success, dims, error = await index_referrer_profile(
        referrer_id=request.referrer_id,
        bio=request.bio,
        skills=request.skills,
        job_title=request.job_title,
        company=request.company,
        department=request.department,
        seniority=request.seniority,
        years_of_experience=request.years_of_experience,
    )

    if not success:
        logger.warning("index_referrer.failed", error=error)

    return IndexReferrerResponse(
        success=success,
        referrer_id=request.referrer_id,
        embedding_dimensions=dims,
        error=error,
    )
