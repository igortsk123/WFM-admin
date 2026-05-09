"""
Движок доставки уведомлений.

Принимает уведомление из БД, применяет стратегию доставки:
- WEBSOCKET_ONLY: отправить через WS, если нет ACK — записать FAILED, больше ничего
- WEBSOCKET_THEN_PUSH: WS с ACK, если нет ACK — push на все активные токены
- EMERGENCY: WS + push одновременно
- EMAIL_ONLY: только email (stub, будет реализован позднее)
"""
import asyncio
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core import analytics
from app.domain.models import Notification
from app.domain.schemas import DeliveryChannel, DeliveryStatus, DeliveryStrategy
from app.repositories.notification_repository import (
    NotificationRepository,
    DeviceTokenRepository,
)
from app.services.connection_manager import manager as ws_manager
from app.services.fcm_client import send_push as fcm_send_push
from app.services.hms_client import send_push as hms_send_push

logger = logging.getLogger(__name__)

_notification_repo = NotificationRepository()
_device_repo = DeviceTokenRepository()


def _build_ws_payload(notification: Notification) -> dict:
    return {
        "type": "NOTIFICATION",
        "notification_id": str(notification.id),
        "category": notification.category,
        "title": notification.title,
        "body": notification.body,
        "data": notification.data,
    }


async def _deliver_websocket(db: Session, notification: Notification) -> bool:
    """Попытка доставки через WebSocket. Возвращает True при успешном ACK."""
    delivery = _notification_repo.create_delivery(
        db, notification.id, DeliveryChannel.WEBSOCKET
    )
    payload = _build_ws_payload(notification)

    ws_props = {
        "channel": "websocket",
        "notification_id": str(notification.id),
        "task_id": (notification.data or {}).get("task_id"),
    }
    user_id_str = str(notification.recipient_id)

    had_connection = ws_manager.is_connected(notification.recipient_id)
    if had_connection:
        analytics.track("push_notification_sent", user_id=user_id_str, properties=ws_props)

    acked = await ws_manager.send_notification(
        user_id=notification.recipient_id,
        notification_id=str(notification.id),
        payload=payload,
    )
    status = DeliveryStatus.DELIVERED if acked else DeliveryStatus.FAILED
    _notification_repo.update_delivery_status(db, delivery.id, status)

    if had_connection and not acked:
        reason = "ack_timeout" if ws_manager.is_connected(notification.recipient_id) else "disconnect"
        analytics.track("push_notification_failed", user_id=user_id_str, properties={**ws_props, "reason": reason})

    return acked


async def _deliver_push(db: Session, notification: Notification) -> bool:
    """Отправить push на все активные токены пользователя. Возвращает True если отправлено хотя бы на 1 токен."""
    tokens_rows = _device_repo.get_active_tokens_for_user(db, notification.recipient_id)
    if not tokens_rows:
        logger.info(f"Push: нет активных токенов для user_id={notification.recipient_id}")
        return False

    # Разделяем токены по типу провайдера
    fcm_rows = [t for t in tokens_rows if t.token_type == "fcm"]
    hms_rows = [t for t in tokens_rows if t.token_type == "hms"]

    total_success = 0
    invalid_tokens = set()

    push_data = {**(notification.data or {}), "notification_id": str(notification.id)}

    task_id = (notification.data or {}).get("task_id")
    user_id_str = str(notification.recipient_id)
    notification_id_str = str(notification.id)

    # FCM
    if fcm_rows:
        fcm_props = {"channel": "fcm", "notification_id": notification_id_str, "task_id": task_id}
        analytics.track("push_notification_sent", user_id=user_id_str, properties=fcm_props)
        fcm_result = await fcm_send_push(
            tokens=[t.token for t in fcm_rows],
            title=notification.title,
            body=notification.body,
            data=push_data,
        )
        total_success += fcm_result["success"]
        for token_row in fcm_rows:
            status = DeliveryStatus.DELIVERED if fcm_result["success"] > 0 else DeliveryStatus.FAILED
            _notification_repo.create_delivery(
                db, notification.id, DeliveryChannel.PUSH, status=status, device_token=token_row.token,
            )
        if fcm_result["success"] == 0:
            analytics.track("push_notification_failed", user_id=user_id_str, properties={**fcm_props, "reason": "provider_rejected"})

    # HMS
    if hms_rows:
        hms_props = {"channel": "hms", "notification_id": notification_id_str, "task_id": task_id}
        analytics.track("push_notification_sent", user_id=user_id_str, properties=hms_props)
        hms_result = await hms_send_push(
            tokens=[t.token for t in hms_rows],
            title=notification.title,
            body=notification.body,
            data=push_data,
        )
        total_success += hms_result["success"]
        invalid_tokens.update(hms_result.get("invalid_tokens", []))
        for token_row in hms_rows:
            status = DeliveryStatus.DELIVERED if hms_result["success"] > 0 else DeliveryStatus.FAILED
            _notification_repo.create_delivery(
                db, notification.id, DeliveryChannel.PUSH, status=status, device_token=token_row.token,
            )
        if hms_result["success"] == 0:
            analytics.track("push_notification_failed", user_id=user_id_str, properties={**hms_props, "reason": "provider_rejected"})

    # Деактивируем невалидные HMS-токены
    if invalid_tokens:
        from app.domain.models import DeviceToken
        db.query(DeviceToken).filter(
            DeviceToken.token.in_(invalid_tokens)
        ).update({"is_active": False}, synchronize_session=False)
        db.commit()
        logger.info(f"Push: деактивировано {len(invalid_tokens)} невалидных HMS-токенов")

    return total_success > 0


async def deliver(db: Session, notification: Notification) -> None:
    """
    Выполнить доставку уведомления согласно стратегии.
    Запускается в фоне (не блокирует HTTP-ответ).
    """
    strategy = notification.delivery_strategy
    logger.info(f"Доставка notification_id={notification.id}, strategy={strategy}, recipient={notification.recipient_id}")

    if strategy == DeliveryStrategy.WEBSOCKET_ONLY:
        await _deliver_websocket(db, notification)

    elif strategy == DeliveryStrategy.WEBSOCKET_THEN_PUSH:
        ws_delivered = await _deliver_websocket(db, notification)
        if not ws_delivered:
            await _deliver_push(db, notification)

    elif strategy == DeliveryStrategy.EMERGENCY:
        await asyncio.gather(
            _deliver_websocket(db, notification),
            _deliver_push(db, notification),
        )

    elif strategy == DeliveryStrategy.EMAIL_ONLY:
        # TODO: реализовать email-доставку
        logger.warning(f"EMAIL_ONLY: email-доставка не реализована, notification_id={notification.id}")
        _notification_repo.create_delivery(
            db, notification.id, DeliveryChannel.EMAIL, status=DeliveryStatus.SKIPPED
        )

    else:
        logger.error(f"Неизвестная стратегия доставки: {strategy}")
