"""Coach service — orchestrates the LangGraph coach agent with SSE streaming."""

from __future__ import annotations

import json
from typing import AsyncGenerator

from app.agents.coach.graph import get_coach_graph
from app.agents.coach.state import CoachState
from app.core.logging import get_logger
from app.db.postgres import get_postgres_pool
from app.db.redis import get_redis_client
from app.services.llm_client import generate, generate_stream

logger = get_logger(__name__)

# Redis key prefix for coach state
COACH_STATE_PREFIX = "coach:state:"
COACH_STATE_TTL = 60 * 60 * 24  # 24 hours


async def _save_coach_state(conversation_id: str, state_data: dict) -> None:
    """Persist coach state to Redis."""
    client = get_redis_client()
    if client is None:
        return

    try:
        key = f"{COACH_STATE_PREFIX}{conversation_id}"
        # Only save serializable parts
        serializable = {
            "conversation_id": state_data.get("conversation_id", ""),
            "current_stage": state_data.get("current_stage", "first_contact"),
            "advice_type": state_data.get("advice_type", ""),
            "situation_analysis": state_data.get("situation_analysis", ""),
        }
        await client.setex(key, COACH_STATE_TTL, json.dumps(serializable))
    except Exception as exc:
        logger.warning("coach.state.save_failed", error=str(exc))


async def run_coach_pipeline(
    conversation_id: str,
    seeker_id: str,
    referrer_id: str,
    current_message: str | None = None,
    current_stage: str = "first_contact",
) -> AsyncGenerator[str, None]:
    """
    Run the coach agent pipeline and stream the suggestion.

    Yields text chunks for SSE streaming.
    """
    initial_state: CoachState = {
        "conversation_id": conversation_id,
        "seeker_id": seeker_id,
        "referrer_id": referrer_id,
        "current_message": current_message or "",
        "current_stage": current_stage,
    }

    try:
        graph = get_coach_graph()
        final_state = await graph.ainvoke(initial_state)

        # Check for errors in pipeline
        if final_state.get("error"):
            yield f"I'm having trouble right now: {final_state['error']}. Please try again in a moment."
            return

        # Get the streaming prompt built by the graph
        streaming_prompt = final_state.get("streaming_prompt", "")
        if not streaming_prompt:
            yield "I need more context to provide advice. Please share what's happening in the conversation."
            return

        # Stream the actual coaching suggestion from Gemini
        full_suggestion = ""
        async for chunk in generate_stream(streaming_prompt):
            full_suggestion += chunk
            yield chunk

        # Log the complete advice to DB (update the log_advice node's work)
        if full_suggestion:
            final_state["suggestion"] = full_suggestion
            pool = get_postgres_pool()
            if pool:
                try:
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """
                            INSERT INTO coach_advice_log
                                (conversation_id, seeker_id, referrer_id, stage, advice_text, advice_metadata)
                            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb)
                            """,
                            conversation_id,
                            seeker_id,
                            referrer_id,
                            current_stage,
                            full_suggestion[:2000],
                            json.dumps({"advice_type": final_state.get("advice_type", "")}),
                        )
                except Exception as exc:
                    logger.warning("coach.log_advice.post_stream.failed", error=str(exc))

        # Save state to Redis
        await _save_coach_state(conversation_id, final_state)

        logger.info(
            "coach.pipeline.done",
            conversation_id=conversation_id,
            suggestion_len=len(full_suggestion),
        )

    except Exception as exc:
        logger.exception("coach.pipeline.failed", error=str(exc))
        yield f"I encountered an error while preparing your coaching advice. Please try again."


async def run_coach_non_streaming(
    conversation_id: str,
    seeker_id: str,
    referrer_id: str,
    current_message: str | None = None,
    current_stage: str = "first_contact",
) -> tuple[bool, str | None, str | None]:
    """
    Non-streaming fallback for the coach agent.

    Returns:
        (success, suggestion, error)
    """
    try:
        full_text = ""
        async for chunk in run_coach_pipeline(
            conversation_id, seeker_id, referrer_id, current_message, current_stage
        ):
            full_text += chunk

        return True, full_text, None
    except Exception as exc:
        return False, None, str(exc)
