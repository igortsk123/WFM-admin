"""
Клиент для svc_monitoring `/internal/errors`. Используется бэкенд-сервисами WFM,
чтобы сообщать о 5xx ошибках в реальном времени для физического монитора.

Защита канала — стандартный паттерн internal API
(`.memory_bank/backend/patterns/inter_service_communication.md`):
доступ только из Docker-сети, nginx закрывает `/monitoring/internal/` через `deny all`.

Канал НЕ заменяет existing analytics.track('api_error', ...) в Semetrics — оба работают параллельно.
"""
from __future__ import annotations
import asyncio
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class MonitoringClient:
    """Singleton httpx-клиент. Fire-and-forget вызовы, на ошибки логируем warning."""

    def __init__(
        self,
        service_name: str,
        base_url: str,
        timeout: float = 1.0,
    ) -> None:
        self.service_name = service_name
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._client_lock = asyncio.Lock()

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            async with self._client_lock:
                if self._client is None:
                    self._client = httpx.AsyncClient(
                        base_url=self.base_url,
                        timeout=self.timeout,
                    )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _send(self, payload: dict) -> None:
        try:
            client = await self._ensure_client()
            await client.post("/internal/errors", json=payload)
        except Exception as exc:
            logger.warning("monitoring_client: не удалось отправить ошибку: %s", exc)

    def report_error(
        self,
        *,
        status_code: int,
        path: str,
        method: str,
        error_message: Optional[str] = None,
        stack_trace: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> None:
        """
        Fire-and-forget. НЕ блокирует и НЕ кидает исключения наружу.
        Безопасно вызывать из middleware на горячем пути.
        """
        payload: dict = {
            "service": self.service_name,
            "status_code": status_code,
            "path": path,
            "method": method,
        }
        if error_message:
            payload["error_message"] = error_message
        if stack_trace:
            payload["stack_trace"] = stack_trace
        if request_id:
            payload["request_id"] = request_id

        try:
            asyncio.create_task(self._send(payload))
        except RuntimeError:
            # Нет работающего event loop — например, вызов из синхронного контекста при старте
            logger.debug("monitoring_client: event loop недоступен, событие пропущено")


_instance: Optional[MonitoringClient] = None


def init_monitoring_client(
    service_name: str,
    base_url: Optional[str] = None,
    timeout: float = 1.0,
) -> MonitoringClient:
    """
    Инициализация singleton'а. Безопасно вызывать в lifespan на старте сервиса.
    Если base_url не задан — берём из ENV `MONITORING_SERVICE_URL`.
    """
    global _instance
    resolved_url = base_url or os.environ.get("MONITORING_SERVICE_URL", "http://svc_monitoring:8000")
    _instance = MonitoringClient(
        service_name=service_name,
        base_url=resolved_url,
        timeout=timeout,
    )
    return _instance


def get_monitoring_client() -> Optional[MonitoringClient]:
    return _instance


async def shutdown_monitoring_client() -> None:
    global _instance
    if _instance is not None:
        await _instance.close()
        _instance = None
