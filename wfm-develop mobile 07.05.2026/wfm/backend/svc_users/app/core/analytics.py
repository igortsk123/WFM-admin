from __future__ import annotations
import logging
from semetrics import Semetrics
from app.core.config import settings

logger = logging.getLogger(__name__)
_client: Semetrics | None = None


def init() -> None:
    global _client
    if not settings.SEMETRICS_API_KEY:
        logger.info("SEMETRICS_API_KEY не задан — аналитика отключена")
        return
    _client = Semetrics(
        api_key=settings.SEMETRICS_API_KEY,
        endpoint=settings.SEMETRICS_ENDPOINT,
    )
    logger.info("Semetrics инициализирован")


def shutdown() -> None:
    global _client
    if _client:
        _client.shutdown()
        _client = None


def track(event_name: str, user_id: str | None = None, properties: dict | None = None) -> None:
    if not _client:
        return
    props = {"server": settings.SERVER_NAME, **(properties or {})}
    _client.track(event_name=event_name, user_id=user_id, properties=props)
