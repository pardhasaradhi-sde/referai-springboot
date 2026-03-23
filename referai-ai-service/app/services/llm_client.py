"""Groq LLM client used for all generation and streaming tasks."""

from __future__ import annotations

import json
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Return (or create) the singleton Groq client."""
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.groq_api_key:
        logger.warning("groq.not_configured", reason="GROQ_API_KEY not set")
        raise RuntimeError("GROQ_API_KEY not set")

    _client = AsyncOpenAI(
        api_key=settings.groq_api_key,
        base_url=settings.groq_base_url,
    )
    logger.info("groq.configured", model=settings.groq_model, base_url=settings.groq_base_url)
    return _client


def _ensure_configured() -> None:
    """Ensure the Groq client is initialized at startup."""
    try:
        _get_client()
    except RuntimeError:
        pass


async def generate(
    prompt: str,
    *,
    json_mode: bool = False,
    system_prompt: str | None = None,
) -> str:
    """Single Groq call. Returns raw text (or JSON string when json_mode=True)."""
    settings = get_settings()
    client = _get_client()

    logger.info("groq.generate.start", prompt_len=len(prompt), json_mode=json_mode)

    effective_prompt = prompt
    if json_mode:
        effective_prompt = (
            "Return ONLY valid JSON. Do not include code fences or extra narration.\n\n"
            + prompt
        )

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": effective_prompt})

    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2 if json_mode else 0.7,
    )

    text = (response.choices[0].message.content or "").strip()

    # Strip fences if model still returns them.
    if text.startswith("```json"):
        text = text.removeprefix("```json").removesuffix("```").strip()
    elif text.startswith("```"):
        text = text.removeprefix("```").removesuffix("```").strip()

    logger.info("groq.generate.done", response_len=len(text))
    return text


async def generate_json(prompt: str) -> dict | list:
    """Groq call that parses the response as JSON."""
    raw = await generate(prompt, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        candidate = _extract_json_substring(raw)
        if candidate:
            return json.loads(candidate)
        raise


def _extract_json_substring(raw: str) -> str | None:
    """Extract the first balanced JSON object or array from a raw LLM string."""
    if not raw:
        return None

    start_candidates = [idx for idx in (raw.find("{"), raw.find("[")) if idx >= 0]
    if not start_candidates:
        return None

    start = min(start_candidates)
    opening = raw[start]
    closing = "}" if opening == "{" else "]"

    depth = 0
    in_string = False
    escaped = False

    for idx in range(start, len(raw)):
        ch = raw[idx]

        if in_string:
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == opening:
            depth += 1
        elif ch == closing:
            depth -= 1
            if depth == 0:
                return raw[start:idx + 1]

    return None


async def generate_stream(prompt: str) -> AsyncGenerator[str, None]:
    """Streaming Groq call — yields text chunks."""
    settings = get_settings()
    client = _get_client()

    logger.info("groq.stream.start", prompt_len=len(prompt))

    stream = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        stream=True,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content

    logger.info("groq.stream.done")
