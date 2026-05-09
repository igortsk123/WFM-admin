"""
Синхронизация смен из LAMA (перенесено из svc_shifts).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from typing import Optional
from datetime import time, date
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.models import ShiftPlan
from shared import LamaClient

logger = logging.getLogger(__name__)


class ShiftLamaService:
    """Синхронизация данных смены из LAMA"""

    def __init__(self):
        self.client = LamaClient(
            base_url=settings.LAMA_API_BASE_URL,
            timeout=settings.LAMA_API_TIMEOUT,
            enabled=settings.LAMA_API_ENABLED,
        )

    async def sync_shift(
        self,
        employee_in_shop_id: int,
        assignment_id: int,
        db: Session,
    ) -> Optional[ShiftPlan]:
        """
        Синхронизировать смену из LAMA.

        1. GET /shift/?employee_in_shop_id={id}
        2. Upsert ShiftPlan по external_id
        """
        data = await self.client.get_shift(employee_in_shop_id)
        if data is None:
            return None

        shift_external_id = data.get("id")
        if shift_external_id is None:
            return None

        start_time = self._parse_time(data.get("time_start"))
        shift_date_val = self._parse_date(data.get("date_shift"))
        duration = data.get("duration")
        end_time = self._calc_end_time(start_time, duration)

        if not start_time or not shift_date_val:
            logger.warning(f"LAMA shift data incomplete: {data}")
            return None

        plan = (
            db.query(ShiftPlan)
            .filter(ShiftPlan.external_id == shift_external_id)
            .first()
        )

        if plan:
            plan.shift_date = shift_date_val
            plan.start_time = start_time
            plan.end_time = end_time
            plan.assignment_id = assignment_id
            plan.duration = duration
            plan.partner_id = settings.LAMA_PARTNER_ID
        else:
            plan = ShiftPlan(
                assignment_id=assignment_id,
                shift_date=shift_date_val,
                start_time=start_time,
                end_time=end_time,
                external_id=shift_external_id,
                duration=duration,
                partner_id=settings.LAMA_PARTNER_ID,
            )
            db.add(plan)

        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def _parse_time(value: Optional[str]) -> Optional[time]:
        if not value:
            return None
        try:
            parts = value.split(":")
            return time(int(parts[0]), int(parts[1]))
        except (ValueError, TypeError, IndexError):
            return None

    @staticmethod
    def _calc_end_time(start: Optional[time], duration_hours: Optional[int]) -> Optional[time]:
        if not start:
            return None
        if not duration_hours:
            # LAMA может вернуть duration=0 или None — используем 23:59 как заглушку
            return time(23, 59)
        total_minutes = start.hour * 60 + start.minute + duration_hours * 60
        return time(total_minutes // 60 % 24, total_minutes % 60)

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except (ValueError, TypeError):
            return None


def get_shift_lama_service() -> ShiftLamaService:
    """Dependency для получения экземпляра ShiftLamaService"""
    return ShiftLamaService()
