"""Переименование shift_external_id → shift_id, удаление assignment_id

Revision ID: 005
Revises: 004
Create Date: 2026-02-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовать shift_external_id → shift_id
    op.alter_column('tasks', 'shift_external_id', new_column_name='shift_id')

    # Удалить assignment_id
    op.drop_column('tasks', 'assignment_id')


def downgrade() -> None:
    # Вернуть assignment_id
    op.add_column('tasks', sa.Column('assignment_id', sa.Integer(), nullable=True))

    # Переименовать shift_id → shift_external_id
    op.alter_column('tasks', 'shift_id', new_column_name='shift_external_id')
