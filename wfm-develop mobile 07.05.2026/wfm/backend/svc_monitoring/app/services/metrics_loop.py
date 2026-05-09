"""
Цикл сбора метрик хоста. Каждые METRICS_INTERVAL секунд:
1) собирает props через psutil,
2) обновляет state_store (для /api/state и WS broadcast),
3) шлёт server_metrics в Semetrics (исторический ряд).
"""
from __future__ import annotations
import asyncio
import logging

from semetrics import Semetrics

from app.core.config import settings
from app.services.collector import collect_metrics
from app.services.state_store import state_store

logger = logging.getLogger(__name__)


async def run(semetrics: Semetrics | None, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            # cpu_percent(interval=1) блокирует поток — выносим в executor
            props = await asyncio.to_thread(collect_metrics)

            # 1) snapshot для устройства — приоритетнее track в Semetrics
            try:
                await state_store.set_metrics(props)
            except Exception:
                logger.exception("state_store.set_metrics упал")

            # 2) исторический ряд в Semetrics
            if semetrics is not None:
                try:
                    semetrics.track(
                        event_name="server_metrics",
                        user_id="system",
                        properties=props,
                    )
                except Exception:
                    logger.exception("semetrics.track упал для server_metrics")

            logger.info(
                "server_metrics: cpu=%.1f%% mem=%.1f%% swap=%.1f%% disk=%.1f%%",
                props.get("cpu_percent", 0),
                props.get("mem_percent", 0),
                props.get("swap_percent", 0),
                props.get("disk_percent", 0),
            )
        except Exception:
            logger.exception("Ошибка сбора метрик")

        try:
            await asyncio.wait_for(
                asyncio.shield(stop_event.wait()),
                timeout=settings.METRICS_INTERVAL,
            )
        except asyncio.TimeoutError:
            pass
