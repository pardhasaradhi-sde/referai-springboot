"""Gemini client helper used only for embeddings."""

from __future__ import annotations

from google import genai

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return (or create) the singleton Gemini client."""
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning("gemini.not_configured", reason="GEMINI_API_KEY not set")
        raise RuntimeError("GEMINI_API_KEY not set")

    _client = genai.Client(api_key=settings.gemini_api_key)
    logger.info("gemini.configured_for_embeddings", model=settings.gemini_embedding_model)
    return _client


def _ensure_configured() -> None:
    """Ensure the Gemini embedding client is initialized. Called at startup."""
    try:
        _get_client()
    except RuntimeError:
        pass
