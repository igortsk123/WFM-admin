"""
Модуль аутентификации и авторизации на основе JWT.

Проверяет bearer токены, выданные сервисом Beyond Violet,
и извлекает данные о пользователе из подписанного RS256 JWT.

Общий модуль для всех сервисов WFM. Публичный ключ загружается
из файла bv_public_key.pem, расположенного рядом с этим модулем.

CurrentUser содержит:
- sso_id: str  — UUID из JWT (поле 'u'), используется для маппинга
- user_id: int — internal integer ID из таблицы users (резолвится per-service)
"""

import logging
import os
from pathlib import Path
from typing import Optional, Tuple, NamedTuple
from datetime import datetime, timezone

import jwt
from fastapi import Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .exceptions import UnauthorizedException


logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

_SHARED_DIR = Path(__file__).parent
_DEFAULT_PEM_FILENAME = "bv_public_key.pem"
_DEFAULT_CLOCK_SKEW = 60


class TokenValidationError(Exception):
    """Базовое исключение для ошибок валидации токена"""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class CurrentUser:
    """Объект текущего пользователя, извлечённый из JWT.

    Атрибуты:
        sso_id: UUID строка из JWT (поле 'u') — идентификатор во внешней SSO системе
        user_id: internal integer ID из таблицы users — резолвится per-service dependency
        token_exp: время истечения токена
        is_manager: True если роль пользователя — manager (резолвится через svc_users)
        is_dev: True если JWT содержит flags.dev=true — разрешён режим impersonation
    """

    def __init__(
        self,
        sso_id: str,
        user_id: int,
        token_exp: datetime,
        is_manager: bool = False,
        is_dev: bool = False,
    ):
        self.sso_id = sso_id
        self.user_id = user_id
        self.token_exp = token_exp
        self.is_manager = is_manager
        self.is_dev = is_dev

    def __repr__(self):
        return f"CurrentUser(sso_id={self.sso_id}, user_id={self.user_id}, is_manager={self.is_manager}, is_dev={self.is_dev})"


def _load_public_key() -> str:
    """
    Загружает публичный ключ RS256 для валидации JWT.

    Порядок приоритетов:
    1. Переменная окружения BV_PUBLIC_KEY (прямое значение ключа)
    2. Файл по пути из переменной окружения BV_PUBLIC_KEY_PATH
    3. Файл bv_public_key.pem в директории shared/
    """
    # 1. Прямое значение из ENV
    key_from_env = os.environ.get("BV_PUBLIC_KEY", "").strip()
    if key_from_env:
        logger.info("Публичный ключ загружен из переменной окружения BV_PUBLIC_KEY")
        return key_from_env

    # 2. Путь из ENV
    key_path_from_env = os.environ.get("BV_PUBLIC_KEY_PATH", "").strip()
    if key_path_from_env:
        path = Path(key_path_from_env)
        if path.exists():
            content = path.read_text().strip()
            if content:
                logger.info(f"Публичный ключ загружен из {path}")
                return content

    # 3. Файл рядом с модулем (shared/bv_public_key.pem)
    default_path = _SHARED_DIR / _DEFAULT_PEM_FILENAME
    if default_path.exists():
        content = default_path.read_text().strip()
        if content:
            logger.info(f"Публичный ключ загружен из {default_path}")
            return content

    raise RuntimeError(
        "Публичный ключ Beyond Violet не найден. "
        "Укажите BV_PUBLIC_KEY, BV_PUBLIC_KEY_PATH или поместите bv_public_key.pem в shared/"
    )


_public_key: Optional[str] = None


def _get_public_key() -> str:
    """Ленивая загрузка публичного ключа (singleton)."""
    global _public_key
    if _public_key is None:
        _public_key = _load_public_key()
    return _public_key


def _get_clock_skew() -> int:
    """Возвращает допустимую рассинхронизацию часов (в секундах)."""
    try:
        return int(os.environ.get("JWT_CLOCK_SKEW", _DEFAULT_CLOCK_SKEW))
    except (ValueError, TypeError):
        return _DEFAULT_CLOCK_SKEW


def validate_jwt_token(token: str) -> dict:
    """
    Валидация JWT токена с проверкой подписи RS256.

    Args:
        token: JWT токен без префикса "Bearer"

    Returns:
        dict: Декодированный payload токена

    Raises:
        TokenValidationError: При ошибках валидации токена
    """
    try:
        payload = jwt.decode(
            token,
            _get_public_key(),
            algorithms=["RS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "require_exp": True,
            },
            leeway=_get_clock_skew()
        )

        if not payload.get("u"):
            raise TokenValidationError(
                "token_invalid",
                "Отсутствует обязательное поле 'u' (user_id) в токене"
            )

        return payload

    except jwt.ExpiredSignatureError:
        logger.warning("JWT токен истёк")
        raise TokenValidationError(
            "token_expired",
            "Токен истёк, требуется обновление"
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Невалидный JWT токен: {type(e).__name__}")
        raise TokenValidationError(
            "token_invalid",
            "Невалидный токен"
        )
    except TokenValidationError:
        raise
    except Exception as e:
        logger.error(f"Ошибка при валидации токена: {e}")
        raise TokenValidationError(
            "token_invalid",
            "Ошибка валидации токена"
        )


def validate_token_and_get_sso_id(token: str) -> Tuple[str, datetime, bool]:
    """
    Валидирует JWT токен и возвращает (sso_id, token_exp, is_dev).

    Используется сервис-специфичными dependency для получения sso_id,
    который затем резолвится в internal integer user_id.

    Args:
        token: JWT токен без префикса "Bearer"

    Returns:
        Tuple[str, datetime, bool]: (sso_uuid_str, token_exp, is_dev)
            is_dev — True если JWT содержит flags.dev=true (режим impersonation)

    Raises:
        UnauthorizedException: При ошибках валидации токена
    """
    try:
        payload = validate_jwt_token(token)
        sso_id = payload["u"]
        exp_timestamp = payload["exp"]
        token_exp = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        flags = payload.get("flags") or {}
        is_dev = bool(flags.get("dev", False))
        return sso_id, token_exp, is_dev
    except TokenValidationError as e:
        logger.warning(f"Ошибка валидации токена: {e.code}")
        raise UnauthorizedException(e.message)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> CurrentUser:
    """
    Базовая dependency для извлечения текущего пользователя из JWT.

    Возвращает CurrentUser с заполненным sso_id, но user_id = 0.
    Сервисы должны переопределять эту dependency для резолвинга integer user_id.

    Для svc_users: см. app/api/dependencies.py (DB lookup по sso_id)
    Для svc_tasks/svc_shifts: добавить HTTP lookup к svc_users internal endpoint

    Используется в защищённых эндпоинтах:
        @router.get("/tasks")
        def get_tasks(current_user: CurrentUser = Depends(get_current_user)):
            ...
    """
    if not credentials:
        logger.warning("Запрос без токена авторизации")
        raise UnauthorizedException("Требуется токен авторизации")

    sso_id, token_exp, is_dev = validate_token_and_get_sso_id(credentials.credentials)
    return CurrentUser(sso_id=sso_id, user_id=0, token_exp=token_exp, is_dev=is_dev)
