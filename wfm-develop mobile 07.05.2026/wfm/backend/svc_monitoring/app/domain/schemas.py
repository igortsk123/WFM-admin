from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# Контейнеры — каноничный порядок и набор статусов
# ──────────────────────────────────────────────────────────────────────────────

# Порядок отображения на устройстве задаётся этим кортежем.
# state_store сохраняет порядок, ConnectionManager шлёт устройству dict в insertion-order.
CRITICAL_CONTAINERS: tuple[str, ...] = (
    "postgres",
    "svc_tasks",
    "svc_users",
    "svc_notifications",
)

ContainerStatus = Literal["healthy", "starting", "unhealthy", "stopped", "unknown"]

# Маппинг docker action → предварительный статус контейнера до прихода health_status
ACTION_TO_STATUS: dict[str, ContainerStatus] = {
    "start": "starting",
    "restart": "starting",
    "stop": "stopped",
    "die": "stopped",
}


# ──────────────────────────────────────────────────────────────────────────────
# /internal/errors
# ──────────────────────────────────────────────────────────────────────────────

class ErrorReport(BaseModel):
    service: str
    status_code: int
    path: str
    method: str
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    request_id: Optional[str] = None
    server_ts: Optional[datetime] = None


# ──────────────────────────────────────────────────────────────────────────────
# Алерты — формат, который улетает на устройство
# ──────────────────────────────────────────────────────────────────────────────

class Alert(BaseModel):
    type: Literal["alert"] = "alert"
    ts: int  # unix seconds
    level: Literal["critical", "warning"]
    kind: Literal[
        "container_down",
        "container_unhealthy",
        "api_errors",
    ]
    container: Optional[str] = None
    count: Optional[int] = None
    message: str = Field(max_length=120)
