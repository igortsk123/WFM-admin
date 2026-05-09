"""Добавить first_name, last_name, middle_name в таблицу users

Revision ID: 012
Revises: 011
Create Date: 2026-04-08 00:00:00.000000

Локальное хранение ФИО для партнёрских пользователей.
При теневой регистрации в SSO поля ФИО пустые, LAMA для партнёров неприменима.
Поля задаются вручную при создании/редактировании пользователя через PATCH /{user_id}.

Приоритет при формировании ответа /me: LAMA cache → users.first_name → SSO cache.
"""
from alembic import op
import sqlalchemy as sa

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('first_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('middle_name', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('users', 'middle_name')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
