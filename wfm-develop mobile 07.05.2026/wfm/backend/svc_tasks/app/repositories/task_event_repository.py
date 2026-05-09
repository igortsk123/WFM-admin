from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime
from collections import defaultdict

from app.domain.models import TaskEvent
from app.domain.schemas import TaskEventType, HistoryBrief, WorkInterval


class TaskEventRepository:
    """Репозиторий для работы с аудит-логом событий задачи"""

    def __init__(self, db: Session):
        self.db = db

    def create_event(
        self,
        task_id: UUID,
        event_type: TaskEventType,
        actor_role: str,
        actor_id: Optional[int] = None,
        old_state: Optional[str] = None,
        new_state: Optional[str] = None,
        old_review_state: Optional[str] = None,
        new_review_state: Optional[str] = None,
        comment: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> TaskEvent:
        """Записать событие в аудит-лог.

        actor_role: "worker" | "manager" | "system"
        actor_id: UUID пользователя; None для системных событий (AUTO_ACCEPT, LAMA)
        """
        event = TaskEvent(
            task_id=task_id,
            event_type=event_type.value,
            actor_id=actor_id,
            actor_role=actor_role,
            old_state=old_state,
            new_state=new_state,
            old_review_state=old_review_state,
            new_review_state=new_review_state,
            comment=comment,
            meta=meta,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_events_for_task(self, task_id: UUID) -> List[TaskEvent]:
        """Получить все события задачи в хронологическом порядке"""
        return (
            self.db.query(TaskEvent)
            .filter(TaskEvent.task_id == task_id)
            .order_by(TaskEvent.created_at.asc())
            .all()
        )

    def get_history_brief(self, task_id: UUID) -> HistoryBrief:
        """Вычислить history_brief для одной задачи"""
        events = self.get_events_for_task(task_id)
        return self.compute_history_brief(events)

    def get_history_briefs_for_tasks(self, task_ids: List[UUID]) -> Dict[UUID, HistoryBrief]:
        """Вычислить history_brief для списка задач одним запросом к БД"""
        if not task_ids:
            return {}

        all_events = (
            self.db.query(TaskEvent)
            .filter(TaskEvent.task_id.in_(task_ids))
            .order_by(TaskEvent.task_id, TaskEvent.created_at.asc())
            .all()
        )

        events_by_task: Dict[UUID, List[TaskEvent]] = defaultdict(list)
        for event in all_events:
            events_by_task[event.task_id].append(event)

        return {
            task_id: self.compute_history_brief(events_by_task.get(task_id, []))
            for task_id in task_ids
        }

    @staticmethod
    def compute_history_brief(events: List[TaskEvent]) -> HistoryBrief:
        """Вычислить history_brief по списку событий задачи.

        time_start:         created_at первого события START
        duration:           сумма длительностей всех отрезков IN_PROGRESS (в секундах)
        time_state_updated: created_at последнего события с изменением execution state
        work_intervals:     промежутки IN_PROGRESS; открываются START/RESUME, закрываются PAUSE/COMPLETE
        """
        time_start: Optional[datetime] = None
        time_state_updated: Optional[datetime] = None
        duration_seconds: int = 0
        in_progress_since: Optional[datetime] = None
        work_intervals: List[WorkInterval] = []

        for event in events:
            # time_start: первое событие START
            if event.event_type == TaskEventType.START.value and time_start is None:
                time_start = event.created_at

            # Изменение execution state (new_state не null)
            if event.new_state is not None:
                time_state_updated = event.created_at

                if event.new_state == "IN_PROGRESS":
                    in_progress_since = event.created_at
                else:
                    # Закрываем текущий отрезок IN_PROGRESS
                    if in_progress_since is not None:
                        duration_seconds += int(
                            (event.created_at - in_progress_since).total_seconds()
                        )
                        work_intervals.append(WorkInterval(
                            time_start=in_progress_since,
                            time_end=event.created_at,
                        ))
                        in_progress_since = None

        # Незакрытый отрезок — задача сейчас IN_PROGRESS
        if in_progress_since is not None:
            work_intervals.append(WorkInterval(
                time_start=in_progress_since,
                time_end=None,
            ))

        return HistoryBrief(
            time_start=time_start,
            duration=duration_seconds,
            time_state_updated=time_state_updated,
            work_intervals=work_intervals,
        )
