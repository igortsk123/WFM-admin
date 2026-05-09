# Shared модуль для общих компонентов WFM API
# Стандартизированный формат ответов по аналогии с Beyond Violet API

from .schemas.response import (
    StatusSchema,
    ApiResponse,
    ok,
    error,
)
from .exceptions import (
    ApiException,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
    ValidationException,
    InternalErrorException,
    ServiceUnavailableException,
)
from .handlers import register_exception_handlers
from .auth import (
    TokenValidationError,
    CurrentUser,
    validate_jwt_token,
    get_current_user,
)
from .lama_client import LamaClient, LAMA_TO_WFM_STATUS, WFM_TO_LAMA_STATUS
from .monitoring_client import (
    MonitoringClient,
    init_monitoring_client,
    get_monitoring_client,
    shutdown_monitoring_client,
)

__all__ = [
    # Response schemas
    "StatusSchema",
    "ApiResponse",
    "ok",
    "error",
    # Exceptions
    "ApiException",
    "NotFoundException",
    "ConflictException",
    "ForbiddenException",
    "UnauthorizedException",
    "ValidationException",
    "InternalErrorException",
    "ServiceUnavailableException",
    # Handlers
    "register_exception_handlers",
    # Auth
    "TokenValidationError",
    "CurrentUser",
    "validate_jwt_token",
    "get_current_user",
    # LAMA
    "LamaClient",
    "LAMA_TO_WFM_STATUS",
    "WFM_TO_LAMA_STATUS",
    # Monitoring
    "MonitoringClient",
    "init_monitoring_client",
    "get_monitoring_client",
    "shutdown_monitoring_client",
]
