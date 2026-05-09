"""
Детектор алертов. Раз в ALERT_POLL_INTERVAL секунд проверяет:
- новые контейнерные события (stop/die/unhealthy критичных контейнеров)
- спайк api ошибок (>= ERROR_SPIKE_COUNT за ERROR_SPIKE_WINDOW_SEC) с cooldown
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.domain.schemas import CRITICAL_CONTAINERS
from app.services.errors_buffer import errors_buffer
from app.services.state_store import state_store

logger = logging.getLogger(__name__)


class AlertDetector:
    def __init__(self) -> None:
        self._last_seen_event_seq: int = 0
        self._last_error_alert_at: Optional[datetime] = None

    async def check(self) -> list[dict]:
        alerts: list[dict] = []

        # ── контейнерные события ─────────────────────────────────────────────
        new_events = state_store.events_log.since(self._last_seen_event_seq)
        for ev in new_events:
            name = ev["container"]
            if name not in CRITICAL_CONTAINERS:
                continue
            action = ev["action"]
            status = ev["status"]
            ts_unix = int(ev["ts"].timestamp())

            if action in ("stop", "die"):
                alerts.append(
                    {
                        "type": "alert",
                        "ts": ts_unix,
                        "level": "critical",
                        "kind": "container_down",
                        "container": name,
                        "message": f"{name} {action}",
                    }
                )
            elif action == "health_status" and status == "unhealthy":
                alerts.append(
                    {
                        "type": "alert",
                        "ts": ts_unix,
                        "level": "warning",
                        "kind": "container_unhealthy",
                        "container": name,
                        "message": f"{name} unhealthy",
                    }
                )

        if new_events:
            self._last_seen_event_seq = state_store.events_log.latest_seq

        # ── спайк ошибок ─────────────────────────────────────────────────────
        now = datetime.now(tz=timezone.utc)
        cooldown_ok = (
            self._last_error_alert_at is None
            or (now - self._last_error_alert_at).total_seconds()
            >= settings.ERROR_ALERT_COOLDOWN_SEC
        )
        if cooldown_ok:
            spike_count = await errors_buffer.count_last_5min()
            if spike_count >= settings.ERROR_SPIKE_COUNT:
                alerts.append(
                    {
                        "type": "alert",
                        "ts": int(now.timestamp()),
                        "level": "warning",
                        "kind": "api_errors",
                        "count": spike_count,
                        "message": f"{spike_count} errors / 5 min",
                    }
                )
                self._last_error_alert_at = now

        return alerts


alert_detector = AlertDetector()
