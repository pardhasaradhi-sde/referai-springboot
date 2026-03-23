"""Embedding service — generates 768-dim vectors via Gemini."""

from __future__ import annotations

from google import genai

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.gemini_client import _get_client

logger = get_logger(__name__)

# Must match pgvector schema in migrations (profiles.embedding vector(768)).
EMBEDDING_DIMENSIONS = 768


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
    """Generate a 768-dimension embedding for a search query."""
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

    return response.embeddings[0].values


async def embed_batch(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Generate embeddings for multiple texts."""
    client = _get_client()
    settings = get_settings()

    logger.info("embedding.batch.start", count=len(texts), model=settings.gemini_embedding_model)

    response = await client.aio.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=texts,
        config=genai.types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    embeddings = [e.values for e in response.embeddings]
    logger.info("embedding.batch.done", count=len(embeddings))
    return embeddings
