"""Schemas for referrer profile indexing."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class IndexReferrerRequest(BaseModel):
    """Request to index (embed) a referrer profile for semantic search."""

    model_config = ConfigDict(populate_by_name=True)

    referrer_id: str = Field(
        ...,
        validation_alias=AliasChoices("referrer_id", "referrerId"),
        description="UUID of the referrer profile",
    )
    bio: str | None = Field(default=None, description="Referrer bio / about section")
    skills: list[str] = Field(default_factory=list, description="List of skills")
    job_title: str | None = Field(
        default=None,
        validation_alias=AliasChoices("job_title", "jobTitle"),
    )
    company: str | None = None
    department: str | None = None
    seniority: str | None = None
    years_of_experience: int | None = Field(
        default=None,
        validation_alias=AliasChoices("years_of_experience", "yearsOfExperience"),
    )


class IndexReferrerResponse(BaseModel):
    """Response from referrer indexing."""

    success: bool
    referrer_id: str = Field(serialization_alias="referrerId")
    embedding_dimensions: int | None = Field(
        default=None,
        serialization_alias="embeddingDimensions",
    )
    error: str | None = None
