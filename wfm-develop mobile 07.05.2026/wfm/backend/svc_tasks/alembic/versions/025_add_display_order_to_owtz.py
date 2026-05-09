"""Добавить display_order в operation_work_type_zone

Revision ID: 025
Revises: 024
Create Date: 2026-05-04

Каждой паре (work_type_id, zone_id) — свой порядок операций.
Бэкфилл: ROW_NUMBER() OVER (PARTITION BY work_type_id, zone_id ORDER BY operation_id) - 1
сохраняет текущий видимый порядок (был ORDER BY operation_id).
Новые PENDING-операции вставляются с MAX(display_order)+1.
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'operation_work_type_zone',
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
    )

    op.execute("""
        UPDATE operation_work_type_zone owtz
        SET display_order = numbered.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY work_type_id, zone_id
                ORDER BY operation_id
            ) - 1 AS rn
            FROM operation_work_type_zone
        ) numbered
        WHERE owtz.id = numbered.id
    """)

    op.create_index(
        'ix_owtz_order',
        'operation_work_type_zone',
        ['work_type_id', 'zone_id', 'display_order'],
    )


def downgrade():
    op.drop_index('ix_owtz_order', 'operation_work_type_zone')
    op.drop_column('operation_work_type_zone', 'display_order')
