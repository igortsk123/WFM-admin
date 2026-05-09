"""
Клиент для взаимодействия с svc_users internal endpoint.
Используется для резолвинга SSO UUID → internal integer user_id.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
import threading
import time
from typing import Optional

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# TTL кэша для назначений сотрудников магазина (меняются не чаще раза в день)
_STORE_ASSIGNMENTS_TTL = 300  # 5 минут


class UsersServiceClient:
    """Клиент svc_users для получения integer user_id по SSO UUID.

    Кэширует маппинг sso_id → int и assignment_id → is_manager в памяти (thread-safe dict).
    Назначения магазина кэшируются на 5 минут — они меняются не чаще раза в день.
    Кэш сбрасывается при перезапуске сервиса — для MVP приемлемо.
    """

    def __init__(self):
        self.base_url = settings.USERS_SERVICE_URL
        self.timeout = settings.USERS_SERVICE_TIMEOUT
        self._sso_cache: dict[str, int] = {}
        self._role_cache: dict[int, bool] = {}  # assignment_id → is_manager
        self._assignments_cache: dict[int, tuple[list[dict], float]] = {}  # assignment_id → (data, expires_at)
        self._lock = threading.Lock()
        # Persistent client — переиспользуем TCP-соединение вместо нового на каждый запрос
        self._http_client = httpx.AsyncClient(timeout=self.timeout)

    async def get_int_user_id(self, sso_id: str) -> Optional[int]:
        """
        Получить integer user_id по SSO UUID.

        Сначала проверяет in-memory кэш. При промахе делает HTTP запрос
        к GET /users/internal/id-by-sso?sso_id=<uuid>.

        Args:
            sso_id: UUID строка из JWT (поле 'u')

        Returns:
            integer user_id или None при ошибке
        """
        with self._lock:
            if sso_id in self._sso_cache:
                return self._sso_cache[sso_id]

        try:
            response = await self._http_client.get(
                f"{self.base_url}/users/internal/id-by-sso",
                params={"sso_id": sso_id},
            )
            response.raise_for_status()
            data = response.json()
            int_id = data["data"]["id"]

            with self._lock:
                self._sso_cache[sso_id] = int_id

            return int_id

        except Exception as e:
            logger.error(f"Не удалось получить integer user_id для sso_id={sso_id}: {e}")
            return None

    async def get_int_user_id_by_phone(self, phone: str) -> Optional[int]:
        """
        Получить integer user_id по номеру телефона (для impersonation).

        Вызывает GET /users/internal/id-by-phone?phone=<phone>.
        Не кэшируется — разработчик может менять номер в любой момент.

        Args:
            phone: Номер телефона пользователя (из хидера X-Auth-By)

        Returns:
            integer user_id или None если пользователь не найден
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/users/internal/id-by-phone",
                params={"phone": phone},
            )
            if response.status_code == 404:
                logger.warning(f"Impersonation: пользователь с phone={phone!r} не найден")
                return None
            response.raise_for_status()
            return response.json()["data"]["id"]
        except Exception as e:
            logger.error(f"Не удалось получить user_id по phone={phone!r}: {e}")
            return None

    async def get_user_role(self, assignment_id: int) -> bool:
        """
        Получить признак менеджера по assignment_id.

        Кэширует результат в памяти — роль назначения меняется редко.
        Вызывает GET /users/internal/user-role?assignment_id=<id> в svc_users.
        Возвращает True если роль назначения — manager, иначе False.
        """
        with self._lock:
            if assignment_id in self._role_cache:
                return self._role_cache[assignment_id]

        try:
            response = await self._http_client.get(
                f"{self.base_url}/users/internal/user-role",
                params={"assignment_id": assignment_id},
            )
            response.raise_for_status()
            data = response.json()
            is_manager = data["data"]["is_manager"]

            with self._lock:
                self._role_cache[assignment_id] = is_manager

            return is_manager

        except Exception as e:
            logger.error(f"Не удалось получить роль для assignment_id={assignment_id}: {e}")
            return False

    async def get_assignment_external_id(self, assignment_id: int) -> Optional[int]:
        """
        Получить external_id (employee_in_shop_id из LAMA) по assignment_id.

        Вызывает GET /users/internal/assignment-external-id в svc_users.
        Возвращает external_id или None при ошибке / отсутствии данных.
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/users/internal/assignment-external-id",
                params={"assignment_id": assignment_id},
            )
            if response.status_code == 200:
                data = response.json().get("data")
                if data:
                    return data.get("external_id")
            return None

        except Exception as e:
            logger.warning(f"Ошибка при запросе assignment-external-id assignment_id={assignment_id}: {e}")
            return None

    async def get_store_assignments_by_assignment(self, assignment_id: int) -> list[dict]:
        """
        Получить все назначения сотрудников магазина по assignment_id.

        Вызывает GET /users/internal/store-assignments-by-assignment в svc_users.
        Возвращает список [{assignment_id, user_id, first_name, last_name, middle_name, position}].
        Кэшируется на 5 минут — назначения меняются не чаще раза в день.
        """
        with self._lock:
            cached = self._assignments_cache.get(assignment_id)
            if cached and time.monotonic() < cached[1]:
                return cached[0]

        try:
            response = await self._http_client.get(
                f"{self.base_url}/users/internal/store-assignments-by-assignment",
                params={"assignment_id": assignment_id},
            )
            if response.status_code == 200:
                data = response.json().get("data", {})
                assignments = data.get("assignments", [])
                with self._lock:
                    self._assignments_cache[assignment_id] = (assignments, time.monotonic() + _STORE_ASSIGNMENTS_TTL)
                return assignments

            logger.warning(
                f"svc_users /store-assignments-by-assignment вернул status={response.status_code} "
                f"для assignment_id={assignment_id}"
            )
            return []

        except Exception as e:
            logger.error(f"Ошибка при запросе store-assignments-by-assignment assignment_id={assignment_id}: {e}")
            return []

    async def get_all_store_codes(self) -> list[str]:
        """
        Получить список external_code всех магазинов из svc_users.

        Вызывает GET /users/internal/all-store-codes.
        Используется при ежедневной синхронизации для итерации по магазинам.
        """
        try:
            response = await self._http_client.get(f"{self.base_url}/users/internal/all-store-codes")
            if response.status_code == 200:
                return response.json().get("data", {}).get("store_codes", [])
            logger.warning(f"svc_users /all-store-codes вернул status={response.status_code}")
            return []
        except Exception as e:
            logger.error(f"Ошибка при запросе all-store-codes: {e}")
            return []

    async def sync_lama_store(self, shop_code: str) -> list[dict]:
        """
        Запустить синхронизацию сотрудников магазина в svc_users.

        Вызывает POST /users/internal/sync-lama-store?shop_code=X.
        Возвращает список [{assignment_id, employee_in_shop_id}].
        """
        try:
            # Sync — долгий запрос, отдельный timeout
            response = await self._http_client.post(
                f"{self.base_url}/users/internal/sync-lama-store",
                params={"shop_code": shop_code},
                timeout=60.0,
            )
            if response.status_code == 200:
                return response.json().get("data", {}).get("assignments", [])
            logger.warning(
                f"svc_users /sync-lama-store вернул status={response.status_code} "
                f"для shop_code={shop_code}"
            )
            return []
        except Exception as e:
            logger.error(f"Ошибка при sync_lama_store shop_code={shop_code}: {e}")
            return []


_users_client: Optional[UsersServiceClient] = None


def get_users_service_client() -> UsersServiceClient:
    """Dependency: возвращает singleton экземпляр UsersServiceClient."""
    global _users_client
    if _users_client is None:
        _users_client = UsersServiceClient()
    return _users_client
