"""
Внутренние эндпоинты для межсервисного взаимодействия.
Доступны только из Docker-сети, без JWT авторизации.
"""
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.daily_sync_service import get_daily_sync_service, DailySyncService
from app.services.eod_close_service import get_eod_close_service, EodCloseService
from app.services.users_client import get_users_service_client, UsersServiceClient
from shared import ok

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/sync-daily")
async def sync_daily(
    db: Session = Depends(get_db),
    service: DailySyncService = Depends(get_daily_sync_service),
):
    """
    Запустить ежедневную синхронизацию из LAMA.

    Проходит по всем магазинам, синхронизирует сотрудников, смены и задачи.
    Запускается n8n в 6:00 ежедневно.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    logger.info("DailySync: запрос на синхронизацию получен")
    stats = await service.sync_daily(db)
    return ok(stats)


@router.get("/store-codes")
async def get_store_codes(
    users_client: UsersServiceClient = Depends(get_users_service_client),
):
    """
    Получить список всех shop_code из svc_users.

    Прокси для n8n — n8n не имеет прямого доступа к svc_users.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    store_codes = await users_client.get_all_store_codes()
    return ok({"store_codes": store_codes})


@router.post("/sync-store")
async def sync_store(
    shop_code: str = Query(..., description="Код магазина (external_code из svc_users)"),
    service: DailySyncService = Depends(get_daily_sync_service),
):
    """
    Синхронизировать один магазин из LAMA: сотрудники → смены → задачи.

    Каждый assignment обрабатывается в изолированной DB-сессии.
    Предназначен для n8n-цикла (lama_daily_sync_v2): вызывается последовательно
    для каждого магазина — проблема общей сессии отсутствует.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    logger.info(f"sync_store: запрос для shop_code={shop_code}")
    stats = await service.sync_store(shop_code)
    return ok(stats)


@router.post("/close-shifts-eod")
def close_shifts_eod(
    db: Session = Depends(get_db),
    service: EodCloseService = Depends(get_eod_close_service),
):
    """
    Вечернее закрытие всех открытых смен.

    Закрывает все смены с closed_at IS NULL. Задачи IN_PROGRESS → PAUSED.
    Запускается n8n в 23:50 ежедневно.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    logger.info("EodClose: запрос на закрытие смен получен")
    stats = service.close_all(db)
    return ok(stats)


@router.post("/clear-external-ids")
def clear_external_ids(db: Session = Depends(get_db)):
    """
    Очистить external_id у всех задач и плановых смен.

    Только для DEV-среды. Запускается после ежедневной синхронизации из LAMA,
    чтобы тестовые данные не улетели обратно в LAMA при изменении статусов задач.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    result_tasks = db.execute(
        text("UPDATE tasks SET external_id = NULL WHERE external_id IS NOT NULL")
    )
    result_shifts = db.execute(
        text("UPDATE shifts_plan SET external_id = NULL WHERE external_id IS NOT NULL")
    )
    db.commit()
    cleared_tasks = result_tasks.rowcount
    cleared_shifts = result_shifts.rowcount
    logger.info(f"ClearExternalIds: задач={cleared_tasks}, смен={cleared_shifts}")
    return ok({"cleared_tasks": cleared_tasks, "cleared_shifts": cleared_shifts})
