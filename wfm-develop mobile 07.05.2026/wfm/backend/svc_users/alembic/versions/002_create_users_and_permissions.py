"""Create users, permissions and sso_cache tables

Revision ID: 002
Revises: 001
Create Date: 2026-01-30 14:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создание таблиц users, permissions и user_sso_cache"""

    # Таблица users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('type_id', sa.Integer(), nullable=True),
        sa.Column('position_id', sa.Integer(), nullable=True),
        sa.Column('grade', sa.Integer(), nullable=True),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['type_id'], ['employee_types.id'], ),
        sa.ForeignKeyConstraint(['position_id'], ['positions.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], )
    )

    # Индексы для users
    op.create_index('ix_users_external_id', 'users', ['external_id'])
    op.create_index('ix_users_role_id', 'users', ['role_id'])
    op.create_index('ix_users_store_id', 'users', ['store_id'])

    # Таблица permissions
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission', sa.String(length=50), nullable=False),
        sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.CheckConstraint(
            "permission IN ('CASHIER', 'SALES_FLOOR', 'SELF_CHECKOUT', 'WAREHOUSE')",
            name='check_permission_type'
        )
    )

    # Индексы для permissions
    op.create_index('ix_permissions_user_id', 'permissions', ['user_id'])
    op.create_index('ix_permissions_revoked_at', 'permissions', ['revoked_at'])

    # Таблица user_sso_cache
    op.create_table(
        'user_sso_cache',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('middle_name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('gender', sa.String(length=10), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('cached_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Индекс для user_sso_cache (для поиска устаревших записей)
    op.create_index('ix_user_sso_cache_cached_at', 'user_sso_cache', ['cached_at'])


def downgrade() -> None:
    """Удаление таблиц users, permissions и user_sso_cache"""

    # Удаляем индексы
    op.drop_index('ix_user_sso_cache_cached_at', table_name='user_sso_cache')
    op.drop_index('ix_permissions_revoked_at', table_name='permissions')
    op.drop_index('ix_permissions_user_id', table_name='permissions')
    op.drop_index('ix_users_store_id', table_name='users')
    op.drop_index('ix_users_role_id', table_name='users')
    op.drop_index('ix_users_external_id', table_name='users')

    # Удаляем таблицы (в обратном порядке из-за FK)
    op.drop_table('user_sso_cache')
    op.drop_table('permissions')
    op.drop_table('users')
