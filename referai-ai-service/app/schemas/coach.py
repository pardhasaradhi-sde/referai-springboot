"""Schemas for the referral coach agent."""

from __future__ import annotations

from enum import Enum

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ReferralStage(str, Enum):
    """Stages of the referral conversation."""

    FIRST_CONTACT = "first_contact"
    BUILDING_RAPPORT = "building_rapport"
    MADE_THE_ASK = "made_the_ask"
    FOLLOWING_UP = "following_up"


class CoachSuggestRequest(BaseModel):
    """Request for a coaching suggestion."""

    model_config = ConfigDict(populate_by_name=True)

    conversation_id: str = Field(
        ...,
        validation_alias=AliasChoices("conversation_id", "conversationId"),
    )
    seeker_id: str = Field(
        ...,
        validation_alias=AliasChoices("seeker_id", "seekerId"),
    )
    referrer_id: str = Field(
        ...,
        validation_alias=AliasChoices("referrer_id", "referrerId"),
    )
    current_message: str | None = Field(
        default=None,
        validation_alias=AliasChoices("current_message", "currentMessage"),
        description="The most recent message in the conversation",
    )
    current_stage: ReferralStage = Field(
        default=ReferralStage.FIRST_CONTACT,
        validation_alias=AliasChoices("current_stage", "currentStage"),
    )


class CoachSuggestResponse(BaseModel):
    """Non-streaming response for the coach (fallback)."""

    success: bool
    suggestion: str | None = None
    stage: str | None = None
    error: str | None = None
