"""POST /internal/errors — приём ошибок от других backend-сервисов WFM.

Защита по паттерну `.memory_bank/backend/patterns/inter_service_communication.md`:
доступен только из Docker-сети, через nginx закрыт правилом
`location /monitoring/internal/ { deny all; return 404; }`.
"""
from fastapi import APIRouter

from app.domain.schemas import ErrorReport
from app.services.errors_buffer import errors_buffer

router = APIRouter(prefix="/internal")


@router.post("/errors")
async def report_error(payload: ErrorReport) -> dict:
    accepted = await errors_buffer.add(payload)
    return {"status": "accepted" if accepted else "duplicate"}
