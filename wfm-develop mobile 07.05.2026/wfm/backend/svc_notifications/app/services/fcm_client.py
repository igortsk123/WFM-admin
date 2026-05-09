"""
Firebase Cloud Messaging клиент.

Инициализирует Firebase Admin SDK при старте, если FIREBASE_CREDENTIALS_JSON задан.
При отсутствии ключей — работает в stub-режиме (логирует, не отправляет).
"""
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_firebase_initialized = False


def _init_firebase(credentials_json: str) -> bool:
    """Инициализировать Firebase Admin SDK из JSON-строки."""
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_dict = json.loads(credentials_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase Admin SDK инициализирован")
        return True
    except Exception as e:
        logger.error(f"Ошибка инициализации Firebase: {e}")
        return False


def init_fcm(credentials_json: str) -> None:
    """Вызывается при старте приложения."""
    if credentials_json.strip():
        _init_firebase(credentials_json)
    else:
        logger.warning("FIREBASE_CREDENTIALS_JSON не задан — push уведомления отключены")


async def send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict[str, int]:
    """
    Отправить push-уведомление на список FCM-токенов.

    Возвращает {"success": N, "failure": M}.
    При отсутствии Firebase — логирует и возвращает failure для всех токенов.
    """
    if not tokens:
        return {"success": 0, "failure": 0}

    if not _firebase_initialized:
        logger.warning(f"FCM: Firebase не инициализирован, push не отправлен (tokens={len(tokens)})")
        return {"success": 0, "failure": len(tokens)}

    try:
        from firebase_admin import messaging

        clean_data = {k: str(v) for k, v in (data or {}).items()}

        messages = [
            messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=clean_data,
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(mutable_content=True)
                    )
                ),
                token=token,
            )
            for token in tokens
        ]

        response = messaging.send_each(messages)
        success = response.success_count
        failure = response.failure_count

        if failure > 0:
            for i, resp in enumerate(response.responses):
                if not resp.success:
                    logger.warning(f"FCM: ошибка для токена {tokens[i]}: {resp.exception}")

        logger.info(f"FCM: отправлено {success}/{len(tokens)} пушей")
        return {"success": success, "failure": failure}

    except Exception as e:
        logger.error(f"FCM: неожиданная ошибка: {e}")
        return {"success": 0, "failure": len(tokens)}
