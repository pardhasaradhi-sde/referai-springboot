"""Outreach message generation endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.logging import get_logger
from app.schemas.outreach import GenerateMessageRequest, GenerateMessageResponse
from app.services.outreach_service import generate_outreach_message

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["outreach"])


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_message(request: GenerateMessageRequest) -> GenerateMessageResponse:
    """
    Generate a personalized outreach message for a referral request.

    Called by the Java backend's MatchingController.
    """
    logger.info(
        "generate_message.start",
        seeker_id=request.seeker_id,
        referrer_id=request.referrer_id,
    )

    success, message, error = await generate_outreach_message(
        seeker_id=request.seeker_id,
        referrer_id=request.referrer_id,
        job_context=request.job_context,
    )

    word_count = len(message.split()) if message else None

    return GenerateMessageResponse(
        success=success,
        message=message,
        tone="professional",
        word_count=word_count,
        error=error,
    )
