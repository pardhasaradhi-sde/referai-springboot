"""Outreach message generation service."""

from __future__ import annotations

import math

from app.core.logging import get_logger
from app.core.vector import cosine_similarity
from app.db.postgres import get_postgres_pool


def _first_name(full_name: str) -> str:
    return (full_name or "there").split(" ")[0]


def _has_third_person_self_reference(message: str, seeker_name: str) -> bool:
    """Detect drafts that refer to the seeker in third person inside the body."""
    if not message or not seeker_name:
        return False

    full = seeker_name.strip().lower()
    first = _first_name(seeker_name).strip().lower()
    body = message.lower()

    # Ignore signature lines where the sender name is expected.
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    non_signature = "\n".join(lines[:-2]) if len(lines) > 2 else body

    return full in non_signature or (first and first in non_signature)


def _build_outreach_prompt(
    seeker: dict,
    referrer: dict,
    job_context: str,
    retrieved_context: list[str],
    outcome_signals: str,
) -> str:
    seeker_name = seeker.get("full_name", "")
    referrer_name = referrer.get("full_name", "")
    referrer_company = referrer.get("company", "")
    seeker_seniority = seeker.get("seniority", "Unknown")
    referrer_seniority = referrer.get("seniority", "Unknown")

    tone_instruction = "5. Match the professional tone appropriate for the referrer's seniority level."
    rs_lower = referrer_seniority.lower() if referrer_seniority else ""
    ss_lower = seeker_seniority.lower() if seeker_seniority else ""
    
    if any(x in rs_lower for x in ["lead", "director", "vp", "manager", "head", "chief", "principal"]):
        tone_instruction = "5. TONE: The referrer is highly senior. Be extremely respectful, concise, and lean toward asking for \"career guidance\" or a \"brief chat\" rather than a direct referral unless explicitly matched."
    elif rs_lower and ss_lower and rs_lower == ss_lower:
        tone_instruction = "5. TONE: The referrer is your peer. Be direct, authentic, and casually professional (e.g., engineer to engineer)."
    else:
        tone_instruction = "5. TONE: Adapt a respectful, professional tone appropriate for their level."

    return OUTREACH_PROMPT.format(
        seeker_name=seeker_name,
        seeker_first_name=_first_name(seeker_name),
        seeker_skills=", ".join(seeker.get("skills", [])[:25]),
        seeker_bio=seeker.get("resume_text", seeker.get("bio", ""))[:4000],
        referrer_name=referrer_name,
        referrer_first_name=_first_name(referrer_name),
        referrer_title=referrer.get("job_title", ""),
        referrer_company=referrer_company,
        referrer_skills=", ".join(referrer.get("skills", [])[:25]),
        referrer_seniority=referrer_seniority,
        referrer_bio=referrer.get("bio", "")[:2000],
        job_context=job_context or "General referral request",
        retrieved_context="\n".join(f"- {item}" for item in retrieved_context) or "- No retrieved context",
        outcome_signals=outcome_signals,
        tone_instruction=tone_instruction,
    )


def _build_outreach_fallback(
    seeker_name: str,
    referrer_name: str,
    company: str,
    shared_skills: list[str],
) -> str:
    shared_line = (
        f"I noticed we both work with {', '.join(shared_skills[:3])}. "
        if shared_skills
        else "I noticed we have overlapping technical interests. "
    )
    return (
        f"Hi {_first_name(referrer_name)},\n\n"
        f"I hope you are doing well. I am exploring opportunities at {company or 'your company'} and "
        f"wanted to reach out. {shared_line}"
        f"If you are open to it, I would really appreciate a referral or any guidance on the role.\n\n"
        f"Thanks in advance,\n{seeker_name or 'A fellow candidate'}"
    )

OUTREACH_PROMPT = """\
You are an expert career coach. Write a hyper-personalized referral request message.
The message MUST be written by the seeker to the referrer.

=== SEEKER PROFILE ===
Name: {seeker_name}
Skills: {seeker_skills}
Experience: {seeker_bio}

=== REFERRER PROFILE ===
Name: {referrer_name}
Title: {referrer_title} at {referrer_company}
Skills: {referrer_skills}
Seniority: {referrer_seniority}
Bio: {referrer_bio}

=== JOB CONTEXT ===
{job_context}

=== RETRIEVED CONTEXT (FACTS ONLY) ===
{retrieved_context}

=== HISTORICAL OUTCOME SIGNALS ===
{outcome_signals}

RULES:
0. The sender is {seeker_name}. The recipient is {referrer_name}.
1. Write in FIRST PERSON from the seeker's perspective (I, me, my).
2. NEVER refer to the seeker in third person by name (e.g., "{seeker_first_name} is", "he", "his profile").
3. Address the referrer directly as "you" and greet with "Hi {referrer_first_name},".
4. Ask for a referral only where appropriate to the referrer's company/team; otherwise ask for guidance or introductions.
{tone_instruction}
6. Under 200 words — concise and direct
7. Sound human, NOT AI-generated — no buzzwords like "synergy" or "leverage"
8. Reference specific things from the referrer's profile that show genuine research
9. Highlight the specific synergies between seeker and referrer
10. Only use facts from profiles/retrieved context; do not invent projects, teams, or achievements
11. Include one concrete shared-context line and one clear ask line

Return ONLY the message text, nothing else.
"""




def _safe_preview(text: str, max_len: int = 1500) -> str:
    return " ".join(text.split())[:max_len]


def _build_retrieval_chunks(
    seeker: dict,
    referrer: dict,
    job_context: str | None,
) -> list[str]:
    chunks: list[str] = []

    if seeker.get("skills"):
        chunks.append(f"Seeker top skills: {', '.join(seeker['skills'][:15])}")
    if seeker.get("resume_text"):
        chunks.append(f"Seeker resume highlights: {_safe_preview(seeker['resume_text'], 500)}")
    if seeker.get("bio"):
        chunks.append(f"Seeker bio: {_safe_preview(seeker['bio'], 350)}")

    if referrer.get("skills"):
        chunks.append(f"Referrer top skills: {', '.join(referrer['skills'][:15])}")
    if referrer.get("bio"):
        chunks.append(f"Referrer background: {_safe_preview(referrer['bio'], 450)}")
    if referrer.get("job_title") or referrer.get("company"):
        chunks.append(
            f"Referrer role context: {referrer.get('job_title', '')} at {referrer.get('company', '')}".strip()
        )

    if seeker.get("skills") and referrer.get("skills"):
        seeker_lower = {skill.lower() for skill in seeker.get("skills", [])}
        referrer_lower = {skill.lower() for skill in referrer.get("skills", [])}
        shared = sorted(seeker_lower & referrer_lower)
        if shared:
            chunks.append(f"Shared skills: {', '.join(shared[:12])}")

    if job_context:
        chunks.append(f"Job context: {_safe_preview(job_context, 350)}")

    return chunks


async def _retrieve_relevant_context(
    seeker: dict,
    referrer: dict,
    job_context: str | None,
    top_k: int = 4,
) -> list[str]:
    chunks = _build_retrieval_chunks(seeker, referrer, job_context)
    if not chunks:
        return []

    query_text = " | ".join(
        [
            f"seeker={seeker.get('full_name', '')}",
            f"referrer={referrer.get('full_name', '')}",
            f"goal={job_context or 'referral outreach message'}",
            f"seeker_skills={', '.join(seeker.get('skills', [])[:10])}",
            f"referrer_skills={', '.join(referrer.get('skills', [])[:10])}",
        ]
    )

    try:
        query_embedding = await embed_query(query_text[:8000])
        chunk_embeddings = await embed_batch(chunks, task_type="RETRIEVAL_DOCUMENT")

        scored = []
        for chunk, chunk_emb in zip(chunks, chunk_embeddings):
            similarity = cosine_similarity(query_embedding, chunk_emb)
            scored.append((similarity, chunk))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in scored[:top_k]]

    except Exception as exc:
        logger.warning("outreach.rag.semantic_fallback", error=str(exc))

        # Keyword-overlap fallback retrieval
        query_terms = set(query_text.lower().replace("|", " ").replace(",", " ").split())
        lexical_scored = []
        for chunk in chunks:
            chunk_terms = set(chunk.lower().replace(",", " ").split())
            overlap = len(query_terms & chunk_terms)
            lexical_scored.append((overlap, chunk))

        lexical_scored.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in lexical_scored[:top_k]]


async def _fetch_profile(profile_id: str) -> dict | None:
    """Fetch a profile from the database."""
    pool = get_postgres_pool()
    if pool is None:
        return None

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT full_name, job_title, company, seniority, skills, bio, resume_text
            FROM profiles WHERE id = $1::uuid
            """,
            profile_id,
        )

    if row is None:
        return None

    skills_raw = row["skills"]
    if isinstance(skills_raw, str):
        skills = [s.strip() for s in skills_raw.strip("{}").split(",") if s.strip()]
    elif isinstance(skills_raw, list):
        skills = skills_raw
    else:
        skills = []

    return {
        "full_name": row["full_name"] or "",
        "job_title": row["job_title"] or "",
        "company": row["company"] or "",
        "seniority": row["seniority"] or "",
        "skills": skills,
        "bio": row["bio"] or "",
        "resume_text": row["resume_text"] or "",
    }


async def generate_outreach_message(
    seeker_id: str,
    referrer_id: str,
    job_context: str | None = None,
) -> tuple[bool, str | None, str | None]:
    """
    Generate a personalized outreach message for a referral request.

    Returns:
        (success, message, error)
    """
    try:
        seeker = await _fetch_profile(seeker_id)
        referrer = await _fetch_profile(referrer_id)

        if not seeker:
            return False, None, f"Seeker profile not found: {seeker_id}"
        if not referrer:
            return False, None, f"Referrer profile not found: {referrer_id}"

        retrieved_context = await _retrieve_relevant_context(seeker, referrer, job_context, top_k=4)
        outcome_patterns = await get_outcome_patterns()
        outcome_signals = (
            str(outcome_patterns.get("averages_by_outcome", {}))
            if outcome_patterns
            else "No historical outcomes available yet."
        )

        prompt = _build_outreach_prompt(
            seeker=seeker,
            referrer=referrer,
            job_context=job_context or "General referral request",
            retrieved_context=retrieved_context,
            outcome_signals=outcome_signals,
        )

        message = await generate(prompt)

        # One corrective retry if the draft sounds like a third-person bio instead of a direct message.
        if _has_third_person_self_reference(message, seeker.get("full_name", "")):
            correction = (
                "\n\nYour previous draft used third-person wording for the seeker. "
                "Rewrite now in strict first person from the seeker to the referrer. "
                "Do not mention the seeker name in the body text."
            )
            message = await generate(prompt + correction)

        logger.info(
            "outreach.generated",
            seeker_id=seeker_id,
            referrer_id=referrer_id,
            retrieved_context_count=len(retrieved_context),
            word_count=len(message.split()),
        )

        return True, message.strip(), None

    except Exception as exc:
        logger.exception("outreach.failed", error=str(exc))
        seeker_name = seeker.get("full_name", "") if isinstance(seeker, dict) else ""
        referrer_name = referrer.get("full_name", "") if isinstance(referrer, dict) else ""
        company = referrer.get("company", "") if isinstance(referrer, dict) else ""
        shared_skills = []
        if isinstance(seeker, dict) and isinstance(referrer, dict):
            seeker_skills = {s.lower() for s in seeker.get("skills", [])}
            referrer_skills = {s.lower() for s in referrer.get("skills", [])}
            shared_skills = sorted(seeker_skills & referrer_skills)

        fallback_message = _build_outreach_fallback(
            seeker_name=seeker_name,
            referrer_name=referrer_name,
            company=company,
            shared_skills=shared_skills,
        )
        return False, fallback_message, str(exc)
