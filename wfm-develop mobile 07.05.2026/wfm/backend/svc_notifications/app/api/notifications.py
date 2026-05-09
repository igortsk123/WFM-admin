"""
Public API для работы с уведомлениями.

Эндпоинты для мобильного приложения:
- Список уведомлений пользователя
- Отметка как прочитанное
- Управление токенами устройств
- Настройки уведомлений
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.repositories.notification_repository import (
    NotificationRepository,
    DeviceTokenRepository,
    PreferencesRepository,
)
from app.domain.schemas import (
    DeviceTokenRegister,
    DeviceTokenResponse,
    NotificationListData,
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    UnreadCountData,
)
from shared import (
    ApiResponse,
    ok,
    NotFoundException,
    CurrentUser,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])

_notification_repo = NotificationRepository()
_device_repo = DeviceTokenRepository()
_prefs_repo = PreferencesRepository()


@router.get("/list", response_model=ApiResponse[NotificationListData])
def get_notifications(
    is_read: Optional[bool] = Query(None, description="Фильтр по статусу прочтения"),
    date_from: Optional[datetime] = Query(None, description="Фильтр: уведомления не раньше этой даты (ISO 8601)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Список уведомлений текущего пользователя (только visibility=USER)."""
    items, total = _notification_repo.get_user_notifications(
        db, current_user.user_id, is_read=is_read, date_from=date_from, limit=limit, offset=offset
    )
    unread = _notification_repo.get_unread_count(db, current_user.user_id)
    return ok(NotificationListData(
        notifications=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        unread_count=unread,
    ))


@router.get("/unread-count", response_model=ApiResponse[UnreadCountData])
def get_unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Количество непрочитанных уведомлений."""
    count = _notification_repo.get_unread_count(db, current_user.user_id)
    return ok(UnreadCountData(unread_count=count))


@router.post("/{notification_id}/read", response_model=ApiResponse[NotificationResponse])
def mark_as_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Пометить уведомление как прочитанное."""
    notification = _notification_repo.mark_as_read(db, notification_id, current_user.user_id)
    if not notification:
        raise NotFoundException(f"Уведомление {notification_id} не найдено")
    return ok(NotificationResponse.model_validate(notification))


@router.post("/read-all", response_model=ApiResponse[dict])
def mark_all_as_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Пометить все уведомления пользователя как прочитанные."""
    count = _notification_repo.mark_all_as_read(db, current_user.user_id)
    return ok({"marked_count": count})


# --- Device tokens ---

@router.post("/devices/tokens", response_model=ApiResponse[DeviceTokenResponse])
def register_device_token(
    body: DeviceTokenRegister,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Зарегистрировать или обновить токен устройства (FCM или HMS).

    Вызывается при старте приложения и при обновлении токена.
    Если токен уже существует у другого пользователя — переназначается текущему.

    Backward compat: platform='ANDROID' нормализуется в 'AND' с token_type='fcm'.
    """
    # Нормализация platform: старые клиенты шлют ANDROID
    platform = body.platform.value
    if platform == "ANDROID":
        platform = "AND"

    token_type = body.token_type.value if body.token_type else "fcm"

    device = _device_repo.register(db, current_user.user_id, platform, body.token, token_type)
    logger.info(f"Токен зарегистрирован: user_id={current_user.user_id}, platform={platform}, token_type={token_type}")
    return ok(DeviceTokenResponse.model_validate(device))


@router.delete("/devices/tokens/{token}", response_model=ApiResponse[dict])
def deactivate_device_token(
    token: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Деактивировать FCM-токен при логауте."""
    success = _device_repo.deactivate(db, token, current_user.user_id)
    if not success:
        raise NotFoundException("Токен не найден или принадлежит другому пользователю")
    return ok({"deactivated": True})


# --- Preferences ---

@router.get("/preferences", response_model=ApiResponse[NotificationPreferencesResponse])
def get_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить настройки уведомлений текущего пользователя."""
    prefs = _prefs_repo.get_or_create(db, current_user.user_id)
    return ok(NotificationPreferencesResponse.model_validate(prefs))


@router.patch("/preferences", response_model=ApiResponse[NotificationPreferencesResponse])
def update_preferences(
    body: NotificationPreferencesUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Обновить настройки уведомлений: включить/выключить пуши, заблокировать категории."""
    prefs = _prefs_repo.update(
        db,
        current_user.user_id,
        push_enabled=body.push_enabled,
        blocked_categories=body.blocked_categories,
    )
    return ok(NotificationPreferencesResponse.model_validate(prefs))
