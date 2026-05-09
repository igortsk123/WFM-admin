"""Добавить таблицу stores, Assignment.store_id → FK на stores.id

Revision ID: 007
Revises: 006
Create Date: 2026-03-08 16:00:00.000000

Store возвращается в svc_users (ранее была здесь, затем перенесена в svc_shifts).
Теперь svc_users является единственным владельцем справочника магазинов.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создать таблицу stores
    op.create_table(
        'stores',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('external_code', sa.String(50), nullable=True, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )

    # Обнулить store_id у assignments, которые ссылаются на несуществующие магазины
    # (данные из старой wfm_shifts.stores ещё не перенесены в wfm_users.stores)
    op.execute("UPDATE assignments SET store_id = NULL WHERE store_id IS NOT NULL")

    # Добавить FK constraint на assignments.store_id → stores.id
    op.create_foreign_key(
        'assignments_store_id_fkey',
        'assignments', 'stores',
        ['store_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('assignments_store_id_fkey', 'assignments', type_='foreignkey')
    op.drop_table('stores')
