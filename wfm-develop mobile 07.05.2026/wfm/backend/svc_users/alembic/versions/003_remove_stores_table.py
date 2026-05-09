"""Remove stores table and update users.store_id to INTEGER

Store model has been moved to svc_shifts service.
Users table now stores store_id as INTEGER without FK.

Revision ID: 003
Revises: 002
Create Date: 2026-02-11 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Миграция store_id из UUID в INTEGER и удаление таблицы stores.

    Таблица stores теперь находится в svc_shifts.
    """

    # 1. Удаляем FK constraint с users.store_id
    op.drop_constraint('users_store_id_fkey', 'users', type_='foreignkey')

    # 2. Удаляем индекс на store_id (будет пересоздан с новым типом)
    op.drop_index('ix_users_store_id', table_name='users')

    # 3. Удаляем старую колонку store_id (UUID)
    op.drop_column('users', 'store_id')

    # 4. Добавляем новую колонку store_id (INTEGER)
    op.add_column('users', sa.Column('store_id', sa.Integer(), nullable=True))

    # 5. Создаём индекс заново
    op.create_index('ix_users_store_id', 'users', ['store_id'])

    # 6. Удаляем таблицу stores
    op.drop_table('stores')


def downgrade() -> None:
    """
    Откат: восстановление таблицы stores и store_id как UUID.

    ВНИМАНИЕ: Данные о привязке пользователей к магазинам будут потеряны!
    """

    # 1. Создаём таблицу stores заново
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Удаляем индекс
    op.drop_index('ix_users_store_id', table_name='users')

    # 3. Удаляем INTEGER колонку
    op.drop_column('users', 'store_id')

    # 4. Добавляем UUID колонку
    op.add_column('users', sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True))

    # 5. Создаём индекс
    op.create_index('ix_users_store_id', 'users', ['store_id'])

    # 6. Добавляем FK constraint
    op.create_foreign_key('users_store_id_fkey', 'users', 'stores', ['store_id'], ['id'])
