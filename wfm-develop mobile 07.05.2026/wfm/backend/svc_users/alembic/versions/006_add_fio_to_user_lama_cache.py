"""Add first_name, last_name, middle_name to user_lama_cache

Revision ID: 006
Revises: 005
Create Date: 2026-02-24 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_lama_cache', sa.Column('first_name', sa.String(255), nullable=True))
    op.add_column('user_lama_cache', sa.Column('last_name', sa.String(255), nullable=True))
    op.add_column('user_lama_cache', sa.Column('middle_name', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('user_lama_cache', 'middle_name')
    op.drop_column('user_lama_cache', 'last_name')
    op.drop_column('user_lama_cache', 'first_name')
