"""
Внутренние эндпоинты для межсервисного взаимодействия.
Доступны только из Docker-сети, без JWT авторизации.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.domain.models import Assignment, User, UserLamaCache, UserSSOCache, Position, Role, Store
from app.repositories.user_repository import UserRepository
from app.services.lama_service import LamaService
from shared import ok, NotFoundException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/id-by-phone")
def get_user_id_by_phone(
    phone: str = Query(..., description="Номер телефона пользователя"),
    db: Session = Depends(get_db),
):
    """
    Получить internal integer ID пользователя по номеру телефона.

    Используется svc_tasks для impersonation: когда разработчик с flags.dev=true
    передаёт X-Auth-By хидер, svc_tasks вызывает этот endpoint для получения
    user_id целевого пользователя.

    Без JWT авторизации — доступен только из внутренней Docker-сети.
    Возвращает 404 если пользователь не найден.
    """
    repo = UserRepository(db)
    user = repo.get_user_by_phone(phone)
    if not user:
        raise NotFoundException(f"Пользователь с phone={phone!r} не найден")
    return ok({"id": user.id})


@router.get("/id-by-sso")
def get_user_id_by_sso(
    sso_id: UUID = Query(..., description="SSO UUID пользователя (поле 'u' из JWT)"),
    db: Session = Depends(get_db),
):
    """
    Получить internal integer ID пользователя по SSO UUID.

    Используется для межсервисного взаимодействия (svc_tasks → svc_users).
    Без JWT авторизации — доступен только из внутренней Docker-сети.

    Если пользователь не найден — создаёт запись автоматически.
    """
    repo = UserRepository(db)
    user, _ = repo.get_or_create_user_by_sso(sso_id)
    return ok({"id": user.id, "sso_id": str(user.sso_id)})


@router.get("/user-role")
def get_user_role(
    assignment_id: int = Query(..., description="ID назначения (PK таблицы assignments)"),
    db: Session = Depends(get_db),
):
    """
    Получить роль пользователя по assignment_id.
    Роль определяется через цепочку: Assignment → Position → Role.

    Используется для межсервисного взаимодействия (svc_tasks → svc_users).
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    assignment = (
        db.query(Assignment)
        .join(Assignment.position)
        .join(Position.role)
        .filter(Assignment.id == assignment_id)
        .first()
    )

    if not assignment or not assignment.position or not assignment.position.role:
        return ok({"assignment_id": assignment_id, "role_code": "worker", "is_manager": False})

    role = assignment.position.role
    is_manager = role.code == "manager"
    return ok({"assignment_id": assignment_id, "role_code": role.code, "is_manager": is_manager})


@router.get("/assignment-external-id")
def get_assignment_external_id(
    assignment_id: int = Query(..., description="ID назначения (PK таблицы assignments)"),
    db: Session = Depends(get_db),
):
    """
    Получить external_id (employee_in_shop_id из LAMA) по assignment_id.

    Используется для межсервисного взаимодействия (svc_tasks → svc_users).
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise NotFoundException(f"Назначение с id={assignment_id} не найдено")

    return ok({
        "assignment_id": assignment.id,
        "external_id": assignment.external_id,
    })


@router.get("/store-assignments-by-assignment")
def get_store_assignments_by_assignment(
    assignment_id: int = Query(..., description="ID назначения (PK таблицы assignments)"),
    db: Session = Depends(get_db),
):
    """
    Получить все назначения сотрудников магазина по assignment_id одного сотрудника.

    Объединяет поиск магазина и получение списка сотрудников в один запрос.
    Используется в svc_tasks для получения контекста магазина (список задач, фильтры).
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    anchor = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not anchor or not anchor.store_id:
        return ok({"assignments": []})

    assignments = (
        db.query(Assignment)
        .options(joinedload(Assignment.position))
        .filter(Assignment.store_id == anchor.store_id)
        .all()
    )

    if not assignments:
        return ok({"assignments": []})

    user_ids = [a.user_id for a in assignments]
    lama_cache = {
        c.user_id: c
        for c in db.query(UserLamaCache).filter(UserLamaCache.user_id.in_(user_ids)).all()
    }
    sso_cache = {
        c.user_id: c
        for c in db.query(UserSSOCache).filter(UserSSOCache.user_id.in_(user_ids)).all()
    }
    local_users = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(user_ids)).all()
    }

    result = []
    for a in assignments:
        lama = lama_cache.get(a.user_id)
        sso = sso_cache.get(a.user_id)
        local = local_users.get(a.user_id)
        # Приоритет ФИО: LAMA → users (локальные поля) → SSO
        first_name = (lama.first_name if lama else None) or (local.first_name if local else None) or (sso.first_name if sso else None)
        last_name = (lama.last_name if lama else None) or (local.last_name if local else None) or (sso.last_name if sso else None)
        middle_name = (lama.middle_name if lama else None) or (local.middle_name if local else None) or (sso.middle_name if sso else None)

        position_data = None
        if a.position:
            position_data = {
                "id": a.position.id,
                "code": a.position.code,
                "name": a.position.name,
            }
        result.append({
            "assignment_id": a.id,
            "user_id": a.user_id,
            "external_id": a.external_id,
            "first_name": first_name,
            "last_name": last_name,
            "middle_name": middle_name,
            "position": position_data,
        })

    return ok({"assignments": result})


@router.get("/all-store-codes")
def get_all_store_codes(db: Session = Depends(get_db)):
    """
    Получить список external_code всех магазинов с привязкой к LAMA.

    Используется svc_tasks для запуска ежедневной синхронизации по всем магазинам.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    codes = (
        db.query(Store.external_code)
        .filter(
            Store.external_code.isnot(None),
            Store.partner_id == settings.LAMA_PARTNER_ID,
        )
        .all()
    )
    return ok({"store_codes": [row[0] for row in codes]})


@router.post("/sync-lama-store")
async def sync_lama_store(
    shop_code: str = Query(..., description="shop_code магазина из LAMA"),
    db: Session = Depends(get_db),
):
    """
    Синхронизировать сотрудников магазина из LAMA.

    Создаёт/обновляет пользователей и их назначения. Пользователи создаются
    без sso_id — при первом входе через телефон sso_id будет добавлен.

    Возвращает список assignments для последующей синхронизации смен и задач.
    Без JWT авторизации — доступен только из внутренней Docker-сети.
    """
    service = LamaService()
    assignments = await service.sync_store_employees(shop_code, db)
    return ok({
        "shop_code": shop_code,
        "synced": len(assignments),
        "assignments": assignments,
    })
