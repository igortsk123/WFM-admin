"""
Custom exception классы для WFM API.

Все исключения наследуются от ApiException и автоматически
преобразуются в стандартный формат ответа через exception handler.
"""

from .schemas.response import ErrorCode


class ApiException(Exception):
    """
    Базовый класс для всех API исключений.

    Attributes:
        code: Код ошибки (из ErrorCode)
        message: Человекочитаемое описание ошибки
    """

    def __init__(self, message: str, code: str = ErrorCode.INTERNAL_ERROR):
        self.code = code
        self.message = message
        super().__init__(message)


class NotFoundException(ApiException):
    """Ресурс не найден (аналог HTTP 404)."""

    def __init__(self, message: str = "Ресурс не найден"):
        super().__init__(message=message, code=ErrorCode.NOT_FOUND)


class ConflictException(ApiException):
    """Конфликт состояния (аналог HTTP 409)."""

    def __init__(self, message: str = "Конфликт состояния"):
        super().__init__(message=message, code=ErrorCode.CONFLICT)


class ForbiddenException(ApiException):
    """Доступ запрещён (аналог HTTP 403)."""

    def __init__(self, message: str = "Доступ запрещён"):
        super().__init__(message=message, code=ErrorCode.FORBIDDEN)


class UnauthorizedException(ApiException):
    """Не авторизован (аналог HTTP 401)."""

    def __init__(self, message: str = "Не авторизован"):
        super().__init__(message=message, code=ErrorCode.UNAUTHORIZED)


class ValidationException(ApiException):
    """Ошибка валидации (аналог HTTP 422)."""

    def __init__(self, message: str = "Ошибка валидации"):
        super().__init__(message=message, code=ErrorCode.VALIDATION_ERROR)


class InternalErrorException(ApiException):
    """Внутренняя ошибка сервера (аналог HTTP 500)."""

    def __init__(self, message: str = "Внутренняя ошибка сервера"):
        super().__init__(message=message, code=ErrorCode.INTERNAL_ERROR)


class ServiceUnavailableException(ApiException):
    """Внешний сервис недоступен (аналог HTTP 503)."""

    def __init__(self, message: str = "Сервис временно недоступен"):
        super().__init__(message=message, code=ErrorCode.SERVICE_UNAVAILABLE)
