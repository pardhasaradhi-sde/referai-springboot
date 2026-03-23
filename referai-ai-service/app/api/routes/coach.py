"""Coach agent endpoint with SSE streaming."""

from __future__ import annotations

import json

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.core.logging import get_logger
from app.schemas.coach import CoachSuggestRequest, CoachSuggestResponse
from app.services.coach_service import run_coach_non_streaming, run_coach_pipeline

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["coach"])


async def _sse_generator(request: CoachSuggestRequest):
    """Generate SSE events from the coach pipeline."""
    async for chunk in run_coach_pipeline(
        conversation_id=request.conversation_id,
        seeker_id=request.seeker_id,
        referrer_id=request.referrer_id,
        current_message=request.current_message,
        current_stage=request.current_stage.value,
    ):
        yield {
            "event": "suggestion",
            "data": json.dumps({"chunk": chunk}),
        }

    yield {
        "event": "done",
        "data": json.dumps({"status": "complete"}),
    }


@router.post("/coach/suggest")
async def coach_suggest(request: CoachSuggestRequest, raw_request: Request):
    """
    Get a coaching suggestion for the current conversation.

    Called by the Java backend's ConversationController.
    Returns SSE stream if Accept header includes text/event-stream,
    otherwise returns a complete JSON response as fallback.
    """
    logger.info(
        "coach.suggest.start",
        conversation_id=request.conversation_id,
        stage=request.current_stage.value,
    )

    accept = raw_request.headers.get("accept", "")

    # SSE streaming path
    if "text/event-stream" in accept:
        return EventSourceResponse(_sse_generator(request))

    # Non-streaming fallback
    success, suggestion, error = await run_coach_non_streaming(
        conversation_id=request.conversation_id,
        seeker_id=request.seeker_id,
        referrer_id=request.referrer_id,
        current_message=request.current_message,
        current_stage=request.current_stage.value,
    )

    return CoachSuggestResponse(
        success=success,
        suggestion=suggestion,
        stage=request.current_stage.value,
        error=error,
    )
