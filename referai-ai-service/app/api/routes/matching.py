"""Matching pipeline endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi import Query

from app.core.logging import get_logger
from app.schemas.matching import MatchRequest, MatchResponse
from app.services.matching_service import get_matching_history, run_matching_pipeline

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["matching"])


@router.post("/match", response_model=MatchResponse)
async def match(request: MatchRequest) -> MatchResponse:
    """
    Run the full 4-step intelligent matching pipeline.

    Called by the Java backend's MatchingController.
    Returns top 5 matches ranked by combined semantic + LLM judgment score.
    """
    logger.info(
        "match.start",
        seeker_id=request.seeker_id,
        jd_len=len(request.job_description),
        resume_len=len(request.resume_text),
    )

    result = await run_matching_pipeline(
        job_description=request.job_description,
        resume_text=request.resume_text,
        seeker_id=request.seeker_id,
        target_company=request.target_company,
    )

    logger.info(
        "match.done",
        success=result.success,
        matches_count=len(result.matches),
    )

    return result


@router.get("/match-history/{seeker_id}")
async def match_history(seeker_id: str, limit: int = Query(default=20, ge=1, le=50)) -> dict:
    """Return historical matching runs for a seeker."""
    history = await get_matching_history(seeker_id=seeker_id, limit=limit)
    return {
        "success": True,
        "runs": history,
        "count": len(history),
    }
