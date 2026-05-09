"""
Pydantic схемы для svc_notifications.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Any, List
from uuid import UUID

from pydantic import BaseModel


# --- Enums ---

class NotificationVisibility(str, Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"


class DeliveryStrategy(str, Enum):
    EMERGENCY = "EMERGENCY"
    WEBSOCKET_ONLY = "WEBSOCKET_ONLY"
    WEBSOCKET_THEN_PUSH = "WEBSOCKET_THEN_PUSH"
    EMAIL_ONLY = "EMAIL_ONLY"


class DeliveryChannel(str, Enum):
    WEBSOCKET = "WEBSOCKET"
    PUSH = "PUSH"
    EMAIL = "EMAIL"


class DeliveryStatus(str, Enum):
    PENDING = "PENDING"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class DevicePlatform(str, Enum):
    IOS = "IOS"
    AND = "AND"
    HUA = "HUA"
    # Backward compat: старые клиенты шлют ANDROID — нормализуется в AND на уровне API
    ANDROID = "ANDROID"


class TokenType(str, Enum):
    FCM = "fcm"
    HMS = "hms"


class NotificationCategory(str, Enum):
    TASK_REVIEW = "TASK_REVIEW"          # менеджеру: задача на проверку
    TASK_REJECTED = "TASK_REJECTED"       # работнику: задача отклонена
    TASK_STATE_CHANGED = "TASK_STATE_CHANGED"  # работнику: изменение состояния задачи


# --- Notification responses ---

class NotificationResponse(BaseModel):
    id: UUID
    category: str
    title: str
    body: str
    data: Optional[Any] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListData(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountData(BaseModel):
    unread_count: int


# --- Device token ---

class DeviceTokenRegister(BaseModel):
    platform: DevicePlatform
    token: str
    token_type: Optional[TokenType] = TokenType.FCM


class DeviceTokenResponse(BaseModel):
    id: UUID
    platform: str
    token: str
    token_type: str
    registered_at: datetime

    model_config = {"from_attributes": True}


# --- Preferences ---

class NotificationPreferencesResponse(BaseModel):
    push_enabled: bool
    blocked_categories: List[str]
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferencesUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    blocked_categories: Optional[List[str]] = None


# --- Internal API: отправка уведомления ---

class SendNotificationRequest(BaseModel):
    recipient_id: int
    category: NotificationCategory
    data: Optional[dict] = None


# --- WebSocket сообщения ---

class WsNotificationMessage(BaseModel):
    """Сообщение от сервера клиенту по WebSocket"""
    type: str = "NOTIFICATION"
    notification_id: str
    category: str
    title: str
    body: str
    data: Optional[Any] = None


class WsAckMessage(BaseModel):
    """ACK от клиента серверу"""
    type: str  # "ACK"
    notification_id: str
