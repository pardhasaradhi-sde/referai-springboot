"""Referrer profile indexing service — embeds and stores in pgvector."""

from __future__ import annotations

from app.core.logging import get_logger
from app.db.postgres import get_postgres_pool
from app.services.embedding_service import embed_text

logger = get_logger(__name__)


def _build_profile_text(
    bio: str | None,
    skills: list[str],
    job_title: str | None,
    company: str | None,
    department: str | None,
    seniority: str | None,
    years_of_experience: int | None,
) -> str:
    """Combine profile fields into a rich text for embedding."""
    parts: list[str] = []

    if job_title:
        parts.append(f"Role: {job_title}")
    if company:
        parts.append(f"Company: {company}")
    if department:
        parts.append(f"Department: {department}")
    if seniority:
        parts.append(f"Seniority: {seniority}")
    if years_of_experience is not None:
        parts.append(f"Years of experience: {years_of_experience}")
    if skills:
        parts.append(f"Skills: {', '.join(skills)}")
    if bio:
        parts.append(f"About: {bio}")

    return "\n".join(parts) if parts else "No profile information available"


async def index_referrer_profile(
    referrer_id: str,
    bio: str | None,
    skills: list[str],
    job_title: str | None,
    company: str | None,
    department: str | None = None,
    seniority: str | None = None,
    years_of_experience: int | None = None,
) -> tuple[bool, int | None, str | None]:
    """
    Embed a referrer profile and store the vector in pgvector.

    Returns:
        (success, embedding_dimensions, error_message)
    """
    pool = get_postgres_pool()
    if pool is None:
        return False, None, "Database not initialized"

    try:
        profile_text = _build_profile_text(
            bio, skills, job_title, company, department, seniority, years_of_experience
        )

        logger.info(
            "indexing.embed.start",
            referrer_id=referrer_id,
            text_len=len(profile_text),
        )

        embedding = await embed_text(profile_text)
        dims = len(embedding)

        # Convert to pgvector-compatible string format
        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE profiles SET embedding = $1::vector WHERE id = $2::uuid",
                embedding_str,
                referrer_id,
            )

        logger.info(
            "indexing.embed.done",
            referrer_id=referrer_id,
            dimensions=dims,
        )

        return True, dims, None

    except Exception as exc:
        logger.exception("indexing.embed.failed", referrer_id=referrer_id, error=str(exc))
        return False, None, str(exc)
