"""
Кольцевой буфер ошибок от WFM-сервисов. Хранит последние ERRORS_BUFFER_MAXLEN записей.
Используется для счётчика errors_1h в snapshot и для детекции спайков.
"""
from __future__ import annotations
import asyncio
import logging
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.domain.schemas import ErrorReport

logger = logging.getLogger(__name__)

_DEDUP_TTL = timedelta(minutes=5)


class ErrorsBuffer:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._buffer: deque[tuple[datetime, ErrorReport]] = deque(
            maxlen=settings.ERRORS_BUFFER_MAXLEN
        )
        self._dedup_keys: dict[tuple[str, datetime], datetime] = {}

    async def add(self, report: ErrorReport) -> bool:
        """
        Добавить ошибку. Возвращает True если приняли, False если отфильтровано как дубль.
        """
        ts = report.server_ts or datetime.now(tz=timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        async with self._lock:
            # Идемпотентность по (request_id, server_ts) — оба должны быть переданы
            if report.request_id and report.server_ts:
                key = (report.request_id, ts)
                self._gc_dedup(now=datetime.now(tz=timezone.utc))
                if key in self._dedup_keys:
                    return False
                self._dedup_keys[key] = ts
            self._buffer.append((ts, report))
        return True

    def _gc_dedup(self, now: datetime) -> None:
        cutoff = now - _DEDUP_TTL
        # `dict` сохраняет insertion-order; самые старые ключи в начале
        stale = [k for k, ts in self._dedup_keys.items() if ts < cutoff]
        for k in stale:
            del self._dedup_keys[k]

    async def count_within(self, window_sec: int) -> int:
        cutoff = datetime.now(tz=timezone.utc) - timedelta(seconds=window_sec)
        async with self._lock:
            count = 0
            # итерируем с конца — там свежие записи, выходим как только встретили старую
            for ts, _ in reversed(self._buffer):
                if ts < cutoff:
                    break
                count += 1
            return count

    async def count_last_hour(self) -> int:
        return await self.count_within(3600)

    async def count_last_5min(self) -> int:
        return await self.count_within(settings.ERROR_SPIKE_WINDOW_SEC)


errors_buffer = ErrorsBuffer()
