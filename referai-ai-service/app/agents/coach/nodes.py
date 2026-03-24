"""LangGraph node functions for the coach agent."""

from __future__ import annotations

import json

from app.agents.coach.state import CoachState
from app.core.logging import get_logger
from app.core.vector import cosine_similarity
from app.db.postgres import get_postgres_pool
from app.services.embedding_service import embed_query, embed_batch
from app.services.llm_client import generate_json

logger = get_logger(__name__)

# ─────────────────────────────────────────────
# Node 1 — Load Context
# ─────────────────────────────────────────────

async def load_context(state: CoachState) -> CoachState:
    """Fetch profiles, conversation history, and match explanation from DB."""
    pool = get_postgres_pool()
    if pool is None:
        return {**state, "error": "Database not initialized"}

    try:
        async with pool.acquire() as conn:
            # Fetch seeker profile
            seeker_row = await conn.fetchrow(
                "SELECT full_name, job_title, company, skills, bio, resume_text, seniority "
                "FROM profiles WHERE id = $1::uuid",
                state["seeker_id"],
            )

            # Fetch referrer profile
            referrer_row = await conn.fetchrow(
                "SELECT full_name, job_title, company, skills, bio, seniority, years_of_experience "
                "FROM profiles WHERE id = $1::uuid",
                state["referrer_id"],
            )

            # Fetch conversation history (last 20 messages)
            msg_rows = await conn.fetch(
                "SELECT m.sender_id::text, m.content, m.created_at "
                "FROM messages m "
                "WHERE m.conversation_id = $1::uuid "
                "ORDER BY m.created_at DESC LIMIT 20",
                state["conversation_id"],
            )

            # Fetch match explanation from referral request
            match_row = await conn.fetchrow(
                "SELECT rr.ai_explanation, rr.shared_skills "
                "FROM referral_requests rr "
                "JOIN conversations c ON c.request_id = rr.id "
                "WHERE c.id = $1::uuid",
                state["conversation_id"],
            )

            # Fetch previous advice
            advice_rows = await conn.fetch(
                "SELECT advice_text FROM coach_advice_log "
                "WHERE conversation_id = $1::uuid "
                "ORDER BY created_at DESC LIMIT 10",
                state["conversation_id"],
            )

        def _parse_skills(raw) -> list[str]:
            if isinstance(raw, list):
                return raw
            if isinstance(raw, str):
                return [s.strip() for s in raw.strip("{}").split(",") if s.strip()]
            return []

        seeker_profile = {}
        if seeker_row:
            seeker_profile = {
                "full_name": seeker_row["full_name"] or "",
                "job_title": seeker_row["job_title"] or "",
                "company": seeker_row["company"] or "",
                "skills": _parse_skills(seeker_row["skills"]),
                "bio": seeker_row["bio"] or "",
                "resume_text": seeker_row["resume_text"] or "",
                "seniority": seeker_row["seniority"] or "",
            }

        referrer_profile = {}
        if referrer_row:
            referrer_profile = {
                "full_name": referrer_row["full_name"] or "",
                "job_title": referrer_row["job_title"] or "",
                "company": referrer_row["company"] or "",
                "skills": _parse_skills(referrer_row["skills"]),
                "bio": referrer_row["bio"] or "",
                "seniority": referrer_row["seniority"] or "",
                "years_of_experience": referrer_row["years_of_experience"] or 0,
            }

        conversation_history = []
        for row in reversed(msg_rows):  # oldest first
            sender = "seeker" if str(row["sender_id"]) == state["seeker_id"] else "referrer"
            conversation_history.append({
                "sender": sender,
                "content": row["content"],
                "timestamp": row["created_at"].isoformat() if row["created_at"] else "",
            })

        match_explanation = ""
        if match_row:
            match_explanation = match_row["ai_explanation"] or ""

        previous_advice = [row["advice_text"] for row in advice_rows]

        logger.info(
            "coach.load_context.done",
            messages=len(conversation_history),
            previous_advice_count=len(previous_advice),
        )

        return {
            **state,
            "seeker_profile": seeker_profile,
            "referrer_profile": referrer_profile,
            "conversation_history": conversation_history,
            "match_explanation": match_explanation,
            "previous_advice": previous_advice,
        }

    except Exception as exc:
        logger.exception("coach.load_context.failed", error=str(exc))
        return {**state, "error": str(exc)}


# ─────────────────────────────────────────────
# Node 2 — RAG Retrieval
# ─────────────────────────────────────────────

async def rag_retrieval(state: CoachState) -> CoachState:
    """Retrieve the most relevant context chunks for grounded coaching."""
    seeker = state.get("seeker_profile", {})
    referrer = state.get("referrer_profile", {})
    pool = get_postgres_pool()

    query_text = " ".join(
        [
            state.get("current_message", ""),
            state.get("situation_analysis", ""),
            " ".join(msg.get("content", "") for msg in state.get("conversation_history", [])[-4:]),
        ]
    ).strip()

    chunks: list[str] = []

    if pool and query_text:
        try:
            query_embedding = await embed_query(query_text[:1500])
            embedding_str = "[" + ",".join(str(value) for value in query_embedding) + "]"

            async with pool.acquire() as conn:
                vector_rows = await conn.fetch(
                    """
                    SELECT p.id::text,
                           p.full_name,
                           p.job_title,
                           p.company,
                           p.skills,
                           p.bio,
                           1 - (p.embedding <=> $1::vector) AS similarity
                    FROM profiles p
                    WHERE p.embedding IS NOT NULL
                      AND p.id IN ($2::uuid, $3::uuid)
                    ORDER BY p.embedding <=> $1::vector
                    LIMIT 2
                    """,
                    embedding_str,
                    state.get("seeker_id"),
                    state.get("referrer_id"),
                )

            for row in vector_rows:
                skills_raw = row["skills"]
                if isinstance(skills_raw, str):
                    skill_items = [item.strip() for item in skills_raw.strip("{}").split(",") if item.strip()]
                elif isinstance(skills_raw, list):
                    skill_items = skills_raw
                else:
                    skill_items = []

                chunks.append(
                    (
                        f"Vector context ({row['similarity']:.2f}) — "
                        f"{row['full_name']} | {row['job_title']} at {row['company']} | "
                        f"Skills: {', '.join(skill_items[:10])} | "
                        f"Bio: {(row['bio'] or '')[:280]}"
                    )
                )
        except Exception as exc:
            logger.warning("coach.rag_retrieval.vector_fallback", error=str(exc))

    # Profile facts

    if seeker.get("skills"):
        chunks.append(f"Seeker skills: {', '.join(seeker['skills'][:15])}")
    if seeker.get("resume_text"):
        chunks.append(f"Seeker background: {seeker['resume_text'][:800]}")
    if referrer.get("skills"):
        chunks.append(f"Referrer skills: {', '.join(referrer['skills'][:15])}")
    if referrer.get("bio"):
        chunks.append(f"Referrer bio: {referrer['bio'][:500]}")

    # Shared context
    seeker_skills_lower = {s.lower() for s in seeker.get("skills", [])}
    referrer_skills_lower = {s.lower() for s in referrer.get("skills", [])}
    shared = seeker_skills_lower & referrer_skills_lower
    if shared:
        chunks.append(f"Shared skills: {', '.join(sorted(shared))}")

    if state.get("match_explanation"):
        chunks.append(f"Match reasoning: {state['match_explanation'][:300]}")

    # Recent conversation chunks
    for msg in state.get("conversation_history", [])[-12:]:
        speaker = "Seeker" if msg.get("sender") == "seeker" else "Referrer"
        content = (msg.get("content") or "").strip()
        if content:
            chunks.append(f"Conversation ({speaker}): {content[:260]}")

    if not chunks:
        return {**state, "relevant_context": ""}

    try:
        query_embedding = await embed_query(query_text[:1500] or "referral coaching context")
        chunk_embeddings = await embed_batch(chunks, task_type="RETRIEVAL_DOCUMENT")

        scored = []
        for chunk, emb in zip(chunks, chunk_embeddings):
            scored.append((cosine_similarity(query_embedding, emb), chunk))

        scored.sort(key=lambda item: item[0], reverse=True)
        top_context = [chunk for _, chunk in scored[:8]]
    except Exception as exc:
        logger.warning("coach.rag_retrieval.semantic_fallback", error=str(exc))
        query_terms = set(query_text.lower().replace("|", " ").replace(",", " ").split())
        lexical = []
        for chunk in chunks:
            terms = set(chunk.lower().replace(",", " ").split())
            lexical.append((len(query_terms & terms), chunk))
        lexical.sort(key=lambda item: item[0], reverse=True)
        top_context = [chunk for _, chunk in lexical[:8]]

    relevant_context = "\n".join(top_context)

    logger.info("coach.rag_retrieval.done", context_len=len(relevant_context))

    return {**state, "relevant_context": relevant_context}


# ─────────────────────────────────────────────
# Node 3 — Analyze Situation
# ─────────────────────────────────────────────

ANALYSIS_PROMPT = """\
You are a referral coaching expert. Analyze this conversation situation.

Stage: {stage}
Messages exchanged so far: {message_count}
Current message: {current_message}

Conversation so far:
{conversation_text}

Seeker: {seeker_name} ({seeker_title})
Referrer: {referrer_name} ({referrer_title} at {referrer_company})

Determine:
1. What is the emotional tone of the conversation?
2. Is now the right time to make the referral ask?
3. What type of advice does the seeker need RIGHT NOW?

Return JSON:
{{
  "situation_analysis": "2-3 sentence analysis of where the conversation stands",
  "advice_type": "one of: encourage_rapport | time_to_ask | too_early | re_engage | draft_ask | follow_up | celebrate"
}}
"""


async def analyze_situation(state: CoachState) -> CoachState:
    """Determine what type of coaching advice is needed."""
    history = state.get("conversation_history", [])
    seeker = state.get("seeker_profile", {})
    referrer = state.get("referrer_profile", {})

    conversation_text = ""
    for msg in history[-10:]:  # Last 10 messages
        sender_name = seeker.get("full_name", "Seeker") if msg["sender"] == "seeker" else referrer.get("full_name", "Referrer")
        conversation_text += f"{sender_name}: {msg['content']}\n"

    prompt = ANALYSIS_PROMPT.format(
        stage=state.get("current_stage", "first_contact"),
        message_count=len(history),
        current_message=state.get("current_message", ""),
        conversation_text=conversation_text or "No messages yet",
        seeker_name=seeker.get("full_name", "Seeker"),
        seeker_title=seeker.get("job_title", ""),
        referrer_name=referrer.get("full_name", "Referrer"),
        referrer_title=referrer.get("job_title", ""),
        referrer_company=referrer.get("company", ""),
    )

    try:
        parsed = await generate_json(prompt)
        if not isinstance(parsed, dict):
            parsed = {}

        return {
            **state,
            "situation_analysis": parsed.get("situation_analysis", ""),
            "advice_type": parsed.get("advice_type", "encourage_rapport"),
        }
    except Exception as exc:
        logger.exception("coach.analyze_situation.failed", error=str(exc))
        return {
            **state,
            "situation_analysis": "Unable to analyze — providing general guidance.",
            "advice_type": "encourage_rapport",
        }


# ─────────────────────────────────────────────
# Node 4 — Generate Suggestion (builds prompt for streaming)
# ─────────────────────────────────────────────

SUGGESTION_PROMPT = """\
You are an expert career coach.
Your job: analyze the conversation, give brief advice, then write the exact next message the seeker should send.

=== PROFILES ===
Seeker: {seeker_name} ({seeker_title})
Referrer: {referrer_name} ({referrer_title} at {referrer_company})

=== RELEVANT CONTEXT ===
{relevant_context}

=== CONVERSATION HISTORY ===
{conversation_text}

=== SITUATION ANALYSIS ===
{situation_analysis}
Advice type: {advice_type}

Previous advice given (do not repeat): {previous_advice}

Your response MUST follow this EXACT two-section format:

[ADVICE]
Your 1-2 sentence analysis of why this is the right move right now.

[MESSAGE]
The exact message {seeker_name} should send to {referrer_name}. First person, addresses {referrer_name} directly by first name. Maximum 100 words. No labels, no quotes — just the raw message text.
"""



async def generate_suggestion(state: CoachState) -> CoachState:
    """Build the final coaching prompt for streaming generation."""
    seeker = state.get("seeker_profile", {})
    referrer = state.get("referrer_profile", {})
    history = state.get("conversation_history", [])

    conversation_text = ""
    for msg in history[-10:]:
        sender_name = seeker.get("full_name", "Seeker") if msg["sender"] == "seeker" else referrer.get("full_name", "Referrer")
        conversation_text += f"{sender_name}: {msg['content']}\n"

    previous_text = "\n".join(f"- {a[:150]}" for a in state.get("previous_advice", [])[:5])

    prompt = SUGGESTION_PROMPT.format(
        seeker_name=seeker.get("full_name", "Seeker"),
        seeker_title=seeker.get("job_title", ""),
        referrer_name=referrer.get("full_name", "Referrer"),
        referrer_title=referrer.get("job_title", ""),
        referrer_company=referrer.get("company", ""),
        relevant_context=state.get("relevant_context", ""),
        conversation_text=conversation_text or "No messages yet — this is the opening move.",
        situation_analysis=state.get("situation_analysis", ""),
        advice_type=state.get("advice_type", ""),
        previous_advice=previous_text or "None yet — first coaching session.",
    )

    return {**state, "streaming_prompt": prompt}



