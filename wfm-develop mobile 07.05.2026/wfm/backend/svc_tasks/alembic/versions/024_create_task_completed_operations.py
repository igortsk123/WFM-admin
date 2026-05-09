"""Создать таблицу task_completed_operations

Revision ID: 024
Revises: 023
Create Date: 2026-04-20

Хранит список операций, отмеченных работником при завершении задачи.
Одна запись = одна операция в одной задаче. Уникальный составной индекс
по (task_id, operation_id) исключает дубли.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'task_completed_operations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('task_id', UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('operation_id', sa.Integer(), sa.ForeignKey('operations.id'), nullable=False),
        sa.UniqueConstraint('task_id', 'operation_id', name='uq_task_completed_operation'),
    )


def downgrade():
    op.drop_table('task_completed_operations')
