"""
API эндпоинты для управления магазинами.
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.domain.schemas import StoreCreate, StoreUpdate, StoreResponse, StoreListResponse
from app.repositories.store_repository import StoreRepository
from shared import ok, NotFoundException, CurrentUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("")
def get_stores(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Получить список всех магазинов."""
    repo = StoreRepository(db)
    stores = repo.get_all()
    return ok(StoreListResponse(stores=[StoreResponse.model_validate(s) for s in stores]))


@router.post("")
def create_store(
    data: StoreCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Создать новый магазин."""
    repo = StoreRepository(db)
    store = repo.create(name=data.name, address=data.address, external_code=data.external_code)
    logger.info(f"Создан магазин: id={store.id}, name={store.name}")
    return ok(StoreResponse.model_validate(store))


@router.get("/{store_id}")
def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Получить магазин по ID."""
    repo = StoreRepository(db)
    store = repo.get_by_id(store_id)
    if not store:
        raise NotFoundException(f"Магазин с id={store_id} не найден")
    return ok(StoreResponse.model_validate(store))


@router.patch("/{store_id}")
def update_store(
    store_id: int,
    data: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Обновить магазин."""
    repo = StoreRepository(db)
    store = repo.get_by_id(store_id)
    if not store:
        raise NotFoundException(f"Магазин с id={store_id} не найден")
    store = repo.update(store, name=data.name, address=data.address, external_code=data.external_code)
    logger.info(f"Обновлён магазин: id={store.id}")
    return ok(StoreResponse.model_validate(store))
