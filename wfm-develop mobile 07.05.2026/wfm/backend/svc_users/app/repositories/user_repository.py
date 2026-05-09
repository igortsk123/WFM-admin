import logging
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.domain.models import User, Permission, Role, EmployeeType, Position, Assignment, Rank, Store, UserLamaCache, UserSSOCache
from app.domain.schemas import PermissionType
from app.core.config import settings

logger = logging.getLogger(__name__)


class UserRepository:
    """Репозиторий для работы с пользователями и привилегиями"""

    def __init__(self, db: Session):
        self.db = db

    # ========== Методы для работы с пользователями ==========

    def get_user(self, user_id: int) -> Optional[User]:
        """Получить пользователя по integer ID"""
        return (
            self.db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    def get_user_by_sso_id(self, sso_id: UUID) -> Optional[User]:
        """Получить пользователя по SSO UUID (поле 'u' из JWT)"""
        return (
            self.db.query(User)
            .filter(User.sso_id == sso_id)
            .first()
        )

    def get_user_with_permissions(self, user_id: int) -> Optional[User]:
        """
        Получить пользователя со всеми связанными данными.

        Использует eager loading для оптимизации запросов.
        """
        return (
            self.db.query(User)
            .options(
                joinedload(User.employee_type),
                joinedload(User.permissions),
                joinedload(User.assignments).joinedload(Assignment.position).joinedload(Position.role),
                joinedload(User.assignments).joinedload(Assignment.rank),
                joinedload(User.assignments).joinedload(Assignment.store),
            )
            .filter(User.id == user_id)
            .first()
        )

    def get_user_with_permissions_by_sso(self, sso_id: UUID) -> Optional[User]:
        """
        Получить пользователя со всеми связанными данными по SSO UUID.
        """
        return (
            self.db.query(User)
            .options(
                joinedload(User.employee_type),
                joinedload(User.permissions),
                joinedload(User.assignments).joinedload(Assignment.position).joinedload(Position.role),
                joinedload(User.assignments).joinedload(Assignment.rank),
                joinedload(User.assignments).joinedload(Assignment.store),
            )
            .filter(User.sso_id == sso_id)
            .first()
        )

    def create_user(
        self,
        sso_id: UUID,
        external_id: Optional[int] = None,
        type_id: Optional[int] = None,
        updated_by: Optional[int] = None
    ) -> User:
        """Создать нового пользователя по SSO UUID"""
        user = User(
            sso_id=sso_id,
            external_id=external_id,
            type_id=type_id,
            updated_at=datetime.utcnow(),
            updated_by=updated_by
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_user_by_phone(self, phone: str) -> Optional[User]:
        """Получить пользователя по номеру телефона"""
        return self.db.query(User).filter(User.phone == phone).first()

    def get_or_create_user_by_sso(self, sso_id: UUID) -> tuple[User, bool]:
        """Получить или создать пользователя по SSO UUID. Используется в auth dependency.

        Возвращает (user, is_new): is_new=True если пользователь только что создан.
        """
        user = self.get_user_by_sso_id(sso_id)
        if not user:
            user = self.create_user(sso_id=sso_id)
            return user, True
        return user, False

    def has_lama_assignments(self, user_id: int) -> bool:
        """Проверить, есть ли у пользователя хотя бы одно назначение в LAMA-магазин.

        LAMA-магазин определяется по store.partner_id == settings.LAMA_PARTNER_ID.
        """
        return (
            self.db.query(Assignment)
            .join(Store, Assignment.store_id == Store.id)
            .filter(
                Assignment.user_id == user_id,
                Store.partner_id == settings.LAMA_PARTNER_ID,
            )
            .first()
        ) is not None

    def merge_preloaded_by_phone(self, current_user_id: int, phone: str) -> Optional[int]:
        """
        Найти User(phone=phone, sso_id=NULL) и выполнить merge с current_user.

        Поведение зависит от типа preloaded-пользователя:

        - Если у preloaded есть LAMA-назначения (store.partner_id == LAMA_PARTNER_ID):
          assignments переносятся к current_user, preloaded удаляется.
          Возвращает current_user_id.

        - Если LAMA-назначений нет (не-LAMA партнёр):
          sso_id и phone записываются в preloaded, current_user удаляется.
          Возвращает preloaded.id — caller должен использовать его как effective user_id.

        Возвращает None если preloaded-пользователь не найден.
        """
        preloaded = (
            self.db.query(User)
            .filter(
                User.phone == phone,
                User.sso_id.is_(None),
                User.id != current_user_id,
            )
            .first()
        )
        if not preloaded:
            return None

        if self.has_lama_assignments(preloaded.id):
            # LAMA-пользователь: переносим assignments к SSO-пользователю, удаляем preloaded
            logger.info(
                f"Phone merge (LAMA): preloaded user {preloaded.id} → current user {current_user_id} "
                f"(phone={phone})"
            )
            self.db.query(Assignment).filter(Assignment.user_id == preloaded.id).update(
                {"user_id": current_user_id}, synchronize_session=False
            )
            self.db.query(UserLamaCache).filter(UserLamaCache.user_id == preloaded.id).delete()
            self.db.delete(preloaded)
            self.db.flush()
            return current_user_id
        else:
            # Не-LAMA партнёр: добавляем sso_id к preloaded, удаляем только что созданного SSO-пользователя
            current_user = self.db.query(User).filter(User.id == current_user_id).first()
            logger.info(
                f"Phone merge (non-LAMA): set sso_id on preloaded user {preloaded.id}, "
                f"delete new SSO user {current_user_id} (phone={phone})"
            )
            sso_id_to_transfer = current_user.sso_id
            # Удаляем SSO-кэш нового пользователя (orphan после удаления)
            self.db.query(UserSSOCache).filter(UserSSOCache.user_id == current_user_id).delete()
            # Сначала удаляем нового SSO-пользователя и делаем flush, чтобы освободить sso_id.
            # Иначе UNIQUE constraint сработает: оба объекта имеют одинаковый sso_id в одной транзакции.
            self.db.delete(current_user)
            self.db.flush()
            preloaded.sso_id = sso_id_to_transfer
            preloaded.phone = phone
            self.db.flush()
            return preloaded.id

    def update_user(
        self,
        user_id: int,
        external_id: Optional[int] = None,
        type_id: Optional[int] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        middle_name: Optional[str] = None,
        updated_by: Optional[int] = None
    ) -> Optional[User]:
        """Обновить данные пользователя"""
        user = self.get_user(user_id)
        if not user:
            return None

        if external_id is not None:
            user.external_id = external_id
        if type_id is not None:
            user.type_id = type_id
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if middle_name is not None:
            user.middle_name = middle_name
        if updated_by is not None:
            user.updated_by = updated_by

        user.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)
        return user

    def get_store_users(self, store_id: int) -> List[User]:
        """
        Получить всех пользователей магазина.

        Ищет пользователей через assignments.store_id.
        """
        return (
            self.db.query(User)
            .options(
                joinedload(User.employee_type),
                joinedload(User.permissions),
                joinedload(User.assignments).joinedload(Assignment.position).joinedload(Position.role),
                joinedload(User.assignments).joinedload(Assignment.rank),
                joinedload(User.assignments).joinedload(Assignment.store),
            )
            .join(User.assignments)
            .filter(Assignment.store_id == store_id)
            .order_by(User.updated_at.desc())
            .distinct()
            .all()
        )

    # ========== Методы для работы с assignments ==========

    def get_user_assignments(self, user_id: int) -> List[Assignment]:
        """Получить все назначения пользователя"""
        return (
            self.db.query(Assignment)
            .options(
                joinedload(Assignment.position).joinedload(Position.role),
                joinedload(Assignment.rank),
            )
            .filter(Assignment.user_id == user_id)
            .all()
        )

    def upsert_assignment(
        self,
        user_id: int,
        external_id: int,
        company_name: Optional[str] = None,
        position_id: Optional[int] = None,
        rank_id: Optional[int] = None,
        store_id: Optional[int] = None,
        date_start=None,
        date_end=None,
    ) -> Assignment:
        """Создать или обновить assignment по external_id"""
        assignment = (
            self.db.query(Assignment)
            .filter(Assignment.external_id == external_id)
            .first()
        )

        if assignment:
            assignment.user_id = user_id
            assignment.company_name = company_name
            assignment.position_id = position_id
            assignment.rank_id = rank_id
            assignment.store_id = store_id
            assignment.date_start = date_start
            assignment.date_end = date_end
        else:
            assignment = Assignment(
                user_id=user_id,
                external_id=external_id,
                company_name=company_name,
                position_id=position_id,
                rank_id=rank_id,
                store_id=store_id,
                date_start=date_start,
                date_end=date_end,
            )
            self.db.add(assignment)

        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    # ========== Методы для работы с привилегиями ==========

    def get_active_permissions(self, user_id: int) -> List[Permission]:
        """Получить только активные привилегии пользователя (где revoked_at = null)"""
        return (
            self.db.query(Permission)
            .filter(
                Permission.user_id == user_id,
                Permission.revoked_at.is_(None)
            )
            .all()
        )

    def grant_permission(
        self,
        user_id: int,
        permission: PermissionType,
        granted_by: int
    ) -> Permission:
        """
        Назначить привилегию пользователю.

        Raises:
            ValueError: Если пользователь не найден или привилегия уже назначена
        """
        user = self.get_user(user_id)

        if not user:
            raise ValueError("Пользователь не найден")

        # Проверяем, нет ли уже активной привилегии
        existing = (
            self.db.query(Permission)
            .filter(
                Permission.user_id == user_id,
                Permission.permission == permission.value,
                Permission.revoked_at.is_(None)
            )
            .first()
        )

        if existing:
            raise ValueError(f"Привилегия {permission.value} уже назначена")

        # Создаём новую привилегию
        user_permission = Permission(
            user_id=user_id,
            permission=permission.value,
            granted_at=datetime.utcnow(),
            granted_by=granted_by
        )
        self.db.add(user_permission)
        self.db.commit()
        self.db.refresh(user_permission)
        return user_permission

    def revoke_permission(self, permission_id: UUID) -> bool:
        """
        Отозвать привилегию (soft delete).

        Устанавливает revoked_at = current_timestamp.
        """
        permission = (
            self.db.query(Permission)
            .filter(Permission.id == permission_id)
            .first()
        )

        if not permission:
            return False

        permission.revoked_at = datetime.utcnow()
        self.db.commit()
        return True

    def update_permissions(
        self,
        user_id: int,
        new_permissions: List[PermissionType],
        granted_by: int
    ) -> List[Permission]:
        """
        Обновить список привилегий пользователя.

        Сравнивает текущие активные привилегии с новым списком:
        - Добавляет новые привилегии
        - Отзывает (soft delete) привилегии, которых нет в новом списке
        """
        user = self.get_user(user_id)

        if not user:
            raise ValueError("Пользователь не найден")

        # Получаем текущие активные привилегии
        current_permissions = self.get_active_permissions(user_id)
        current_permission_types = {p.permission for p in current_permissions}

        # Новые типы привилегий (преобразуем в строки для сравнения)
        new_permission_types = {p.value for p in new_permissions}

        # Находим привилегии для добавления (есть в новом списке, но нет в текущих)
        permissions_to_add = new_permission_types - current_permission_types

        # Находим привилегии для отзыва (есть в текущих, но нет в новом списке)
        permissions_to_revoke = current_permission_types - new_permission_types

        # Добавляем новые привилегии
        for permission_type in permissions_to_add:
            new_permission = Permission(
                user_id=user_id,
                permission=permission_type,
                granted_at=datetime.utcnow(),
                granted_by=granted_by
            )
            self.db.add(new_permission)

        # Отзываем удалённые привилегии (soft delete)
        for permission in current_permissions:
            if permission.permission in permissions_to_revoke:
                permission.revoked_at = datetime.utcnow()

        self.db.commit()

        # Возвращаем обновлённый список активных привилегий
        return self.get_active_permissions(user_id)

    def get_permission_by_id(self, permission_id: UUID) -> Optional[Permission]:
        """Получить привилегию по ID"""
        return (
            self.db.query(Permission)
            .filter(Permission.id == permission_id)
            .first()
        )

    # ========== Вспомогательные методы ==========

    def _get_user_role_code(self, user_id: int) -> Optional[str]:
        """Получить код роли пользователя через assignments → position → role"""
        result = (
            self.db.query(Role.code)
            .join(Position, Position.role_id == Role.id)
            .join(Assignment, Assignment.position_id == Position.id)
            .filter(Assignment.user_id == user_id)
            .first()
        )
        return result[0] if result else None

    def is_manager(self, user_id: int) -> bool:
        """Проверить, является ли пользователь управляющим (через assignment → position → role)"""
        return self._get_user_role_code(user_id) == "manager"

    def is_worker(self, user_id: int) -> bool:
        """Проверить, является ли пользователь работником (через assignment → position → role)"""
        return self._get_user_role_code(user_id) == "worker"

    def get_user_store_id(self, user_id: int) -> Optional[int]:
        """Получить ID магазина пользователя из assignments"""
        result = (
            self.db.query(Assignment.store_id)
            .filter(Assignment.user_id == user_id, Assignment.store_id.isnot(None))
            .first()
        )
        return result[0] if result else None
