"""
SQLAlchemy модели для svc_notifications.

Таблицы:
- notifications — уведомления (сообщения пользователям)
- notification_deliveries — статусы доставки по каналам
- device_tokens — FCM-токены устройств пользователей
- user_notification_preferences — настройки уведомлений пользователей
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Integer, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(Integer, nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    # deeplink info: {"task_id": "uuid", "screen": "task_detail"}
    data = Column(JSON, nullable=True)
    visibility = Column(String(20), nullable=False, default="USER")  # USER | SYSTEM
    delivery_strategy = Column(String(30), nullable=False)  # EMERGENCY | WEBSOCKET_ONLY | WEBSOCKET_THEN_PUSH | EMAIL_ONLY
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    deliveries = relationship("NotificationDelivery", back_populates="notification", cascade="all, delete-orphan")


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notification_id = Column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(20), nullable=False)  # WEBSOCKET | PUSH | EMAIL
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | DELIVERED | FAILED | SKIPPED
    device_token = Column(String(500), nullable=True)  # для PUSH — какой токен использовался
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    notification = relationship("Notification", back_populates="deliveries")


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, nullable=False, index=True)
    platform = Column(String(10), nullable=False)  # IOS | AND | HUA
    token = Column(String(500), nullable=False, unique=True)
    token_type = Column(String(10), nullable=False, default="fcm")  # fcm | hms
    is_active = Column(Boolean, nullable=False, default=True)
    registered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class UserNotificationPreferences(Base):
    __tablename__ = "user_notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    push_enabled = Column(Boolean, nullable=False, default=True)
    # список заблокированных категорий, например: ["TASK_STATE_CHANGED"]
    blocked_categories = Column(JSON, nullable=False, default=list)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
