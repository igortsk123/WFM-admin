from sqlalchemy import or_, case, and_
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.domain.models import Task
from app.domain.schemas import TaskCreate, TaskUpdate, TaskState, TaskReviewState, TaskType
from app.domain.state_machine import TaskStateMachine


class TaskRepository:
    """Репозиторий для работы с задачами"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        state: Optional[TaskState] = None,
        assignee_id: Optional[int] = None,
        shift_id: Optional[int] = None,
        shift_ids: Optional[List[int]] = None,
        assignee_ids: Optional[List[int]] = None,
        zone_ids: Optional[List[int]] = None,
        work_type_ids: Optional[List[int]] = None,
        review_state: Optional[TaskReviewState] = None,
        sort_by_cluster: bool = False,
        intersection: bool = False,
    ) -> List[Task]:
        """Получить список задач с фильтрацией.

        intersection=False (по умолчанию): zone_ids и work_type_ids применяются как OR
        intersection=True: zone_ids и work_type_ids применяются как AND (пересечение)
        """
        query = self.db.query(Task)

        if state:
            query = query.filter(Task.state == state.value)

        if review_state:
            query = query.filter(Task.review_state == review_state.value)

        if assignee_id:
            query = query.filter(Task.assignee_id == assignee_id)

        if assignee_ids:
            query = query.filter(Task.assignee_id.in_(assignee_ids))

        if shift_id is not None:
            query = query.filter(Task.shift_id == shift_id)

        if shift_ids:
            query = query.filter(Task.shift_id.in_(shift_ids))

        if intersection:
            if zone_ids:
                query = query.filter(Task.zone_id.in_(zone_ids))
            if work_type_ids:
                query = query.filter(Task.work_type_id.in_(work_type_ids))
        else:
            if zone_ids and work_type_ids:
                query = query.filter(
                    or_(Task.zone_id.in_(zone_ids), Task.work_type_id.in_(work_type_ids))
                )
            elif zone_ids:
                query = query.filter(Task.zone_id.in_(zone_ids))
            elif work_type_ids:
                query = query.filter(Task.work_type_id.in_(work_type_ids))

        if sort_by_cluster:
            cluster_order = case(
                (and_(Task.state == "PAUSED", Task.review_state == "REJECTED"), 1),
                (Task.state == "IN_PROGRESS", 2),
                (and_(Task.state == "PAUSED", Task.review_state == "NONE"), 3),
                (Task.state == "NEW", 4),
                (Task.review_state == "ON_REVIEW", 5),
                (and_(Task.state == "COMPLETED", Task.review_state == "ACCEPTED"), 6),
                else_=7,
            )
            return query.order_by(cluster_order, Task.time_start.asc().nulls_last()).all()

        return query.order_by(Task.created_at.desc()).all()

    def get_by_id(self, task_id: UUID) -> Optional[Task]:
        """Получить задачу по ID"""
        return self.db.query(Task).filter(Task.id == task_id).first()

    def create(self, task_data: TaskCreate) -> Task:
        """Создать новую задачу"""
        task = Task(
            title=task_data.title,
            description=task_data.description,
            planned_minutes=task_data.planned_minutes,
            creator_id=task_data.creator_id,
            assignee_id=task_data.assignee_id,
            type=task_data.type.value,
            shift_id=task_data.shift_id,
            work_type_id=task_data.work_type_id,
            zone_id=task_data.zone_id,
            category_id=task_data.category_id,
            state=TaskState.NEW.value,
            acceptance_policy=task_data.acceptance_policy.value,
            comment=task_data.comment,
            requires_photo=task_data.requires_photo,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task_id: UUID, task_data: TaskUpdate) -> Optional[Task]:
        """Обновить задачу"""
        task = self.get_by_id(task_id)
        if not task:
            return None

        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        self.db.commit()
        self.db.refresh(task)
        return task

    def transition_state(
        self,
        task_id: UUID,
        new_state: TaskState,
        new_review_state: Optional[TaskReviewState] = None,
    ) -> Optional[Task]:
        """Изменить execution state задачи с валидацией переходов.

        new_review_state — если передан, одновременно обновляет review_state.
        """
        task = self.get_by_id(task_id)
        if not task:
            return None

        current_state = TaskState(task.state)

        # Валидация перехода
        TaskStateMachine.validate_transition(current_state, new_state)

        task.state = new_state.value
        if new_review_state is not None:
            task.review_state = new_review_state.value
        self.db.commit()
        self.db.refresh(task)
        return task

    def set_review_state(
        self,
        task_id: UUID,
        new_review_state: TaskReviewState,
        review_comment: Optional[str] = None,
    ) -> Optional[Task]:
        """Обновить review_state задачи без изменения execution state.

        review_comment перезаписывается при каждом изменении review_state.
        """
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.review_state = new_review_state.value
        task.review_comment = review_comment
        self.db.commit()
        self.db.refresh(task)
        return task

    def reject_to_paused(self, task_id: UUID, review_comment: Optional[str] = None) -> Optional[Task]:
        """Применить reject: COMPLETED → PAUSED + review_state = REJECTED.

        Обходит state machine намеренно — COMPLETED→PAUSED является исключительным
        переходом, доступным только через review flow (reject менеджером).
        review_comment = причина отклонения (reason из запроса).
        """
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.state = TaskState.PAUSED.value
        task.review_state = TaskReviewState.REJECTED.value
        task.review_comment = review_comment
        self.db.commit()
        self.db.refresh(task)
        return task

    def save_report(
        self,
        task_id: UUID,
        report_text: Optional[str],
        report_image_url: Optional[str],
    ) -> Optional[Task]:
        """Сохранить данные отчёта работника в задаче."""
        task = self.get_by_id(task_id)
        if not task:
            return None
        task.report_text = report_text
        task.report_image_url = report_image_url
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_tasks_by_shift_and_states(self, shift_id: int, states: List[TaskState]) -> List[Task]:
        """Получить задачи смены в указанных состояниях.

        shift_id соответствует Task.shift_id (ссылка на shifts_plan.id).
        """
        return self.db.query(Task).filter(
            Task.shift_id == shift_id,
            Task.state.in_([s.value for s in states]),
        ).all()

    def get_active_task_for_assignee(self, assignee_id: int) -> Optional[Task]:
        """Получить активную задачу сотрудника"""
        return self.db.query(Task).filter(
            Task.assignee_id == assignee_id,
            Task.state == TaskState.IN_PROGRESS.value
        ).first()
