"""Переименовать operation_type → work_type

Revision ID: 013
Revises: 012
Create Date: 2026-03-06

"""
from typing import Sequence, Union
from alembic import op

revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовать таблицу operation_types → work_types
    op.rename_table('operation_types', 'work_types')

    # Переименовать столбец в tasks
    op.alter_column('tasks', 'operation_type_id', new_column_name='work_type_id')

    # Переименовать столбец в operations
    op.alter_column('operations', 'operation_type_id', new_column_name='work_type_id')

    # Переименовать индексы
    op.execute('ALTER INDEX IF EXISTS ix_tasks_operation_type_id RENAME TO ix_tasks_work_type_id')
    op.execute('ALTER INDEX IF EXISTS ix_operations_operation_type_id RENAME TO ix_operations_work_type_id')

    # Переименовать unique constraint на operations
    op.execute(
        'ALTER TABLE operations RENAME CONSTRAINT uq_operations_type_zone_name TO uq_operations_work_type_zone_name'
    )


def downgrade() -> None:
    op.execute(
        'ALTER TABLE operations RENAME CONSTRAINT uq_operations_work_type_zone_name TO uq_operations_type_zone_name'
    )
    op.execute('ALTER INDEX IF EXISTS ix_operations_work_type_id RENAME TO ix_operations_operation_type_id')
    op.execute('ALTER INDEX IF EXISTS ix_tasks_work_type_id RENAME TO ix_tasks_operation_type_id')

    op.alter_column('operations', 'work_type_id', new_column_name='operation_type_id')
    op.alter_column('tasks', 'work_type_id', new_column_name='operation_type_id')

    op.rename_table('work_types', 'operation_types')
