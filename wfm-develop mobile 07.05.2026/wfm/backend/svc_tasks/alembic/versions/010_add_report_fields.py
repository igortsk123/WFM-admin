"""Добавить поля report_text, report_image_url, requires_photo в таблицу tasks

Revision ID: 010
Revises: 009
Create Date: 2026-03-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('report_text', sa.Text(), nullable=True))
    op.add_column('tasks', sa.Column('report_image_url', sa.String(500), nullable=True))
    op.add_column('tasks', sa.Column('requires_photo', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('tasks', 'requires_photo')
    op.drop_column('tasks', 'report_image_url')
    op.drop_column('tasks', 'report_text')
