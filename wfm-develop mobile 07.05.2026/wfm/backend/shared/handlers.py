"""
Глобальные exception handlers для FastAPI.

Преобразуют все исключения в стандартный формат ответа Beyond Violet:
{"status": {"code": "ERROR_CODE", "message": "..."}}

HTTP статус всегда 200.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from .exceptions import ApiException
from .schemas.response import ErrorCode

logger = logging.getLogger(__name__)


async def api_exception_handler(request: Request, exc: ApiException) -> JSONResponse:
    """
    Handler для ApiException и его наследников.

    Возвращает HTTP 200 с телом:
    {"status": {"code": "ERROR_CODE", "message": "..."}}
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": {
                "code": exc.code,
                "message": exc.message
            }
        }
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handler для ошибок валидации Pydantic/FastAPI.

    Преобразует детали валидации в человекочитаемое сообщение.
    """
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        loc = " -> ".join(str(x) for x in first_error.get("loc", []))
        msg = first_error.get("msg", "Ошибка валидации")
        message = f"{loc}: {msg}" if loc else msg
    else:
        message = "Ошибка валидации запроса"

    return JSONResponse(
        status_code=200,
        content={
            "status": {
                "code": ErrorCode.VALIDATION_ERROR,
                "message": message
            }
        }
    )


async def pydantic_validation_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handler для ошибок валидации Pydantic моделей."""
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        loc = " -> ".join(str(x) for x in first_error.get("loc", []))
        msg = first_error.get("msg", "Ошибка валидации")
        message = f"{loc}: {msg}" if loc else msg
    else:
        message = "Ошибка валидации данных"

    return JSONResponse(
        status_code=200,
        content={
            "status": {
                "code": ErrorCode.VALIDATION_ERROR,
                "message": message
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler для всех непредвиденных исключений.

    Логирует полную ошибку, но возвращает общее сообщение клиенту.
    """
    logger.exception(f"Unhandled exception: {exc}")

    return JSONResponse(
        status_code=200,
        content={
            "status": {
                "code": ErrorCode.INTERNAL_ERROR,
                "message": "Внутренняя ошибка сервера"
            }
        }
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Регистрирует все exception handlers в FastAPI приложении.

    Args:
        app: Экземпляр FastAPI приложения

    Example:
        from shared import register_exception_handlers

        app = FastAPI()
        register_exception_handlers(app)
    """
    app.add_exception_handler(ApiException, api_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
