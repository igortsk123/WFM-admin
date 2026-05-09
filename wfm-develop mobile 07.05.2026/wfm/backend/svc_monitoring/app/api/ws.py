"""WSS /api/events/ws — push-канал для устройства."""
from __future__ import annotations
import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.auth import verify_device_token_value
from app.services.connection_manager import connection_manager
from app.services.errors_buffer import errors_buffer
from app.services.state_store import now_unix, state_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events")


async def _build_state_message() -> dict:
    snapshot = await state_store.snapshot()
    errors_1h = await errors_buffer.count_last_hour()
    return {
        "type": "state",
        "ts": now_unix(),
        "server": snapshot.get("server"),
        "cpu": snapshot.get("cpu"),
        "mem": snapshot.get("mem"),
        "disk": snapshot.get("disk"),
        "containers": snapshot.get("containers", {}),
        "errors_1h": errors_1h,
    }


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: Optional[str] = Query(default=None),
) -> None:
    if not verify_device_token_value(token):
        await ws.close(code=4001)
        logger.warning("WS: отклонено подключение с неверным токеном")
        return

    await ws.accept()
    await connection_manager.connect(ws)

    # Немедленно шлём текущее состояние
    try:
        await connection_manager.send(ws, await _build_state_message())
    except Exception:
        logger.exception("WS: не удалось отправить начальный state")

    # Держим соединение. Прошивка по дизайну ничего не шлёт серверу —
    # liveness обеспечивают нативные WebSocket ping/pong, которые uvicorn
    # шлёт автоматически (см. --ws-ping-interval / --ws-ping-timeout).
    # При обрыве (нет pong от клиента или TCP сломался) — receive_text
    # бросит WebSocketDisconnect, и мы корректно отпустим соединение.
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS: ошибка соединения")
    finally:
        await connection_manager.disconnect(ws)
