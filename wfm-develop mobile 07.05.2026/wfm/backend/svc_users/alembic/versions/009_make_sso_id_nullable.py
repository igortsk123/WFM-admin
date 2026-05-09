"""Сделать sso_id nullable для поддержки LAMA batch-sync

Пользователи, созданные через ежедневную синхронизацию из LAMA,
не имеют SSO аккаунта. sso_id заполняется при первом входе через телефон.

Revision ID: 009
Revises: 008
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('users', 'sso_id', nullable=True)


def downgrade():
    # Перед откатом нужно удалить строки с sso_id IS NULL
    op.execute("DELETE FROM users WHERE sso_id IS NULL")
    op.alter_column('users', 'sso_id', nullable=False)
