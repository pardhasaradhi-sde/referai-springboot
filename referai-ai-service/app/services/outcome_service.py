"""Outcome feedback loop service — records outcomes and builds learning data."""

from __future__ import annotations

import json

from app.core.logging import get_logger
from app.db.postgres import get_postgres_pool
from app.db.redis import get_redis_client

logger = get_logger(__name__)

FEEDBACK_CACHE_KEY = "feedback:aggregate:v1"
FEEDBACK_CACHE_TTL_SECONDS = 60 * 60 * 6


def _to_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _bounded(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _default_feedback_patterns_text() -> str:
    return (
        "No platform feedback available yet. Apply standard priors: "
        "same-team referrals convert 3x higher, seniority sweet spot submits 40% more often, "
        "messages under 150 words get 60% more replies. These will be replaced by real platform data as it accumulates."
    )


def _build_weight_recommendations(signal_accuracy: dict[str, float]) -> dict[str, float]:
    company_acc = signal_accuracy.get("company_match", 0.5)
    reply_acc = signal_accuracy.get("reply_bio_signal", 0.5)
    semantic_acc = signal_accuracy.get("skill_credibility", 0.5)

    company_weight = _bounded(0.25 + (company_acc - 0.5) * 0.2, 0.15, 0.35)
    reply_weight = _bounded(0.25 + (reply_acc - 0.5) * 0.2, 0.15, 0.35)
    semantic_weight = _bounded(0.20 + (semantic_acc - 0.5) * 0.15, 0.10, 0.30)
    llm_weight = _bounded(1.0 - (company_weight + reply_weight + semantic_weight), 0.30, 0.60)

    total = company_weight + reply_weight + semantic_weight + llm_weight
    if total <= 0:
        return {
            "company_match_weight": 0.25,
            "reply_probability_weight": 0.25,
            "semantic_weight": 0.20,
            "llm_score_weight": 0.30,
        }

    return {
        "company_match_weight": round(company_weight / total, 3),
        "reply_probability_weight": round(reply_weight / total, 3),
        "semantic_weight": round(semantic_weight / total, 3),
        "llm_score_weight": round(llm_weight / total, 3),
    }


def _feedback_patterns_text(summary: dict) -> str:
    total = int(summary.get("total_outcomes", 0))
    if total <= 0:
        return _default_feedback_patterns_text()

    distribution = summary.get("outcome_distribution", {})
    signal_accuracy = summary.get("signal_accuracy", {})
    weights = summary.get("weight_recommendations", {})

    positive = (
        int(distribution.get("GOT_REFERRAL", 0))
        + int(distribution.get("GOT_INTERVIEW", 0))
        + int(distribution.get("GOT_OFFER", 0))
    )
    positive_rate = round((positive / max(1, total)) * 100, 1)

    return (
        f"Platform learning from {total} completed referrals:\n"
        f"- Positive outcomes observed: {positive_rate}%\n"
        f"- Company match signal accuracy: {round(signal_accuracy.get('company_match', 0.5) * 100, 1)}%\n"
        f"- Seniority delta signal accuracy: {round(signal_accuracy.get('seniority_delta', 0.5) * 100, 1)}%\n"
        f"- Reply bio signal accuracy: {round(signal_accuracy.get('reply_bio_signal', 0.5) * 100, 1)}%\n"
        f"- Skill credibility signal accuracy: {round(signal_accuracy.get('skill_credibility', 0.5) * 100, 1)}%\n"
        "Weight adjustments derived from outcomes:\n"
        f"- company_match_weight={weights.get('company_match_weight', 0.25)}\n"
        f"- reply_probability_weight={weights.get('reply_probability_weight', 0.25)}\n"
        f"- semantic_weight={weights.get('semantic_weight', 0.20)}\n"
        f"- llm_score_weight={weights.get('llm_score_weight', 0.30)}\n"
        "Use these learnings to adjust scoring intuition for this request."
    )


async def _compute_feedback_summary() -> dict:
    pool = get_postgres_pool()
    if pool is None:
        return {}

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT outcome_type, COUNT(*) AS count
            FROM referral_outcomes
            WHERE outcome_type != 'FEEDBACK_AGGREGATE'
            GROUP BY outcome_type
            ORDER BY count DESC
            """
        )

        avg_rows = await conn.fetch(
            """
            SELECT outcome_type,
                   AVG((context_snapshot->>'match_score')::float) as avg_score,
                   AVG((context_snapshot->>'message_count')::int) as avg_messages,
                   AVG((context_snapshot->>'coach_suggestions_used')::int) as avg_coach_used
            FROM referral_outcomes
            WHERE outcome_type != 'FEEDBACK_AGGREGATE'
              AND context_snapshot->>'match_score' IS NOT NULL
            GROUP BY outcome_type
            """
        )

        accuracy_row = await conn.fetchrow(
            """
            SELECT
              AVG(CASE
                    WHEN context_snapshot->>'match_score' IS NULL THEN NULL
                    WHEN (context_snapshot->>'match_score')::float >= 0.7
                         AND outcome_type IN ('GOT_REFERRAL','GOT_INTERVIEW','GOT_OFFER') THEN 1
                    WHEN (context_snapshot->>'match_score')::float < 0.7
                         AND outcome_type IN ('NO_RESPONSE','DECLINED') THEN 1
                    ELSE 0
                  END) AS skill_credibility,
              AVG(CASE
                    WHEN context_snapshot->>'message_count' IS NULL THEN NULL
                    WHEN (context_snapshot->>'message_count')::int >= 1
                         AND outcome_type IN ('GOT_REFERRAL','GOT_INTERVIEW','GOT_OFFER') THEN 1
                    WHEN (context_snapshot->>'message_count')::int = 0
                         AND outcome_type IN ('NO_RESPONSE','DECLINED') THEN 1
                    ELSE 0
                  END) AS reply_bio_signal,
              AVG(CASE
                    WHEN context_snapshot->>'shared_skills_count' IS NULL THEN NULL
                    WHEN (context_snapshot->>'shared_skills_count')::int >= 2
                         AND outcome_type IN ('GOT_REFERRAL','GOT_INTERVIEW','GOT_OFFER') THEN 1
                    WHEN (context_snapshot->>'shared_skills_count')::int < 2
                         AND outcome_type IN ('NO_RESPONSE','DECLINED') THEN 1
                    ELSE 0
                  END) AS company_match,
              AVG(CASE
                    WHEN context_snapshot->>'coach_suggestions_used' IS NULL THEN NULL
                    WHEN (context_snapshot->>'coach_suggestions_used')::int >= 1
                         AND outcome_type IN ('GOT_REFERRAL','GOT_INTERVIEW','GOT_OFFER') THEN 1
                    WHEN (context_snapshot->>'coach_suggestions_used')::int = 0
                         AND outcome_type IN ('NO_RESPONSE','DECLINED') THEN 1
                    ELSE 0
                  END) AS seniority_delta
            FROM referral_outcomes
            WHERE outcome_type != 'FEEDBACK_AGGREGATE'
            """
        )

    distribution = {row["outcome_type"]: int(row["count"]) for row in rows}
    total_outcomes = sum(distribution.values())

    signal_accuracy = {
        "company_match": round(_to_float(accuracy_row["company_match"], 0.5), 3) if accuracy_row else 0.5,
        "seniority_delta": round(_to_float(accuracy_row["seniority_delta"], 0.5), 3) if accuracy_row else 0.5,
        "reply_bio_signal": round(_to_float(accuracy_row["reply_bio_signal"], 0.5), 3) if accuracy_row else 0.5,
        "skill_credibility": round(_to_float(accuracy_row["skill_credibility"], 0.5), 3) if accuracy_row else 0.5,
    }

    weight_recommendations = _build_weight_recommendations(signal_accuracy)

    summary = {
        "outcome_distribution": distribution,
        "averages_by_outcome": {
            row["outcome_type"]: {
                "avg_match_score": round(float(row["avg_score"]), 2) if row["avg_score"] else None,
                "avg_messages": round(float(row["avg_messages"]), 1) if row["avg_messages"] else None,
                "avg_coach_suggestions": round(float(row["avg_coach_used"]), 1) if row["avg_coach_used"] else None,
            }
            for row in avg_rows
        },
        "total_outcomes": total_outcomes,
        "signal_accuracy": signal_accuracy,
        "weight_recommendations": weight_recommendations,
    }
    summary["feedback_patterns"] = _feedback_patterns_text(summary)
    return summary


async def _persist_feedback_aggregate(summary: dict) -> None:
    pool = get_postgres_pool()
    if pool is None:
        return

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO referral_outcomes
                    (request_id, reporter_id, outcome_type, context_snapshot)
                VALUES (NULL, NULL, 'FEEDBACK_AGGREGATE', $1::jsonb)
                ON CONFLICT (outcome_type)
                WHERE outcome_type = 'FEEDBACK_AGGREGATE'
                DO UPDATE SET context_snapshot = EXCLUDED.context_snapshot,
                              created_at = NOW()
                """,
                json.dumps(summary),
            )
    except Exception as exc:
        logger.warning("outcome.feedback.persist_failed", error=str(exc))


async def _cache_feedback_summary(summary: dict) -> None:
    client = get_redis_client()
    if client is None:
        return
    try:
        await client.setex(FEEDBACK_CACHE_KEY, FEEDBACK_CACHE_TTL_SECONDS, json.dumps(summary))
    except Exception as exc:
        logger.warning("outcome.feedback.cache_set_failed", error=str(exc))


async def _read_feedback_cache() -> dict | None:
    client = get_redis_client()
    if client is None:
        return None

    try:
        raw = await client.get(FEEDBACK_CACHE_KEY)
        if not raw:
            return None
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception as exc:
        logger.warning("outcome.feedback.cache_read_failed", error=str(exc))

    return None


async def refresh_feedback_summary() -> dict:
    summary = await _compute_feedback_summary()
    await _persist_feedback_aggregate(summary)
    await _cache_feedback_summary(summary)
    return summary


async def get_feedback_summary() -> dict:
    cached = await _read_feedback_cache()
    if cached is not None:
        return cached

    pool = get_postgres_pool()
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT context_snapshot
                    FROM referral_outcomes
                    WHERE outcome_type = 'FEEDBACK_AGGREGATE'
                    LIMIT 1
                    """
                )
            if row and isinstance(row["context_snapshot"], dict):
                summary = row["context_snapshot"]
                await _cache_feedback_summary(summary)
                return summary
        except Exception as exc:
            logger.warning("outcome.feedback.read_row_failed", error=str(exc))

    return await refresh_feedback_summary()


async def get_feedback_patterns_text() -> str:
    summary = await get_feedback_summary()
    return summary.get("feedback_patterns") or _default_feedback_patterns_text()


async def get_dynamic_weight_recommendations() -> dict[str, float]:
    summary = await get_feedback_summary()
    weights = summary.get("weight_recommendations")
    if isinstance(weights, dict) and weights:
        return {
            "company_match_weight": _to_float(weights.get("company_match_weight"), 0.25),
            "reply_probability_weight": _to_float(weights.get("reply_probability_weight"), 0.25),
            "semantic_weight": _to_float(weights.get("semantic_weight"), 0.20),
            "llm_score_weight": _to_float(weights.get("llm_score_weight"), 0.30),
        }
    return {
        "company_match_weight": 0.25,
        "reply_probability_weight": 0.25,
        "semantic_weight": 0.20,
        "llm_score_weight": 0.30,
    }


async def record_outcome(
    request_id: str,
    outcome_type: str,
    reporter_id: str,
) -> tuple[bool, str | None, str | None]:
    """
    Record a referral outcome with context snapshot.

    The context snapshot captures the state at the time of outcome:
    - match_score, shared_skills, seniority_gap
    - message_count, coach_suggestions_used

    Returns:
        (success, outcome_id, error)
    """
    pool = get_postgres_pool()
    if pool is None:
        return False, None, "Database not initialized"

    try:
        async with pool.acquire() as conn:
            # Build context snapshot from the referral request
            request_row = await conn.fetchrow(
                """
                SELECT rr.match_score, rr.shared_skills, rr.ai_explanation,
                       rr.seeker_id::text, rr.referrer_id::text,
                       sp.seniority as seeker_seniority,
                       rp.seniority as referrer_seniority
                FROM referral_requests rr
                LEFT JOIN profiles sp ON sp.id = rr.seeker_id
                LEFT JOIN profiles rp ON rp.id = rr.referrer_id
                WHERE rr.id = $1::uuid
                """,
                request_id,
            )

            context_snapshot: dict = {}
            if request_row:
                # Count messages in conversation
                msg_count = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM messages m
                    JOIN conversations c ON c.id = m.conversation_id
                    WHERE c.request_id = $1::uuid
                    """,
                    request_id,
                )

                # Count coach suggestions used
                coach_count = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM coach_advice_log cal
                    JOIN conversations c ON c.id = cal.conversation_id
                    WHERE c.request_id = $1::uuid
                    """,
                    request_id,
                )

                shared_skills = request_row["shared_skills"]
                if isinstance(shared_skills, str):
                    shared_skills_list = [s.strip() for s in shared_skills.strip("{}").split(",") if s.strip()]
                elif isinstance(shared_skills, list):
                    shared_skills_list = shared_skills
                else:
                    shared_skills_list = []

                context_snapshot = {
                    "match_score": float(request_row["match_score"]) if request_row["match_score"] else None,
                    "shared_skills_count": len(shared_skills_list),
                    "shared_skills": shared_skills_list[:10],
                    "seeker_seniority": request_row["seeker_seniority"],
                    "referrer_seniority": request_row["referrer_seniority"],
                    "message_count": msg_count or 0,
                    "coach_suggestions_used": coach_count or 0,
                }

            # Insert outcome record
            outcome_id = await conn.fetchval(
                """
                INSERT INTO referral_outcomes
                    (request_id, reporter_id, outcome_type, context_snapshot)
                VALUES ($1::uuid, $2::uuid, $3, $4::jsonb)
                RETURNING id::text
                """,
                request_id,
                reporter_id,
                outcome_type,
                json.dumps(context_snapshot),
            )

        logger.info(
            "outcome.recorded",
            outcome_id=outcome_id,
            outcome_type=outcome_type,
            request_id=request_id,
            context_keys=list(context_snapshot.keys()),
        )

        try:
            await refresh_feedback_summary()
        except Exception as exc:
            logger.warning("outcome.feedback.refresh_failed", error=str(exc))

        return True, outcome_id, None

    except Exception as exc:
        logger.exception("outcome.record.failed", error=str(exc))
        return False, None, str(exc)


async def get_outcome_patterns() -> dict:
    """
    Query historical outcome data for patterns.

    Used to inject learnings into the matching prompt (data flywheel).
    """
    try:
        patterns = await get_feedback_summary()
        logger.info("outcome.patterns.loaded", total=patterns.get("total_outcomes", 0))
        return patterns
    except Exception as exc:
        logger.exception("outcome.patterns.failed", error=str(exc))
        return {
            "outcome_distribution": {},
            "averages_by_outcome": {},
            "total_outcomes": 0,
            "signal_accuracy": {},
            "weight_recommendations": {
                "company_match_weight": 0.25,
                "reply_probability_weight": 0.25,
                "semantic_weight": 0.20,
                "llm_score_weight": 0.30,
            },
            "feedback_patterns": _default_feedback_patterns_text(),
        }
