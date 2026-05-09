import sys
from pathlib import Path

# Добавляем shared модуль в путь
# В контейнере: /app/app/api/tasks.py -> /app (где лежит /app/shared/)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import json
import logging
from fastapi import APIRouter, Depends, Query, Form, File, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from shared import CurrentUser
from app.api.dependencies import get_current_user
from app.domain.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskState,
    TaskReviewState,
    AcceptancePolicy,
    TaskEventType,
    TaskRejectRequest,
    TaskListData,
    TaskEventListData,
    TaskListFiltersData,
    TaskListUsersData,
    TaskListUserItem,
    PositionBriefResponse,
    FilterItem,
    FilterGroup,
    AssigneeBrief,
    OperationResponse,
    OperationReviewState,
)
from app.domain.models import Operation, OperationWorkTypeZone, TaskCompletedOperation
from app.repositories.task_repository import TaskRepository
from app.repositories.task_event_repository import TaskEventRepository
from app.repositories.shift_repository import ShiftRepository
from app.services.lama_service import TaskLamaService, get_task_lama_service
from app.services.users_client import UsersServiceClient, get_users_service_client
from app.services.s3_client import upload_task_image, ALLOWED_CONTENT_TYPES
from app.services.notifications_client import NotificationsServiceClient, get_notifications_client
from shared import (
    ApiResponse,
    ok,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    ValidationException,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tasks"])


def _actor_role(current_user: CurrentUser) -> str:
    """Определить actor_role по роли пользователя"""
    return "manager" if current_user.is_manager else "worker"


def _populate_task_operations(db: Session, task_id: UUID, task: object, response: TaskResponse) -> None:
    """Заполнить operations и completed_operation_ids в TaskResponse.

    operations — список ACCEPTED + PENDING операций для work_type/zone задачи.
    completed_operation_ids — операции, отмеченные работником при завершении.
    """
    if task.work_type_id and task.zone_id:
        rows = db.query(Operation, OperationWorkTypeZone.display_order).join(
            OperationWorkTypeZone,
            OperationWorkTypeZone.operation_id == Operation.id,
        ).filter(
            OperationWorkTypeZone.work_type_id == task.work_type_id,
            OperationWorkTypeZone.zone_id == task.zone_id,
            Operation.review_state.in_([OperationReviewState.ACCEPTED, OperationReviewState.PENDING]),
        ).order_by(OperationWorkTypeZone.display_order, Operation.id).all()
        response.operations = [
            OperationResponse.from_model_with_order(op, display_order)
            for op, display_order in rows
        ]

    completed = db.query(TaskCompletedOperation).filter(
        TaskCompletedOperation.task_id == task_id
    ).all()
    response.completed_operation_ids = [c.operation_id for c in completed]


async def _get_store_today_context(
    assignment_id: int,
    shift_repo: ShiftRepository,
    users_client: UsersServiceClient,
) -> tuple[list[int], list[dict]]:
    """
    Получить контекст магазина на сегодня: plan_ids и назначения сотрудников.

    Returns:
        (plan_ids, assignments) — plan_ids плановых смен на сегодня
        и полный список назначений магазина.
    """
    assignments = await users_client.get_store_assignments_by_assignment(assignment_id)
    if not assignments:
        logger.warning(f"Не удалось получить назначения для assignment_id={assignment_id}")
        return [], []

    from datetime import date
    assignment_ids = [a["assignment_id"] for a in assignments]
    shift_plans = shift_repo.get_today_plans_for_assignments(date.today(), assignment_ids)
    plan_ids = [p.id for p in shift_plans]

    return plan_ids, assignments


def _format_assignee_short_name(
    last_name: Optional[str],
    first_name: Optional[str],
    middle_name: Optional[str],
) -> str:
    """Форматировать ФИО в краткий вид: «Карпычев П.А.» или «Карпычев П» (без отчества)"""
    initials = ""
    if first_name:
        if middle_name:
            initials = f"{first_name[0]}.{middle_name[0]}."
        else:
            initials = first_name[0]
    parts = [p for p in [last_name, initials] if p]
    return " ".join(parts) if parts else "—"


@router.get("/list/filters")
async def get_task_list_filters(
    assignment_id: int = Query(..., description="ID назначения менеджера (для определения магазина)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    users_client: UsersServiceClient = Depends(get_users_service_client),
) -> ApiResponse[TaskListFiltersData]:
    """
    Получить доступные фильтры для списка задач магазина на сегодня.

    Возвращает только зоны и типы работ, которые реально присутствуют
    в задачах сотрудников данного магазина на сегодня — чтобы не показывать
    заведомо пустые варианты фильтра.

    Только для MANAGER.

    **УСТАРЕЛО:** используется приложениями iOS ≤ ? / Android ≤ ?
    Для новых клиентов используйте GET /list/filters/v2.
    См. .memory_bank/backend/api_compatibility.md
    """
    if not current_user.is_manager:
        raise ForbiddenException("Доступ только для менеджеров")

    shift_repo = ShiftRepository(db)
    plan_ids, _ = await _get_store_today_context(assignment_id, shift_repo, users_client)

    if not plan_ids:
        return ok(TaskListFiltersData(filters=[
            FilterGroup(id="zone_ids", title="Зона", array=[]),
            FilterGroup(id="work_type_ids", title="Тип работ", array=[]),
        ]))

    repo = TaskRepository(db)
    tasks = repo.get_all(shift_ids=plan_ids)

    zones_seen: dict[int, FilterItem] = {}
    work_types_seen: dict[int, FilterItem] = {}

    for t in tasks:
        if t.zone_id and t.zone and t.zone_id not in zones_seen:
            zones_seen[t.zone_id] = FilterItem(id=t.zone_id, title=t.zone.name)
        if t.work_type_id and t.work_type and t.work_type_id not in work_types_seen:
            work_types_seen[t.work_type_id] = FilterItem(id=t.work_type_id, title=t.work_type.name)

    zones = sorted(zones_seen.values(), key=lambda x: x.id)
    work_types = sorted(work_types_seen.values(), key=lambda x: x.id)

    return ok(TaskListFiltersData(filters=[
        FilterGroup(id="zone_ids", title="Зона", array=zones),
        FilterGroup(id="work_type_ids", title="Тип работ", array=work_types),
    ]))


@router.get("/list/filters/v2")
async def get_task_list_filters_v2(
    assignment_id: int = Query(..., description="ID назначения менеджера (для определения магазина)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    users_client: UsersServiceClient = Depends(get_users_service_client),
) -> ApiResponse[TaskListFiltersData]:
    """
    Получить доступные фильтры для списка задач магазина на сегодня (v2).

    Отличия от v1:
    - Порядок групп: «Тип работ» → «Сотрудники» → «Зона»
    - Добавлена группа «Сотрудники» (id: assignee_ids) — сотрудники с плановой сменой сегодня
    - Формат имён сотрудников: «Фамилия И.О.» (пример: «Карпычев П.А.»)

    Только для MANAGER.
    """
    if not current_user.is_manager:
        raise ForbiddenException("Доступ только для менеджеров")

    from datetime import date

    shift_repo = ShiftRepository(db)
    plan_ids, assignments = await _get_store_today_context(assignment_id, shift_repo, users_client)

    if not plan_ids:
        return ok(TaskListFiltersData(filters=[
            FilterGroup(id="work_type_ids", title="Тип работ", array=[]),
            FilterGroup(id="assignee_ids", title="Сотрудники", array=[]),
            FilterGroup(id="zone_ids", title="Зона", array=[]),
        ]))

    # Сотрудники с плановой сменой сегодня
    today_plans = shift_repo.get_today_plans_for_assignments(
        date.today(), [a["assignment_id"] for a in assignments]
    )
    assignment_ids_with_plans = {p.assignment_id for p in today_plans}

    assignees_seen: dict[int, FilterItem] = {}
    for a in assignments:
        if a["assignment_id"] not in assignment_ids_with_plans:
            continue
        user_id = a["user_id"]
        if user_id not in assignees_seen:
            assignees_seen[user_id] = FilterItem(
                id=user_id,
                title=_format_assignee_short_name(
                    a.get("last_name"),
                    a.get("first_name"),
                    a.get("middle_name"),
                ),
            )

    assignees = sorted(assignees_seen.values(), key=lambda x: x.title)

    # Зоны и типы работ из задач сегодняшних смен
    repo = TaskRepository(db)
    tasks = repo.get_all(shift_ids=plan_ids)

    zones_seen: dict[int, FilterItem] = {}
    work_types_seen: dict[int, FilterItem] = {}

    for t in tasks:
        if t.zone_id and t.zone and t.zone_id not in zones_seen:
            zones_seen[t.zone_id] = FilterItem(id=t.zone_id, title=t.zone.name)
        if t.work_type_id and t.work_type and t.work_type_id not in work_types_seen:
            work_types_seen[t.work_type_id] = FilterItem(id=t.work_type_id, title=t.work_type.name)

    zones = sorted(zones_seen.values(), key=lambda x: x.id)
    work_types = sorted(work_types_seen.values(), key=lambda x: x.id)

    # Lookup: id → индекс в соответствующем отсортированном массиве фильтра
    work_type_index: dict[int, int] = {item.id: i for i, item in enumerate(work_types)}
    assignee_index: dict[int, int] = {item.id: i for i, item in enumerate(assignees)}
    zone_index: dict[int, int] = {item.id: i for i, item in enumerate(zones)}

    # Для каждой задачи — тройка [work_type_idx, assignee_idx, zone_idx], -1 если отсутствует
    task_filter_indices = [
        [
            work_type_index.get(t.work_type_id, -1) if t.work_type_id else -1,
            assignee_index.get(t.assignee_id, -1) if t.assignee_id else -1,
            zone_index.get(t.zone_id, -1) if t.zone_id else -1,
        ]
        for t in tasks
    ]

    return ok(TaskListFiltersData(
        filters=[
            FilterGroup(id="work_type_ids", title="Тип работ", array=work_types),
            FilterGroup(id="assignee_ids", title="Сотрудники", array=assignees),
            FilterGroup(id="zone_ids", title="Зона", array=zones),
        ],
        task_filter_indices=task_filter_indices,
    ))


@router.get("/list/users")
async def get_task_list_users(
    assignment_id: int = Query(..., description="ID назначения менеджера (для определения магазина)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    users_client: UsersServiceClient = Depends(get_users_service_client),
) -> ApiResponse[TaskListUsersData]:
    """
    Получить список сотрудников магазина, у которых есть плановая смена сегодня.

    Используется для фильтрации задач по конкретному сотруднику.
    Только для MANAGER.
    """
    if not current_user.is_manager:
        raise ForbiddenException("Доступ только для менеджеров")

    shift_repo = ShiftRepository(db)
    # _get_store_today_context уже возвращает plan_ids и assignments с фильтром по сегодня
    plan_ids, assignments = await _get_store_today_context(assignment_id, shift_repo, users_client)

    if not plan_ids or not assignments:
        return ok(TaskListUsersData(users=[]))

    # plan_ids уже содержит только смены на сегодня — строим set assignment_ids из них
    from datetime import date
    today_plans = shift_repo.get_today_plans_for_assignments(
        date.today(), [a["assignment_id"] for a in assignments]
    )
    assignment_ids_with_plans = {p.assignment_id for p in today_plans}

    users_today = []
    for a in assignments:
        if a["assignment_id"] not in assignment_ids_with_plans:
            continue
        pos_data = a.get("position")
        users_today.append(TaskListUserItem(
            assignment_id=a["assignment_id"],
            user_id=a["user_id"],
            first_name=a.get("first_name"),
            last_name=a.get("last_name"),
            middle_name=a.get("middle_name"),
            position=PositionBriefResponse(**pos_data) if pos_data else None,
        ))

    return ok(TaskListUsersData(users=users_today))


@router.get("/list")
async def get_tasks(
    assignment_id: int = Query(..., description="ID назначения менеджера (определяет магазин)"),
    state: Optional[TaskState] = Query(None, description="Фильтр по состоянию"),
    review_state: Optional[TaskReviewState] = Query(None, description="Фильтр по статусу проверки (применяется глобально)"),
    assignee_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву исполнителей"),
    zone_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву зон"),
    work_type_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву типов работ"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    users_client: UsersServiceClient = Depends(get_users_service_client),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
) -> ApiResponse[TaskListData]:
    """
    Получить список задач магазина с фильтрацией.

    При передаче assignment_id автоматически определяет магазин и фильтрует
    задачи по сменам всех сотрудников на сегодня.

    Только для MANAGER.

    Параметры:
    - assignment_id: ID назначения менеджера — определяет магазин
    - state: фильтр по состоянию задачи
    - review_state: фильтр по статусу проверки (глобальный — накладывается поверх всех остальных)
    - assignee_ids: фильтр по массиву ID сотрудников
    - zone_ids: фильтр по массиву ID зон (OR с work_type_ids)
    - work_type_ids: фильтр по массиву ID типов работ (OR с zone_ids)

    **УСТАРЕЛО:** используется приложениями iOS ≤ ? / Android ≤ ?
    zone_ids и work_type_ids применяются как OR. Для AND-логики используйте GET /list/v2.
    См. .memory_bank/backend/api_compatibility.md
    """
    import time
    t_total = time.perf_counter()

    if not current_user.is_manager:
        raise ForbiddenException("Доступ только для менеджеров")

    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)

    # Определяем shift_ids для фильтрации по магазину и собираем данные исполнителей
    shift_repo = ShiftRepository(db)

    t0 = time.perf_counter()
    plan_ids, assignments = await _get_store_today_context(assignment_id, shift_repo, users_client)
    t_store_context = time.perf_counter() - t0

    if not plan_ids:
        # Нет плановых смен на сегодня — задач быть не должно
        return ok(TaskListData(tasks=[]))

    shift_ids: List[int] = plan_ids
    assignees_map: dict[int, AssigneeBrief] = {
        a["user_id"]: AssigneeBrief(
            id=a["user_id"],
            first_name=a.get("first_name"),
            last_name=a.get("last_name"),
            middle_name=a.get("middle_name"),
        )
        for a in assignments
    }

    t0 = time.perf_counter()
    tasks = repo.get_all(
        state=state,
        review_state=review_state,
        assignee_ids=assignee_ids,
        shift_ids=shift_ids,
        zone_ids=zone_ids,
        work_type_ids=work_type_ids,
    )
    t_get_tasks = time.perf_counter() - t0

    task_ids = [t.id for t in tasks]

    t0 = time.perf_counter()
    history_briefs = event_repo.get_history_briefs_for_tasks(task_ids)
    t_history_briefs = time.perf_counter() - t0

    t0 = time.perf_counter()
    task_responses = []
    for t in tasks:
        r = TaskResponse.model_validate(t)
        r.history_brief = history_briefs.get(t.id)
        if t.assignee_id:
            r.assignee = assignees_map.get(t.assignee_id)
        task_responses.append(r)
    t_serialize = time.perf_counter() - t0

    t_total = time.perf_counter() - t_total
    logger.info(
        "[TIMING] GET /list assignment_id=%s state=%s review_state=%s tasks=%d | "
        "store_context=%.0fms get_tasks=%.0fms history_briefs=%.0fms serialize=%.0fms TOTAL=%.0fms",
        assignment_id, state, review_state, len(tasks),
        t_store_context * 1000, t_get_tasks * 1000, t_history_briefs * 1000,
        t_serialize * 1000, t_total * 1000,
    )

    return ok(TaskListData(tasks=task_responses))


@router.get("/list/v2")
async def get_tasks_v2(
    assignment_id: int = Query(..., description="ID назначения менеджера (определяет магазин)"),
    state: Optional[TaskState] = Query(None, description="Фильтр по состоянию"),
    review_state: Optional[TaskReviewState] = Query(None, description="Фильтр по статусу проверки (применяется глобально)"),
    assignee_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву исполнителей"),
    zone_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву зон (AND с work_type_ids)"),
    work_type_ids: Optional[List[int]] = Query(None, description="Фильтр по массиву типов работ (AND с zone_ids)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    users_client: UsersServiceClient = Depends(get_users_service_client),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
) -> ApiResponse[TaskListData]:
    """
    Получить список задач магазина с фильтрацией (v2).

    Отличия от v1:
    - zone_ids и work_type_ids применяются как пересечение (AND):
      задача попадает в результат только если совпадают оба фильтра одновременно.

    Только для MANAGER.
    """
    import time
    t_total = time.perf_counter()

    if not current_user.is_manager:
        raise ForbiddenException("Доступ только для менеджеров")

    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    shift_repo = ShiftRepository(db)

    t0 = time.perf_counter()
    plan_ids, assignments = await _get_store_today_context(assignment_id, shift_repo, users_client)
    t_store_context = time.perf_counter() - t0

    if not plan_ids:
        return ok(TaskListData(tasks=[]))

    shift_ids: List[int] = plan_ids
    assignees_map: dict[int, AssigneeBrief] = {
        a["user_id"]: AssigneeBrief(
            id=a["user_id"],
            first_name=a.get("first_name"),
            last_name=a.get("last_name"),
            middle_name=a.get("middle_name"),
        )
        for a in assignments
    }

    t0 = time.perf_counter()
    tasks = repo.get_all(
        state=state,
        review_state=review_state,
        assignee_ids=assignee_ids,
        shift_ids=shift_ids,
        zone_ids=zone_ids,
        work_type_ids=work_type_ids,
        intersection=True,
    )
    t_get_tasks = time.perf_counter() - t0

    task_ids = [t.id for t in tasks]

    t0 = time.perf_counter()
    history_briefs = event_repo.get_history_briefs_for_tasks(task_ids)
    t_history_briefs = time.perf_counter() - t0

    t0 = time.perf_counter()
    task_responses = []
    for t in tasks:
        r = TaskResponse.model_validate(t)
        r.history_brief = history_briefs.get(t.id)
        if t.assignee_id:
            r.assignee = assignees_map.get(t.assignee_id)
        task_responses.append(r)
    t_serialize = time.perf_counter() - t0

    t_total = time.perf_counter() - t_total
    logger.info(
        "[TIMING] GET /list/v2 assignment_id=%s state=%s review_state=%s tasks=%d | "
        "store_context=%.0fms get_tasks=%.0fms history_briefs=%.0fms serialize=%.0fms TOTAL=%.0fms",
        assignment_id, state, review_state, len(tasks),
        t_store_context * 1000, t_get_tasks * 1000, t_history_briefs * 1000,
        t_serialize * 1000, t_total * 1000,
    )

    return ok(TaskListData(tasks=task_responses))


@router.get("/my")
async def get_my_tasks(
    assignment_id: int = Query(..., description="ID назначения пользователя (обязательный)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
) -> ApiResponse[TaskListData]:
    """
    Получить список задач текущего пользователя.

    Логика:
    1. Ищет плановую смену на сегодня по assignment_id (смена не обязана быть открыта)
    2. Если нет плановой смены на сегодня — возвращает ошибку NOT_FOUND
    3. Читает задачи из локальной БД
    4. Если список пуст — синхронизирует задачи из LAMA (lazy sync) и повторно читает
    5. Возвращает задачи по shift_id = plan_id

    LAMA sync вызывается только если задач нет в локальной БД.
    Основная синхронизация происходит через утренний n8n-джоб в 6:00.

    Параметры:
    - assignment_id: ID назначения пользователя (обязательный)
    """
    from datetime import date

    shift_repo = ShiftRepository(db)
    plan = shift_repo.get_first_today_plan_shift(date.today(), assignment_id)

    if not plan:
        raise NotFoundException(
            f"Нет плановой смены на сегодня для assignment_id={assignment_id}"
        )

    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)

    tasks = repo.get_all(shift_id=plan.id, sort_by_cluster=True)

    # Синхронизация задач из LAMA только если список пуст (graceful degradation)
    if not tasks and plan.external_id:
        try:
            await lama_service.sync_tasks(
                shift_external_id=plan.external_id,
                shift_id=plan.id,
                user_id=current_user.user_id,
                db=db,
            )
            tasks = repo.get_all(shift_id=plan.id, sort_by_cluster=True)
        except Exception as e:
            logger.warning(f"Не удалось синхронизировать задачи из LAMA: {e}")

    task_ids = [t.id for t in tasks]
    history_briefs = event_repo.get_history_briefs_for_tasks(task_ids)

    task_responses = []
    for t in tasks:
        r = TaskResponse.model_validate(t)
        r.history_brief = history_briefs.get(t.id)
        task_responses.append(r)

    return ok(TaskListData(tasks=task_responses))


@router.post("/")
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[TaskResponse]:
    """Создать новую задачу"""
    repo = TaskRepository(db)

    # Проверка: если задача назначена, у сотрудника не должно быть активной задачи
    if task_data.assignee_id:
        active_task = repo.get_active_task_for_assignee(task_data.assignee_id)
        if active_task:
            raise ConflictException(
                f"У сотрудника уже есть активная задача: {active_task.id}"
            )

    task = repo.create(task_data)
    from app.core import analytics
    analytics.track(
        "task_created",
        user_id=str(current_user.user_id),
        properties={
            "task_id": str(task.id),
            "task_type": task.type,
            "work_type_id": task.work_type_id,
            "has_assignee": task.assignee_id is not None,
        },
    )
    return ok(TaskResponse.model_validate(task))


@router.get("/{task_id}")
async def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
) -> ApiResponse[TaskResponse]:
    """Получить задачу по ID.

    Перед выдачей данных синхронизирует задачу из LAMA (если задача привязана
    к смене с external_id). Ответ включает history_brief для прогресс-бара.
    """
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    # Синхронизация из LAMA — graceful degradation, прямой запрос к локальной БД
    if task.shift_id and task.assignee_id:
        try:
            shift_repo = ShiftRepository(db)
            plan = shift_repo.get_plan_by_id(task.shift_id)
            if plan and plan.external_id:
                await lama_service.sync_tasks(
                    shift_external_id=plan.external_id,
                    shift_id=task.shift_id,
                    user_id=task.assignee_id,
                    db=db,
                )
                # Перечитываем задачу с актуальными данными после синхронизации
                task = repo.get_by_id(task_id)
        except Exception as e:
            logger.warning(f"Не удалось синхронизировать задачу {task_id} из LAMA: {e}")

    response = TaskResponse.model_validate(task)
    response.history_brief = event_repo.get_history_brief(task_id)
    _populate_task_operations(db, task_id, task, response)
    return ok(response)


@router.patch("/{task_id}")
def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[TaskResponse]:
    """Обновить поля задачи"""
    repo = TaskRepository(db)
    task = repo.update(task_id, task_data)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    return ok(TaskResponse.model_validate(task))


@router.post("/{task_id}/start")
async def start_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Начать выполнение задачи (NEW -> IN_PROGRESS)"""
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    # Проверка: у сотрудника не должно быть другой активной задачи
    if task.assignee_id:
        active_task = repo.get_active_task_for_assignee(task.assignee_id)
        if active_task and active_task.id != task_id:
            raise ConflictException(
                f"У сотрудника уже есть активная задача: {active_task.id}"
            )

    old_state = task.state
    try:
        task = repo.transition_state(task_id, TaskState.IN_PROGRESS)

        event_repo.create_event(
            task_id=task.id,
            event_type=TaskEventType.START,
            actor_id=current_user.user_id,
            actor_role=_actor_role(current_user),
            old_state=old_state,
            new_state=task.state,
        )

        if task.external_id:
            await lama_service.sync_task_status_to_lama(task, "InProgress")

        # Уведомление работнику об изменении состояния (WEBSOCKET_ONLY)
        if task.assignee_id and task.assignee_id != current_user.user_id:
            await notifications.send(
                recipient_id=task.assignee_id,
                category="TASK_STATE_CHANGED",
                data={"task_id": str(task.id), "task_title": task.title, "new_state": "IN_PROGRESS",
                      "actor_name": "Менеджер"},
            )

        response = TaskResponse.model_validate(task)
        response.history_brief = event_repo.get_history_brief(task_id)
        _populate_task_operations(db, task_id, task, response)
        return ok(response)
    except ValueError as e:
        raise ConflictException(str(e))


@router.post("/{task_id}/pause")
async def pause_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Приостановить выполнение задачи (IN_PROGRESS -> PAUSED)"""
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    old_state = task.state
    try:
        task = repo.transition_state(task_id, TaskState.PAUSED)

        event_repo.create_event(
            task_id=task.id,
            event_type=TaskEventType.PAUSE,
            actor_id=current_user.user_id,
            actor_role=_actor_role(current_user),
            old_state=old_state,
            new_state=task.state,
        )

        if task.external_id:
            await lama_service.sync_task_status_to_lama(task, "Suspended")

        if task.assignee_id and task.assignee_id != current_user.user_id:
            await notifications.send(
                recipient_id=task.assignee_id,
                category="TASK_STATE_CHANGED",
                data={"task_id": str(task.id), "task_title": task.title, "new_state": "PAUSED",
                      "actor_name": "Менеджер"},
            )

        response = TaskResponse.model_validate(task)
        response.history_brief = event_repo.get_history_brief(task_id)
        _populate_task_operations(db, task_id, task, response)
        return ok(response)
    except ValueError as e:
        raise ConflictException(str(e))


@router.post("/{task_id}/resume")
async def resume_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Возобновить выполнение задачи (PAUSED -> IN_PROGRESS)"""
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    # Проверка: у сотрудника не должно быть другой активной задачи
    if task.assignee_id:
        active_task = repo.get_active_task_for_assignee(task.assignee_id)
        if active_task and active_task.id != task_id:
            raise ConflictException(
                f"У сотрудника уже есть активная задача: {active_task.id}"
            )

    old_state = task.state
    try:
        task = repo.transition_state(task_id, TaskState.IN_PROGRESS)

        event_repo.create_event(
            task_id=task.id,
            event_type=TaskEventType.RESUME,
            actor_id=current_user.user_id,
            actor_role=_actor_role(current_user),
            old_state=old_state,
            new_state=task.state,
        )

        if task.external_id:
            await lama_service.sync_task_status_to_lama(task, "InProgress")

        if task.assignee_id and task.assignee_id != current_user.user_id:
            await notifications.send(
                recipient_id=task.assignee_id,
                category="TASK_STATE_CHANGED",
                data={"task_id": str(task.id), "task_title": task.title, "new_state": "IN_PROGRESS",
                      "actor_name": "Менеджер"},
            )

        response = TaskResponse.model_validate(task)
        response.history_brief = event_repo.get_history_brief(task_id)
        _populate_task_operations(db, task_id, task, response)
        return ok(response)
    except ValueError as e:
        raise ConflictException(str(e))


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    report_text: Optional[str] = Form(None, description="Текстовый отчёт работника (опционально)"),
    report_image: Optional[UploadFile] = File(None, description="Фото выполненной задачи (опционально)"),
    operation_ids: Optional[str] = Form(None, description="JSON-массив int: id операций, отмеченных работником"),
    new_operations: Optional[str] = Form(None, description="JSON-массив string: новые операции (только если work_type.allow_new_operations=true)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Завершить задачу (IN_PROGRESS или PAUSED -> COMPLETED).

    Принимает `multipart/form-data` с опциональными полями:
    - `report_text` — текстовый комментарий работника
    - `report_image` — одна фотография (image/jpeg, image/png, image/webp, image/heic)
    - `operation_ids` — JSON-массив int, операции отмеченные работником ([1, 2, 3])
    - `new_operations` — JSON-массив string, новые операции (["Протереть полку"]); только если work_type.allow_new_operations=true

    Если у задачи `requires_photo = true` и фото не передано — возвращает 400.

    Применяет acceptance_policy:
    - AUTO: review_state = ACCEPTED автоматически; события COMPLETE + AUTO_ACCEPT
    - MANUAL: review_state = ON_REVIEW; события COMPLETE + SEND_TO_REVIEW
    """
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    # Парсинг operation_ids
    parsed_operation_ids: List[int] = []
    if operation_ids:
        try:
            parsed_operation_ids = json.loads(operation_ids)
            if not isinstance(parsed_operation_ids, list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            raise ValidationException("operation_ids должен быть JSON-массивом чисел, например: [1, 2, 3]")

    # Парсинг new_operations
    parsed_new_operations: List[str] = []
    if new_operations:
        try:
            parsed_new_operations = json.loads(new_operations)
            if not isinstance(parsed_new_operations, list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            raise ValidationException("new_operations должен быть JSON-массивом строк, например: [\"Протереть полку\"]")

    # Валидация: new_operations разрешены только если work_type это допускает
    if parsed_new_operations:
        if not task.work_type_id or not task.zone_id:
            raise ValidationException("Нельзя предлагать новые операции для задачи без типа работы и зоны")
        if not task.work_type or not task.work_type.allow_new_operations:
            raise ValidationException("Для данного типа работы нельзя предлагать новые операции")

    # Валидация: если задача требует фото — оно должно быть передано
    if task.requires_photo and not report_image:
        raise ValidationException("Для завершения этой задачи необходимо приложить фотоотчёт")

    # Валидация типа файла
    if report_image and report_image.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationException(
            f"Неподдерживаемый тип файла: {report_image.content_type}. "
            f"Допустимые: image/jpeg, image/png, image/webp, image/heic"
        )

    # Загрузка фото в S3
    report_image_url = None
    if report_image:
        try:
            report_image_url = await upload_task_image(report_image, str(task_id))
        except (ValueError, RuntimeError) as e:
            raise ValidationException(str(e))

    # Создание новых операций, предложенных работником
    new_operation_ids: List[int] = []
    next_order: int = 0
    if parsed_new_operations:
        max_order = db.query(func.max(OperationWorkTypeZone.display_order)).filter(
            OperationWorkTypeZone.work_type_id == task.work_type_id,
            OperationWorkTypeZone.zone_id == task.zone_id,
        ).scalar()
        next_order = (max_order + 1) if max_order is not None else 0

    for op_name in parsed_new_operations:
        op_name = op_name.strip()
        if not op_name:
            continue
        new_op = Operation(name=op_name, review_state=OperationReviewState.PENDING)
        db.add(new_op)
        db.flush()
        db.add(OperationWorkTypeZone(
            operation_id=new_op.id,
            work_type_id=task.work_type_id,
            zone_id=task.zone_id,
            display_order=next_order,
        ))
        next_order += 1
        new_operation_ids.append(new_op.id)
        parsed_operation_ids.append(new_op.id)

    # Сохранение выполненных операций: очищаем старые записи (возможны при повторном /complete после reject)
    db.query(TaskCompletedOperation).filter(
        TaskCompletedOperation.task_id == task_id
    ).delete(synchronize_session=False)
    for op_id in set(parsed_operation_ids):
        db.add(TaskCompletedOperation(task_id=task_id, operation_id=op_id))
    if parsed_operation_ids:
        db.flush()

    # Сохраняем отчёт в задаче
    repo.save_report(task_id, report_text, report_image_url)

    old_state = task.state
    old_review_state = task.review_state
    policy = AcceptancePolicy(task.acceptance_policy)

    try:
        task = repo.transition_state(task_id, TaskState.COMPLETED)

        # Событие COMPLETE — report_text в comment, данные операций и фото в meta
        event_meta: dict = {}
        if report_image_url:
            event_meta["image_url"] = report_image_url
        existing_op_ids = [i for i in set(parsed_operation_ids) if i not in new_operation_ids]
        if existing_op_ids:
            event_meta["operation_ids"] = existing_op_ids
        if new_operation_ids:
            event_meta["new_operation_ids"] = new_operation_ids

        event_repo.create_event(
            task_id=task.id,
            event_type=TaskEventType.COMPLETE,
            actor_id=current_user.user_id,
            actor_role=_actor_role(current_user),
            old_state=old_state,
            new_state=task.state,
            old_review_state=old_review_state,
            new_review_state=old_review_state,
            comment=report_text,
            meta=event_meta or None,
        )

        if policy == AcceptancePolicy.AUTO:
            # Автоматическая приёмка
            task = repo.set_review_state(task_id, TaskReviewState.ACCEPTED, review_comment=None)
            event_repo.create_event(
                task_id=task.id,
                event_type=TaskEventType.AUTO_ACCEPT,
                actor_id=None,
                actor_role="system",
                old_review_state=old_review_state,
                new_review_state=task.review_state,
            )
        else:
            # Ручная проверка менеджером
            task = repo.set_review_state(task_id, TaskReviewState.ON_REVIEW, review_comment=None)
            event_repo.create_event(
                task_id=task.id,
                event_type=TaskEventType.SEND_TO_REVIEW,
                actor_id=current_user.user_id,
                actor_role=_actor_role(current_user),
                old_review_state=old_review_state,
                new_review_state=task.review_state,
            )
            # Уведомление менеджеру (создателю задачи) — задача на проверке
            if task.creator_id:
                await notifications.send(
                    recipient_id=task.creator_id,
                    category="TASK_REVIEW",
                    data={"task_id": str(task.id), "task_title": task.title,
                          "worker_id": current_user.user_id},
                )

        if task.external_id:
            lama_comment: Optional[str] = None
            if parsed_operation_ids and task.work_type and task.work_type.allow_new_operations:
                ops = db.query(Operation).filter(Operation.id.in_(parsed_operation_ids)).all()
                op_names = [op.name for op in ops if op.name]
                if op_names:
                    lama_comment = ", ".join(op_names)
            await lama_service.sync_task_status_to_lama(
                task,
                "Completed",
                comment=lama_comment,
            )

        from app.core import analytics
        analytics.track(
            "task_completed",
            user_id=str(current_user.user_id),
            properties={
                "task_id": str(task_id),
                "task_type": task.type,
                "work_type_id": task.work_type_id,
                "has_photo": report_image is not None,
                "has_text": bool(report_text),
            },
        )
        response = TaskResponse.model_validate(task)
        response.history_brief = event_repo.get_history_brief(task_id)
        _populate_task_operations(db, task_id, task, response)
        return ok(response)
    except ValueError as e:
        raise ConflictException(str(e))


@router.post("/{task_id}/approve")
async def approve_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Принять выполнение задачи (только MANAGER).

    Задача должна быть COMPLETED с review_state = ON_REVIEW.
    Устанавливает review_state = ACCEPTED, записывает событие ACCEPT.
    Отправляет статус Accepted в LAMA (если задача из LAMA).
    """
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    if task.state != TaskState.COMPLETED.value:
        raise ConflictException("Можно принять только завершённую задачу (state=COMPLETED)")

    if task.review_state != TaskReviewState.ON_REVIEW.value:
        raise ConflictException(
            f"Задача не ожидает проверки (review_state={task.review_state}, ожидается ON_REVIEW)"
        )

    old_review_state = task.review_state
    task = repo.set_review_state(task_id, TaskReviewState.ACCEPTED, review_comment=None)

    event_repo.create_event(
        task_id=task.id,
        event_type=TaskEventType.ACCEPT,
        actor_id=current_user.user_id,
        actor_role="manager",
        old_review_state=old_review_state,
        new_review_state=task.review_state,
    )

    if task.external_id:
        await lama_service.sync_task_status_to_lama(task, "Accepted")

    # Уведомление работнику об изменении состояния задачи (задача принята)
    if task.assignee_id:
        await notifications.send(
            recipient_id=task.assignee_id,
            category="TASK_STATE_CHANGED",
            data={"task_id": str(task.id), "task_title": task.title,
                  "new_state": "COMPLETED", "actor_name": "Менеджер"},
        )

    response = TaskResponse.model_validate(task)
    response.history_brief = event_repo.get_history_brief(task_id)
    _populate_task_operations(db, task_id, task, response)
    return ok(response)


@router.post("/{task_id}/reject")
async def reject_task(
    task_id: UUID,
    body: TaskRejectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    lama_service: TaskLamaService = Depends(get_task_lama_service),
    notifications: NotificationsServiceClient = Depends(get_notifications_client),
) -> ApiResponse[TaskResponse]:
    """Отклонить выполнение задачи (только MANAGER).

    Задача должна быть COMPLETED с review_state = ON_REVIEW.
    Поле reason обязательно (min_length=1).
    Устанавливает review_state = REJECTED, task.state = PAUSED.
    Записывает событие REJECT с комментарием.
    Отправляет статус Returned в LAMA (если задача из LAMA).
    """
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    if task.state != TaskState.COMPLETED.value:
        raise ConflictException("Можно отклонить только завершённую задачу (state=COMPLETED)")

    if task.review_state != TaskReviewState.ON_REVIEW.value:
        raise ConflictException(
            f"Задача не ожидает проверки (review_state={task.review_state}, ожидается ON_REVIEW)"
        )

    old_state = task.state
    old_review_state = task.review_state

    # COMPLETED → PAUSED + REJECTED — специальный переход через review flow,
    # обходит state machine намеренно (см. TaskRepository.reject_to_paused)
    task = repo.reject_to_paused(task_id, review_comment=body.reason)

    event_repo.create_event(
        task_id=task.id,
        event_type=TaskEventType.REJECT,
        actor_id=current_user.user_id,
        actor_role="manager",
        old_state=old_state,
        new_state=task.state,
        old_review_state=old_review_state,
        new_review_state=task.review_state,
        comment=body.reason,
    )

    if task.external_id:
        await lama_service.sync_task_status_to_lama(task, "Returned")

    # Уведомление работнику — задача отклонена с причиной (WEBSOCKET_THEN_PUSH)
    if task.assignee_id:
        await notifications.send(
            recipient_id=task.assignee_id,
            category="TASK_REJECTED",
            data={"task_id": str(task.id), "task_title": task.title,
                  "reject_reason": body.reason},
        )

    from app.core import analytics
    analytics.track(
        "task_rejected",
        user_id=str(current_user.user_id),
        properties={
            "task_id": str(task_id),
            "task_type": task.type,
            "work_type_id": task.work_type_id,
        },
    )
    response = TaskResponse.model_validate(task)
    response.history_brief = event_repo.get_history_brief(task_id)
    _populate_task_operations(db, task_id, task, response)
    return ok(response)


@router.get("/{task_id}/events")
def get_task_events(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[TaskEventListData]:
    """Получить историю событий задачи (аудит-лог).

    MANAGER видит события любой задачи.
    WORKER видит события только своих задач.
    """
    repo = TaskRepository(db)
    event_repo = TaskEventRepository(db)
    task = repo.get_by_id(task_id)

    if not task:
        raise NotFoundException(f"Задача {task_id} не найдена")

    # WORKER может видеть события только своих задач
    if not current_user.is_manager:
        if task.assignee_id != current_user.user_id:
            raise ForbiddenException("Нет доступа к событиям этой задачи")

    events = event_repo.get_events_for_task(task_id)
    from app.domain.schemas import TaskEventResponse
    return ok(TaskEventListData(events=[TaskEventResponse.model_validate(e) for e in events]))
