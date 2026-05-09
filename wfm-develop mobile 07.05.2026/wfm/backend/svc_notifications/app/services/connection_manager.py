"""
Менеджер WebSocket-соединений.

Хранит активные соединения в памяти: user_id → список WebSocket.
При отправке уведомления рассылает его на все устройства пользователя
и ожидает ACK в течение WS_ACK_TIMEOUT секунд.

Реестр singleton — один экземпляр на весь процесс.
"""
import asyncio
import json
import logging
from collections import defaultdict
from typing import Optional

from fastapi import WebSocket

from app.core.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # user_id → список WebSocket
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)
        # notification_id → asyncio.Event (для ACK)
        self._ack_events: dict[str, asyncio.Event] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].append(websocket)
        logger.info(f"WS: user_id={user_id} подключился, активных соединений: {len(self._connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self._connections.pop(user_id, None)
        logger.info(f"WS: user_id={user_id} отключился")

    def is_connected(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))

    async def send_notification(
        self,
        user_id: int,
        notification_id: str,
        payload: dict,
    ) -> bool:
        """
        Отправить уведомление пользователю по всем его WebSocket-соединениям.
        Ждёт ACK в течение WS_ACK_TIMEOUT секунд.

        Возвращает True если хотя бы одно соединение подтвердило доставку (ACK),
        False — если нет соединений или ACK не получен за таймаут.
        """
        connections = self._connections.get(user_id, [])
        if not connections:
            logger.debug(f"WS: user_id={user_id} не подключён, нет соединений")
            return False

        # Регистрируем событие для ожидания ACK
        ack_event = asyncio.Event()
        self._ack_events[notification_id] = ack_event

        message = json.dumps(payload)
        dead_connections = []

        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"WS: ошибка отправки user_id={user_id}: {e}")
                dead_connections.append(ws)

        # Убираем мёртвые соединения
        for ws in dead_connections:
            self.disconnect(user_id, ws)

        if not self._connections.get(user_id):
            # Все соединения умерли
            self._ack_events.pop(notification_id, None)
            return False

        try:
            await asyncio.wait_for(ack_event.wait(), timeout=settings.WS_ACK_TIMEOUT)
            logger.info(f"WS: ACK получен для notification_id={notification_id}")
            return True
        except asyncio.TimeoutError:
            logger.info(f"WS: ACK не получен за {settings.WS_ACK_TIMEOUT}с, notification_id={notification_id}")
            return False
        finally:
            self._ack_events.pop(notification_id, None)

    def acknowledge(self, notification_id: str) -> None:
        """Вызывается при получении ACK от клиента."""
        event = self._ack_events.get(notification_id)
        if event:
            event.set()
        else:
            logger.debug(f"WS: ACK для неизвестного notification_id={notification_id} (возможно, уже истёк)")


# Singleton — один экземпляр на весь процесс
manager = ConnectionManager()
