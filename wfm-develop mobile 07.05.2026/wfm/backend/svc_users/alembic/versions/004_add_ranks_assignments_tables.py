"""Add ranks, assignments tables; change users.external_id to Integer; remove position_id, grade from users

Revision ID: 004
Revises: 003
Create Date: 2026-02-18 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Создать таблицу ranks
    op.create_table(
        'ranks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )

    # 2. Создать таблицу user_lama_cache
    op.create_table(
        'user_lama_cache',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cached_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('user_id'),
    )

    # 3. Создать таблицу assignments
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_id', sa.Integer(), nullable=True),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('position_id', sa.Integer(), nullable=True),
        sa.Column('rank_id', sa.Integer(), nullable=True),
        sa.Column('store_id', sa.Integer(), nullable=True),
        sa.Column('date_start', sa.Date(), nullable=True),
        sa.Column('date_end', sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['position_id'], ['positions.id']),
        sa.ForeignKeyConstraint(['rank_id'], ['ranks.id']),
        sa.UniqueConstraint('external_id'),
    )

    # 4. Изменить users.external_id: String(255) → Integer
    # Удаляем старую колонку и создаём новую с типом Integer
    op.drop_column('users', 'external_id')
    op.add_column('users', sa.Column('external_id', sa.Integer(), nullable=True))

    # 5. Удалить FK users.position_id → positions
    op.drop_constraint('users_position_id_fkey', 'users', type_='foreignkey')

    # 6. Удалить колонку users.position_id
    op.drop_column('users', 'position_id')

    # 7. Удалить колонку users.grade
    op.drop_column('users', 'grade')


def downgrade() -> None:
    # 1. Восстановить users.grade
    op.add_column('users', sa.Column('grade', sa.Integer(), nullable=True))

    # 2. Восстановить users.position_id
    op.add_column('users', sa.Column('position_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_position_id_fkey', 'users', 'positions', ['position_id'], ['id'])

    # 3. Восстановить users.external_id как String
    op.drop_column('users', 'external_id')
    op.add_column('users', sa.Column('external_id', sa.String(255), nullable=True))

    # 4. Удалить таблицы
    op.drop_table('assignments')
    op.drop_table('user_lama_cache')
    op.drop_table('ranks')
