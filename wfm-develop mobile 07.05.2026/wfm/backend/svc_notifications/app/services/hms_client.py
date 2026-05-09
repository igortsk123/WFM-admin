"""
Huawei Push Kit клиент.

Отправляет push-уведомления через HMS Push Kit Server API.
При отсутствии конфигурации — работает в stub-режиме (логирует, не отправляет).

Обработка ошибок:
- 80000000 / 80100003 — токен невалиден (возвращается в списке invalid_tokens)
- 80200003 — access_token истёк → обновляется и запрос повторяется один раз
"""
import json
import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_app_id: str = ""
_client_secret: str = ""
_oauth_url: str = "https://oauth-login.cloud.huawei.com/oauth2/v3/token"
_push_url: str = "https://push-api.cloud.huawei.com/v1"
_hms_initialized: bool = False

# Кэш access token
_access_token: Optional[str] = None
_access_token_expires_at: float = 0.0
_TOKEN_EXPIRY_BUFFER = 60  # обновить за 60 сек до истечения


# Коды ошибок HMS для невалидных токенов
_INVALID_TOKEN_CODES = {80000000, 80100003}
_AUTH_ERROR_CODE = 80200003


def init_hms(app_id: str, client_secret: str, oauth_url: str = "", push_url: str = "") -> None:
    """Вызывается при старте приложения."""
    global _app_id, _client_secret, _oauth_url, _push_url, _hms_initialized
    if not app_id.strip() or not client_secret.strip():
        logger.warning("HMS_APP_ID или HMS_CLIENT_SECRET не заданы — HMS push отключён")
        return
    _app_id = app_id
    _client_secret = client_secret
    if oauth_url:
        _oauth_url = oauth_url
    if push_url:
        _push_url = push_url
    _hms_initialized = True
    logger.info("HMS Push Kit инициализирован")


def _get_access_token() -> Optional[str]:
    """Получить (или взять из кэша) OAuth access token для HMS Push Kit API."""
    global _access_token, _access_token_expires_at

    if _access_token and time.time() < _access_token_expires_at - _TOKEN_EXPIRY_BUFFER:
        return _access_token

    try:
        response = httpx.post(
            _oauth_url,
            data={
                "grant_type": "client_credentials",
                "client_id": _app_id,
                "client_secret": _client_secret,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        _access_token = data["access_token"]
        _access_token_expires_at = time.time() + data.get("expires_in", 3600)
        return _access_token
    except Exception as e:
        logger.error(f"HMS: ошибка получения access token: {e}")
        _access_token = None
        return None


def _invalidate_token_cache() -> None:
    global _access_token, _access_token_expires_at
    _access_token = None
    _access_token_expires_at = 0.0


def _send_one(access_token: str, device_token: str, title: str, body: str, data: dict) -> dict:
    """Отправить одно HMS push-уведомление. Возвращает тело ответа от HMS API."""
    url = f"{_push_url}/{_app_id}/messages:send"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "validate_only": False,
        "message": {
            "data": json.dumps({"title": title, "body": body, **{k: str(v) for k, v in data.items()}}),
            "android": {
                "notification": {
                    "title": title,
                    "body": body,
                }
            },
            "token": [device_token],
        },
    }
    response = httpx.post(url, headers=headers, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()


async def send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """
    Отправить HMS push на список токенов.

    Возвращает {"success": N, "failure": M, "invalid_tokens": [...]}.
    invalid_tokens — список токенов, которые нужно деактивировать в БД.
    """
    if not tokens:
        return {"success": 0, "failure": 0, "invalid_tokens": []}

    if not _hms_initialized:
        logger.warning(f"HMS: не инициализирован, push не отправлен (tokens={len(tokens)})")
        return {"success": 0, "failure": len(tokens), "invalid_tokens": []}

    access_token = _get_access_token()
    if not access_token:
        return {"success": 0, "failure": len(tokens), "invalid_tokens": []}

    success = 0
    failure = 0
    invalid_tokens = []
    payload_data = data or {}

    for token in tokens:
        try:
            result = _send_one(access_token, token, title, body, payload_data)
            code = int(result.get("code", 0))

            if code == 80000:
                # 80000 — успех в HMS API
                success += 1
            elif code == _AUTH_ERROR_CODE:
                # access_token истёк — обновить и повторить
                _invalidate_token_cache()
                access_token = _get_access_token()
                if access_token:
                    retry = _send_one(access_token, token, title, body, payload_data)
                    if int(retry.get("code", -1)) == 80000:
                        success += 1
                    else:
                        failure += 1
                        logger.warning(f"HMS: повторная попытка не удалась для токена {token}: {retry}")
                else:
                    failure += 1
            elif code in _INVALID_TOKEN_CODES:
                failure += 1
                invalid_tokens.append(token)
                logger.warning(f"HMS: невалидный токен {token}, code={code}")
            else:
                failure += 1
                logger.warning(f"HMS: ошибка для токена {token}, code={code}, msg={result.get('msg')}")

        except Exception as e:
            failure += 1
            logger.error(f"HMS: неожиданная ошибка для токена {token}: {e}")

    logger.info(f"HMS: отправлено {success}/{len(tokens)} пушей")
    return {"success": success, "failure": failure, "invalid_tokens": invalid_tokens}
