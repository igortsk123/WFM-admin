import sys
from pathlib import Path

# Добавляем shared модуль в путь
# В контейнере: /app/app/api/users.py -> /app (где лежит /app/shared/)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from shared import CurrentUser
from app.api.dependencies import get_current_user
from app.domain.schemas import (
    UserMeResponse,
    UserResponse,
    UserUpdate,
    PermissionsUpdate,
    AssignmentResponse,
)
from app.repositories.user_repository import UserRepository
from app.domain.models import UserLamaCache, UserSSOCache
from app.services.sso_service import SSOService, get_sso_service
from app.services.lama_service import LamaService, get_lama_service
from shared import (
    ApiResponse,
    ok,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    ValidationException,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


# ========== Endpoint /users/me ==========

@router.get("/me")
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    sso_service: SSOService = Depends(get_sso_service),
    lama_service: LamaService = Depends(get_lama_service),
) -> ApiResponse[UserMeResponse]:
    """
    Получить полную информацию о текущем пользователе.

    Склеивает данные из локальной БД (тип, привилегии, назначения)
    с данными из SSO API (ФИО, email, телефон, фото и т.д.)
    и LAMA API (назначения, должности, разряды).

    SSO данные кэшируются на 24 часа. LAMA данные кэшируются на 1 час.
    При недоступности внешних сервисов возвращаются устаревшие/локальные данные.
    """
    # 1. Получить токен из заголовка Authorization
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    if not token:
        raise UnauthorizedException("Missing authorization token")

    # 2. Получить sso_id из current_user (UUID)
    sso_id = UUID(current_user.sso_id)
    user_id = current_user.user_id  # integer ID

    # 3. Получить локальные данные пользователя
    repo = UserRepository(db)
    user = repo.get_user_with_permissions(user_id)

    if not user:
        raise UnauthorizedException("Пользователь не найден в локальной БД")

    # 4. Получить данные из SSO (с кэшированием по integer user_id)
    sso_cache = await sso_service.get_user_info(user_id, token, db)

    # 5. Phone merge для preloaded-пользователей + сохранение телефона
    # Порядок важен: сначала merge (preloaded X уже может иметь этот телефон с UNIQUE constraint),
    # и только если preloaded не найден — сохраняем телефон на текущем пользователе.
    if sso_cache and sso_cache.phone:
        effective_user_id = repo.merge_preloaded_by_phone(user_id, sso_cache.phone)
        if effective_user_id is not None:
            db.commit()
            user_id = effective_user_id
            user = repo.get_user_with_permissions(user_id)
        elif user.phone != sso_cache.phone:
            user.phone = sso_cache.phone
            db.commit()

    # 6. Синхронизировать данные из LAMA (с кэшированием 1 час)
    # Пропускаем sync только если у пользователя есть назначения И ни одно из них не в LAMA-магазине.
    # Если назначений нет — вызываем LAMA: пользователь может оказаться LAMA-сотрудником,
    # которому нужно проставить external_id и создать назначения.
    user_assignments = user.assignments if user else []
    is_confirmed_non_lama = len(user_assignments) > 0 and not repo.has_lama_assignments(user_id)
    assignments = []
    if sso_cache and sso_cache.phone and not is_confirmed_non_lama:
        try:
            assignments = await lama_service.sync_employee(user_id, sso_cache.phone, db)
            # Перезагружаем пользователя после LAMA sync (мог обновиться external_id)
            user = repo.get_user_with_permissions(user_id)
        except Exception as e:
            logger.warning(f"LAMA sync failed for user {user_id}: {e}")
            assignments = user.assignments if user else []
    else:
        assignments = user.assignments if user else []

    # 7. Фильтруем только активные привилегии
    active_permissions = [p for p in user.permissions if p.revoked_at is None]

    # 8. Получить LAMA кэш для ФИО (приоритет LAMA над локальными и SSO)
    lama_cache = db.query(UserLamaCache).filter(UserLamaCache.user_id == user_id).first()

    # 9. Формируем и возвращаем ответ (ФИО: LAMA → local users → SSO fallback)
    def resolve_name(lama_val, local_val, sso_val):
        return (lama_val or None) or (local_val or None) or (sso_val or None)

    return ok(UserMeResponse(
        # Локальные данные
        id=user.id,
        sso_id=user.sso_id,
        external_id=user.external_id,
        employee_type=user.employee_type,
        permissions=active_permissions,
        assignments=[AssignmentResponse.model_validate(a) for a in assignments],
        # ФИО: приоритет LAMA, затем локальные поля users, fallback на SSO
        first_name=resolve_name(
            lama_cache.first_name if lama_cache else None,
            user.first_name,
            sso_cache.first_name if sso_cache else None,
        ),
        last_name=resolve_name(
            lama_cache.last_name if lama_cache else None,
            user.last_name,
            sso_cache.last_name if sso_cache else None,
        ),
        middle_name=resolve_name(
            lama_cache.middle_name if lama_cache else None,
            user.middle_name,
            sso_cache.middle_name if sso_cache else None,
        ),
        # SSO данные
        email=sso_cache.email if sso_cache else None,
        phone=sso_cache.phone if sso_cache else None,
        photo_url=sso_cache.photo_url if sso_cache else None,
        gender=sso_cache.gender if sso_cache else None,
        birth_date=sso_cache.birth_date if sso_cache else None,
    ))


# ========== Endpoint /users/me DELETE ==========

@router.delete("/me")
async def delete_current_user_account(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    """
    Удалить учётную запись текущего пользователя.

    Вызывает Beyond Violet Shopping API для удаления аккаунта.
    После успешного удаления очищает phone в локальной записи,
    чтобы при повторной регистрации не было UniqueViolation.
    Остальные локальные данные (задачи, смены) не удаляются.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise UnauthorizedException("Missing authorization token")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                settings.ACCOUNT_DELETE_URL,
                headers={
                    "Authorization": auth_header,
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json",
                },
                timeout=settings.ACCOUNT_DELETE_TIMEOUT,
            )

        if response.status_code == 200:
            repo = UserRepository(db)
            user = repo.get_user(current_user.user_id)
            if user and user.phone is not None:
                user.phone = None
            # Удаляем SSO-кэш, чтобы повторный /me не восстановил телефон из кэша
            db.query(UserSSOCache).filter(UserSSOCache.user_id == current_user.user_id).delete()
            db.commit()
            logger.info(f"Account deleted for user {current_user.user_id}")
            return ok(None)

        logger.error(f"Account deletion failed for user {current_user.user_id}: HTTP {response.status_code}")
        raise ValidationException("Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку.")

    except httpx.TimeoutException:
        logger.error(f"Account deletion timeout for user {current_user.user_id}")
        raise ValidationException("Превышено время ожидания. Попробуйте позже.")

    except httpx.HTTPError as e:
        logger.error(f"Account deletion HTTP error for user {current_user.user_id}: {e}")
        raise ValidationException("Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку.")


# ========== CRUD endpoints для пользователей (для MANAGER) ==========

@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[UserResponse]:
    """
    Получить данные пользователя по ID (только MANAGER).

    Управляющий может просматривать только пользователей своего магазина.
    """
    repo = UserRepository(db)

    # Проверка прав: только MANAGER
    if not repo.is_manager(current_user.user_id):
        raise ForbiddenException("Доступ запрещён: требуется роль MANAGER")

    # Проверка: пользователи должны быть из одного магазина
    current_user_store = repo.get_user_store_id(current_user.user_id)
    target_user = repo.get_user_with_permissions(user_id)

    if not target_user:
        raise NotFoundException(f"Пользователь {user_id} не найден")

    target_user_store = repo.get_user_store_id(user_id)
    if target_user_store != current_user_store:
        raise ForbiddenException("Доступ запрещён: пользователи из разных магазинов")

    # Фильтруем только активные привилегии
    active_permissions = [p for p in target_user.permissions if p.revoked_at is None]

    return ok(UserResponse(
        id=target_user.id,
        sso_id=target_user.sso_id,
        external_id=target_user.external_id,
        employee_type=target_user.employee_type,
        permissions=active_permissions,
        assignments=[AssignmentResponse.model_validate(a) for a in target_user.assignments],
        updated_at=target_user.updated_at
    ))


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[UserResponse]:
    """
    Обновить данные пользователя (только MANAGER).

    Управляющий может обновлять только пользователей своего магазина.
    """
    repo = UserRepository(db)

    # Проверка прав: только MANAGER
    if not repo.is_manager(current_user.user_id):
        raise ForbiddenException("Доступ запрещён: требуется роль MANAGER")

    # Проверка: пользователи должны быть из одного магазина
    current_user_store = repo.get_user_store_id(current_user.user_id)
    target_user = repo.get_user(user_id)

    if not target_user:
        raise NotFoundException(f"Пользователь {user_id} не найден")

    target_user_store = repo.get_user_store_id(user_id)
    if target_user_store != current_user_store:
        raise ForbiddenException("Доступ запрещён: пользователи из разных магазинов")

    # Обновляем данные
    updated_user = repo.update_user(
        user_id=user_id,
        external_id=user_data.external_id,
        type_id=user_data.type_id,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        middle_name=user_data.middle_name,
        updated_by=current_user.user_id
    )

    # Перезагружаем с relationships
    updated_user = repo.get_user_with_permissions(user_id)
    active_permissions = [p for p in updated_user.permissions if p.revoked_at is None]

    return ok(UserResponse(
        id=updated_user.id,
        sso_id=updated_user.sso_id,
        external_id=updated_user.external_id,
        employee_type=updated_user.employee_type,
        permissions=active_permissions,
        assignments=[AssignmentResponse.model_validate(a) for a in updated_user.assignments],
        updated_at=updated_user.updated_at
    ))


# ========== Endpoints для привилегий ==========

@router.patch("/{user_id}/permissions")
def update_permissions(
    user_id: int,
    permissions_data: PermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> ApiResponse[UserResponse]:
    """
    Обновить список привилегий пользователя (только MANAGER).

    Управляющий отправляет полный список привилегий, которые должны быть у пользователя.
    Система автоматически:
    - Добавляет новые привилегии (которых не было)
    - Отзывает (soft delete) привилегии, которых нет в новом списке
    """
    repo = UserRepository(db)

    # Проверка прав: только MANAGER
    if not repo.is_manager(current_user.user_id):
        raise ForbiddenException("Доступ запрещён: требуется роль MANAGER")

    # Проверка: пользователи должны быть из одного магазина
    current_user_store = repo.get_user_store_id(current_user.user_id)
    target_user = repo.get_user(user_id)

    if not target_user:
        raise NotFoundException(f"Пользователь {user_id} не найден")

    target_user_store = repo.get_user_store_id(user_id)
    if target_user_store != current_user_store:
        raise ForbiddenException("Доступ запрещён: пользователи из разных магазинов")

    # Обновляем привилегии
    try:
        updated_permissions = repo.update_permissions(
            user_id=user_id,
            new_permissions=permissions_data.permissions,
            granted_by=current_user.user_id
        )

        # Перезагружаем пользователя с обновлёнными данными
        updated_user = repo.get_user_with_permissions(user_id)

        return ok(UserResponse(
            id=updated_user.id,
            sso_id=updated_user.sso_id,
            external_id=updated_user.external_id,
            employee_type=updated_user.employee_type,
            permissions=updated_permissions,
            assignments=[AssignmentResponse.model_validate(a) for a in updated_user.assignments],
            updated_at=updated_user.updated_at
        ))

    except ValueError as e:
        raise ValidationException(str(e))
