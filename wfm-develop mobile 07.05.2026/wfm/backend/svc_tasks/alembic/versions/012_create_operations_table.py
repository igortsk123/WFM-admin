"""Создать таблицу operations для операций с подсказками

Revision ID: 012
Revises: 011
Create Date: 2026-03-05 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '012'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'operations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('operation_type_id', sa.Integer(), sa.ForeignKey('operation_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('zone_id', sa.Integer(), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hint_1', sa.Text(), nullable=True),
        sa.Column('hint_2', sa.Text(), nullable=True),
        sa.Column('hint_3', sa.Text(), nullable=True),
        sa.Column('hint_4', sa.Text(), nullable=True),
        sa.Column('hint_5', sa.Text(), nullable=True),
        sa.Column('hint_6', sa.Text(), nullable=True),
        sa.UniqueConstraint('operation_type_id', 'zone_id', 'name', name='uq_operations_type_zone_name'),
    )
    op.create_index('ix_operations_operation_type_id', 'operations', ['operation_type_id'])
    op.create_index('ix_operations_zone_id', 'operations', ['zone_id'])


def downgrade() -> None:
    op.drop_index('ix_operations_zone_id', table_name='operations')
    op.drop_index('ix_operations_operation_type_id', table_name='operations')
    op.drop_table('operations')
