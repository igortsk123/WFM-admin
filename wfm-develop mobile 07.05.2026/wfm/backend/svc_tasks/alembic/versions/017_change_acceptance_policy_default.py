"""Изменить server_default acceptance_policy с AUTO на MANUAL

Revision ID: 017
Revises: 016
Create Date: 2026-03-19 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '017'
down_revision: Union[str, None] = '016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'tasks',
        'acceptance_policy',
        existing_type=sa.String(length=50),
        server_default='MANUAL',
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'tasks',
        'acceptance_policy',
        existing_type=sa.String(length=50),
        server_default='AUTO',
        existing_nullable=False,
    )
