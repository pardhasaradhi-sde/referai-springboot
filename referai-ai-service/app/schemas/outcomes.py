"""Schemas for outcome feedback loop."""

from __future__ import annotations

from enum import Enum

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class OutcomeType(str, Enum):
    """Possible referral outcomes."""

    GOT_REFERRAL = "GOT_REFERRAL"
    GOT_INTERVIEW = "GOT_INTERVIEW"
    GOT_OFFER = "GOT_OFFER"
    NO_RESPONSE = "NO_RESPONSE"
    DECLINED = "DECLINED"


class RecordOutcomeRequest(BaseModel):
    """Request to record a referral outcome."""

    model_config = ConfigDict(populate_by_name=True)

    request_id: str = Field(
        ...,
        validation_alias=AliasChoices("request_id", "requestId"),
        description="UUID of the referral request",
    )
    outcome_type: OutcomeType = Field(
        ...,
        validation_alias=AliasChoices("outcome_type", "outcomeType"),
    )
    reporter_id: str = Field(
        ...,
        validation_alias=AliasChoices("reporter_id", "reporterId"),
        description="UUID of the user reporting the outcome",
    )


class RecordOutcomeResponse(BaseModel):
    """Response from recording an outcome."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    outcome_id: str | None = Field(
        default=None,
        serialization_alias="outcomeId",
    )
    error: str | None = None
