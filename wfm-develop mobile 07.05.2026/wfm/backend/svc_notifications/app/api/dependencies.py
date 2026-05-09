"""
Dependency функции для svc_notifications.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import Optional

from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared.auth import validate_token_and_get_sso_id, CurrentUser
from shared.exceptions import UnauthorizedException
from app.services.users_client import UsersServiceClient, get_users_service_client

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    users_client: UsersServiceClient = Depends(get_users_service_client),
) -> CurrentUser:
    """
    Извлекает CurrentUser из JWT и резолвит integer user_id через svc_users.
    """
    if not credentials:
        raise UnauthorizedException("Требуется токен авторизации")

    sso_id, token_exp, is_dev = validate_token_and_get_sso_id(credentials.credentials)

    user_id = await users_client.get_int_user_id(sso_id)
    if user_id is None:
        logger.warning(f"Не удалось резолвить integer user_id для sso_id={sso_id}")
        user_id = 0

    is_manager = await users_client.get_user_role(user_id) if user_id else False

    return CurrentUser(
        sso_id=sso_id,
        user_id=user_id,
        token_exp=token_exp,
        is_manager=is_manager,
        is_dev=is_dev,
    )
