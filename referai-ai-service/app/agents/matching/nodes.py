"""LangGraph node functions for the 4-step matching pipeline."""

from __future__ import annotations

import json
import re
import time

from app.agents.matching.state import CandidateProfile, MatchingState, RankedCandidate
from app.core.logging import get_logger
from app.db.postgres import get_postgres_pool
from app.services.embedding_service import embed_query
from app.services.llm_client import generate_json
from app.services.outcome_service import (
    get_dynamic_weight_recommendations,
    get_feedback_patterns_text,
    get_outcome_patterns,
)

logger = get_logger(__name__)


def _split_skills(raw: str) -> list[str]:
    return [part.strip() for part in raw.replace("\n", ",").split(",") if part.strip()]


def _normalize_company_name(name: str) -> str:
    if not name:
        return ""

    cleaned = re.sub(r"[^a-z0-9 ]+", " ", name.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    stopwords = {
        "inc",
        "llc",
        "ltd",
        "limited",
        "corp",
        "corporation",
        "company",
        "co",
        "private",
        "pvt",
        "plc",
    }
    tokens = [token for token in cleaned.split(" ") if token and token not in stopwords]
    return " ".join(tokens)



def _company_matches_target(candidate_company: str, target_company: str) -> bool:
    candidate = _normalize_company_name(candidate_company)
    target = _normalize_company_name(target_company)
    if not target:
        return True
    if not candidate:
        return False
    if candidate == target:
        return True
    return target in candidate or candidate in target


def _company_related_to_target(candidate_company: str, target_company: str) -> bool:
    candidate = _normalize_company_name(candidate_company)
    target = _normalize_company_name(target_company)
    if not candidate or not target:
        return False

    candidate_tokens = set(candidate.split())
    target_tokens = set(target.split())
    overlap = candidate_tokens & target_tokens
    return len(overlap) >= 1


def _overlap_score(candidate_skills: list[str], target_signals: list[str]) -> float:
    if not candidate_skills or not target_signals:
        return 0.0

    candidate_lower = {item.lower() for item in candidate_skills}
    target_lower = {item.lower() for item in target_signals}
    overlap = candidate_lower & target_lower
    return len(overlap) / max(1, len(target_lower))


def _target_signals_from_state(state: MatchingState) -> list[str]:
    merged = [
        *state.get("job_chunks", {}).get("must_have_skills", []),
        *state.get("resume_chunks", {}).get("key_skills", []),
        *state.get("implicit_signals", []),
    ]
    signals: list[str] = []
    for item in merged:
        if isinstance(item, str):
            value = item.strip()
            if value:
                signals.append(value)
    return signals[:30]


async def _fallback_semantic_retrieval(state: MatchingState, limit: int) -> list[CandidateProfile]:
    """Fallback retrieval when embeddings/Gemini are unavailable.

    Uses lexical matching over profile text columns to produce a usable candidate set.
    """
    pool = get_postgres_pool()
    if pool is None:
        return []

    must_have_skills = state.get("job_chunks", {}).get("must_have_skills", [])
    key_skills = state.get("resume_chunks", {}).get("key_skills", [])
    implicit_signals = state.get("implicit_signals", [])

    target_signals = [*must_have_skills, *key_skills, *implicit_signals][:20]
    search_terms = [signal for signal in target_signals if isinstance(signal, str) and signal.strip()]
    search_query = " ".join(search_terms[:8])
    target_company = state.get("target_company", "")

    query = """
        SELECT
            p.id::text,
            p.full_name,
            p.job_title,
            p.company,
            p.department,
            p.seniority,
            p.skills,
            p.years_of_experience,
            p.bio
        FROM profiles p
        WHERE p.id != $1::uuid
          AND p.role IN ('REFERRER', 'BOTH')
          AND p.is_active = true
              AND (
                  $4 = ''
                  OR COALESCE(p.company, '') ILIKE '%' || $4 || '%'
              )
          AND (
              $2 = ''
              OR COALESCE(p.bio, '') ILIKE '%' || $2 || '%'
              OR COALESCE(p.job_title, '') ILIKE '%' || $2 || '%'
              OR COALESCE(array_to_string(p.skills, ','), '') ILIKE '%' || $2 || '%'
          )
        ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
        LIMIT $3
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, state["seeker_id"], search_query, limit, target_company)

    candidates: list[CandidateProfile] = []
    for row in rows:
        skills_raw = row["skills"]
        if isinstance(skills_raw, str):
            skills_list = [s.strip() for s in skills_raw.strip("{}").split(",") if s.strip()]
        elif isinstance(skills_raw, list):
            skills_list = skills_raw
        else:
            skills_list = []

        lexical_score = _overlap_score(skills_list, target_signals)
        candidates.append(
            CandidateProfile(
                id=row["id"],
                full_name=row["full_name"] or "",
                job_title=row["job_title"] or "",
                company=row["company"] or "",
                department=row["department"] or "",
                seniority=row["seniority"] or "",
                skills=skills_list,
                years_of_experience=row["years_of_experience"] or 0,
                bio=row["bio"] or "",
                semantic_score=round(min(1.0, lexical_score), 3),
            )
        )

    candidates.sort(key=lambda item: item.get("semantic_score", 0.0), reverse=True)
    return candidates[:limit]

# ─────────────────────────────────────────────
# Step 1 — Document Intelligence
# ─────────────────────────────────────────────

DOCUMENT_INTELLIGENCE_PROMPT = """\
You are an expert technical recruiter. Analyze the resume and job description below.

=== TARGET COMPANY (PROVIDED BY USER) ===
{target_company}

=== RESUME ===
{resume_text}

=== JOB DESCRIPTION ===
{job_description}

Return a JSON object with this exact structure:
{{
  "job_chunks": {{
    "must_have_skills": ["skill1", "skill2"],
    "nice_to_have_skills": ["skill1"],
    "responsibilities": ["resp1", "resp2"],
    "culture_signals": ["signal1"]
  }},
  "resume_chunks": {{
    "experience_summary": "2-3 sentence summary",
    "key_skills": ["skill1", "skill2"],
    "notable_projects": ["project1"],
    "education": "brief education summary"
  }},
  "implicit_signals": [
    "has startup experience",
    "has led a team of 5+",
    "has shipped to production",
    "has open source contributions"
  ],
    "jd_must_haves": [
        "A concise list of 3-5 must-have role requirements"
    ],
    "seeker_strengths": [
        "Top 3 strengths the seeker can credibly claim"
    ],
    "seeker_gaps": [
        "Top 2 potential weaknesses or missing requirements"
    ],
    "implicit_referrer_requirements": {{
        "seeker_signal": "what kind of referrer can best validate this signal"
    }},
    "seeker_embedding_text": "MUST start with the target company name verbatim, then role title, then seniority, then top 5 must-have skills from JD, then one sentence of seeker's most relevant experience. Format strictly: '[Company] [Role] [Seniority] — needs [skill1, skill2, skill3, skill4, skill5] — has [seeker experience]'. Example: 'Microsoft Software Engineering Intern Entry-Level — needs Java, DSA, OOP, distributed systems, cloud — has 2 years Spring Boot, competitive programming top 23% globally'. Company name must appear first and verbatim. This drives pgvector retrieval toward the right company cluster."
}}

IMPORTANT:
- Extract IMPLICIT signals not explicitly listed as skills (leadership, scale, domain depth)
- Use the exact company name provided in the TARGET COMPANY section in seeker_embedding_text. Do not extract or guess company from JD text.
- seeker_embedding_text MUST follow the exact company-first format shown above and begin with the company name verbatim.
"""


async def document_intelligence(state: MatchingState) -> MatchingState:
    """Step 1: Deep understanding of resume + JD."""
    start = time.monotonic()
    target_company = state.get("target_company", "").strip()

    prompt = DOCUMENT_INTELLIGENCE_PROMPT.format(
        resume_text=state["resume_text"][:12000],
        job_description=state["job_description"][:8000],
        target_company=target_company,
    )

    try:
        result = await generate_json(prompt)

        timings = state.get("step_timings", {})
        timings["document_intelligence_ms"] = int((time.monotonic() - start) * 1000)

        return {
            **state,
            "target_company": target_company,
            "job_chunks": result.get("job_chunks", {}),
            "resume_chunks": result.get("resume_chunks", {}),
            "implicit_signals": result.get("implicit_signals", []),
            "jd_must_haves": result.get("jd_must_haves", []),
            "seeker_strengths": result.get("seeker_strengths", []),
            "seeker_gaps": result.get("seeker_gaps", []),
            "implicit_referrer_requirements": result.get("implicit_referrer_requirements", {}),
            "seeker_embedding_text": result.get("seeker_embedding_text", state["resume_text"][:8000]),
            "step_timings": timings,
        }
    except Exception as exc:
        logger.exception("matching.document_intelligence.failed", error=str(exc))
        timings = state.get("step_timings", {})
        timings["document_intelligence_ms"] = int((time.monotonic() - start) * 1000)
        return {
            **state,
            "target_company": target_company,
            "job_chunks": {},
            "resume_chunks": {},
            "implicit_signals": [],
            "jd_must_haves": [],
            "seeker_strengths": [],
            "seeker_gaps": [],
            "implicit_referrer_requirements": {},
            "seeker_embedding_text": state["resume_text"][:2000],
            "step_timings": timings,
        }


# ─────────────────────────────────────────────
# Step 2 — Semantic Retrieval
# ─────────────────────────────────────────────

async def semantic_retrieval(state: MatchingState) -> MatchingState:
    """Step 2: Embed seeker profile and query pgvector for top 20 candidates."""
    start = time.monotonic()

    pool = get_postgres_pool()
    if pool is None:
        logger.error("matching.semantic_retrieval.no_pool")
        timings = state.get("step_timings", {})
        timings["semantic_retrieval_ms"] = int((time.monotonic() - start) * 1000)
        return {**state, "candidates": [], "step_timings": timings, "error": "Database not initialized"}

    seeker_text = state.get("seeker_embedding_text", state["resume_text"][:8000])
    target_company = state.get("target_company", "")
    target_signals = _target_signals_from_state(state)
    broadened = state.get("retrieval_broadened", False)
    limit = 30 if broadened else 20

    try:
        embedding = await embed_query(seeker_text)
        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

        company_filtered_query = """
            SELECT
                p.id::text,
                p.full_name,
                p.job_title,
                p.company,
                p.department,
                p.seniority,
                p.skills,
                p.years_of_experience,
                p.bio,
                1 - (p.embedding <=> $1::vector) AS similarity
            FROM profiles p
            WHERE p.embedding IS NOT NULL
              AND p.id != $2::uuid
              AND p.role IN ('REFERRER', 'BOTH')
              AND p.is_active = true
              AND COALESCE(p.company, '') ILIKE $4
            ORDER BY p.embedding <=> $1::vector
            LIMIT $3
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                company_filtered_query,
                embedding_str,
                state["seeker_id"],
                limit,
                f"%{target_company}%",
            )
            
        if len(rows) == 0:
            logger.info("matching.semantic_retrieval.no_company_matches", target_company=target_company)
            timings = state.get("step_timings", {})
            timings["semantic_retrieval_ms"] = int((time.monotonic() - start) * 1000)
            return {
                **state,
                "candidates": [],
                "retrieval_tier_counts": {"tier_a": 0, "tier_b": 0, "tier_c": 0},
                "candidate_tier_by_id": {},
                "step_timings": timings,
            }

        candidates: list[CandidateProfile] = []
        for row in rows:
            skills_raw = row["skills"]
            if isinstance(skills_raw, str):
                skills_list = [s.strip() for s in skills_raw.strip("{}").split(",") if s.strip()]
            elif isinstance(skills_raw, list):
                skills_list = skills_raw
            else:
                skills_list = []

            candidates.append(
                CandidateProfile(
                    id=row["id"],
                    full_name=row["full_name"] or "",
                    job_title=row["job_title"] or "",
                    company=row["company"] or "",
                    department=row["department"] or "",
                    seniority=row["seniority"] or "",
                    skills=skills_list,
                    years_of_experience=row["years_of_experience"] or 0,
                    bio=row["bio"] or "",
                    semantic_score=float(row["similarity"]) if row["similarity"] else 0.0,
                )
            )

        candidate_tier_by_id: dict[str, str] = {}
        tier_a: list[CandidateProfile] = []
        tier_b: list[CandidateProfile] = []

        for candidate in candidates:
            if target_company and _company_matches_target(candidate.get("company", ""), target_company):
                candidate_tier_by_id[candidate["id"]] = "A"
                tier_a.append(candidate)
            elif target_company and _company_related_to_target(candidate.get("company", ""), target_company):
                candidate_tier_by_id[candidate["id"]] = "B"
                tier_b.append(candidate)
            else:
                candidate_tier_by_id[candidate["id"]] = "A" # Default to A since SQL filtered by ILIKE
                tier_a.append(candidate)

        if target_signals:
            # Hybrid retrieval score: vector similarity + lexical skill overlap.
            candidates.sort(
                key=lambda c: (
                    (0.75 * float(c.get("semantic_score", 0.0)))
                    + (0.25 * _overlap_score(c.get("skills", []), target_signals))
                ),
                reverse=True,
            )

        candidates = candidates[:limit]

        retrieval_tier_counts = {
            "tier_a": len(tier_a),
            "tier_b": len(tier_b),
            "tier_c": len(tier_c),
        }

        timings = state.get("step_timings", {})
        timings["semantic_retrieval_ms"] = int((time.monotonic() - start) * 1000)

        logger.info(
            "matching.semantic_retrieval.done",
            candidates_found=len(candidates),
            broadened=broadened,
            target_company=target_company or None,
        )

        return {
            **state,
            "candidates": candidates,
            "retrieval_tier_counts": retrieval_tier_counts,
            "candidate_tier_by_id": candidate_tier_by_id,
            "step_timings": timings,
        }

    except Exception as exc:
        logger.exception("matching.semantic_retrieval.failed", error=str(exc))
        fallback_candidates = await _fallback_semantic_retrieval(state, limit)
        timings = state.get("step_timings", {})
        timings["semantic_retrieval_ms"] = int((time.monotonic() - start) * 1000)
        return {
            **state,
            "candidates": fallback_candidates,
            "step_timings": timings,
            "error": str(exc),
        }


# ─────────────────────────────────────────────
# Step 3 — LLM Re-ranking (single batch call)
# ─────────────────────────────────────────────

LLM_INDEPENDENT_EVAL_PROMPT = """\
You are a referral network strategist who specializes in predicting which professionals will successfully advocate for a candidate inside a company.

=== SCORING RUBRIC (MOST IMPORTANT) ===
- Prioritize candidates who can credibly submit an internal referral at the target company.
- Prefer candidates who can vouch for JD must-haves and compensate for seeker gaps.
- Prefer candidates with higher response likelihood for thoughtful cold outreach.
- Company alignment is mechanically prioritized: Tier A > Tier B > Tier C.

=== TARGET ROLE MUST-HAVES (DISTILLED) ===
{jd_must_haves}

=== SEEKER STRENGTHS ===
{seeker_strengths}

=== SEEKER GAPS ===
{seeker_gaps}

=== IMPLICIT SIGNAL -> IDEAL REFERRER REQUIREMENT MAP ===
{implicit_referrer_requirements}

=== PLATFORM FEEDBACK PATTERNS ===
{feedback_patterns}

=== CANDIDATES TO EVALUATE INDEPENDENTLY ===
{candidates_text}

For each candidate, answer in order before scoring:
1) Does this person currently work at the target company? If yes, mention what team/org signals are present.
2) Is their seniority level 1-3 levels above the target role? Describe seniority delta.
3) Which must-have skills can they credibly vouch for and which can they not?
4) Extract reply openness signals from bio text: openness, low engagement, mentorship. If none, say none.
5) What is the single strongest reason to contact this person and the single biggest risk?

Then return a JSON array with one object per candidate and this schema:
[
    {{
        "candidate_id": "uuid",
        "tier": "A|B|C",
        "works_at_target_company": true,
        "team_or_org_signal": "string",
        "seniority_delta": "string",
        "vouchable_skills": ["skill"],
        "non_vouchable_skills": ["skill"],
        "reply_signal_evidence": {{
            "openness": ["phrase"],
            "low_engagement": ["phrase"],
            "mentorship": ["phrase"]
        }},
        "reply_probability": "low|medium|high",
        "referral_viability": 0-10,
        "score": 0-10,
        "strongest_reason": "string",
        "biggest_risk": "string",
        "reasoning": "2-3 sentences",
        "opening_sentence": "exact first sentence under 25 words"
    }}
]

CRITICAL:
- Evaluate each candidate independently; do not compare candidates with each other in this step.
- Return ONLY JSON.
"""

LLM_COMPARATIVE_RANKING_PROMPT = """\
You are a referral network strategist. You are given independent candidate assessments.

Return a JSON array of TOP 5 ranked best to worst:
[
    {{
        "rank": 1,
        "candidate_id": "uuid",
        "score": 0-10,
        "success_likelihood_percent": 0-100,
        "reasoning": "3-4 sentences",
        "strong_points": ["point"],
        "red_flags": ["risk"],
        "suggested_opening": "opening sentence"
    }}
]

Use independent assessments first, then make comparative adjustments.
Keep Tier A candidates above Tier B/C unless evidence is materially stronger.
Return ONLY JSON.
"""


def _compress_candidate(c: CandidateProfile, idx: int) -> str:
    """Compress a candidate into a 6-line summary for the batch prompt."""
    skills_str = ", ".join(c.get("skills", [])[:15])
    return (
        f"Candidate {idx + 1} (ID: {c['id']}):\n"
        f"  Title: {c.get('job_title', 'Unknown')}\n"
        f"  Company: {c.get('company', 'Unknown')}\n"
        f"  Skills: {skills_str}\n"
        f"  Seniority: {c.get('seniority', 'Unknown')} | {c.get('years_of_experience', '?')} years\n"
        f"  Bio: {(c.get('bio', '') or '')[:150]}"
    )


async def llm_reranking(state: MatchingState) -> MatchingState:
    """Step 3: Single batch Groq call to rank all candidates comparatively."""
    start = time.monotonic()

    candidates = state.get("candidates", [])
    target_company = state.get("target_company", "")
    candidate_tier_by_id = state.get("candidate_tier_by_id", {})

    if not candidates:
        timings = state.get("step_timings", {})
        timings["llm_reranking_ms"] = int((time.monotonic() - start) * 1000)
        return {**state, "ranked_candidates": [], "step_timings": timings}

    eval_candidates = candidates[:10]
    candidates_text = "\n\n".join(
        _compress_candidate(c, i) + f"\n  Tier: {candidate_tier_by_id.get(c['id'], 'C')}"
        for i, c in enumerate(eval_candidates)
    )

    jd_must_haves = state.get("jd_must_haves", [])
    seeker_strengths = state.get("seeker_strengths", [])
    seeker_gaps = state.get("seeker_gaps", [])
    implicit_referrer_requirements = state.get("implicit_referrer_requirements", {})
    feedback_patterns = await get_feedback_patterns_text()

    independent_prompt = LLM_INDEPENDENT_EVAL_PROMPT.format(
        jd_must_haves="\n".join(f"- {item}" for item in jd_must_haves) or "- Not extracted",
        seeker_strengths="\n".join(f"- {item}" for item in seeker_strengths) or "- Not extracted",
        seeker_gaps="\n".join(f"- {item}" for item in seeker_gaps) or "- Not extracted",
        implicit_referrer_requirements=json.dumps(implicit_referrer_requirements, ensure_ascii=False),
        feedback_patterns=feedback_patterns,
        candidates_text=candidates_text,
    )

    try:
        independent = await generate_json(independent_prompt)

        if isinstance(independent, dict):
            independent = independent.get("candidates", independent.get("matches", [independent]))
        if not isinstance(independent, list):
            independent = []

        comparison_prompt = (
            LLM_COMPARATIVE_RANKING_PROMPT
            + "\n\n"
            + json.dumps(independent, ensure_ascii=False)
        )
        result = await generate_json(comparison_prompt)
        if isinstance(result, dict):
            result = result.get("candidates", result.get("matches", [result]))
        if not isinstance(result, list):
            result = []

        # Build id -> candidate lookup for enrichment
        candidate_map = {c["id"]: c for c in candidates}
        independent_map = {
            str(item.get("candidate_id", "")): item
            for item in independent
            if isinstance(item, dict)
        }

        ranked: list[RankedCandidate] = []
        for item in result[:10]:
            cid = str(item.get("candidate_id", ""))
            source = candidate_map.get(cid, {})
            assessment = independent_map.get(cid, {})
            reply_probability_text = str(assessment.get("reply_probability", "medium")).lower()
            reply_probability_score = {
                "low": 3.0,
                "medium": 6.0,
                "high": 8.5,
            }.get(reply_probability_text, 6.0)
            referral_viability = float(assessment.get("referral_viability", item.get("score", 0)))
            ranked.append(
                RankedCandidate(
                    rank=item.get("rank", len(ranked) + 1),
                    candidate_id=cid,
                    full_name=source.get("full_name", ""),
                    job_title=source.get("job_title", ""),
                    company=source.get("company", ""),
                    seniority=source.get("seniority", ""),
                    score=float(item.get("score", 0)),
                    success_likelihood_percent=int(item.get("success_likelihood_percent", 0)),
                    reasoning=item.get("reasoning", ""),
                    strong_points=item.get("strong_points", []),
                    red_flags=item.get("red_flags", []),
                    suggested_opening=item.get("suggested_opening", assessment.get("opening_sentence", "")),
                    semantic_score=source.get("semantic_score", 0.0),
                    referral_viability=referral_viability,
                    reply_probability=reply_probability_score,
                    tier=candidate_tier_by_id.get(cid, "C"),
                    independent_assessment=assessment,
                )
            )

        timings = state.get("step_timings", {})
        timings["llm_reranking_ms"] = int((time.monotonic() - start) * 1000)

        logger.info("matching.llm_reranking.done", ranked_count=len(ranked))

        return {**state, "ranked_candidates": ranked, "step_timings": timings}

    except Exception as exc:
        logger.exception("matching.llm_reranking.failed", error=str(exc))
        fallback_ranked = sorted(
            candidates,
            key=lambda item: item.get("semantic_score", 0.0),
            reverse=True,
        )[:10]

        ranked_fallback: list[RankedCandidate] = []
        for index, candidate in enumerate(fallback_ranked):
            score = round((candidate.get("semantic_score", 0.0) * 6.5) + 3.0, 1)
            ranked_fallback.append(
                RankedCandidate(
                    rank=index + 1,
                    candidate_id=candidate["id"],
                    full_name=candidate.get("full_name", ""),
                    job_title=candidate.get("job_title", ""),
                    company=candidate.get("company", ""),
                    seniority=candidate.get("seniority", ""),
                    score=min(score, 9.5),
                    success_likelihood_percent=min(95, int(score * 10)),
                    reasoning="Ranked using semantic retrieval fallback due to LLM unavailability.",
                    strong_points=["High semantic similarity with seeker profile"],
                    red_flags=[],
                    suggested_opening="Start by referencing your strongest shared skill and project context.",
                    semantic_score=candidate.get("semantic_score", 0.0),
                )
            )

        timings = state.get("step_timings", {})
        timings["llm_reranking_ms"] = int((time.monotonic() - start) * 1000)
        return {
            **state,
            "ranked_candidates": ranked_fallback,
            "step_timings": timings,
            "error": str(exc),
        }


# ─────────────────────────────────────────────
# Step 4 — Synthesis
# ─────────────────────────────────────────────

async def synthesis(state: MatchingState) -> MatchingState:
    """Step 4: Combine semantic + LLM scores, produce final top 5."""
    start = time.monotonic()

    ranked = state.get("ranked_candidates", [])

    weights = await get_dynamic_weight_recommendations()

    semantic_weight = float(weights.get("semantic_weight", 0.10))
    llm_weight = float(weights.get("llm_score_weight", 0.45))
    company_weight = float(weights.get("company_match_weight", 0.25))
    reply_weight = float(weights.get("reply_probability_weight", 0.25))

    # Combine semantic + LLM + company tier + reply probability
    final: list[RankedCandidate] = []
    for r in ranked:
        semantic = float(r.get("semantic_score", 0.0)) * 10.0
        llm_score = float(r.get("score", 0.0))
        reply_probability = float(r.get("reply_probability", 5.0))
        tier = r.get("tier", "C")
        company_score = 10.0 if tier == "A" else 6.0 if tier == "B" else 3.0

        combined = (
            semantic * semantic_weight
            + llm_score * llm_weight
            + company_score * company_weight
            + reply_probability * reply_weight
        )
        combined = min(max(combined, 0.0), 10.0)

        final.append({
            **r,
            "score": round(combined, 1),
        })

    # Re-sort by combined score
    final.sort(key=lambda x: x.get("score", 0), reverse=True)

    # Reassign ranks
    for i, m in enumerate(final):
        m["rank"] = i + 1

    timings = state.get("step_timings", {})
    timings["synthesis_ms"] = int((time.monotonic() - start) * 1000)

    logger.info("matching.synthesis.done", final_count=len(final))

    return {
        **state,
        "final_matches": final[:10],
        "step_timings": timings,
        "synthesis_weights": weights,
    }


# ─────────────────────────────────────────────
# Conditional edge: should we broaden search?
# ─────────────────────────────────────────────

def should_broaden_search(state: MatchingState) -> str:
    """
    Conditional edge after llm_reranking.
    If we got < 3 quality candidates and haven't broadened yet, loop back.
    """
    ranked = state.get("ranked_candidates", [])
    already_broadened = state.get("retrieval_broadened", False)

    quality_candidates = [c for c in ranked if c.get("score", 0) >= 5.0]

    if len(quality_candidates) < 3 and not already_broadened:
        logger.info(
            "matching.broaden_search",
            quality_count=len(quality_candidates),
        )
        return "broaden"

    return "proceed"


def mark_retrieval_broadened(state: MatchingState) -> MatchingState:
    """State transition node used before retrying semantic retrieval."""
    return {
        **state,
        "retrieval_broadened": True,
    }
