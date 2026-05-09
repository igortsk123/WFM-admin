import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from shared import get_current_user, CurrentUser
from app.domain.models import Operation, OperationWorkTypeZone
from app.domain.schemas import OperationResponse, OperationListData, OperationReviewState
from shared import ApiResponse, ok

router = APIRouter(tags=["operations"])


@router.get("/operations")
def get_operations(
    work_type_id: int,
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[OperationListData]:
    """Получить список операций для типа работы и зоны.

    Возвращает операции со статусом ACCEPTED и PENDING (отклонённые не показываются).
    Сортировка по display_order пары (work_type, zone), затем по id для стабильности.
    """
    rows = db.query(Operation, OperationWorkTypeZone.display_order).join(
        OperationWorkTypeZone,
        OperationWorkTypeZone.operation_id == Operation.id,
    ).filter(
        OperationWorkTypeZone.work_type_id == work_type_id,
        OperationWorkTypeZone.zone_id == zone_id,
        Operation.review_state.in_([OperationReviewState.ACCEPTED, OperationReviewState.PENDING]),
    ).order_by(OperationWorkTypeZone.display_order, Operation.id).all()

    return ok(OperationListData(operations=[
        OperationResponse.from_model_with_order(op, display_order)
        for op, display_order in rows
    ]))


@router.get("/operations/pending")
def get_pending_operations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[OperationListData]:
    """Получить список операций, ожидающих проверки (только MANAGER).

    Возвращает все операции со статусом PENDING независимо от типа работы и зоны.
    Сортировка по id (порядку предложения).
    """
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    items = db.query(Operation).filter(
        Operation.review_state == OperationReviewState.PENDING
    ).order_by(Operation.id).all()

    return ok(OperationListData(operations=[OperationResponse.from_model(op) for op in items]))


@router.post("/operations/{operation_id}/approve")
def approve_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[OperationResponse]:
    """Принять предложенную операцию: PENDING → ACCEPTED (только MANAGER)."""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Операция не найдена")
    if op.review_state != OperationReviewState.PENDING:
        raise HTTPException(status_code=409, detail=f"Операция не находится в статусе PENDING (текущий: {op.review_state})")

    op.review_state = OperationReviewState.ACCEPTED
    db.commit()
    db.refresh(op)

    return ok(OperationResponse.from_model(op))


@router.post("/operations/{operation_id}/reject")
def reject_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse[OperationResponse]:
    """Отклонить предложенную операцию: PENDING → REJECTED (только MANAGER).

    Операция не удаляется — исторические ссылки из task_completed_operations сохраняются.
    """
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется роль MANAGER")

    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Операция не найдена")
    if op.review_state != OperationReviewState.PENDING:
        raise HTTPException(status_code=409, detail=f"Операция не находится в статусе PENDING (текущий: {op.review_state})")

    op.review_state = OperationReviewState.REJECTED
    db.commit()
    db.refresh(op)

    return ok(OperationResponse.from_model(op))
