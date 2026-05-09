from typing import Dict, Set
from app.domain.schemas import TaskState


class TaskStateMachine:
    """State Machine для управления переходами состояний задачи"""

    # Разрешённые переходы между состояниями
    TRANSITIONS: Dict[TaskState, Set[TaskState]] = {
        TaskState.NEW: {TaskState.IN_PROGRESS},
        TaskState.IN_PROGRESS: {TaskState.PAUSED, TaskState.COMPLETED},
        TaskState.PAUSED: {TaskState.IN_PROGRESS, TaskState.COMPLETED},
        TaskState.COMPLETED: set(),  # Из завершённого состояния нет переходов
    }

    @classmethod
    def can_transition(cls, from_state: TaskState, to_state: TaskState) -> bool:
        """Проверяет, возможен ли переход между состояниями"""
        allowed_states = cls.TRANSITIONS.get(from_state, set())
        return to_state in allowed_states

    @classmethod
    def validate_transition(cls, from_state: TaskState, to_state: TaskState) -> None:
        """
        Валидирует переход между состояниями.
        Выбрасывает ValueError если переход недопустим.
        """
        if not cls.can_transition(from_state, to_state):
            raise ValueError(
                f"Недопустимый переход из состояния {from_state.value} в {to_state.value}"
            )
