from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if request.url.path.startswith("/api/"):
            settings = get_settings()
            incoming = request.headers.get("X-Internal-Key")
            if not incoming or incoming != settings.internal_api_key:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Invalid or missing internal API key",
                        }
                    },
                )

        return await call_next(request)
