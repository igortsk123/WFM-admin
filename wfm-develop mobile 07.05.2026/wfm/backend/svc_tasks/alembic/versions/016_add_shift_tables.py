"""Добавить таблицы shifts_plan и shifts_fact (перенос из svc_shifts)

Revision ID: 016
Revises: 015
Create Date: 2026-03-11 00:00:00.000000

Переносит доменные данные смен из svc_shifts в svc_tasks.
Таблицы создаются пустыми — данные мигрируются вручную через pg_dump/restore.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '016'
down_revision: Union[str, None] = '015'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'shifts_plan',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('assignment_id', sa.Integer(), nullable=False),
        sa.Column('shift_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('external_id', sa.Integer(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.UniqueConstraint('external_id', name='uq_shifts_plan_external_id'),
    )
    op.create_index('ix_shifts_plan_assignment_id', 'shifts_plan', ['assignment_id'])
    op.create_index('ix_shifts_plan_shift_date', 'shifts_plan', ['shift_date'])

    op.create_table(
        'shifts_fact',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('shifts_plan.id'), nullable=False),
        sa.Column('opened_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_shifts_fact_plan_id', 'shifts_fact', ['plan_id'])


def downgrade() -> None:
    op.drop_index('ix_shifts_fact_plan_id', table_name='shifts_fact')
    op.drop_table('shifts_fact')
    op.drop_index('ix_shifts_plan_shift_date', table_name='shifts_plan')
    op.drop_index('ix_shifts_plan_assignment_id', table_name='shifts_plan')
    op.drop_table('shifts_plan')
