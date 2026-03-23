"""Matching service — orchestrates the LangGraph matching pipeline."""

from __future__ import annotations

import json
import time

from app.agents.matching.graph import get_matching_graph
from app.agents.matching.state import MatchingState
from app.core.logging import get_logger
from app.db.postgres import get_postgres_pool
from app.schemas.matching import CandidateMatch, MatchResponse, PipelineTiming
from app.services.outcome_service import get_feedback_summary

logger = get_logger(__name__)


async def _persist_matching_run(seeker_id: str, final_state: MatchingState, timings: dict) -> str | None:
    pool = get_postgres_pool()
    if pool is None:
        return None

    try:
        feedback = await get_feedback_summary()

        async with pool.acquire() as conn:
            run_id = await conn.fetchval(
                """
                INSERT INTO matching_runs (
                    seeker_id,
                    target_company,
                    jd_must_haves,
                    seeker_strengths,
                    seeker_gaps,
                    implicit_referrer_requirements,
                    retrieval_tier_counts,
                    feedback_patterns,
                    weight_recommendations,
                    total_candidates_evaluated,
                    pipeline_timing
                ) VALUES (
                    $1::uuid,
                    $2,
                    $3::jsonb,
                    $4::jsonb,
                    $5::jsonb,
                    $6::jsonb,
                    $7::jsonb,
                    $8::jsonb,
                    $9::jsonb,
                    $10,
                    $11::jsonb
                )
                RETURNING id::text
                """,
                seeker_id,
                final_state.get("target_company"),
                json.dumps(final_state.get("jd_must_haves", [])),
                json.dumps(final_state.get("seeker_strengths", [])),
                json.dumps(final_state.get("seeker_gaps", [])),
                json.dumps(final_state.get("implicit_referrer_requirements", {})),
                json.dumps(final_state.get("retrieval_tier_counts", {})),
                json.dumps({"feedback_patterns": feedback.get("feedback_patterns", "")}),
                json.dumps(final_state.get("synthesis_weights", feedback.get("weight_recommendations", {}))),
                len(final_state.get("candidates", [])),
                json.dumps(timings),
            )

            for item in final_state.get("final_matches", []):
                await conn.execute(
                    """
                    INSERT INTO matching_run_candidates (
                        run_id,
                        candidate_id,
                        rank,
                        tier,
                        semantic_score,
                        llm_score,
                        referral_viability,
                        reply_probability,
                        combined_score,
                        success_likelihood_percent,
                        reasoning,
                        strong_points,
                        red_flags,
                        opening_sentence,
                        independent_assessment
                    ) VALUES (
                        $1::uuid,
                        NULLIF($2, '')::uuid,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12::jsonb,
                        $13::jsonb,
                        $14,
                        $15::jsonb
                    )
                    """,
                    run_id,
                    item.get("candidate_id", ""),
                    item.get("rank"),
                    item.get("tier"),
                    item.get("semantic_score"),
                    item.get("score"),
                    item.get("referral_viability"),
                    item.get("reply_probability"),
                    item.get("score"),
                    item.get("success_likelihood_percent"),
                    item.get("reasoning", ""),
                    json.dumps(item.get("strong_points", [])),
                    json.dumps(item.get("red_flags", [])),
                    item.get("suggested_opening"),
                    json.dumps(item.get("independent_assessment", {})),
                )

        return run_id
    except Exception as exc:
        logger.warning("matching.persist_run.failed", error=str(exc))
        return None


async def get_matching_history(seeker_id: str, limit: int = 20) -> list[dict]:
    pool = get_postgres_pool()
    if pool is None:
        return []

    bounded_limit = max(1, min(limit, 50))

    try:
        async with pool.acquire() as conn:
            run_rows = await conn.fetch(
                """
                SELECT id::text,
                       seeker_id::text,
                       target_company,
                       jd_must_haves,
                       seeker_strengths,
                       seeker_gaps,
                       implicit_referrer_requirements,
                       retrieval_tier_counts,
                       feedback_patterns,
                       weight_recommendations,
                       total_candidates_evaluated,
                       pipeline_timing,
                       created_at
                FROM matching_runs
                WHERE seeker_id = $1::uuid
                ORDER BY created_at DESC
                LIMIT $2
                """,
                seeker_id,
                bounded_limit,
            )

            history: list[dict] = []
            for run_row in run_rows:
                candidate_rows = await conn.fetch(
                    """
                    SELECT mrc.rank,
                           mrc.tier,
                           mrc.semantic_score,
                           mrc.llm_score,
                           mrc.referral_viability,
                           mrc.reply_probability,
                           mrc.combined_score,
                           mrc.success_likelihood_percent,
                           mrc.reasoning,
                           mrc.strong_points,
                           mrc.red_flags,
                           mrc.opening_sentence,
                           mrc.independent_assessment,
                           p.id::text AS candidate_id,
                           p.full_name,
                           p.job_title,
                           p.company
                    FROM matching_run_candidates mrc
                    LEFT JOIN profiles p ON p.id = mrc.candidate_id
                    WHERE mrc.run_id = $1::uuid
                    ORDER BY mrc.rank ASC NULLS LAST, mrc.created_at ASC
                    """,
                    run_row["id"],
                )

                history.append(
                    {
                        "runId": run_row["id"],
                        "seekerId": run_row["seeker_id"],
                        "targetCompany": run_row["target_company"],
                        "jdMustHaves": run_row["jd_must_haves"] or [],
                        "seekerStrengths": run_row["seeker_strengths"] or [],
                        "seekerGaps": run_row["seeker_gaps"] or [],
                        "implicitReferrerRequirements": run_row["implicit_referrer_requirements"] or {},
                        "retrievalTierCounts": run_row["retrieval_tier_counts"] or {},
                        "feedbackPatterns": run_row["feedback_patterns"] or {},
                        "weightRecommendations": run_row["weight_recommendations"] or {},
                        "totalCandidatesEvaluated": run_row["total_candidates_evaluated"] or 0,
                        "pipelineTiming": run_row["pipeline_timing"] or {},
                        "createdAt": run_row["created_at"].isoformat() if run_row["created_at"] else None,
                        "matches": [
                            {
                                "rank": row["rank"],
                                "tier": row["tier"],
                                "candidateId": row["candidate_id"],
                                "fullName": row["full_name"],
                                "jobTitle": row["job_title"],
                                "company": row["company"],
                                "semanticScore": row["semantic_score"],
                                "llmScore": row["llm_score"],
                                "referralViability": row["referral_viability"],
                                "replyProbability": row["reply_probability"],
                                "combinedScore": row["combined_score"],
                                "successLikelihoodPercent": row["success_likelihood_percent"],
                                "reasoning": row["reasoning"],
                                "strongPoints": row["strong_points"] or [],
                                "redFlags": row["red_flags"] or [],
                                "openingSentence": row["opening_sentence"],
                                "independentAssessment": row["independent_assessment"] or {},
                            }
                            for row in candidate_rows
                        ],
                    }
                )

        return history
    except Exception as exc:
        logger.warning("matching.history.failed", error=str(exc))
        return []


async def run_matching_pipeline(
    job_description: str,
    resume_text: str,
    seeker_id: str,
) -> MatchResponse:
    """
    Run the full 4-step matching pipeline via LangGraph.

    Returns a MatchResponse with top 5 matches, timing, and metadata.
    """
    start = time.monotonic()

    initial_state: MatchingState = {
        "job_description": job_description,
        "resume_text": resume_text,
        "seeker_id": seeker_id,
        "step_timings": {},
        "retrieval_broadened": False,
    }

    try:
        graph = get_matching_graph()
        final_state = await graph.ainvoke(initial_state)

        total_ms = int((time.monotonic() - start) * 1000)
        timings = final_state.get("step_timings", {})
        timings["total_ms"] = total_ms

        matches = [
            CandidateMatch(
                rank=m.get("rank", 0),
                candidate_id=m.get("candidate_id", ""),
                full_name=m.get("full_name"),
                job_title=m.get("job_title"),
                company=m.get("company"),
                seniority=m.get("seniority"),
                score=m.get("score", 0.0),
                success_likelihood_percent=m.get("success_likelihood_percent", 0),
                reasoning=m.get("reasoning", ""),
                strong_points=m.get("strong_points", []),
                red_flags=m.get("red_flags", []),
                suggested_opening=m.get("suggested_opening"),
                semantic_score=m.get("semantic_score"),
            )
            for m in final_state.get("final_matches", [])
        ]

        candidates_evaluated = len(final_state.get("candidates", []))

        logger.info(
            "matching.pipeline.done",
            matches=len(matches),
            candidates_evaluated=candidates_evaluated,
            total_ms=total_ms,
        )

        run_id = await _persist_matching_run(seeker_id=seeker_id, final_state=final_state, timings=timings)
        if run_id:
            logger.info("matching.persist_run.done", run_id=run_id)

        error = final_state.get("error")
        degraded_error = error if not matches else None

        return MatchResponse(
            success=len(matches) > 0,
            matches=matches,
            total_candidates_evaluated=candidates_evaluated,
            pipeline_timing=PipelineTiming(
                document_intelligence_ms=timings.get("document_intelligence_ms"),
                semantic_retrieval_ms=timings.get("semantic_retrieval_ms"),
                llm_reranking_ms=timings.get("llm_reranking_ms"),
                synthesis_ms=timings.get("synthesis_ms"),
                total_ms=total_ms,
            ),
            error=degraded_error,
        )

    except Exception as exc:
        total_ms = int((time.monotonic() - start) * 1000)
        logger.exception("matching.pipeline.failed", error=str(exc), total_ms=total_ms)
        return MatchResponse(
            success=False,
            error=f"Matching pipeline failed: {str(exc)}",
            pipeline_timing=PipelineTiming(total_ms=total_ms),
        )
