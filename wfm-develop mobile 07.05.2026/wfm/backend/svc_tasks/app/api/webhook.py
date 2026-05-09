"""
Вебхук для входящих уведомлений от LAMA.

Публичный endpoint (без JWT). Безопасность — опциональный secret-параметр,
управляемый через LAMA_WEBHOOK_SECRET в config.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.domain.models import Task, ShiftPlan
from app.repositories.shift_repository import ShiftRepository
from app.services.lama_service import TaskLamaService, get_task_lama_service
from app.services.users_client import UsersServiceClient, get_users_service_client
from shared import ok

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.get("/lama")
async def lama_webhook(
    shift_id: int = Query(..., description="ID смены из LAMA (external_id в shifts_plan)"),
    secret: Optional[str] = Query(None, description="Секретный токен (если настроен через LAMA_WEBHOOK_SECRET)"),
    db: Session = Depends(get_db),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    users_client: UsersServiceClient = Depends(get_users_service_client),
):
    """
    Вебхук: LAMA сообщает об изменениях в задачах смены.

    При получении запроса WFM немедленно вызывает синхронизацию задач смены
    через LAMA API (GET /tasks/?shift_id=...) и обновляет локальную БД.

    Параметры:
    - shift_id: ID смены в LAMA (он же external_id в нашей таблице shifts_plan)
    - secret: опциональный токен безопасности (проверяется если задан LAMA_WEBHOOK_SECRET)

    Ответ при успехе:
    {
        "status": {"code": ""},
        "data": {"status": "ok", "shift_external_id": 61003, "tasks_synced": 5}
    }

    Ответ если смена не найдена (не было утренней синхронизации):
    {
        "status": {"code": ""},
        "data": {"status": "not_found", "shift_external_id": 61003, "tasks_synced": 0}
    }
    """
    # Проверка секрета (если задан в конфигурации)
    if settings.LAMA_WEBHOOK_SECRET and secret != settings.LAMA_WEBHOOK_SECRET:
        logger.warning(f"Webhook LAMA: отклонён запрос с неверным secret для shift_id={shift_id}")
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    logger.info(f"Webhook LAMA: получен запрос на синхронизацию shift_id={shift_id}")

    # Найти плановую смену по external_id
    plan = db.query(ShiftPlan).filter(ShiftPlan.external_id == shift_id).first()

    if not plan:
        logger.warning(f"Webhook LAMA: смена с external_id={shift_id} не найдена в БД")
        return ok({"status": "not_found", "shift_external_id": shift_id, "tasks_synced": 0})

    # Получить user_id: сначала из существующих задач, потом через svc_users
    user_id = _resolve_user_id_for_shift(plan, db)

    if user_id is None:
        # Fallback через svc_users
        assignments = await users_client.get_store_assignments_by_assignment(plan.assignment_id)
        user_id = next(
            (a["user_id"] for a in assignments if a["assignment_id"] == plan.assignment_id),
            None,
        )

    if user_id is None:
        logger.error(
            f"Webhook LAMA: не удалось определить user_id для shift_id={shift_id}, "
            f"plan_id={plan.id}, assignment_id={plan.assignment_id}"
        )
        return ok({"status": "error", "shift_external_id": shift_id, "tasks_synced": 0,
                   "message": "Cannot resolve user_id for this shift"})

    # Синхронизация задач из LAMA (graceful degradation)
    try:
        synced = await lama_service.sync_tasks(
            shift_external_id=shift_id,
            shift_id=plan.id,
            user_id=user_id,
            db=db,
        )
        tasks_synced = len(synced) if synced else 0
        logger.info(
            f"Webhook LAMA: синхронизировано задач={tasks_synced} "
            f"для shift_id={shift_id}, plan_id={plan.id}"
        )
        return ok({"status": "ok", "shift_external_id": shift_id, "tasks_synced": tasks_synced})

    except Exception as e:
        logger.error(f"Webhook LAMA: ошибка синхронизации shift_id={shift_id}: {e}")
        return ok({"status": "error", "shift_external_id": shift_id, "tasks_synced": 0,
                   "message": str(e)})


def _resolve_user_id_for_shift(plan: ShiftPlan, db: Session) -> Optional[int]:
    """Получить user_id из уже существующих задач смены"""
    existing = (
        db.query(Task)
        .filter(Task.shift_id == plan.id, Task.assignee_id.isnot(None))
        .first()
    )
    return existing.assignee_id if existing else None
