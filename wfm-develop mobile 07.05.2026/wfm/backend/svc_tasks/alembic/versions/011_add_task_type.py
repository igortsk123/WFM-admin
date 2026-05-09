"""Добавить поле type в таблицу tasks

Revision ID: 011
Revises: 010
Create Date: 2026-03-05 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('type', sa.String(50), nullable=False, server_default='PLANNED'))


def downgrade() -> None:
    op.drop_column('tasks', 'type')
