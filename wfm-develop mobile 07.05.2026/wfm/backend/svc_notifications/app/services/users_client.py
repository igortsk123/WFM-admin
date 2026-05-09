"""
HTTP-клиент для svc_users.
Используется для резолвинга user_id из sso_id и получения роли пользователя.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Простой in-memory кэш: sso_id → user_id
_user_id_cache: dict[str, int] = {}
_role_cache: dict[int, bool] = {}


class UsersServiceClient:
    def __init__(self):
        self.base_url = settings.USERS_SERVICE_URL
        self.timeout = settings.USERS_SERVICE_TIMEOUT

    async def get_int_user_id(self, sso_id: str) -> Optional[int]:
        """Получить внутренний int ID пользователя по sso_id из JWT."""
        if sso_id in _user_id_cache:
            return _user_id_cache[sso_id]
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/users/internal/id-by-sso",
                    params={"sso_id": sso_id},
                )
                response.raise_for_status()
                data = response.json()
                user_id = data["data"]["id"]
                _user_id_cache[sso_id] = user_id
                return user_id
        except Exception as e:
            logger.error(f"UsersClient: ошибка запроса user_id для sso_id={sso_id}: {e}")
        return None

    async def get_user_role(self, user_id: int) -> bool:
        """Вернуть True если пользователь — менеджер."""
        if user_id in _role_cache:
            return _role_cache[user_id]
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/users/internal/user-role",
                    params={"user_id": user_id},
                )
                response.raise_for_status()
                data = response.json()
                is_manager = data["data"].get("is_manager", False)
                _role_cache[user_id] = is_manager
                return is_manager
        except Exception as e:
            logger.error(f"UsersClient: ошибка запроса роли для user_id={user_id}: {e}")
        return False


def get_users_service_client() -> UsersServiceClient:
    return UsersServiceClient()
