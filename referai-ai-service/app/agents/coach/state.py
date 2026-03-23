"""LangGraph state definition for the coach agent."""

from __future__ import annotations

from typing import TypedDict


class CoachState(TypedDict, total=False):
    """Full state flowing through the coach agent graph."""

    # --- Input ---
    conversation_id: str
    seeker_id: str
    referrer_id: str
    current_message: str
    current_stage: str

    # --- Context loaded from DB ---
    seeker_profile: dict
    referrer_profile: dict
    conversation_history: list[dict]
    match_explanation: str

    # --- RAG context ---
    relevant_context: str

    # --- Analysis ---
    situation_analysis: str
    advice_type: str  # e.g., "encourage_rapport", "time_to_ask", "re_engage", "draft_ask"

    # --- Previous advice (to prevent repetition) ---
    previous_advice: list[str]

    # --- Output ---
    suggestion: str
    streaming_prompt: str  # The final prompt for streaming generation

    # --- Errors ---
    error: str | None
