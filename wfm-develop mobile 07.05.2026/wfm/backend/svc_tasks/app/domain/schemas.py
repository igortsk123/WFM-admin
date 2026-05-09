from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime, date, time
from uuid import UUID
from enum import Enum


class TaskType(str, Enum):
    """Тип задачи"""
    PLANNED = "PLANNED"       # Плановая задача (по умолчанию)
    ADDITIONAL = "ADDITIONAL"  # Дополнительная задача (планируется)


class TaskState(str, Enum):
    """Execution state задачи — стадия исполнения работником"""
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"


class TaskReviewState(str, Enum):
    """Review state задачи — стадия приёмки менеджером"""
    NONE = "NONE"
    ON_REVIEW = "ON_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class AcceptancePolicy(str, Enum):
    """Политика приёмки задачи при завершении"""
    AUTO = "AUTO"      # review_state = ACCEPTED автоматически (по умолчанию)
    MANUAL = "MANUAL"  # review_state = ON_REVIEW, ждём менеджера


class TaskEventType(str, Enum):
    """Типы событий аудит-лога задачи"""
    START = "START"                  # NEW → IN_PROGRESS
    PAUSE = "PAUSE"                  # IN_PROGRESS → PAUSED
    RESUME = "RESUME"                # PAUSED → IN_PROGRESS
    COMPLETE = "COMPLETE"            # IN_PROGRESS → COMPLETED
    SEND_TO_REVIEW = "SEND_TO_REVIEW"  # review: NONE → ON_REVIEW (MANUAL policy)
    AUTO_ACCEPT = "AUTO_ACCEPT"      # review: NONE → ACCEPTED (AUTO policy, system)
    ACCEPT = "ACCEPT"                # review: ON_REVIEW → ACCEPTED
    REJECT = "REJECT"                # review: ON_REVIEW → REJECTED


# --- Схемы справочников ---

class WorkTypeResponse(BaseModel):
    """Схема ответа для типа работы"""
    id: int
    name: str
    requires_photo: bool = False
    acceptance_policy: str = "AUTO"
    allow_new_operations: bool = False

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {"id": 1, "name": "Выкладка", "requires_photo": True, "acceptance_policy": "AUTO", "allow_new_operations": False}
        }


class WorkTypeUpdate(BaseModel):
    """Схема обновления типа работы (только MANAGER)"""
    requires_photo: Optional[bool] = None
    acceptance_policy: Optional[str] = None
    allow_new_operations: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {"requires_photo": True, "acceptance_policy": "MANUAL", "allow_new_operations": True}
        }


class ZoneResponse(BaseModel):
    """Схема ответа для зоны"""
    id: int
    name: str
    priority: int

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {"id": 2, "name": "Молочный отдел", "priority": 1}
        }


class CategoryResponse(BaseModel):
    """Схема ответа для категории"""
    id: int
    name: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {"id": 3, "name": "Молочные продукты"}
        }


class WorkTypeListData(BaseModel):
    """Список типов работ"""
    work_types: List[WorkTypeResponse]


class ZoneListData(BaseModel):
    """Список зон"""
    zones: List[ZoneResponse]


class CategoryListData(BaseModel):
    """Список категорий"""
    categories: List[CategoryResponse]


class OperationReviewState(str, Enum):
    """Статус модерации операции"""
    ACCEPTED = "ACCEPTED"  # проверена, видна всем
    PENDING = "PENDING"    # предложена работником, ждёт менеджера
    REJECTED = "REJECTED"  # отклонена (не удаляется)


class OperationResponse(BaseModel):
    """Схема ответа для операции (шага выполнения задачи).

    display_order заполняется только в контексте пары (work_type, zone) —
    когда операция возвращается из GET /operations или внутри задачи.
    Для глобальных эндпоинтов (/operations/pending, approve/reject) — None.
    """
    id: int
    name: str
    review_state: OperationReviewState = OperationReviewState.ACCEPTED
    display_order: Optional[int] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, op: object) -> "OperationResponse":
        """Создать из SQLAlchemy модели Operation (без display_order)."""
        return cls(id=op.id, name=op.name, review_state=op.review_state)

    @classmethod
    def from_model_with_order(cls, op: object, display_order: int) -> "OperationResponse":
        """Создать из Operation + display_order из operation_work_type_zone."""
        return cls(id=op.id, name=op.name, review_state=op.review_state, display_order=display_order)


class OperationListData(BaseModel):
    """Список операций для типа работы и зоны"""
    operations: List[OperationResponse]


class HintResponse(BaseModel):
    """Схема ответа для подсказки"""
    id: int
    work_type_id: int
    zone_id: int
    text: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {"id": 1, "work_type_id": 1, "zone_id": 2, "text": "Расставляй товары лицом к покупателю"}
        }


class HintCreate(BaseModel):
    """Схема создания подсказки (только MANAGER)"""
    work_type_id: int
    zone_id: int
    text: str = Field(..., min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {"work_type_id": 1, "zone_id": 2, "text": "Расставляй товары лицом к покупателю"}
        }
    }


class HintUpdate(BaseModel):
    """Схема обновления подсказки (только MANAGER)"""
    text: str = Field(..., min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {"text": "Проверь срок годности перед выкладкой"}
        }
    }


class HintListData(BaseModel):
    """Список подсказок для типа работы и зоны"""
    hints: List[HintResponse]


# --- Схемы задач ---

class TaskCreate(BaseModel):
    """Схема для создания задачи"""
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    planned_minutes: int = Field(..., gt=0)
    creator_id: int
    assignee_id: Optional[int] = None
    type: TaskType = TaskType.PLANNED
    shift_id: Optional[int] = None
    work_type_id: Optional[int] = None
    zone_id: Optional[int] = None
    category_id: Optional[int] = None
    acceptance_policy: AcceptancePolicy = AcceptancePolicy.MANUAL
    comment: Optional[str] = None
    requires_photo: bool = False

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Выкладка молочных продуктов",
                "description": "Выложить товары в секцию молочных продуктов, проверить сроки годности",
                "planned_minutes": 30,
                "creator_id": 42,
                "assignee_id": 7,
                "shift_id": 42,
                "work_type_id": 1,
                "zone_id": 2,
                "category_id": 3,
                "acceptance_policy": "MANUAL",
                "comment": "Особое внимание — просрочке",
                "requires_photo": False
            }
        }
    }


class TaskUpdate(BaseModel):
    """Схема для обновления задачи"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    planned_minutes: Optional[int] = Field(None, gt=0)
    assignee_id: Optional[int] = None
    work_type_id: Optional[int] = None
    zone_id: Optional[int] = None
    category_id: Optional[int] = None
    acceptance_policy: Optional[AcceptancePolicy] = None
    comment: Optional[str] = None
    requires_photo: Optional[bool] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Выкладка молочных продуктов (обновлено)",
                "planned_minutes": 45,
                "comment": "Обновлённый комментарий от менеджера",
                "requires_photo": True
            }
        }
    }


class WorkInterval(BaseModel):
    """Один промежуток времени, когда задача была в состоянии IN_PROGRESS."""
    time_start: datetime
    # None если задача сейчас IN_PROGRESS (интервал ещё не закрыт)
    time_end: Optional[datetime] = None


class HistoryBrief(BaseModel):
    """Краткая история исполнения задачи для прогресс-бара.

    Вычисляется по таблице task_events на лету.
    """
    time_start: Optional[datetime] = None
    # Суммарное время пребывания задачи в состоянии IN_PROGRESS (в секундах).
    # Если задача сейчас IN_PROGRESS — учитывает текущий незакрытый отрезок.
    duration: int = 0
    # Время последнего изменения execution state (new_state не null)
    time_state_updated: Optional[datetime] = None
    # Промежутки фактической работы: time_start = START/RESUME, time_end = PAUSE/COMPLETE
    # Последний элемент может иметь time_end = None, если задача сейчас IN_PROGRESS
    work_intervals: List[WorkInterval] = []

    model_config = {
        "json_schema_extra": {
            "example": {
                "time_start": "2026-03-02T09:15:00",
                "duration": 720,
                "time_state_updated": "2026-03-02T09:27:00",
                "work_intervals": [
                    {"time_start": "2026-03-02T09:15:00", "time_end": "2026-03-02T09:20:00"},
                    {"time_start": "2026-03-02T09:22:00", "time_end": "2026-03-02T09:27:00"}
                ]
            }
        }
    }


class AssigneeBrief(BaseModel):
    """Краткие данные исполнителя задачи"""
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None


class TaskResponse(BaseModel):
    """Схема ответа с задачей"""
    id: UUID
    title: str
    description: str
    planned_minutes: int
    creator_id: Optional[int]
    assignee_id: Optional[int]
    type: TaskType = TaskType.PLANNED
    state: TaskState
    review_state: TaskReviewState = TaskReviewState.NONE
    acceptance_policy: AcceptancePolicy = AcceptancePolicy.MANUAL
    created_at: datetime
    updated_at: datetime

    # Report fields
    requires_photo: bool = False
    report_text: Optional[str] = None
    report_image_url: Optional[str] = None

    # Integration fields
    external_id: Optional[int] = None
    shift_id: Optional[int] = None
    priority: Optional[int] = None
    work_type_id: Optional[int] = None
    work_type: Optional[WorkTypeResponse] = None
    zone_id: Optional[int] = None
    zone: Optional[ZoneResponse] = None
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    source: Optional[str] = "WFM"
    comment: Optional[str] = None
    review_comment: Optional[str] = None
    assignee: Optional[AssigneeBrief] = None
    history_brief: Optional[HistoryBrief] = None

    # Операции задачи (только в деталях задачи, не в списке)
    operations: List[OperationResponse] = []
    completed_operation_ids: List[int] = []

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                "title": "Выкладка молочных продуктов",
                "description": "Выложить товары в секцию молочных продуктов, проверить сроки годности",
                "planned_minutes": 30,
                "creator_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
                "assignee_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "state": "IN_PROGRESS",
                "review_state": "NONE",
                "acceptance_policy": "MANUAL",
                "created_at": "2026-03-02T09:00:00",
                "updated_at": "2026-03-02T09:15:00",
                "requires_photo": False,
                "report_text": None,
                "report_image_url": None,
                "external_id": None,
                "shift_id": 42,
                "priority": None,
                "work_type_id": 1,
                "work_type": {"id": 1, "name": "Мерчендайзинг"},
                "zone_id": 2,
                "zone": {"id": 2, "name": "Молочный отдел", "priority": 1},
                "category_id": 3,
                "category": {"id": 3, "name": "Молочные продукты"},
                "time_start": "09:00:00",
                "time_end": "10:00:00",
                "source": "WFM",
                "comment": "Особое внимание — просрочке",
                "review_comment": None,
                "history_brief": {
                    "time_start": "2026-03-02T09:15:00",
                    "duration": 720,
                    "time_state_updated": "2026-03-02T09:27:00"
                }
            }
        }


class TaskRejectRequest(BaseModel):
    """Тело запроса для отклонения задачи"""
    reason: str = Field(..., min_length=1, description="Причина отклонения (обязательна)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "reason": "Товар выложен неправильно, ценники не соответствуют"
            }
        }
    }


class TaskStateTransition(BaseModel):
    """Схема для перехода состояния"""
    pass  # Тело не требуется, используется только для валидации endpoint


class TaskEventResponse(BaseModel):
    """Схема ответа с событием задачи"""
    id: int
    task_id: UUID
    event_type: TaskEventType
    actor_id: Optional[int]
    actor_role: str
    old_state: Optional[str]
    new_state: Optional[str]
    old_review_state: Optional[str]
    new_review_state: Optional[str]
    comment: Optional[str]
    meta: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "task_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                "event_type": "START",
                "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "actor_role": "worker",
                "old_state": "NEW",
                "new_state": "IN_PROGRESS",
                "old_review_state": None,
                "new_review_state": None,
                "comment": None,
                "meta": None,
                "created_at": "2026-03-02T09:15:00"
            }
        }


class TaskListData(BaseModel):
    """Схема для списка задач (data всегда объект с именованным массивом)"""
    tasks: List[TaskResponse]


class TaskEventListData(BaseModel):
    """Схема для списка событий задачи"""
    events: List[TaskEventResponse]


# --- Схемы для /list/filters ---

class PositionBriefResponse(BaseModel):
    """Краткие данные должности для списка пользователей"""
    id: int
    code: str
    name: str


class FilterItem(BaseModel):
    """Элемент фильтра"""
    id: int
    title: str


class FilterGroup(BaseModel):
    """Группа фильтра с универсальным массивом элементов"""
    id: str
    title: str
    array: List[FilterItem]


class TaskListFiltersData(BaseModel):
    """Ответ endpoint'а /list/filters.

    task_filter_indices (только в v2): для каждой задачи — тройка индексов
    [work_type_idx, assignee_idx, zone_idx] в соответствующих массивах filters.
    -1 если у задачи отсутствует соответствующий атрибут.
    """
    filters: List[FilterGroup]
    # Только в /list/filters/v2. Пустой список в v1.
    task_filter_indices: List[List[int]] = []


# --- Схемы для /list/users ---

class TaskListUserItem(BaseModel):
    """Сотрудник с плановой сменой сегодня"""
    assignment_id: int
    user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    position: Optional[PositionBriefResponse] = None


class TaskListUsersData(BaseModel):
    """Ответ endpoint'а /list/users"""
    users: List[TaskListUserItem]


# =============================================================================
# Shift Schemas (перенесено из svc_shifts)
# =============================================================================

class ShiftStatus(str, Enum):
    """Статус смены для ответа API"""
    NEW = "NEW"       # Смена из shifts_plan (ещё не открыта)
    OPENED = "OPENED" # Смена открыта (shifts_fact, closed_at = NULL)
    CLOSED = "CLOSED" # Смена закрыта (shifts_fact, closed_at IS NOT NULL)


class ShiftPlanResponse(BaseModel):
    """Схема ответа с данными плановой смены"""
    id: int
    assignment_id: int
    shift_date: date
    start_time: time
    end_time: time
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class ShiftOpenRequest(BaseModel):
    """Схема запроса на открытие смены"""
    plan_id: int

    model_config = {
        "json_schema_extra": {"example": {"plan_id": 42}}
    }


class ShiftCloseRequest(BaseModel):
    """Схема запроса на закрытие смены"""
    plan_id: int
    force: bool = False

    model_config = {
        "json_schema_extra": {"example": {"plan_id": 42, "force": False}}
    }


class CurrentShiftResponse(BaseModel):
    """Схема ответа для текущей смены (из shifts_fact или shifts_plan)"""
    id: int
    plan_id: Optional[int] = None
    status: ShiftStatus
    assignment_id: int
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    shift_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    external_id: Optional[int] = None
    duration: Optional[int] = None

    class Config:
        from_attributes = True
