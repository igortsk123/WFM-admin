from sqlalchemy import Column, String, Integer, DateTime, Text, Time, Date, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class ShiftPlan(Base):
    """Плановая смена (перенесено из svc_shifts)"""

    __tablename__ = "shifts_plan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, nullable=False, index=True)  # ссылка на assignment из svc_users
    shift_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    external_id = Column(Integer, nullable=True, unique=True)  # id смены из LAMA
    duration = Column(Integer, nullable=True)                  # длительность в часах из LAMA
    partner_id = Column(Integer, nullable=True)                # ID партнёра (2 = LAMA); NULL для ручных смен
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, nullable=True)                # integer ID пользователя

    def __repr__(self):
        return f"<ShiftPlan(id={self.id}, assignment_id={self.assignment_id}, date={self.shift_date})>"


class ShiftFact(Base):
    """Фактическая смена (перенесено из svc_shifts)"""

    __tablename__ = "shifts_fact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("shifts_plan.id"), nullable=False, index=True)
    opened_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    plan = relationship("ShiftPlan", lazy="joined")

    def __repr__(self):
        return f"<ShiftFact(id={self.id}, plan_id={self.plan_id}, opened_at={self.opened_at})>"

    @property
    def is_open(self) -> bool:
        return self.closed_at is None


class WorkType(Base):
    """Справочник типов работ"""

    __tablename__ = "work_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    requires_photo = Column(Boolean, nullable=False, default=False)
    acceptance_policy = Column(String(10), nullable=False, default="AUTO")
    allow_new_operations = Column(Boolean, nullable=False, default=False)

    def __repr__(self):
        return f"<WorkType(id={self.id}, name={self.name}, requires_photo={self.requires_photo}, acceptance_policy={self.acceptance_policy})>"


class Zone(Base):
    """Справочник зон"""

    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    priority = Column(Integer, nullable=False, default=0)

    def __repr__(self):
        return f"<Zone(id={self.id}, name={self.name})>"


class Category(Base):
    """Справочник категорий"""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)

    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name})>"


class Task(Base):
    """Модель задачи в базе данных"""

    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    planned_minutes = Column(Integer, nullable=False)
    creator_id = Column(Integer, nullable=True)   # integer ID из svc_users (nullable для обратной совместимости)
    assignee_id = Column(Integer, nullable=True)  # integer ID из svc_users
    type = Column(String(50), nullable=False, default="PLANNED")  # TaskType: PLANNED | ADDITIONAL
    state = Column(String(50), nullable=False, default="NEW")
    review_state = Column(String(50), nullable=False, default="NONE")
    acceptance_policy = Column(String(50), nullable=False, default="MANUAL")
    comment = Column(Text, nullable=True)         # Произвольный комментарий от создателя/редактора
    review_comment = Column(Text, nullable=True)  # Последний комментарий к review_state (reason при reject)
    requires_photo = Column(Boolean, nullable=False, default=False)  # Обязательно фото при завершении
    report_text = Column(Text, nullable=True)      # Текстовый отчёт работника при завершении
    report_image_url = Column(String(500), nullable=True)  # URL фото в S3
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # LAMA integration fields
    external_id = Column(Integer, nullable=True, index=True)       # id задачи из LAMA
    shift_id = Column(Integer, nullable=True, index=True)          # ссылка на shifts_plan.id из svc_shifts
    priority = Column(Integer, nullable=True)
    work_type_id = Column(Integer, ForeignKey('work_types.id'), nullable=True)
    zone_id = Column(Integer, ForeignKey('zones.id'), nullable=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    time_start = Column(Time, nullable=True)                        # Плановое время начала
    time_end = Column(Time, nullable=True)                          # Плановое время окончания
    source = Column(String(50), default="WFM")                     # "WFM" | "LAMA"

    # Relationships
    work_type = relationship("WorkType", lazy="joined")
    zone = relationship("Zone", lazy="joined")
    category = relationship("Category", lazy="joined")

    def __repr__(self):
        return f"<Task(id={self.id}, title={self.title}, state={self.state}, review_state={self.review_state})>"


class Operation(Base):
    """Операция — конкретный шаг выполнения задачи, с набором подсказок.

    review_state: ACCEPTED — проверена; PENDING — предложена работником, ждёт модерации;
    REJECTED — отклонена (не удаляется, т.к. задача в истории может ссылаться).
    """

    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    review_state = Column(String(20), nullable=False, default="ACCEPTED")
    hint_1 = Column(Text, nullable=True)
    hint_2 = Column(Text, nullable=True)
    hint_3 = Column(Text, nullable=True)
    hint_4 = Column(Text, nullable=True)
    hint_5 = Column(Text, nullable=True)
    hint_6 = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Operation(id={self.id}, name={self.name}, review_state={self.review_state})>"


class OperationWorkTypeZone(Base):
    """Маппинг операций на тип работы и зону"""

    __tablename__ = "operation_work_type_zone"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operation_id = Column(Integer, ForeignKey('operations.id', ondelete='CASCADE'), nullable=False, index=True)
    work_type_id = Column(Integer, ForeignKey('work_types.id', ondelete='CASCADE'), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey('zones.id', ondelete='CASCADE'), nullable=False, index=True)
    display_order = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint('operation_id', 'work_type_id', 'zone_id', name='uq_operation_work_type_zone'),
    )

    def __repr__(self):
        return f"<OperationWorkTypeZone(operation_id={self.operation_id}, work_type_id={self.work_type_id}, zone_id={self.zone_id})>"


class Hint(Base):
    """Подсказка к выполнению работы в зоне"""

    __tablename__ = "hints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_type_id = Column(Integer, ForeignKey('work_types.id', ondelete='CASCADE'), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey('zones.id', ondelete='CASCADE'), nullable=False, index=True)
    text = Column(Text, nullable=False)

    def __repr__(self):
        return f"<Hint(id={self.id}, work_type_id={self.work_type_id}, zone_id={self.zone_id})>"


class TaskCompletedOperation(Base):
    """Операция, отмеченная работником при завершении задачи"""

    __tablename__ = "task_completed_operations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint('task_id', 'operation_id', name='uq_task_completed_operation'),
    )

    def __repr__(self):
        return f"<TaskCompletedOperation(task_id={self.task_id}, operation_id={self.operation_id})>"


class TaskEvent(Base):
    """Аудит-лог событий задачи"""

    __tablename__ = "task_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)

    # Кто выполнил действие (null для системных событий: AUTO_ACCEPT, LAMA)
    actor_id = Column(Integer, nullable=True)  # integer ID из svc_users
    actor_role = Column(String(20), nullable=False)  # "worker" | "manager" | "system"

    # Снапшот execution state
    old_state = Column(String(50), nullable=True)
    new_state = Column(String(50), nullable=True)

    # Снапшот review state
    old_review_state = Column(String(50), nullable=True)
    new_review_state = Column(String(50), nullable=True)

    # Текстовый комментарий (обязателен для REJECT через API)
    comment = Column(Text, nullable=True)

    # Произвольные доп. поля (например {"source": "lama"})
    meta = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<TaskEvent(id={self.id}, task_id={self.task_id}, event_type={self.event_type})>"
