"""Outreach message generation endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.logging import get_logger
from app.schemas.outreach import GenerateMessageRequest, GenerateMessageResponse
from app.services.outreach_service import generate_outreach_message, generate_outreach_stream

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


@router.post("/generate-message/stream")
async def generate_message_stream(request: GenerateMessageRequest) -> StreamingResponse:
    """
    SSE streaming endpoint for outreach message generation.
    Returns the message token-by-token for live frontend rendering.
    """
    logger.info(
        "generate_message.stream.start",
        seeker_id=request.seeker_id,
        referrer_id=request.referrer_id,
    )

    async def event_generator():
        async for chunk in generate_outreach_stream(
            seeker_id=request.seeker_id,
            referrer_id=request.referrer_id,
            job_context=request.job_context,
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
