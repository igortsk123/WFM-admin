"""
In-memory snapshot инфраструктуры. Заполняется циклами _metrics_loop и docker_events.stream.
Читается из /api/state и WS broadcast loop.
"""
from __future__ import annotations
import asyncio
import logging
import time
from collections import deque
from datetime import datetime, timezone
from typing import Optional

from app.domain.schemas import (
    ACTION_TO_STATUS,
    CRITICAL_CONTAINERS,
    ContainerStatus,
)

logger = logging.getLogger(__name__)


class _ContainerEventLog:
    """Маленький лог последних контейнерных событий для AlertDetector."""

    def __init__(self, maxlen: int = 100) -> None:
        self._events: deque[dict] = deque(maxlen=maxlen)
        self._seq: int = 0

    def add(self, name: str, action: str, status: ContainerStatus, ts: datetime) -> None:
        self._seq += 1
        self._events.append(
            {
                "seq": self._seq,
                "ts": ts,
                "container": name,
                "action": action,  # "start" | "stop" | "die" | "restart" | "health_status"
                "status": status,
            }
        )

    def since(self, last_seq: int) -> list[dict]:
        return [e for e in self._events if e["seq"] > last_seq]

    @property
    def latest_seq(self) -> int:
        return self._seq


class StateStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._metrics: dict = {}
        self._last_metrics_ts: Optional[datetime] = None
        self._containers: dict[str, ContainerStatus] = {
            name: "unknown" for name in CRITICAL_CONTAINERS
        }
        self.events_log = _ContainerEventLog()

    async def set_metrics(self, props: dict) -> None:
        async with self._lock:
            self._metrics = dict(props)
            self._last_metrics_ts = datetime.now(tz=timezone.utc)

    async def set_container_status(
        self,
        name: str,
        action: str,
        health_status: Optional[str] = None,
    ) -> None:
        """
        Применяет docker event к состоянию контейнера. Возвращается без эффекта,
        если контейнер не входит в CRITICAL_CONTAINERS.
        """
        if name not in CRITICAL_CONTAINERS:
            return
        if action == "health_status":
            status: ContainerStatus = (health_status or "unknown")  # type: ignore[assignment]
            if status not in {"healthy", "unhealthy", "starting"}:
                status = "unknown"
        else:
            status = ACTION_TO_STATUS.get(action, "unknown")
        ts = datetime.now(tz=timezone.utc)
        async with self._lock:
            self._containers[name] = status
        self.events_log.add(name=name, action=action, status=status, ts=ts)

    async def warmup_containers(self, statuses: dict[str, ContainerStatus]) -> None:
        """Прогрев контейнерных статусов (например, из /containers/json при старте)."""
        async with self._lock:
            for name, status in statuses.items():
                if name in self._containers:
                    self._containers[name] = status

    async def snapshot(self) -> dict:
        """Возвращает данные для GET /api/state и WS broadcast (без errors_1h)."""
        async with self._lock:
            cpu = self._metrics.get("cpu_percent")
            mem = self._metrics.get("mem_percent")
            disk = self._metrics.get("disk_percent")
            server = self._metrics.get("server")
            return {
                "server": server,
                "cpu": cpu,
                "mem": mem,
                "disk": disk,
                "containers": dict(self._containers),  # порядок CRITICAL_CONTAINERS сохранён
                "last_metrics_ts": self._last_metrics_ts,
            }


# Singleton
state_store = StateStore()


def now_unix() -> int:
    return int(time.time())
