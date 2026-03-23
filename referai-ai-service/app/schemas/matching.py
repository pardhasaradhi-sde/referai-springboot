"""Schemas for intelligent matching pipeline."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class MatchRequest(BaseModel):
    """Request to run the full matching pipeline."""

    model_config = ConfigDict(populate_by_name=True)

    job_description: str = Field(
        ...,
        validation_alias=AliasChoices("job_description", "jobDescription"),
        description="Full job description text",
    )
    resume_text: str = Field(
        ...,
        validation_alias=AliasChoices("resume_text", "resumeText"),
        description="Full resume text of the seeker",
    )
    seeker_id: str = Field(
        ...,
        validation_alias=AliasChoices("seeker_id", "seekerId"),
        description="UUID of the seeker profile",
    )
    target_company: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("target_company", "targetCompany"),
        description="Target company is required",
    )


class CandidateMatch(BaseModel):
    """A single candidate match result from the pipeline."""

    model_config = ConfigDict(populate_by_name=True)

    rank: int
    candidate_id: str = Field(serialization_alias="candidateId")
    full_name: str | None = Field(default=None, serialization_alias="fullName")
    job_title: str | None = Field(default=None, serialization_alias="jobTitle")
    company: str | None = None
    seniority: str | None = None
    score: float = Field(description="Final combined score 0-10")
    success_likelihood_percent: int = Field(
        serialization_alias="successLikelihoodPercent",
        description="Predicted referral success percentage",
    )
    reasoning: str = Field(description="3-4 sentence explanation of why this match is strong")
    strong_points: list[str] = Field(
        default_factory=list,
        serialization_alias="strongPoints",
    )
    red_flags: list[str] = Field(
        default_factory=list,
        serialization_alias="redFlags",
    )
    suggested_opening: str | None = Field(
        default=None,
        serialization_alias="suggestedOpening",
        description="What shared context to mention first in outreach",
    )
    semantic_score: float | None = Field(
        default=None,
        serialization_alias="semanticScore",
        description="Raw cosine similarity score from pgvector",
    )


class PipelineTiming(BaseModel):
    """Timing breakdown for the matching pipeline steps."""

    model_config = ConfigDict(populate_by_name=True)

    document_intelligence_ms: int | None = Field(
        default=None, serialization_alias="documentIntelligenceMs"
    )
    semantic_retrieval_ms: int | None = Field(
        default=None, serialization_alias="semanticRetrievalMs"
    )
    llm_reranking_ms: int | None = Field(
        default=None, serialization_alias="llmRerankingMs"
    )
    synthesis_ms: int | None = Field(
        default=None, serialization_alias="synthesisMs"
    )
    total_ms: int | None = Field(
        default=None, serialization_alias="totalMs"
    )


class MatchResponse(BaseModel):
    """Response from the matching pipeline."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    matches: list[CandidateMatch] = Field(default_factory=list)
    total_candidates_evaluated: int = Field(
        default=0,
        serialization_alias="totalCandidatesEvaluated",
    )
    pipeline_timing: PipelineTiming | None = Field(
        default=None,
        serialization_alias="pipelineTiming",
    )
    error: str | None = None
