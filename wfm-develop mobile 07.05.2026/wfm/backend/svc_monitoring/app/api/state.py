"""GET /api/state — JSON snapshot для устройства. Совместим с WS-сообщением `state`."""
from fastapi import APIRouter, Depends

from app.core.auth import require_device_token
from app.services.errors_buffer import errors_buffer
from app.services.state_store import now_unix, state_store

router = APIRouter(prefix="/api", dependencies=[Depends(require_device_token)])


@router.get("/state")
async def get_state() -> dict:
    snapshot = await state_store.snapshot()
    errors_1h = await errors_buffer.count_last_hour()
    return {
        "type": "state",
        "ts": now_unix(),
        "server": snapshot.get("server"),
        "cpu": snapshot.get("cpu"),
        "mem": snapshot.get("mem"),
        "disk": snapshot.get("disk"),
        "containers": snapshot.get("containers", {}),
        "errors_1h": errors_1h,
    }
