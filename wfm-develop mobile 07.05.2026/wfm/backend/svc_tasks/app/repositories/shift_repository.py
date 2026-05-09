from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from datetime import datetime, date

from app.domain.models import ShiftFact, ShiftPlan


class ShiftRepository:
    """Репозиторий для работы со сменами (перенесено из svc_shifts)"""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # ShiftFact
    # =========================================================================

    def get_fact_by_id(self, shift_id: int) -> Optional[ShiftFact]:
        """Получить фактическую смену по ID"""
        return self.db.query(ShiftFact).filter(ShiftFact.id == shift_id).first()

    def get_open_shift_by_assignment(self, assignment_id: int) -> Optional[ShiftFact]:
        """Найти любую незакрытую смену по assignment_id (без фильтра по дате).
        Используется при открытии новой смены для автозакрытия предыдущей."""
        return (
            self.db.query(ShiftFact)
            .join(ShiftPlan, ShiftFact.plan_id == ShiftPlan.id)
            .filter(
                ShiftPlan.assignment_id == assignment_id,
                ShiftFact.closed_at.is_(None),
            )
            .first()
        )

    def get_open_shift_by_plan_id(self, plan_id: int) -> Optional[ShiftFact]:
        """Найти открытую смену по plan_id"""
        return self.db.query(ShiftFact).filter(
            and_(
                ShiftFact.plan_id == plan_id,
                ShiftFact.closed_at.is_(None),
            )
        ).first()

    def get_last_today_fact_shift(self, today: date, assignment_id: int) -> Optional[ShiftFact]:
        """Получить последнюю фактическую смену за сегодня по assignment_id.
        Сравниваем по ShiftPlan.shift_date, а не func.date(opened_at), чтобы
        избежать timezone-проблем: opened_at хранится в UTC, а shift_date — явная дата."""
        return (
            self.db.query(ShiftFact)
            .join(ShiftPlan, ShiftFact.plan_id == ShiftPlan.id)
            .filter(
                ShiftPlan.assignment_id == assignment_id,
                ShiftPlan.shift_date == today,
            )
            .order_by(ShiftFact.opened_at.desc())
            .first()
        )

    def create_fact_shift(self, plan_id: int) -> ShiftFact:
        """Создать фактическую смену (открыть смену)"""
        shift = ShiftFact(plan_id=plan_id, opened_at=datetime.utcnow())
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def close_shift(self, shift: ShiftFact) -> ShiftFact:
        """Закрыть смену (установить closed_at)"""
        shift.closed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(shift)
        return shift

    # =========================================================================
    # ShiftPlan
    # =========================================================================

    def get_plan_by_id(self, plan_id: int) -> Optional[ShiftPlan]:
        """Получить плановую смену по ID"""
        return self.db.query(ShiftPlan).filter(ShiftPlan.id == plan_id).first()

    def get_first_today_plan_shift(self, today: date, assignment_id: int) -> Optional[ShiftPlan]:
        """Получить первую плановую смену за сегодня по assignment_id"""
        return (
            self.db.query(ShiftPlan)
            .filter(
                ShiftPlan.assignment_id == assignment_id,
                ShiftPlan.shift_date == today,
            )
            .order_by(ShiftPlan.start_time)
            .first()
        )

    def get_all_open_shifts(self) -> list[ShiftFact]:
        """Получить все открытые смены (для EOD закрытия)"""
        return self.db.query(ShiftFact).filter(ShiftFact.closed_at.is_(None)).all()

    def get_today_plans_for_assignments(self, today: date, assignment_ids: list[int]) -> list[ShiftPlan]:
        """Получить плановые смены на сегодня для списка assignment_ids"""
        if not assignment_ids:
            return []
        return (
            self.db.query(ShiftPlan)
            .filter(
                ShiftPlan.assignment_id.in_(assignment_ids),
                ShiftPlan.shift_date == today,
            )
            .all()
        )
