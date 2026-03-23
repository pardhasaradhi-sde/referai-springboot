"""LangGraph state definition for the matching pipeline."""

from __future__ import annotations

from typing import TypedDict


class CandidateProfile(TypedDict, total=False):
    """A referrer candidate retrieved from pgvector."""

    id: str
    full_name: str
    job_title: str
    company: str
    department: str
    seniority: str
    skills: list[str]
    years_of_experience: int
    bio: str
    semantic_score: float


class RankedCandidate(TypedDict, total=False):
    """A candidate after LLM re-ranking."""

    rank: int
    candidate_id: str
    full_name: str
    job_title: str
    company: str
    seniority: str
    score: float
    success_likelihood_percent: int
    reasoning: str
    strong_points: list[str]
    red_flags: list[str]
    suggested_opening: str
    semantic_score: float
    referral_viability: float
    reply_probability: float
    tier: str
    independent_assessment: dict


class MatchingState(TypedDict, total=False):
    """Full state flowing through the matching pipeline graph."""

    # --- Input ---
    job_description: str
    resume_text: str
    seeker_id: str

    # --- Step 1: Document Intelligence ---
    target_company: str
    job_chunks: dict       # parsed JD: must_have, nice_to_have, responsibilities, culture
    resume_chunks: dict    # parsed resume: experience, skills, projects, education
    implicit_signals: list[str]
    jd_must_haves: list[str]
    seeker_strengths: list[str]
    seeker_gaps: list[str]
    implicit_referrer_requirements: dict

    # --- Step 2: Semantic Retrieval ---
    seeker_embedding_text: str
    candidates: list[CandidateProfile]
    retrieval_broadened: bool
    retrieval_tier_counts: dict
    candidate_tier_by_id: dict[str, str]

    # --- Step 3: LLM Re-ranking ---
    ranked_candidates: list[RankedCandidate]

    # --- Step 4: Synthesis ---
    final_matches: list[RankedCandidate]

    # --- Timing ---
    step_timings: dict[str, int]
    synthesis_weights: dict[str, float]

    # --- Errors ---
    error: str | None
