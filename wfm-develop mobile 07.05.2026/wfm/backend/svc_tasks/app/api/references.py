import sys
from pathlib import Path

# Добавляем shared модуль в путь
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from shared import get_current_user, CurrentUser
from typing import Optional
from app.domain.models import WorkType, Zone, Category
from app.domain.schemas import (
    WorkTypeResponse,
    WorkTypeListData,
    WorkTypeUpdate,
    ZoneResponse,
    ZoneListData,
    CategoryResponse,
    CategoryListData,
)
from shared import ApiResponse, ok

router = APIRouter(tags=["references"])


@router.get("/references/work-types")
def get_work_types(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[WorkTypeListData]:
    """Получить список типов работ"""
    items = db.query(WorkType).order_by(WorkType.id).all()
    return ok(WorkTypeListData(
        work_types=[WorkTypeResponse.model_validate(i) for i in items]
    ))


@router.patch("/references/work-types/{work_type_id}")
def update_work_type(
    work_type_id: int,
    body: WorkTypeUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[WorkTypeResponse]:
    """Обновить тип работы (только MANAGER).

    Позволяет управляющему настроить флаги для данного типа работы.
    При следующей синхронизации с LAMA новые задачи этого типа получат актуальные значения.

    - `requires_photo` — обязателен ли фотоотчёт при завершении задачи
    - `acceptance_policy` — политика приёмки для задач этого типа: AUTO или MANUAL
    """
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    work_type = db.query(WorkType).filter(WorkType.id == work_type_id).first()
    if not work_type:
        raise HTTPException(status_code=404, detail="Тип работы не найден")

    if body.requires_photo is not None:
        work_type.requires_photo = body.requires_photo
    if body.acceptance_policy is not None:
        if body.acceptance_policy not in ("AUTO", "MANUAL"):
            raise HTTPException(status_code=422, detail="acceptance_policy должен быть AUTO или MANUAL")
        work_type.acceptance_policy = body.acceptance_policy
    db.commit()
    db.refresh(work_type)

    return ok(WorkTypeResponse.model_validate(work_type))


@router.get("/references/zones")
def get_zones(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[ZoneListData]:
    """Получить список зон"""
    items = db.query(Zone).order_by(Zone.priority, Zone.id).all()
    return ok(ZoneListData(
        zones=[ZoneResponse.model_validate(i) for i in items]
    ))


@router.get("/references/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[CategoryListData]:
    """Получить список категорий"""
    items = db.query(Category).order_by(Category.name).all()
    return ok(CategoryListData(
        categories=[CategoryResponse.model_validate(i) for i in items]
    ))


