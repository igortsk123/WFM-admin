"""Добавить allow_new_operations в таблицу work_types

Revision ID: 023
Revises: 022
Create Date: 2026-04-20

Флаг разрешает работникам предлагать новые операции при завершении задачи
данного типа работы. По умолчанию запрещено (False).
"""
from alembic import op
import sqlalchemy as sa

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('work_types', sa.Column('allow_new_operations', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('work_types', 'allow_new_operations')
