"""Пересоздать task_events с id INTEGER вместо UUID

Причина: миграция 007 была применена с UUID id, но требование изменилось
на INTEGER autoincrement. Alembic не перезапускает уже применённые миграции,
поэтому изменение оформлено отдельной миграцией.

Revision ID: 008
Revises: 007
Create Date: 2026-02-27 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем таблицу (данные должны быть очищены перед запуском)
    op.drop_index('ix_task_events_task_id', table_name='task_events')
    op.drop_table('task_events')

    # Создаём заново с INTEGER id
    op.create_table(
        'task_events',

        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),

        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column('event_type', sa.String(length=50), nullable=False),

        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_role', sa.String(length=20), nullable=False),

        sa.Column('old_state', sa.String(length=50), nullable=True),
        sa.Column('new_state', sa.String(length=50), nullable=True),

        sa.Column('old_review_state', sa.String(length=50), nullable=True),
        sa.Column('new_review_state', sa.String(length=50), nullable=True),

        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('meta', postgresql.JSONB(), nullable=True),

        sa.Column(
            'created_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.text('now()'),
        ),

        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index('ix_task_events_task_id', 'task_events', ['task_id'])


def downgrade() -> None:
    op.drop_index('ix_task_events_task_id', table_name='task_events')
    op.drop_table('task_events')

    op.create_table(
        'task_events',

        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text('gen_random_uuid()'),
        ),

        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_role', sa.String(length=20), nullable=False),
        sa.Column('old_state', sa.String(length=50), nullable=True),
        sa.Column('new_state', sa.String(length=50), nullable=True),
        sa.Column('old_review_state', sa.String(length=50), nullable=True),
        sa.Column('new_review_state', sa.String(length=50), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('meta', postgresql.JSONB(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.text('now()'),
        ),

        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index('ix_task_events_task_id', 'task_events', ['task_id'])
