"""Add user roles and worker permissions tables

Revision ID: 001
Revises:
Create Date: 2026-01-15 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = '000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создание таблиц user_roles и worker_permissions"""

    # Таблица user_roles
    op.create_table(
        'user_roles',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
        sa.CheckConstraint("role IN ('MANAGER', 'WORKER')", name='check_role_type')
    )

    # Индекс для быстрого поиска по магазину
    op.create_index('ix_user_roles_store_id', 'user_roles', ['store_id'])

    # Таблица worker_permissions
    op.create_table(
        'worker_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission', sa.String(length=50), nullable=False),
        sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['user_roles.user_id'], ondelete='CASCADE'),
        sa.CheckConstraint(
            "permission IN ('CASHIER', 'SALES_FLOOR', 'SELF_CHECKOUT', 'WAREHOUSE')",
            name='check_permission_type'
        )
    )

    # Индексы для быстрого поиска
    op.create_index('ix_worker_permissions_user_id', 'worker_permissions', ['user_id'])
    op.create_index('ix_worker_permissions_revoked_at', 'worker_permissions', ['revoked_at'])


def downgrade() -> None:
    """Удаление таблиц user_roles и worker_permissions"""

    # Удаляем индексы
    op.drop_index('ix_worker_permissions_revoked_at', table_name='worker_permissions')
    op.drop_index('ix_worker_permissions_user_id', table_name='worker_permissions')
    op.drop_index('ix_user_roles_store_id', table_name='user_roles')

    # Удаляем таблицы (в обратном порядке из-за FK)
    op.drop_table('worker_permissions')
    op.drop_table('user_roles')
