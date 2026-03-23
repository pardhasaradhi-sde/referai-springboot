"""Schemas for outreach message generation."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class GenerateMessageRequest(BaseModel):
    """Request to generate a personalized outreach message."""

    model_config = ConfigDict(populate_by_name=True)

    seeker_id: str = Field(
        ...,
        validation_alias=AliasChoices("seeker_id", "seekerId"),
    )
    referrer_id: str = Field(
        ...,
        validation_alias=AliasChoices("referrer_id", "referrerId"),
    )
    job_context: str | None = Field(
        default=None,
        validation_alias=AliasChoices("job_context", "jobContext"),
        description="Job title, company, or description for context",
    )


class GenerateMessageResponse(BaseModel):
    """Response from outreach message generation."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    message: str | None = None
    tone: str | None = Field(default=None, description="Detected tone of the message")
    word_count: int | None = Field(
        default=None,
        serialization_alias="wordCount",
    )
    error: str | None = None
