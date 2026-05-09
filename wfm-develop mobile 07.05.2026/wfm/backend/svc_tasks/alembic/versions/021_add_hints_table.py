"""Добавить таблицу hints

Revision ID: 021
Revises: 020
Create Date: 2026-04-20 00:00:00.000000

Таблица hints хранит лаконичные подсказки к выполнению работы по комбинации
(work_type_id + zone_id). Одной паре может соответствовать несколько подсказок;
порядок — по возрастанию id.

Подсказки hint_1..hint_6 в таблице operations являются исходным сырым материалом
из LAMA. hints — отредактированные вручную версии, без прямой FK-связи с operations.
"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'hints',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('work_type_id', sa.Integer(), sa.ForeignKey('work_types.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('zone_id', sa.Integer(), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('text', sa.Text(), nullable=False),
    )


def downgrade():
    op.drop_table('hints')
