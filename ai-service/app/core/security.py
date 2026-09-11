"""API-key authentication for internal calls between the backend and AI service."""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from app.core.config import settings

API_KEY_HEADER = "X-AI-Key"


def require_api_key(
    x_ai_key: str | None = Header(default=None, alias=API_KEY_HEADER),
) -> None:
    """Reject requests unless ``X-AI-Key`` matches the configured internal API key.

    When ``AI_API_KEY`` is unset (e.g. local development), authentication is
    disabled to keep the sandbox easy to run.
    """
    expected = settings.api_key
    if expected is None:
        return
    if not x_ai_key or not hmac.compare_digest(x_ai_key.strip(), expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )