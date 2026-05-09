"""Добавить поля comment и review_comment в таблицу tasks

Revision ID: 009
Revises: 008
Create Date: 2026-02-27 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('comment', sa.Text(), nullable=True))
    op.add_column('tasks', sa.Column('review_comment', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'review_comment')
    op.drop_column('tasks', 'comment')
