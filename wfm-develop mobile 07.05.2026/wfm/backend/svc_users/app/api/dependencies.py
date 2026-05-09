"""
Service-специфичные dependency функции для svc_users.

get_current_user переопределяет базовую shared версию: дополнительно
резолвит sso_id → internal integer user_id через запрос к локальной БД.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.user_repository import UserRepository
from shared.auth import validate_token_and_get_sso_id, CurrentUser
from shared.exceptions import UnauthorizedException
from app.core import analytics

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Dependency для svc_users: извлекает CurrentUser из JWT и резолвит
    integer user_id через lookup по sso_id в локальной таблице users.

    При первом входе пользователя — создаёт запись в таблице users.

    Если в запросе присутствует хидер X-Auth-By и у пользователя есть флаг
    flags.dev=true в JWT — разрешает impersonation: ищет пользователя по
    номеру телефона из хидера вместо sso_id.
    """
    if not credentials:
        raise UnauthorizedException("Требуется токен авторизации")

    sso_id_str, token_exp, is_dev = validate_token_and_get_sso_id(credentials.credentials)
    repo = UserRepository(db)

    impersonation_phone = request.headers.get("X-Auth-By", "").strip()
    if impersonation_phone and is_dev:
        impersonated = repo.get_user_by_phone(impersonation_phone)
        if impersonated:
            logger.info(
                f"Impersonation: dev_sso_id={sso_id_str} вошёл под user_id={impersonated.id} "
                f"(phone={impersonation_phone})"
            )
            return CurrentUser(
                sso_id=sso_id_str,
                user_id=impersonated.id,
                token_exp=token_exp,
                is_dev=True,
            )
        logger.warning(
            f"Impersonation: телефон {impersonation_phone} не найден, "
            f"используем оригинальный пользователь sso_id={sso_id_str}"
        )

    sso_id = UUID(sso_id_str)
    user, is_new = repo.get_or_create_user_by_sso(sso_id)
    if is_new:
        analytics.track("user_registered", user_id=str(user.id))
    return CurrentUser(sso_id=sso_id_str, user_id=user.id, token_exp=token_exp, is_dev=is_dev)
