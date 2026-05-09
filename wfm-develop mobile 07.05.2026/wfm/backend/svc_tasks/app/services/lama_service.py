import sys
from pathlib import Path

# Добавляем shared модуль в путь
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import List, Optional
from uuid import UUID
from datetime import time
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.models import Task, WorkType, Zone, Category
from app.domain.schemas import TaskEventType
from app.repositories.task_event_repository import TaskEventRepository
from shared import LamaClient, LAMA_TO_WFM_STATUS

logger = logging.getLogger(__name__)


class TaskLamaService:
    """Синхронизация задач из LAMA и двусторонняя синхронизация статусов"""

    def __init__(self):
        self.client = LamaClient(
            base_url=settings.LAMA_API_BASE_URL,
            timeout=settings.LAMA_API_TIMEOUT,
            enabled=settings.LAMA_API_ENABLED,
        )

    async def sync_tasks(
        self,
        shift_external_id: int,
        shift_id: int,
        user_id: int,
        db: Session,
    ) -> List[Task]:
        """
        Синхронизировать задачи из LAMA для смены.

        1. GET /tasks/?shift_id={shift_external_id}
        2. Для каждой задачи — upsert по external_id
        3. Маппинг полей и статусов
        """
        data = await self.client.get_tasks(shift_external_id)
        if data is None:
            return []

        # Reconciliation: удаляем LAMA-задачи этой смены, которых нет в ответе LAMA.
        # LAMA пересоздаёт задачу с новым ID при редактировании — старую нужно удалить.
        lama_external_ids = {t.get("id") for t in data if t.get("id") is not None}
        orphan_query = db.query(Task).filter(
            Task.source == "LAMA",
            Task.shift_id == shift_id,
        )
        if lama_external_ids:
            orphan_query = orphan_query.filter(
                Task.external_id.notin_(lama_external_ids)
            )
        orphaned_tasks = orphan_query.all()
        for orphan in orphaned_tasks:
            logger.info(
                f"Удаляем осиротевшую LAMA-задачу: id={orphan.id}, external_id={orphan.external_id}"
            )
            db.delete(orphan)

        synced_tasks = []
        for task_data in data:
            task_external_id = task_data.get("id")
            if task_external_id is None:
                continue

            # Маппинг статуса
            lama_status = task_data.get("status", "Created")
            wfm_state = LAMA_TO_WFM_STATUS.get(lama_status, "NEW")

            # Маппинг duration (секунды → минуты)
            duration_seconds = task_data.get("duration", 0)
            planned_minutes = max(1, duration_seconds // 60) if duration_seconds else 1

            # Парсим время
            time_start = self._parse_time(task_data.get("time_start"))
            time_end = self._parse_time(task_data.get("time_end"))

            # Резолвим справочники (get or create)
            operation_work = task_data.get("operation_work", "")
            operation_zone = task_data.get("operation_zone", "")
            category_name = task_data.get("category", "")

            work_type_id = self._resolve_work_type(db, operation_work) if operation_work else None
            zone_id = self._resolve_zone(db, operation_zone) if operation_zone else None
            category_id = self._resolve_category(db, category_name) if category_name else None

            # Формируем title из operation_work + operation_zone
            title = operation_work
            if operation_zone:
                title = f"{operation_work} — {operation_zone}"
            if not title:
                title = f"Задача LAMA #{task_external_id}"

            # Читаем requires_photo и acceptance_policy из справочника work_types (управляется через API)
            requires_photo = self._get_requires_photo(db, work_type_id)
            acceptance_policy = self._get_acceptance_policy(db, work_type_id)

            # Upsert по external_id
            task = (
                db.query(Task)
                .filter(Task.external_id == task_external_id)
                .first()
            )

            # Определяем review_state для статусов Accepted и Returned
            lama_review_state = self._lama_review_state(lama_status)

            if task:
                old_review_state = task.review_state
                task.state = wfm_state
                task.priority = task_data.get("priority")
                task.work_type_id = work_type_id
                task.zone_id = zone_id
                task.category_id = category_id
                task.time_start = time_start
                task.time_end = time_end
                task.planned_minutes = planned_minutes
                task.title = title
                task.requires_photo = requires_photo
                task.acceptance_policy = acceptance_policy
                if lama_review_state is not None:
                    task.review_state = lama_review_state
            else:
                old_review_state = "NONE"
                task = Task(
                    title=title,
                    description=f"Задача из LAMA (shift_external_id={shift_external_id})",
                    planned_minutes=planned_minutes,
                    creator_id=user_id,
                    assignee_id=user_id,
                    state=wfm_state,
                    review_state=lama_review_state if lama_review_state else "NONE",
                    external_id=task_external_id,
                    shift_id=shift_id,
                    priority=task_data.get("priority"),
                    work_type_id=work_type_id,
                    zone_id=zone_id,
                    category_id=category_id,
                    time_start=time_start,
                    time_end=time_end,
                    source="LAMA",
                    requires_photo=requires_photo,
                    acceptance_policy=acceptance_policy,
                )
                db.add(task)

            synced_tasks.append((task, old_review_state, lama_review_state, lama_status))

        db.commit()

        # Записываем события review_state для Accepted / Returned после commit
        event_repo = TaskEventRepository(db)
        for task, old_review_state, new_review_state, lama_status in synced_tasks:
            if new_review_state is not None and old_review_state != new_review_state:
                self._write_lama_review_event(
                    event_repo=event_repo,
                    task=task,
                    lama_status=lama_status,
                    old_review_state=old_review_state,
                    new_review_state=new_review_state,
                    task_data_comment=None,
                )

        return [item[0] for item in synced_tasks]

    async def sync_task_status_to_lama(
        self,
        task: Task,
        lama_status: str,
        comment: Optional[str] = None,
    ) -> bool:
        """
        Отправить обновление статуса в LAMA (исходящая синхронизация).

        lama_status передаётся явно из вызывающего кода:
        - start/resume  → "InProgress"
        - pause         → "Suspended"
        - complete      → "Completed"
        - approve       → "Accepted"
        - reject        → "Returned"

        Для complete дополнительно передаётся comment — имена завершённых операций
        через запятую, только если work_type.allow_new_operations = true.
        """
        if not task.external_id:
            return False

        return await self.client.set_task_status(
            task.external_id, lama_status, comment=comment
        )

    @staticmethod
    def _lama_review_state(lama_status: str) -> Optional[str]:
        """Вернуть review_state для статусов LAMA, влияющих на приёмку.

        Возвращает None если статус не затрагивает review_state.
        """
        return {
            "Accepted": "ACCEPTED",
            "Returned": "REJECTED",
        }.get(lama_status)

    @staticmethod
    def _write_lama_review_event(
        event_repo: TaskEventRepository,
        task: Task,
        lama_status: str,
        old_review_state: str,
        new_review_state: str,
        task_data_comment: Optional[str],
    ) -> None:
        """Записать событие review_state, пришедшее из LAMA.

        Событие создаётся только если review_state изменился (защита от дублей
        при повторной синхронизации).
        """
        if lama_status == "Accepted":
            event_type = TaskEventType.ACCEPT
            comment = None
        else:  # Returned
            event_type = TaskEventType.REJECT
            comment = task_data_comment  # причина возврата от LAMA, если есть

        event_repo.create_event(
            task_id=task.id,
            event_type=event_type,
            actor_id=None,
            actor_role="system",
            old_review_state=old_review_state,
            new_review_state=new_review_state,
            comment=comment,
            meta={"source": "lama"},
        )

    @staticmethod
    def _resolve_work_type(db: Session, name: str) -> Optional[int]:
        """Найти или создать тип работы по имени"""
        obj = db.query(WorkType).filter(WorkType.name == name).first()
        if not obj:
            obj = WorkType(name=name)
            db.add(obj)
            db.flush()
            logger.info(f"Создан новый тип работы из LAMA: '{name}' (id={obj.id})")
        return obj.id

    @staticmethod
    def _resolve_zone(db: Session, name: str) -> Optional[int]:
        """Найти или создать зону по имени"""
        obj = db.query(Zone).filter(Zone.name == name).first()
        if not obj:
            obj = Zone(name=name, priority=0)
            db.add(obj)
            db.flush()
            logger.info(f"Создана новая зона из LAMA: '{name}' (id={obj.id})")
        return obj.id

    @staticmethod
    def _resolve_category(db: Session, name: str) -> Optional[int]:
        """Найти или создать категорию по имени"""
        obj = db.query(Category).filter(Category.name == name).first()
        if not obj:
            obj = Category(name=name)
            db.add(obj)
            db.flush()
            logger.info(f"Создана новая категория из LAMA: '{name}' (id={obj.id})")
        return obj.id

    @staticmethod
    def _parse_time(value: Optional[str]) -> Optional[time]:
        """Безопасный парсинг времени"""
        if not value:
            return None
        try:
            parts = value.split(":")
            return time(int(parts[0]), int(parts[1]))
        except (ValueError, TypeError, IndexError):
            return None

    @staticmethod
    def _get_requires_photo(db: Session, work_type_id: Optional[int]) -> bool:
        """Вернуть флаг requires_photo для типа работы из БД.

        Управляется через PATCH /references/work-types/{id}.
        Возвращает False если work_type_id не указан.
        """
        if work_type_id is None:
            return False
        obj = db.query(WorkType).filter(WorkType.id == work_type_id).first()
        return obj.requires_photo if obj else False

    @staticmethod
    def _get_acceptance_policy(db: Session, work_type_id: Optional[int]) -> str:
        """Вернуть acceptance_policy для типа работы из БД.

        Управляется через PATCH /references/work-types/{id}.
        Возвращает AUTO если work_type_id не указан или тип не найден.
        """
        if work_type_id is None:
            return "AUTO"
        obj = db.query(WorkType).filter(WorkType.id == work_type_id).first()
        return obj.acceptance_policy if obj else "AUTO"


def get_task_lama_service() -> TaskLamaService:
    """Dependency для получения экземпляра TaskLamaService"""
    return TaskLamaService()
