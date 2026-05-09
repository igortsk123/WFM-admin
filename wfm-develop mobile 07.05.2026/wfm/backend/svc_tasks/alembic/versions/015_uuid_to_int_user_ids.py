"""Переход tasks и task_events с UUID user IDs на INTEGER

Revision ID: 015
Revises: 014
Create Date: 2026-03-09 00:00:00.000000

Изменяет:
- tasks.creator_id: UUID → INTEGER
- tasks.assignee_id: UUID → INTEGER (nullable)
- task_events.actor_id: UUID → INTEGER (nullable)

Для данных миграции используется скрипт backend/svc_tasks/data_migration.py,
который заполняет новые INTEGER колонки через API svc_users.

Данная миграция только создаёт схему. Данные мигрируются отдельно.
На DEV — просто обнуляем старые значения (система перезапишет через API).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # tasks: creator_id и assignee_id UUID → INTEGER
    # =========================================================================

    # Добавить новые INTEGER колонки
    op.add_column('tasks', sa.Column('creator_id_new', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('assignee_id_new', sa.Integer(), nullable=True))

    # Примечание: маппинг UUID → int выполняется внешним скриптом data_migration.py
    # На DEV значения будут NULL (старые задачи станут "без привязки к пользователю")

    # Удалить старые UUID колонки
    op.drop_column('tasks', 'creator_id')
    op.drop_column('tasks', 'assignee_id')

    # Переименовать новые колонки
    op.alter_column('tasks', 'creator_id_new', new_column_name='creator_id')
    op.alter_column('tasks', 'assignee_id_new', new_column_name='assignee_id')

    # Добавить NOT NULL constraint для creator_id (после заполнения данными)
    # На DEV оставляем nullable — данные будут null для старых задач
    # op.alter_column('tasks', 'creator_id', nullable=False)  # раскомментировать после data migration

    # =========================================================================
    # task_events: actor_id UUID → INTEGER
    # =========================================================================

    op.add_column('task_events', sa.Column('actor_id_new', sa.Integer(), nullable=True))

    # Примечание: маппинг UUID → int выполняется внешним скриптом data_migration.py

    op.drop_column('task_events', 'actor_id')
    op.alter_column('task_events', 'actor_id_new', new_column_name='actor_id')


def downgrade() -> None:
    # Downgrade не поддерживается — деструктивная миграция
    raise NotImplementedError(
        "Downgrade миграции 015 (UUID → INTEGER) не поддерживается. "
        "Восстановите базу данных из резервной копии."
    )
