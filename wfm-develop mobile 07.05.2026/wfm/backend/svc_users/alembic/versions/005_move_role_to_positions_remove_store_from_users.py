"""Move role_id from users to positions; remove store_id from users

Revision ID: 005
Revises: 004
Create Date: 2026-02-19 12:00:00.000000

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
    # 1. Добавить role_id в таблицу positions (default=1 — worker)
    op.add_column(
        'positions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), nullable=False, server_default='1')
    )

    # 2. Удалить индекс и FK role_id из таблицы users
    op.drop_index('ix_users_role_id', table_name='users')
    op.drop_constraint('users_role_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')

    # 3. Удалить индекс и колонку store_id из таблицы users
    op.drop_index('ix_users_store_id', table_name='users')
    op.drop_column('users', 'store_id')


def downgrade() -> None:
    # 1. Восстановить store_id в users
    op.add_column('users', sa.Column('store_id', sa.Integer(), nullable=True))
    op.create_index('ix_users_store_id', 'users', ['store_id'])

    # 2. Восстановить role_id в users
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_role_id_fkey', 'users', 'roles', ['role_id'], ['id'])
    op.create_index('ix_users_role_id', 'users', ['role_id'])

    # 3. Удалить role_id из positions
    op.drop_column('positions', 'role_id')
