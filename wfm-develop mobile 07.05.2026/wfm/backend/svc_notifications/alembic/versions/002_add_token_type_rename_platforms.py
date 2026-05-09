"""Добавить token_type в device_tokens, переименовать ANDROID → AND

Revision ID: 002
Revises: 001
Create Date: 2026-04-01

Изменения:
- Добавлена колонка token_type VARCHAR(10) DEFAULT 'fcm' в device_tokens
- Добавлен индекс idx_device_tokens_type
- Существующие platform='ANDROID' переименованы в 'AND'
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "device_tokens",
        sa.Column("token_type", sa.String(10), nullable=False, server_default="fcm"),
    )
    op.create_index("idx_device_tokens_type", "device_tokens", ["token_type"])

    # Переименовать старые значения ANDROID → AND
    op.execute("UPDATE device_tokens SET platform = 'AND' WHERE platform = 'ANDROID'")


def downgrade() -> None:
    op.execute("UPDATE device_tokens SET platform = 'ANDROID' WHERE platform = 'AND'")
    op.drop_index("idx_device_tokens_type", table_name="device_tokens")
    op.drop_column("device_tokens", "token_type")
