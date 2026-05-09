"""WebSocket connection hub. Принимает подключения устройств, рассылает state/alert."""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


def _serialize(message: dict[str, Any]) -> str:
    return json.dumps(message, ensure_ascii=False, default=str)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections.add(ws)
        logger.info("WS клиент подключён, активных: %d", len(self._connections))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(ws)
        logger.info("WS клиент отключён, активных: %d", len(self._connections))

    @property
    def has_clients(self) -> bool:
        return bool(self._connections)

    async def send(self, ws: WebSocket, message: dict[str, Any]) -> None:
        await ws.send_text(_serialize(message))

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self._connections:
            return
        payload = _serialize(message)
        dead: list[WebSocket] = []
        # snapshot, чтобы не держать lock пока шлём
        async with self._lock:
            targets = list(self._connections)
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)


connection_manager = ConnectionManager()
