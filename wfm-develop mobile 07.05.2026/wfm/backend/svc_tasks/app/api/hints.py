import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from shared import get_current_user, CurrentUser
from app.domain.models import Hint, WorkType, Zone
from app.domain.schemas import HintResponse, HintCreate, HintUpdate, HintListData
from shared import ApiResponse, ok

router = APIRouter(tags=["hints"])


@router.get("/hints")
def get_hints(
    work_type_id: int,
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[HintListData]:
    """Получить список подсказок для типа работы и зоны.

    Оба параметра обязательны. Подсказки отсортированы по id.
    Если подсказок нет — возвращает пустой список.
    """
    items = db.query(Hint).filter(
        Hint.work_type_id == work_type_id,
        Hint.zone_id == zone_id,
    ).order_by(Hint.id).all()

    return ok(HintListData(hints=[HintResponse.model_validate(i) for i in items]))


@router.post("/hints")
def create_hint(
    body: HintCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[HintResponse]:
    """Создать подсказку (только MANAGER)."""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    if not db.query(WorkType).filter(WorkType.id == body.work_type_id).first():
        raise HTTPException(status_code=404, detail="Тип работы не найден")
    if not db.query(Zone).filter(Zone.id == body.zone_id).first():
        raise HTTPException(status_code=404, detail="Зона не найдена")

    hint = Hint(work_type_id=body.work_type_id, zone_id=body.zone_id, text=body.text)
    db.add(hint)
    db.commit()
    db.refresh(hint)

    return ok(HintResponse.model_validate(hint))


@router.patch("/hints/{hint_id}")
def update_hint(
    hint_id: int,
    body: HintUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[HintResponse]:
    """Обновить текст подсказки (только MANAGER)."""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    hint = db.query(Hint).filter(Hint.id == hint_id).first()
    if not hint:
        raise HTTPException(status_code=404, detail="Подсказка не найдена")

    hint.text = body.text
    db.commit()
    db.refresh(hint)

    return ok(HintResponse.model_validate(hint))


@router.delete("/hints/{hint_id}")
def delete_hint(
    hint_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[None]:
    """Удалить подсказку (только MANAGER)."""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    hint = db.query(Hint).filter(Hint.id == hint_id).first()
    if not hint:
        raise HTTPException(status_code=404, detail="Подсказка не найдена")

    db.delete(hint)
    db.commit()

    return ok(None)
