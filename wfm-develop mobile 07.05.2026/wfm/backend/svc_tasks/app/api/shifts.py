"""
API эндпоинты для управления сменами (перенесено из svc_shifts).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.domain.schemas import (
    ShiftStatus,
    ShiftOpenRequest,
    ShiftCloseRequest,
    CurrentShiftResponse,
    TaskState,
    TaskEventType,
)
from app.repositories.shift_repository import ShiftRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.task_event_repository import TaskEventRepository
from app.services.shift_lama_service import ShiftLamaService, get_shift_lama_service
from app.services.users_client import UsersServiceClient, get_users_service_client
from shared import ok, NotFoundException, CurrentUser, get_current_user, ApiException
from shared.schemas.response import ErrorCode

logger = logging.getLogger(__name__)

router = APIRouter(tags=["shifts"])


def _build_current_response(shift, status: ShiftStatus, plan=None) -> CurrentShiftResponse:
    """Преобразовать смену в CurrentShiftResponse"""
    # ShiftFact
    if hasattr(shift, "opened_at"):
        p = plan or getattr(shift, "plan", None)
        return CurrentShiftResponse(
            id=shift.id,
            plan_id=shift.plan_id,
            status=status,
            assignment_id=p.assignment_id if p else 0,
            opened_at=shift.opened_at,
            closed_at=shift.closed_at,
            shift_date=p.shift_date if p else None,
            start_time=p.start_time if p else None,
            end_time=p.end_time if p else None,
            external_id=p.external_id if p else None,
            duration=p.duration if p else None,
        )
    # ShiftPlan
    return CurrentShiftResponse(
        id=shift.id,
        status=status,
        assignment_id=shift.assignment_id,
        shift_date=shift.shift_date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        external_id=getattr(shift, "external_id", None),
        duration=getattr(shift, "duration", None),
    )


@router.post("/open")
async def open_shift(
    data: ShiftOpenRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Открыть смену.

    Создаёт запись в shifts_fact. assignment_id берётся из плановой смены.
    Бизнес-правила:
    - У работника может быть только одна открытая смена одновременно
    """
    shift_repo = ShiftRepository(db)

    plan = shift_repo.get_plan_by_id(data.plan_id)
    if not plan:
        raise NotFoundException(f"Плановая смена с id={data.plan_id} не найдена")

    assignment_id = plan.assignment_id

    open_shift_existing = shift_repo.get_open_shift_by_assignment(assignment_id)
    if open_shift_existing:
        task_repo = TaskRepository(db)
        event_repo = TaskEventRepository(db)

        in_progress = task_repo.get_tasks_by_shift_and_states(
            shift_id=open_shift_existing.plan_id,
            states=[TaskState.IN_PROGRESS],
        )
        for task in in_progress:
            task_repo.transition_state(task.id, TaskState.PAUSED)
            event_repo.create_event(
                task_id=task.id,
                event_type=TaskEventType.PAUSE,
                actor_role="system",
                actor_id=None,
                old_state=TaskState.IN_PROGRESS.value,
                new_state=TaskState.PAUSED.value,
                meta={"reason": "shift_auto_close_on_open"},
            )

        shift_repo.close_shift(open_shift_existing)
        logger.warning(
            f"Автоматически закрыта открытая смена id={open_shift_existing.id} "
            f"(assignment_id={assignment_id}) при открытии новой (plan_id={data.plan_id})"
        )

    shift = shift_repo.create_fact_shift(plan_id=data.plan_id)
    logger.info(f"Открыта смена: id={shift.id}, assignment_id={assignment_id}, plan_id={data.plan_id}")

    return ok(_build_current_response(shift, ShiftStatus.OPENED, plan))


@router.post("/close")
async def close_shift(
    data: ShiftCloseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Закрыть смену.

    Находит открытую смену по plan_id и устанавливает closed_at = NOW().

    Если force=false (по умолчанию):
    - Есть задачи IN_PROGRESS → TASKS_IN_PROGRESS
    - Есть задачи PAUSED → TASKS_PAUSED

    Если force=true:
    - Все задачи IN_PROGRESS переводятся в PAUSED (системный actor)
    - Смена закрывается в штатном режиме
    """
    shift_repo = ShiftRepository(db)
    task_repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)

    shift = shift_repo.get_open_shift_by_plan_id(data.plan_id)
    if not shift:
        raise NotFoundException("У вас нет открытой смены")

    if not data.force:
        in_progress = task_repo.get_tasks_by_shift_and_states(
            shift_id=data.plan_id,
            states=[TaskState.IN_PROGRESS],
        )
        if in_progress:
            raise ApiException("У вас есть задачи в работе", code=ErrorCode.TASKS_IN_PROGRESS)

        paused = task_repo.get_tasks_by_shift_and_states(
            shift_id=data.plan_id,
            states=[TaskState.PAUSED],
        )
        if paused:
            raise ApiException("У вас есть незавершённые задачи", code=ErrorCode.TASKS_PAUSED)
    else:
        in_progress = task_repo.get_tasks_by_shift_and_states(
            shift_id=data.plan_id,
            states=[TaskState.IN_PROGRESS],
        )
        for task in in_progress:
            task_repo.transition_state(task.id, TaskState.PAUSED)
            event_repo.create_event(
                task_id=task.id,
                event_type=TaskEventType.PAUSE,
                actor_role="system",
                actor_id=None,
                old_state=TaskState.IN_PROGRESS.value,
                new_state=TaskState.PAUSED.value,
                meta={"reason": "shift_force_close"},
            )
            logger.info(f"Задача id={task.id} переведена в PAUSED (force shift close)")

    shift = shift_repo.close_shift(shift)

    plan = shift_repo.get_plan_by_id(shift.plan_id) if shift.plan_id else None
    assignment_id = plan.assignment_id if plan else None
    logger.info(f"Закрыта смена: id={shift.id}, assignment_id={assignment_id or '?'}, force={data.force}")

    return ok(_build_current_response(shift, ShiftStatus.CLOSED, plan))


@router.get("/current")
async def get_current_shift(
    assignment_id: int = Query(..., description="ID назначения пользователя (обязательный)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: ShiftLamaService = Depends(get_shift_lama_service),
    users_client: UsersServiceClient = Depends(get_users_service_client),
):
    """
    Получить текущую смену пользователя.

    Логика:
    1. Ищем плановую смену за сегодня в локальной БД
    2. Если план не найден → синхронизируем из LAMA (lazy sync)
    3. Ищем в shifts_fact за сегодня → возвращаем последнюю (OPENED или CLOSED)
    4. Если факта нет, но есть план → возвращаем со статусом NEW
    5. Если нигде нет → возвращаем data: null

    LAMA sync вызывается только если плановой смены нет в локальной БД.
    Основная синхронизация происходит через утренний n8n-джоб в 6:00.
    """
    today = date.today()
    shift_repo = ShiftRepository(db)

    plan_shift = shift_repo.get_first_today_plan_shift(today, assignment_id=assignment_id)

    # Синхронизация из LAMA только если плановой смены за сегодня нет
    if plan_shift is None:
        try:
            external_id = await users_client.get_assignment_external_id(assignment_id)
            if external_id is not None:
                synced = await lama_service.sync_shift(
                    employee_in_shop_id=external_id,
                    assignment_id=assignment_id,
                    db=db,
                )
                if synced is not None:
                    plan_shift = shift_repo.get_first_today_plan_shift(today, assignment_id=assignment_id)
            else:
                logger.warning(
                    f"Пропуск LAMA sync: external_id не найден для assignment_id={assignment_id}"
                )
        except Exception as e:
            logger.warning(f"LAMA shift sync failed: {e}")
            db.rollback()

    # Ищем в shifts_fact за сегодня
    fact_shift = shift_repo.get_last_today_fact_shift(today, assignment_id=assignment_id)
    if fact_shift:
        status = ShiftStatus.OPENED if fact_shift.is_open else ShiftStatus.CLOSED
        plan = shift_repo.get_plan_by_id(fact_shift.plan_id) if fact_shift.plan_id else plan_shift
        return ok(_build_current_response(fact_shift, status, plan))

    # Если факта нет, но есть план → NEW
    if plan_shift:
        return ok(_build_current_response(plan_shift, ShiftStatus.NEW))

    return ok(None)


@router.get("/{shift_id}")
async def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Получить смену по ID"""
    shift_repo = ShiftRepository(db)

    shift = shift_repo.get_fact_by_id(shift_id)
    if not shift:
        raise NotFoundException(f"Смена с id={shift_id} не найдена")

    status = ShiftStatus.OPENED if shift.is_open else ShiftStatus.CLOSED
    plan = shift_repo.get_plan_by_id(shift.plan_id) if shift.plan_id else None

    return ok(_build_current_response(shift, status, plan))
