"""
Вечернее закрытие смен (End-of-Day).

Запускается в 23:50 через n8n (POST /tasks/internal/close-shifts-eod).
Закрывает все открытые смены, переводя активные задачи в PAUSED.
"""
import logging
from sqlalchemy.orm import Session

from app.domain.schemas import TaskState, TaskEventType
from app.repositories.shift_repository import ShiftRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.task_event_repository import TaskEventRepository

logger = logging.getLogger(__name__)


class EodCloseService:
    """Сервис вечернего закрытия смен"""

    def close_all(self, db: Session) -> dict:
        """
        Закрыть все открытые смены.

        Для каждой смены:
        1. Задачи IN_PROGRESS → PAUSED (системный актор, meta.reason=shift_eod_close)
        2. closed_at = NOW()

        Ошибка одной смены не останавливает остальные.
        """
        shift_repo = ShiftRepository(db)
        task_repo = TaskRepository(db)
        event_repo = TaskEventRepository(db)

        stats = {"shifts_closed": 0, "tasks_paused": 0, "errors": []}

        open_shifts = shift_repo.get_all_open_shifts()
        logger.info(f"EodClose: найдено {len(open_shifts)} открытых смен")

        for shift in open_shifts:
            try:
                in_progress = task_repo.get_tasks_by_shift_and_states(
                    shift_id=shift.plan_id,
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
                        meta={"reason": "shift_eod_close"},
                    )
                    logger.info(f"EodClose: задача id={task.id} → PAUSED (смена id={shift.id})")

                shift_repo.close_shift(shift)
                stats["shifts_closed"] += 1
                stats["tasks_paused"] += len(in_progress)
                logger.info(
                    f"EodClose: смена id={shift.id} закрыта, "
                    f"задач в PAUSED: {len(in_progress)}"
                )
            except Exception as e:
                logger.error(f"EodClose: ошибка при закрытии смены id={shift.id}: {e}")
                stats["errors"].append(f"shift {shift.id}: {e}")

        logger.info(
            f"EodClose завершён: shifts_closed={stats['shifts_closed']}, "
            f"tasks_paused={stats['tasks_paused']}, errors={len(stats['errors'])}"
        )
        return stats


def get_eod_close_service() -> EodCloseService:
    return EodCloseService()
