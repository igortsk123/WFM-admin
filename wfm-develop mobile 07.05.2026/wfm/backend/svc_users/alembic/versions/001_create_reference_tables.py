"""Create reference tables (roles, employee_types, positions, stores)

Revision ID: 001
Revises:
Create Date: 2026-01-30 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создание справочных таблиц и заполнение начальными данными"""

    # Таблица roles (роли пользователей)
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    # Таблица employee_types (типы сотрудников)
    op.create_table(
        'employee_types',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    # Таблица positions (должности сотрудников)
    op.create_table(
        'positions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    # Таблица stores (магазины)
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    # Заполнение справочника roles
    op.execute("""
        INSERT INTO roles (code, name, description) VALUES
        ('worker', 'Работник', 'Работник магазина, выполняет задачи'),
        ('manager', 'Управляющий', 'Управляющий магазином, создаёт задачи и управляет персоналом')
    """)

    # Заполнение справочника employee_types
    op.execute("""
        INSERT INTO employee_types (code, name, description) VALUES
        ('permanent', 'Штатный сотрудник', 'Постоянный сотрудник в штате компании'),
        ('temporary', 'Временный сотрудник', 'Временный сотрудник, подработчик, самозанятый')
    """)

    # Заполнение справочника positions
    op.execute("""
        INSERT INTO positions (code, name, description) VALUES
        ('zam_dir_po_torgovle', 'Заместитель директора по торговле', 'Заместитель директора по торговле'),
        ('prodav_prod', 'Продавец продовольственных товаров', 'Продавец продовольственных товаров'),
        ('prodav_univer', 'Продавец универсал', 'Продавец универсал'),
        ('dir_superm', 'Директор супермаркета', 'Директор супермаркета'),
        ('kas_kas_samoobsl', 'Кассир кассы самообслуживания', 'Кассир кассы самообслуживания')
    """)


def downgrade() -> None:
    """Удаление справочных таблиц"""

    op.drop_table('stores')
    op.drop_table('positions')
    op.drop_table('employee_types')
    op.drop_table('roles')
