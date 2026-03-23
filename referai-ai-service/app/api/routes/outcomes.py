"""Outcome feedback loop endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.logging import get_logger
from app.schemas.outcomes import RecordOutcomeRequest, RecordOutcomeResponse
from app.services.outcome_service import record_outcome

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["outcomes"])


@router.post("/outcomes/record", response_model=RecordOutcomeResponse)
async def record(request: RecordOutcomeRequest) -> RecordOutcomeResponse:
    """
    Record the outcome of a referral request.

    Called by the Java backend's ReferralRequestController.
    Stores outcome with context snapshot for the data flywheel.
    """
    logger.info(
        "outcomes.record.start",
        request_id=request.request_id,
        outcome_type=request.outcome_type.value,
    )

    success, outcome_id, error = await record_outcome(
        request_id=request.request_id,
        outcome_type=request.outcome_type.value,
        reporter_id=request.reporter_id,
    )

    return RecordOutcomeResponse(
        success=success,
        outcome_id=outcome_id,
        error=error,
    )
