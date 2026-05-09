"""
Внутренние эндпоинты для межсервисного взаимодействия.
Доступны только из Docker-сети, без JWT авторизации.

POST /internal/send — принять уведомление от другого сервиса (svc_tasks и др.)
POST /internal/test — тестовая отправка для разработки
"""
import asyncio
import logging

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.domain.schemas import SendNotificationRequest, NotificationCategory
from app.repositories.notification_repository import NotificationRepository, PreferencesRepository
from app.services.message_builder import build_message
from app.services.delivery_engine import deliver
from shared import ok, ValidationException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])

_notification_repo = NotificationRepository()
_prefs_repo = PreferencesRepository()


@router.post("/send")
async def send_notification(
    body: SendNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Отправить уведомление пользователю.

    Вызывается из svc_tasks и других сервисов.
    Без JWT авторизации — доступен только из Docker-сети.

    Body:
    - recipient_id: int — внутренний user_id получателя
    - category: NotificationCategory — тип уведомления
    - data: dict — данные для шаблона (task_id, task_title, reject_reason, new_state и т.д.)
    """
    data = body.data or {}

    # Проверяем настройки пользователя
    prefs = _prefs_repo.get_or_create(db, body.recipient_id)
    if body.category in (prefs.blocked_categories or []):
        logger.info(f"Уведомление категории {body.category} заблокировано пользователем {body.recipient_id}")
        return ok({"skipped": True, "reason": "blocked_by_user"})

    title, body_text, strategy, visibility = build_message(body.category, data)

    notification = _notification_repo.create(
        db,
        recipient_id=body.recipient_id,
        category=body.category,
        title=title,
        body=body_text,
        data=data,
        visibility=visibility.value,
        delivery_strategy=strategy.value,
    )

    # Доставка в фоне — не блокируем ответ svc_tasks
    background_tasks.add_task(deliver, db, notification)

    logger.info(
        f"Уведомление создано: id={notification.id}, "
        f"category={body.category}, recipient={body.recipient_id}, "
        f"strategy={strategy.value}"
    )
    return ok({"notification_id": str(notification.id), "strategy": strategy.value})


@router.post("/test")
async def test_notification(
    recipient_id: int,
    category: NotificationCategory,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Тестовая отправка уведомления. Только для разработки.
    Доступен без JWT, только из Docker-сети.
    """
    test_data = {
        "task_id": "00000000-0000-0000-0000-000000000000",
        "task_title": "Тестовая задача",
        "reject_reason": "Тестовая причина отклонения",
        "new_state": "IN_PROGRESS",
        "actor_name": "Тест",
    }

    title, body_text, strategy, visibility = build_message(category, test_data)

    notification = _notification_repo.create(
        db,
        recipient_id=recipient_id,
        category=category,
        title=title,
        body=body_text,
        data=test_data,
        visibility=visibility.value,
        delivery_strategy=strategy.value,
    )

    background_tasks.add_task(deliver, db, notification)

    return ok({
        "notification_id": str(notification.id),
        "title": title,
        "body": body_text,
        "strategy": strategy.value,
    })
