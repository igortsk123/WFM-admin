"""
HTTP-клиент для svc_notifications.

Отправляет уведомления через internal API сервиса уведомлений.
При ошибке — логирует warning, не блокирует основную операцию.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationsServiceClient:
    def __init__(self):
        self.base_url = settings.NOTIFICATIONS_SERVICE_URL
        self.timeout = settings.NOTIFICATIONS_SERVICE_TIMEOUT

    async def send(
        self,
        recipient_id: int,
        category: str,
        data: Optional[dict] = None,
    ) -> None:
        """
        Отправить уведомление пользователю через svc_notifications.

        Не блокирует при ошибке — уведомления не критичны для основного функционала.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/internal/send",
                    json={
                        "recipient_id": recipient_id,
                        "category": category,
                        "data": data or {},
                    },
                )
                result = response.json()
                if result.get("status", {}).get("code") == "":
                    logger.debug(f"Уведомление отправлено: category={category}, recipient={recipient_id}")
                else:
                    logger.warning(f"svc_notifications вернул ошибку: {result}")
        except httpx.TimeoutException:
            logger.warning(f"svc_notifications: таймаут при отправке category={category} recipient={recipient_id}")
        except httpx.ConnectError:
            logger.warning(f"svc_notifications: недоступен при отправке category={category} recipient={recipient_id}")
        except Exception as e:
            logger.warning(f"svc_notifications: неожиданная ошибка: {e}")


def get_notifications_client() -> NotificationsServiceClient:
    return NotificationsServiceClient()
