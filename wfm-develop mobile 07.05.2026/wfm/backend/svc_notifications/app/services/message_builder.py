"""
Построитель сообщений: маппинг категории уведомления → title/body/strategy/visibility.

Добавление новой категории:
1. Добавить значение в NotificationCategory (schemas.py)
2. Добавить запись в MESSAGE_TEMPLATES
"""
from app.domain.schemas import (
    NotificationCategory,
    DeliveryStrategy,
    NotificationVisibility,
)

# category → (title_template, body_template, strategy, visibility)
# В шаблонах допустимы плейсхолдеры через .format(**data)
MESSAGE_TEMPLATES: dict[str, tuple[str, str, DeliveryStrategy, NotificationVisibility]] = {
    NotificationCategory.TASK_REVIEW: (
        "Задача на проверку",
        "Сотрудник завершил задачу «{task_title}» и отправил её на проверку",
        DeliveryStrategy.WEBSOCKET_THEN_PUSH,
        NotificationVisibility.USER,
    ),
    NotificationCategory.TASK_REJECTED: (
        "Задача возвращена",
        "Задача «{task_title}» отклонена: {reject_reason}",
        DeliveryStrategy.WEBSOCKET_THEN_PUSH,
        NotificationVisibility.USER,
    ),
    NotificationCategory.TASK_STATE_CHANGED: (
        "Изменение задачи",
        "Задача «{task_title}» обновлена: {state_description}",
        DeliveryStrategy.WEBSOCKET_ONLY,
        NotificationVisibility.SYSTEM,
    ),
}

# Человекочитаемые описания состояний задачи
STATE_DESCRIPTIONS = {
    "IN_PROGRESS": "начата",
    "PAUSED": "приостановлена",
    "COMPLETED": "выполнена",
    "NEW": "создана",
}


def build_message(category: str, data: dict) -> tuple[str, str, DeliveryStrategy, NotificationVisibility]:
    """
    Построить текст уведомления по категории и данным.

    data — произвольный словарь из SendNotificationRequest.data.
    Возвращает (title, body, strategy, visibility).
    """
    template = MESSAGE_TEMPLATES.get(category)
    if not template:
        return (
            "Уведомление",
            "Новое уведомление",
            DeliveryStrategy.WEBSOCKET_ONLY,
            NotificationVisibility.SYSTEM,
        )

    title_tmpl, body_tmpl, strategy, visibility = template

    # Обогащаем data для шаблона: добавляем state_description
    if "new_state" in data and "state_description" not in data:
        data = {**data, "state_description": STATE_DESCRIPTIONS.get(data["new_state"], data["new_state"])}

    # Безопасная подстановка — если ключа нет, оставляем плейсхолдер как есть
    try:
        title = title_tmpl.format(**data)
    except KeyError:
        title = title_tmpl

    try:
        body = body_tmpl.format(**data)
    except KeyError:
        body = body_tmpl

    return title, body, strategy, visibility
