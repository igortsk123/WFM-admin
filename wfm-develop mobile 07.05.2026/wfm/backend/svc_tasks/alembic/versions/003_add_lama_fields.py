"""Add LAMA integration fields to tasks

Revision ID: 003
Revises: 002
Create Date: 2026-02-18 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('external_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('shift_external_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('assignment_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('priority', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('operation_work', sa.String(255), nullable=True))
    op.add_column('tasks', sa.Column('operation_zone', sa.String(255), nullable=True))
    op.add_column('tasks', sa.Column('category', sa.String(255), nullable=True))
    op.add_column('tasks', sa.Column('time_start', sa.Time(), nullable=True))
    op.add_column('tasks', sa.Column('time_end', sa.Time(), nullable=True))
    op.add_column('tasks', sa.Column('source', sa.String(50), server_default='WFM', nullable=True))

    op.create_index('ix_tasks_external_id', 'tasks', ['external_id'])
    op.create_index('ix_tasks_shift_external_id', 'tasks', ['shift_external_id'])


def downgrade() -> None:
    op.drop_index('ix_tasks_shift_external_id', table_name='tasks')
    op.drop_index('ix_tasks_external_id', table_name='tasks')

    op.drop_column('tasks', 'source')
    op.drop_column('tasks', 'time_end')
    op.drop_column('tasks', 'time_start')
    op.drop_column('tasks', 'category')
    op.drop_column('tasks', 'operation_zone')
    op.drop_column('tasks', 'operation_work')
    op.drop_column('tasks', 'priority')
    op.drop_column('tasks', 'assignment_id')
    op.drop_column('tasks', 'shift_external_id')
    op.drop_column('tasks', 'external_id')
