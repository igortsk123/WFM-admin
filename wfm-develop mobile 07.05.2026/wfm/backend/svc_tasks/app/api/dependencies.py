"""
Service-специфичные dependency функции для svc_tasks.

get_current_user переопределяет базовую shared версию: дополнительно
резолвит sso_id → internal integer user_id через HTTP запрос к svc_users.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import Optional

from fastapi import Depends, Query, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.users_client import UsersServiceClient, get_users_service_client
from shared.auth import validate_token_and_get_sso_id, CurrentUser
from shared.exceptions import UnauthorizedException

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    assignment_id: Optional[int] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    users_client: UsersServiceClient = Depends(get_users_service_client),
) -> CurrentUser:
    """
    Dependency для svc_tasks: извлекает CurrentUser из JWT и резолвит
    integer user_id через HTTP запрос к svc_users /internal/id-by-sso.

    Роль определяется по assignment_id из query params — это позволяет
    корректно обрабатывать пользователей с несколькими назначениями (например,
    worker в одном магазине и manager в другом). Если assignment_id не передан,
    is_manager = False.

    Если в запросе присутствует хидер X-Auth-By и у пользователя есть флаг
    flags.dev=true в JWT — разрешает impersonation: использует user_id по
    номеру телефона из хидера. Роль определяется по assignment_id из запроса.
    """
    if not credentials:
        raise UnauthorizedException("Требуется токен авторизации")

    sso_id, token_exp, is_dev = validate_token_and_get_sso_id(credentials.credentials)

    impersonation_phone = request.headers.get("X-Auth-By", "").strip()
    if impersonation_phone and is_dev:
        impersonated_id = await users_client.get_int_user_id_by_phone(impersonation_phone)
        if impersonated_id is not None:
            logger.info(
                f"Impersonation: dev_sso_id={sso_id} вошёл под user_id={impersonated_id} "
                f"(phone={impersonation_phone})"
            )
            is_manager = await users_client.get_user_role(assignment_id) if assignment_id else False
            return CurrentUser(
                sso_id=sso_id,
                user_id=impersonated_id,
                token_exp=token_exp,
                is_manager=is_manager,
                is_dev=True,
            )
        logger.warning(
            f"Impersonation: телефон {impersonation_phone!r} не найден, "
            f"используем оригинальный пользователь sso_id={sso_id}"
        )

    user_id = await users_client.get_int_user_id(sso_id)
    if user_id is None:
        logger.warning(f"Не удалось резолвить integer user_id для sso_id={sso_id}, используем 0")
        user_id = 0

    is_manager = await users_client.get_user_role(assignment_id) if assignment_id else False

    return CurrentUser(sso_id=sso_id, user_id=user_id, token_exp=token_exp, is_manager=is_manager, is_dev=is_dev)
