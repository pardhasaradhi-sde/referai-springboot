"""Embedding service — generates 768-dim vectors via Gemini."""

from __future__ import annotations

import hashlib
import json

from google import genai

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.redis import get_redis_client
from app.services.gemini_client import _get_client

logger = get_logger(__name__)

# Must match pgvector schema in migrations (profiles.embedding vector(768)).
EMBEDDING_DIMENSIONS = 768
_CACHE_TTL = 60 * 60 * 24  # 24 hours
_CACHE_PREFIX = "emb:"


def _cache_key(text: str, task_type: str) -> str:
    digest = hashlib.sha256(f"{task_type}:{text}".encode()).hexdigest()[:24]
    return f"{_CACHE_PREFIX}{digest}"


async def _get_cached(key: str) -> list[float] | None:
    redis = get_redis_client()
    if redis is None:
        return None
    try:
        raw = await redis.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _set_cached(key: str, embedding: list[float]) -> None:
    redis = get_redis_client()
    if redis is None:
        return
    try:
        await redis.setex(key, _CACHE_TTL, json.dumps(embedding))
    except Exception:
        pass



async def embed_text(text: str) -> list[float]:
    """Generate a 768-dimension embedding for a single text (document storage)."""
    client = _get_client()
    settings = get_settings()

    logger.info("embedding.generate.start", text_len=len(text), model=settings.gemini_embedding_model)

    response = await client.aio.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
        config=genai.types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    embedding: list[float] = response.embeddings[0].values
    logger.info("embedding.generate.done", dimensions=len(embedding))
    return embedding


async def embed_query(text: str) -> list[float]:
    """Generate a 768-dimension embedding for a search query (Redis cached)."""
    key = _cache_key(text, "RETRIEVAL_QUERY")
    cached = await _get_cached(key)
    if cached is not None:
        return cached

    client = _get_client()
    settings = get_settings()

    response = await client.aio.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
        config=genai.types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    embedding = response.embeddings[0].values
    await _set_cached(key, embedding)
    return embedding


async def embed_batch(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Generate embeddings for multiple texts (per-item Redis cache)."""
    keys = [_cache_key(t, task_type) for t in texts]

    # Check cache for each item
    results: list[list[float] | None] = [await _get_cached(k) for k in keys]
    miss_indices = [i for i, r in enumerate(results) if r is None]

    if miss_indices:
        client = _get_client()
        settings = get_settings()
        miss_texts = [texts[i] for i in miss_indices]

        logger.info("embedding.batch.start", count=len(miss_texts), cached=len(texts) - len(miss_indices))

        response = await client.aio.models.embed_content(
            model=settings.gemini_embedding_model,
            contents=miss_texts,
            config=genai.types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )
        fresh = [e.values for e in response.embeddings]

        for idx, emb in zip(miss_indices, fresh):
            results[idx] = emb
            await _set_cached(keys[idx], emb)

    return results  # type: ignore[return-value]
