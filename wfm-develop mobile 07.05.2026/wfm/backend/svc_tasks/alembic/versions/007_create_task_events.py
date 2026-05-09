"""Создать таблицу task_events (аудит-лог событий задач)

Revision ID: 007
Revises: 006
Create Date: 2026-02-27 12:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'task_events',

        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),

        # Задача, к которой относится событие
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Тип события: START, PAUSE, RESUME, COMPLETE,
        #              SEND_TO_REVIEW, AUTO_ACCEPT, ACCEPT, REJECT
        sa.Column('event_type', sa.String(length=50), nullable=False),

        # Кто выполнил действие (null для системных событий: AUTO_ACCEPT, LAMA)
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Роль актора: "worker" / "manager" / "system"
        sa.Column('actor_role', sa.String(length=20), nullable=False),

        # Снапшот execution state до и после события
        sa.Column('old_state', sa.String(length=50), nullable=True),
        sa.Column('new_state', sa.String(length=50), nullable=True),

        # Снапшот review_state до и после события
        sa.Column('old_review_state', sa.String(length=50), nullable=True),
        sa.Column('new_review_state', sa.String(length=50), nullable=True),

        # Текстовый комментарий (обязателен для REJECT через API)
        sa.Column('comment', sa.Text(), nullable=True),

        # Произвольные дополнительные поля (например {"source": "lama"})
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

    # Индекс для быстрой выборки всех событий задачи
    op.create_index('ix_task_events_task_id', 'task_events', ['task_id'])


def downgrade() -> None:
    op.drop_index('ix_task_events_task_id', table_name='task_events')
    op.drop_table('task_events')
