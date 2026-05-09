"""Добавить review_state и acceptance_policy в таблицу tasks

Revision ID: 006
Revises: 005
Create Date: 2026-02-27 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # review_state: отдельное измерение приёмки задачи менеджером
    # NONE — приёмка не актуальна (задача ещё не COMPLETED)
    # ON_REVIEW — ожидает проверки менеджером
    # ACCEPTED — принята (вручную или автоматически)
    # REJECTED — отклонена; execution state возвращается в PAUSED
    op.add_column('tasks', sa.Column(
        'review_state',
        sa.String(length=50),
        nullable=False,
        server_default='NONE',
    ))

    # acceptance_policy: определяет поведение review_state при complete
    # AUTO — review_state = ACCEPTED автоматически (по умолчанию)
    # MANUAL — review_state = ON_REVIEW, ждём действия менеджера
    op.add_column('tasks', sa.Column(
        'acceptance_policy',
        sa.String(length=50),
        nullable=False,
        server_default='AUTO',
    ))


def downgrade() -> None:
    op.drop_column('tasks', 'acceptance_policy')
    op.drop_column('tasks', 'review_state')
