"""
WebSocket эндпоинт для доставки уведомлений в реальном времени.

Протокол:
- Клиент подключается: wss://domain/notifications/ws?token={jwt}
- Сервер отправляет: {"type": "NOTIFICATION", "notification_id": "...", ...}
- Клиент отвечает ACK: {"type": "ACK", "notification_id": "..."}
- Ping/Pong: стандартный WebSocket heartbeat (uvicorn обрабатывает автоматически)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from shared.auth import validate_token_and_get_sso_id
from shared.exceptions import UnauthorizedException

from app.services.connection_manager import manager
from app.services.users_client import UsersServiceClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT токен авторизации"),
):
    """
    WebSocket соединение для получения уведомлений в реальном времени.

    Авторизация через query param ?token={jwt}.
    После подключения клиент слушает сообщения и отвечает ACK на каждое.
    """
    user_id: int | None = None
    try:
        sso_id, _, _ = validate_token_and_get_sso_id(token)

        # Резолвим integer user_id
        users_client = UsersServiceClient()
        user_id = await users_client.get_int_user_id(sso_id)

        if not user_id:
            logger.warning(f"WS auth: не удалось резолвить user_id для sso_id={sso_id}")
            await websocket.close(code=4001, reason="Unauthorized")
            return

    except Exception as e:
        logger.warning(f"WS auth error: {e}")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Ждём сообщений от клиента (ACK)
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
                if message.get("type") == "ACK":
                    notification_id = message.get("notification_id", "")
                    if notification_id:
                        manager.acknowledge(notification_id)
            except (json.JSONDecodeError, KeyError):
                logger.debug(f"WS: непарсируемое сообщение от user_id={user_id}: {raw!r}")

    except WebSocketDisconnect:
        logger.info(f"WS: user_id={user_id} отключился")
    except Exception as e:
        logger.warning(f"WS: ошибка для user_id={user_id}: {e}")
    finally:
        if user_id:
            manager.disconnect(user_id, websocket)
