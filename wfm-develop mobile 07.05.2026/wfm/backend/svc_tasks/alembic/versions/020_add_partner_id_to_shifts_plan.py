"""Добавить partner_id в shifts_plan

Revision ID: 020
Revises: 019
Create Date: 2026-04-07 00:00:00.000000

Денормализация: partner_id позволяет svc_tasks определить принадлежность смены
к конкретному партнёру без запроса в svc_users (chain: shift → assignment → store → partner).

Значение NULL означает "партнёр не определён". Проставляется при синхронизации:
- LAMA sync (ShiftLamaService) → partner_id = LAMA_PARTNER_ID (2)
- Смены, созданные вручную менеджером → partner_id = NULL (не синхронизируются с LAMA)

Существующие строки в shifts_plan оставляем с partner_id = NULL. Они будут
корректно обработаны: при следующей LAMA-синхронизации значение обновится до 2.
"""
from alembic import op
import sqlalchemy as sa

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'shifts_plan',
        sa.Column('partner_id', sa.Integer(), nullable=True),
    )


def downgrade():
    op.drop_column('shifts_plan', 'partner_id')
