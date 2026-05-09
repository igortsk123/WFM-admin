"""
Ежедневная синхронизация из LAMA: сотрудники → смены → задачи.

Запускается в 6:00 через n8n (POST /tasks/internal/sync-daily).
"""
import asyncio
import logging
from sqlalchemy.orm import Session

from app.services.users_client import get_users_service_client
from app.services.shift_lama_service import ShiftLamaService
from app.services.lama_service import TaskLamaService

logger = logging.getLogger(__name__)

# Ограничители параллелизма
_STORE_CONCURRENCY = 10   # магазинов одновременно
_ASSIGN_CONCURRENCY = 20  # assignments одновременно
_LAMA_CONCURRENCY = 3     # параллельных запросов к LAMA из одного sync_store


class DailySyncService:
    """Оркестратор ежедневной LAMA-синхронизации"""

    def __init__(self):
        self.users_client = get_users_service_client()
        self.shift_service = ShiftLamaService()
        self.task_service = TaskLamaService()

    async def sync_daily(self, db: Session) -> dict:
        """
        Полная синхронизация:
        1. Получить все shop_code из svc_users
        2. Для каждого — синхронизировать сотрудников и assignments (параллельно)
        3. Для каждого assignment — синхронизировать смену и задачи (параллельно)

        Graceful degradation: ошибка одного магазина / одного сотрудника
        не останавливает остальные.
        """
        stats = {
            "stores_total": 0,
            "stores_synced": 0,
            "employees_synced": 0,
            "shifts_synced": 0,
            "tasks_synced": 0,
            "errors": [],
        }

        # 1. Список магазинов
        store_codes = await self.users_client.get_all_store_codes()
        stats["stores_total"] = len(store_codes)

        if not store_codes:
            logger.warning("DailySync: нет магазинов с external_code — синхронизация пропущена")
            return stats

        logger.info(f"DailySync: начало синхронизации {len(store_codes)} магазинов")

        # 2. Параллельная синхронизация сотрудников по магазинам
        sem_stores = asyncio.Semaphore(_STORE_CONCURRENCY)
        store_results = await asyncio.gather(
            *[self._sync_store(code, sem_stores) for code in store_codes],
            return_exceptions=True,
        )

        # Собираем все assignments
        all_assignments = []
        for i, result in enumerate(store_results):
            if isinstance(result, Exception):
                stats["errors"].append(f"store {store_codes[i]}: {result}")
            else:
                stats["stores_synced"] += 1
                stats["employees_synced"] += len(result)
                all_assignments.extend(result)

        if not all_assignments:
            logger.info("DailySync: нет assignments для синхронизации смен")
            return stats

        logger.info(f"DailySync: синхронизация смен и задач для {len(all_assignments)} assignments")

        # 3. Параллельная синхронизация смен и задач
        sem_assign = asyncio.Semaphore(_ASSIGN_CONCURRENCY)
        assign_results = await asyncio.gather(
            *[
                self._sync_shift_and_tasks(
                    assignment_id=a["assignment_id"],
                    employee_in_shop_id=a["employee_in_shop_id"],
                    user_id=a["user_id"],
                    db=db,
                    sem=sem_assign,
                )
                for a in all_assignments
            ],
            return_exceptions=True,
        )

        for i, result in enumerate(assign_results):
            if isinstance(result, Exception):
                a = all_assignments[i]
                stats["errors"].append(f"assignment {a['assignment_id']}: {result}")
            elif result:
                if result.get("shift"):
                    stats["shifts_synced"] += 1
                stats["tasks_synced"] += result.get("tasks", 0)

        logger.info(
            f"DailySync завершён: stores={stats['stores_synced']}/{stats['stores_total']}, "
            f"employees={stats['employees_synced']}, shifts={stats['shifts_synced']}, "
            f"tasks={stats['tasks_synced']}, errors={len(stats['errors'])}"
        )
        return stats

    async def _sync_store(self, shop_code: str, sem: asyncio.Semaphore) -> list[dict]:
        """Синхронизировать сотрудников одного магазина через svc_users"""
        async with sem:
            return await self.users_client.sync_lama_store(shop_code)

    async def _sync_shift_and_tasks(
        self,
        assignment_id: int,
        employee_in_shop_id: int,
        user_id: int,
        db: Session,
        sem: asyncio.Semaphore,
    ) -> dict:
        """Синхронизировать смену и задачи для одного assignment"""
        async with sem:
            result = {"shift": None, "tasks": 0}
            try:
                shift = await self.shift_service.sync_shift(
                    employee_in_shop_id=employee_in_shop_id,
                    assignment_id=assignment_id,
                    db=db,
                )
                result["shift"] = shift

                if shift and shift.external_id:
                    synced = await self.task_service.sync_tasks(
                        shift_external_id=shift.external_id,
                        shift_id=shift.id,
                        user_id=user_id,
                        db=db,
                    )
                    result["tasks"] = len(synced) if synced else 0

            except Exception as e:
                logger.error(
                    f"DailySync: ошибка sync_shift_and_tasks "
                    f"assignment_id={assignment_id}: {e}"
                )
                raise

            return result


    async def sync_store(self, shop_code: str) -> dict:
        """
        Синхронизировать один магазин: сотрудники → смены → задачи.

        Каждый assignment обрабатывается в изолированной DB-сессии —
        коммиты не пересекаются между сотрудниками.
        Используется n8n-конвейером lama_daily_sync_v2, который вызывает
        этот метод последовательно для каждого магазина.
        """
        stats = {
            "shop_code": shop_code,
            "employees_synced": 0,
            "shifts_synced": 0,
            "tasks_synced": 0,
            "errors": [],
        }

        assignments = await self.users_client.sync_lama_store(shop_code)
        if not assignments:
            logger.info(f"sync_store [{shop_code}]: нет сотрудников")
            return stats

        stats["employees_synced"] = len(assignments)
        logger.info(f"sync_store [{shop_code}]: {len(assignments)} сотрудников")

        sem = asyncio.Semaphore(_LAMA_CONCURRENCY)
        results = await asyncio.gather(
            *[self._sync_one_assignment(a, sem) for a in assignments],
            return_exceptions=True,
        )

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                stats["errors"].append(f"assignment {assignments[i]['assignment_id']}: {result}")
            elif result:
                if result.get("shift"):
                    stats["shifts_synced"] += 1
                stats["tasks_synced"] += result.get("tasks", 0)

        logger.info(
            f"sync_store [{shop_code}] завершён: "
            f"shifts={stats['shifts_synced']}, tasks={stats['tasks_synced']}, "
            f"errors={len(stats['errors'])}"
        )
        return stats

    async def _sync_one_assignment(self, a: dict, sem: asyncio.Semaphore | None = None) -> dict:
        """
        Синхронизировать смену и задачи одного assignment в изолированной сессии.

        Открывает и закрывает собственную SessionLocal — коммиты не влияют
        на параллельные корутины этого же магазина.
        """
        from app.core.database import SessionLocal

        _sem = sem if sem else asyncio.Semaphore(1)
        async with _sem:
            db = SessionLocal()
            try:
                result = {"shift": None, "tasks": 0}
                shift = await self.shift_service.sync_shift(
                    employee_in_shop_id=a["employee_in_shop_id"],
                    assignment_id=a["assignment_id"],
                    db=db,
                )
                result["shift"] = shift

                if shift and shift.external_id:
                    synced = await self.task_service.sync_tasks(
                        shift_external_id=shift.external_id,
                        shift_id=shift.id,
                        user_id=a["user_id"],
                        db=db,
                    )
                    result["tasks"] = len(synced) if synced else 0

                return result
            except Exception as e:
                logger.error(
                    f"sync_one_assignment: ошибка assignment_id={a['assignment_id']}: {e}"
                )
                raise
            finally:
                db.close()


def get_daily_sync_service() -> DailySyncService:
    return DailySyncService()
