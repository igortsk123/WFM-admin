"""
Репозиторий для работы с уведомлениями и токенами устройств.
"""
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.models import (
    Notification,
    NotificationDelivery,
    DeviceToken,
    UserNotificationPreferences,
)
from app.domain.schemas import DeliveryChannel, DeliveryStatus, DevicePlatform

logger = logging.getLogger(__name__)


class NotificationRepository:

    def create(
        self,
        db: Session,
        recipient_id: int,
        category: str,
        title: str,
        body: str,
        data: Optional[dict],
        visibility: str,
        delivery_strategy: str,
    ) -> Notification:
        notification = Notification(
            recipient_id=recipient_id,
            category=category,
            title=title,
            body=body,
            data=data,
            visibility=visibility,
            delivery_strategy=delivery_strategy,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def get_by_id(self, db: Session, notification_id: UUID) -> Optional[Notification]:
        return db.query(Notification).filter(Notification.id == notification_id).first()

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        is_read: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        """Вернуть уведомления пользователя (только visibility=USER)."""
        query = db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.visibility == "USER",
        )
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        if date_from is not None:
            query = query.filter(Notification.created_at >= date_from)
        total = query.count()
        items = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        return items, total

    def get_unread_count(self, db: Session, user_id: int) -> int:
        return db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.visibility == "USER",
            Notification.is_read == False,
        ).count()

    def mark_as_read(self, db: Session, notification_id: UUID, user_id: int) -> Optional[Notification]:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
        ).first()
        if not notification or notification.is_read:
            return notification
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
        return notification

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Пометить все непрочитанные уведомления пользователя как прочитанные."""
        count = db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.visibility == "USER",
            Notification.is_read == False,
        ).update({"is_read": True, "read_at": datetime.utcnow()})
        db.commit()
        return count

    # --- Deliveries ---

    def create_delivery(
        self,
        db: Session,
        notification_id: UUID,
        channel: DeliveryChannel,
        status: DeliveryStatus = DeliveryStatus.PENDING,
        device_token: Optional[str] = None,
    ) -> NotificationDelivery:
        delivery = NotificationDelivery(
            notification_id=notification_id,
            channel=channel.value,
            status=status.value,
            device_token=device_token,
        )
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
        return delivery

    def update_delivery_status(
        self,
        db: Session,
        delivery_id: UUID,
        status: DeliveryStatus,
    ) -> None:
        delivery = db.query(NotificationDelivery).filter(
            NotificationDelivery.id == delivery_id
        ).first()
        if delivery:
            delivery.status = status.value
            if status == DeliveryStatus.DELIVERED:
                delivery.delivered_at = datetime.utcnow()
            db.commit()


class DeviceTokenRepository:

    def register(
        self,
        db: Session,
        user_id: int,
        platform: str,
        token: str,
        token_type: str = "fcm",
    ) -> DeviceToken:
        """Зарегистрировать или обновить токен устройства (FCM или HMS)."""
        existing = db.query(DeviceToken).filter(DeviceToken.token == token).first()
        if existing:
            # Токен уже существует — переназначаем пользователя и активируем
            existing.user_id = user_id
            existing.platform = platform
            existing.token_type = token_type
            existing.is_active = True
            existing.last_seen_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing

        device = DeviceToken(
            user_id=user_id,
            platform=platform,
            token=token,
            token_type=token_type,
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        return device

    def deactivate(self, db: Session, token: str, user_id: int) -> bool:
        """Деактивировать токен при логауте."""
        device = db.query(DeviceToken).filter(
            DeviceToken.token == token,
            DeviceToken.user_id == user_id,
        ).first()
        if not device:
            return False
        device.is_active = False
        db.commit()
        return True

    def get_active_tokens_for_user(self, db: Session, user_id: int) -> list[DeviceToken]:
        """Получить все активные FCM-токены пользователя."""
        return db.query(DeviceToken).filter(
            DeviceToken.user_id == user_id,
            DeviceToken.is_active == True,
        ).all()


class PreferencesRepository:

    def get_or_create(self, db: Session, user_id: int) -> UserNotificationPreferences:
        prefs = db.query(UserNotificationPreferences).filter(
            UserNotificationPreferences.user_id == user_id
        ).first()
        if not prefs:
            prefs = UserNotificationPreferences(user_id=user_id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        return prefs

    def update(
        self,
        db: Session,
        user_id: int,
        push_enabled: Optional[bool] = None,
        blocked_categories: Optional[list] = None,
    ) -> UserNotificationPreferences:
        prefs = self.get_or_create(db, user_id)
        if push_enabled is not None:
            prefs.push_enabled = push_enabled
        if blocked_categories is not None:
            prefs.blocked_categories = blocked_categories
        prefs.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(prefs)
        return prefs
