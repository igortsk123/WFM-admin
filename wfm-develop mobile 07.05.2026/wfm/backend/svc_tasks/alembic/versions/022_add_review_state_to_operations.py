"""Добавить review_state в operations, убрать уникальность name

Revision ID: 022
Revises: 021
Create Date: 2026-04-20

review_state: ACCEPTED (по умолчанию) | PENDING (предложена работником) | REJECTED (отклонена).
Уникальное ограничение на operations.name снимается — теперь операции создаются
работниками и имя не является глобальным идентификатором.
"""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_constraint WHERE conname = 'operations_name_key'"
    ))
    if result.fetchone():
        op.drop_constraint('operations_name_key', 'operations', type_='unique')
    op.add_column('operations', sa.Column('review_state', sa.String(20), nullable=False, server_default='ACCEPTED'))


def downgrade():
    op.drop_column('operations', 'review_state')
    op.create_unique_constraint('operations_name_key', 'operations', ['name'])
