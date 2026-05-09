import sys
from pathlib import Path

# Добавляем shared модуль в путь
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.domain.models import User, Assignment, Position, Rank, Role, Store, UserLamaCache
from app.repositories.store_repository import StoreRepository
from shared import LamaClient

logger = logging.getLogger(__name__)


class LamaService:
    """Синхронизация данных сотрудника из LAMA с кэшированием 1 час"""

    def __init__(self):
        self.client = LamaClient(
            base_url=settings.LAMA_API_BASE_URL,
            timeout=settings.LAMA_API_TIMEOUT,
            enabled=settings.LAMA_API_ENABLED,
        )
        self.cache_ttl = settings.LAMA_CACHE_TTL

    async def sync_employee(self, user_id: int, phone: str, db: Session) -> List[Assignment]:
        """
        Синхронизировать данные сотрудника из LAMA.

        1. Проверить кэш (user_lama_cache, TTL 1 час)
        2. Если свежий — вернуть assignments из БД
        3. Запросить LAMA: GET /employee/?phone={phone}
        4. Обновить user.external_id = employee_id
        5. Для каждой position — upsert Assignment
        6. Обновить кэш
        7. Вернуть assignments
        """
        if not self.client.enabled:
            return self._get_assignments(user_id, db)

        # 1. Проверить кэш
        cache = db.query(UserLamaCache).filter(UserLamaCache.user_id == user_id).first()
        if cache:
            cache_age = (datetime.utcnow() - cache.cached_at).total_seconds()
            if cache_age < self.cache_ttl:
                logger.debug(f"LAMA cache fresh for user {user_id} (age={cache_age:.0f}s)")
                return self._get_assignments(user_id, db)

        # 2. Запросить LAMA
        data = await self.client.get_employee(phone)
        if data is None:
            logger.warning(f"LAMA недоступен для user {user_id}, возвращаем локальные данные")
            return self._get_assignments(user_id, db)

        # 3. Парсить ФИО из employee_name
        last_name, first_name, middle_name = self._parse_employee_name(data.get("employee_name"))

        # 4. Обновить user.external_id + merge с preloaded-пользователем если есть
        employee_id = data.get("employee_id")
        if employee_id is not None:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # Если есть пользователь, созданный через batch-sync (sso_id=NULL, тот же external_id)
                # — переносим его assignments к текущему и удаляем дубль
                preloaded = (
                    db.query(User)
                    .filter(User.external_id == employee_id, User.sso_id.is_(None))
                    .first()
                )
                if preloaded and preloaded.id != user_id:
                    logger.info(
                        f"Merge: preloaded user {preloaded.id} → current user {user_id} "
                        f"(external_id={employee_id})"
                    )
                    db.query(Assignment).filter(Assignment.user_id == preloaded.id).update(
                        {"user_id": user_id}, synchronize_session=False
                    )
                    db.query(UserLamaCache).filter(UserLamaCache.user_id == preloaded.id).delete()
                    db.delete(preloaded)
                    db.flush()

                user.external_id = employee_id

        # 5. Обработать positions и обновить кэш
        positions = data.get("positions", [])
        self._sync_positions(user_id, positions, db)
        self._update_lama_cache(user_id, first_name, last_name, middle_name, db)

        db.commit()

        return self._get_assignments(user_id, db)

    async def sync_store_employees(self, shop_code: str, db: Session) -> List[dict]:
        """
        Batch-синхронизация всех сотрудников магазина из LAMA.

        Вызывается при ежедневной синхронизации. Создаёт User без sso_id,
        если сотрудник ещё не зарегистрирован — при первом логине sso_id будет добавлен.

        Возвращает список {"assignment_id": int, "employee_in_shop_id": int} для
        последующей синхронизации смен и задач.
        """
        if not self.client.enabled:
            logger.info(f"LAMA отключён, пропускаем sync_store_employees для {shop_code}")
            return []

        employees = await self.client.get_employees_by_shop(shop_code)
        if not employees:
            logger.warning(f"LAMA: нет сотрудников для shop_code={shop_code}")
            return []

        result = []
        for emp in employees:
            employee_id = emp.get("employee_id")
            if employee_id is None:
                continue

            try:
                # Найти или создать пользователя по external_id (employee_id из LAMA)
                user = db.query(User).filter(User.external_id == employee_id).first()
                if not user:
                    user = User(external_id=employee_id)
                    db.add(user)
                    db.flush()  # получить user.id

                last_name, first_name, middle_name = self._parse_employee_name(
                    emp.get("employee_name")
                )

                positions = emp.get("positions", [])
                synced = self._sync_positions(user.id, positions, db)
                self._update_lama_cache(user.id, first_name, last_name, middle_name, db)

                db.commit()
                result.extend(synced)

            except Exception as e:
                db.rollback()
                logger.error(f"LAMA sync_store_employees: ошибка для employee_id={employee_id}: {e}")

        logger.info(
            f"LAMA sync_store_employees shop_code={shop_code}: "
            f"{len(employees)} сотрудников, {len(result)} assignments"
        )
        return result

    def _sync_positions(self, user_id: int, positions: list, db: Session) -> List[dict]:
        """
        Upsert assignments по списку positions из LAMA.
        Возвращает список {"assignment_id": int, "employee_in_shop_id": int}.
        """
        result = []
        for pos in positions:
            employee_in_shop_id = pos.get("employee_in_shop_id")
            if employee_in_shop_id is None:
                continue

            position_role = pos.get("position_role")  # "Executor" | "Administrator" | None
            role_id = self._resolve_role_id(db, position_role)

            position_obj = self._get_or_create_position(
                db,
                code=pos.get("position_code"),
                name=pos.get("position_name"),
                role_id=role_id,
            )
            rank_obj = self._get_or_create_rank(
                db,
                code=pos.get("rank_code"),
                name=pos.get("rank_name"),
            )

            store_id = None
            shop_code = pos.get("shop_code")
            if shop_code:
                store_repo = StoreRepository(db)
                store = store_repo.get_or_create(
                    external_code=shop_code,
                    partner_id=settings.LAMA_PARTNER_ID,
                    name=pos.get("shop_name"),
                )
                store_id = store.id

            date_start = self._parse_date(pos.get("date_start"))
            date_end = self._parse_date(pos.get("date_end"))

            assignment = (
                db.query(Assignment)
                .filter(Assignment.external_id == employee_in_shop_id)
                .first()
            )

            if assignment:
                assignment.user_id = user_id
                assignment.company_name = pos.get("company_name")
                assignment.position_id = position_obj.id if position_obj else None
                assignment.rank_id = rank_obj.id if rank_obj else None
                assignment.date_start = date_start
                assignment.date_end = date_end
                if store_id is not None:
                    assignment.store_id = store_id
            else:
                assignment = Assignment(
                    user_id=user_id,
                    external_id=employee_in_shop_id,
                    company_name=pos.get("company_name"),
                    position_id=position_obj.id if position_obj else None,
                    rank_id=rank_obj.id if rank_obj else None,
                    store_id=store_id,
                    date_start=date_start,
                    date_end=date_end,
                )
                db.add(assignment)
                db.flush()

            result.append({
                "assignment_id": assignment.id,
                "employee_in_shop_id": employee_in_shop_id,
                "user_id": user_id,
            })

        return result

    def _update_lama_cache(
        self,
        user_id: int,
        first_name: Optional[str],
        last_name: Optional[str],
        middle_name: Optional[str],
        db: Session,
    ) -> None:
        """Создать или обновить UserLamaCache с ФИО"""
        cache = db.query(UserLamaCache).filter(UserLamaCache.user_id == user_id).first()
        if cache:
            cache.first_name = first_name
            cache.last_name = last_name
            cache.middle_name = middle_name
            cache.cached_at = datetime.utcnow()
        else:
            db.add(UserLamaCache(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                cached_at=datetime.utcnow(),
            ))

    def _get_assignments(self, user_id: int, db: Session) -> List[Assignment]:
        """Получить assignments из БД"""
        return (
            db.query(Assignment)
            .options(
                joinedload(Assignment.position).joinedload(Position.role),
                joinedload(Assignment.rank),
                joinedload(Assignment.store),
            )
            .filter(Assignment.user_id == user_id)
            .all()
        )

    def _resolve_role_id(self, db: Session, position_role: Optional[str]) -> int:
        """Преобразовать position_role из LAMA в role_id.
        Executor → worker (role_id=1), Administrator → manager (role_id=2).
        """
        lama_role_map = {
            "Administrator": "manager",
            "Executor": "worker",
        }
        role_code = lama_role_map.get(position_role, "worker")
        role = db.query(Role).filter(Role.code == role_code).first()
        return role.id if role else 1

    def _get_or_create_position(
        self, db: Session, code: Optional[str], name: Optional[str], role_id: int = 1
    ) -> Optional[Position]:
        """Найти или создать Position по code. Обновляет role_id если он изменился."""
        if not code:
            return None
        position = db.query(Position).filter(Position.code == code).first()
        if not position:
            try:
                nested = db.begin_nested()
                position = Position(code=code, name=name or code, role_id=role_id)
                db.add(position)
                db.flush()
            except IntegrityError:
                nested.rollback()
                position = db.query(Position).filter(Position.code == code).first()
                if position and position.role_id != role_id:
                    position.role_id = role_id
        elif position.role_id != role_id:
            position.role_id = role_id
        return position

    def _get_or_create_rank(self, db: Session, code: Optional[str], name: Optional[str]) -> Optional[Rank]:
        """Найти или создать Rank по code"""
        if not code:
            return None
        rank = db.query(Rank).filter(Rank.code == code).first()
        if not rank:
            try:
                nested = db.begin_nested()
                rank = Rank(code=code, name=name or code)
                db.add(rank)
                db.flush()
            except IntegrityError:
                nested.rollback()
                rank = db.query(Rank).filter(Rank.code == code).first()
        return rank

    @staticmethod
    def _parse_employee_name(employee_name: Optional[str]) -> tuple:
        """Парсить ФИО из строки 'Фамилия Имя Отчество'"""
        if not employee_name or not employee_name.strip():
            return None, None, None
        parts = employee_name.strip().split()
        last_name = parts[0] if len(parts) >= 1 else None
        first_name = parts[1] if len(parts) >= 2 else None
        middle_name = " ".join(parts[2:]) if len(parts) >= 3 else None
        return last_name, first_name, middle_name

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[date]:
        """Безопасный парсинг даты"""
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except (ValueError, TypeError):
            return None


def get_lama_service() -> LamaService:
    """Dependency для получения экземпляра LamaService"""
    return LamaService()
