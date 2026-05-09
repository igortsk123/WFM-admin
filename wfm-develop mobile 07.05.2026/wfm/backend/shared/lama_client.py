import httpx
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


# Маппинг статусов LAMA → WFM (execution state).
# Accepted и Returned дополнительно влияют на review_state — см. lama_service.py:
#   Accepted → review_state = ACCEPTED + событие ACCEPT (actor_role=system)
#   Returned → review_state = REJECTED + событие REJECT (actor_role=system)
LAMA_TO_WFM_STATUS = {
    "Created": "NEW",
    "InProgress": "IN_PROGRESS",
    "Suspended": "PAUSED",
    "Completed": "COMPLETED",
    "Accepted": "COMPLETED",
    "Returned": "PAUSED",
}

# Справочная таблица маппинга WFM → LAMA.
# НЕ используется внутри sync_task_status_to_lama напрямую —
# lama_status передаётся явно из вызывающего кода (tasks.py):
#   start/resume → "InProgress"
#   pause        → "Suspended"
#   complete     → "Completed"
#   approve      → "Accepted"
#   reject       → "Returned"
WFM_TO_LAMA_STATUS = {
    "NEW": "Created",
    "IN_PROGRESS": "InProgress",
    "PAUSED": "Suspended",
    "COMPLETED": "Completed",
    # review actions (передаются явно, не через этот словарь):
    # approve → "Accepted"
    # reject  → "Returned"
}


class LamaClient:
    """HTTP клиент для LAMA API с graceful degradation"""

    def __init__(self, base_url: str, timeout: int = 5, enabled: bool = True):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.enabled = enabled

    async def get_employees_by_shop(self, shop_code: str) -> Optional[list]:
        """Получить всех сотрудников магазина по shop_code"""
        return await self._get("/employee/", params={"shop_code": shop_code})

    async def get_employee(self, phone: str) -> Optional[dict]:
        """Получить данные сотрудника по номеру телефона"""
        data = await self._get("/employee/", params={"phone": phone})
        # LAMA возвращает список — берём первого сотрудника
        if isinstance(data, list):
            return data[0] if data else None
        return data

    async def get_shift(self, employee_in_shop_id: int) -> Optional[dict]:
        """Получить смену сотрудника на сегодня"""
        return await self._get("/shift/", params={"employee_in_shop_id": employee_in_shop_id})

    async def get_tasks(self, shift_id: int) -> Optional[list]:
        """Получить задачи для смены.

        Возвращает:
        - list — корректный ответ от LAMA (может быть пустым)
        - None — ошибка соединения, невалидный ответ, API отключён
        """
        data = await self._get("/tasks/", params={"shift_id": shift_id})
        if data is None:
            return None
        # LAMA возвращает {"result": [...]}, извлекаем список
        if isinstance(data, dict):
            result = data.get("result")
            if not isinstance(result, list):
                logger.warning(f"LAMA: неожиданный формат ответа tasks: result={result!r}")
                return None
            return result
        if isinstance(data, list):
            return data
        logger.warning(f"LAMA: неожиданный тип ответа tasks: {type(data)}")
        return None

    async def set_task_status(
        self,
        task_id: int,
        status: str,
        comment: Optional[str] = None,
    ) -> bool:
        """Обновить статус задачи в LAMA"""
        if not self.enabled:
            return False

        payload: dict = {"status": status}
        if comment:
            payload["comment"] = comment

        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/set_task_status/{task_id}",
                    json=payload,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                elapsed_ms = (time.perf_counter() - t0) * 1000
                logger.info(f"LAMA: POST set_task_status/{task_id} status={status} — {elapsed_ms:.0f}ms")
                return True
        except httpx.TimeoutException:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA timeout: set_task_status/{task_id} — {elapsed_ms:.0f}ms")
            return False
        except httpx.HTTPError as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA HTTP error: set_task_status/{task_id}: {e} — {elapsed_ms:.0f}ms")
            return False
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA unexpected error: set_task_status/{task_id}: {e} — {elapsed_ms:.0f}ms")
            return False

    async def _get(self, path: str, params: dict = None) -> Optional[dict | list]:
        """Выполнить GET запрос к LAMA API с graceful degradation"""
        if not self.enabled:
            logger.debug("LAMA API отключён (LAMA_API_ENABLED=false)")
            return None

        url = f"{self.base_url}{path}"
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                elapsed_ms = (time.perf_counter() - t0) * 1000
                logger.info(f"LAMA: GET {path} params={params} — {elapsed_ms:.0f}ms")
                return data
        except httpx.TimeoutException:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA timeout: GET {path} params={params} — {elapsed_ms:.0f}ms")
            return None
        except httpx.HTTPError as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA HTTP error: GET {path}: {e} — {elapsed_ms:.0f}ms")
            return None
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"LAMA unexpected error: GET {path}: {e} — {elapsed_ms:.0f}ms")
            return None
