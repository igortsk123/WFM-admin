from typing import Optional

from fastapi import HTTPException, Query, Request, status

from app.core.config import settings


def _extract_bearer(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def verify_device_token_value(token: Optional[str]) -> bool:
    expected = settings.DEVICE_TOKEN
    if not expected:
        # Сервис не сконфигурирован — отказываем всем, чтобы не открыть API случайно
        return False
    return bool(token) and token == expected


def require_device_token(
    request: Request,
    token: Optional[str] = Query(default=None),
) -> None:
    """FastAPI dependency для HTTP-эндпоинтов устройства."""
    candidate = token or _extract_bearer(request.headers.get("authorization"))
    if not verify_device_token_value(candidate):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing device token",
        )
