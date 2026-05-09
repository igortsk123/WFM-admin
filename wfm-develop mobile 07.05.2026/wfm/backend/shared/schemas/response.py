"""
Стандартизированные модели ответов WFM API.

Формат соответствует Beyond Violet API:
- Успех: {"status": {"code": ""}, "data": {...}}
- Ошибка: {"status": {"code": "ERROR_CODE", "message": "..."}}

HTTP статус всегда 200, логика определяется по status.code.
"""

from typing import TypeVar, Generic, Optional
from pydantic import BaseModel, Field


# Коды ошибок
class ErrorCode:
    """Константы кодов ошибок."""
    SUCCESS = ""  # Пустая строка = успех
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    FORBIDDEN = "FORBIDDEN"
    UNAUTHORIZED = "UNAUTHORIZED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TASKS_IN_PROGRESS = "TASKS_IN_PROGRESS"
    TASKS_PAUSED = "TASKS_PAUSED"


class StatusSchema(BaseModel):
    """
    Схема статуса ответа.

    Успех: {"code": ""}
    Ошибка: {"code": "ERROR_CODE", "message": "Описание ошибки"}
    """
    code: str = Field(default="", description="Код статуса. Пустая строка = успех")
    message: Optional[str] = Field(default=None, description="Сообщение об ошибке")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"code": ""},
                {"code": "NOT_FOUND", "message": "Задача не найдена"}
            ]
        }
    }


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Универсальная обёртка ответа API.

    Успех: {"status": {"code": ""}, "data": {...}}
    Ошибка: {"status": {"code": "ERROR", "message": "..."}}

    data всегда объект. Для списков используется именованный массив внутри:
    {"status": {"code": ""}, "data": {"tasks": [...]}}
    """
    status: StatusSchema = Field(default_factory=lambda: StatusSchema(code=""))
    data: Optional[T] = Field(default=None, description="Данные ответа")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": {"code": ""},
                    "data": {}
                },
                {
                    "status": {"code": "NOT_FOUND", "message": "Ресурс не найден"},
                    "data": None
                }
            ]
        }
    }


def ok(data: T) -> ApiResponse[T]:
    """
    Создаёт успешный ответ.

    Args:
        data: Данные для возврата (объект или модель со списком)

    Returns:
        ApiResponse с status.code = "" и переданными данными

    Example:
        return ok(TaskResponse.model_validate(task))
        return ok(TaskListData(tasks=[...]))
    """
    return ApiResponse(
        status=StatusSchema(code=ErrorCode.SUCCESS),
        data=data
    )


def error(code: str, message: str) -> ApiResponse[None]:
    """
    Создаёт ответ с ошибкой.

    Args:
        code: Код ошибки (из ErrorCode)
        message: Человекочитаемое описание ошибки

    Returns:
        ApiResponse с status.code и message, без data

    Example:
        return error(ErrorCode.NOT_FOUND, "Задача не найдена")
    """
    return ApiResponse(
        status=StatusSchema(code=code, message=message),
        data=None
    )
