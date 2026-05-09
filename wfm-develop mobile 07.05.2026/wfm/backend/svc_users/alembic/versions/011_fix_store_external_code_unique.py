"""Изменить UNIQUE(external_code) → UNIQUE(external_code, partner_id) в stores

Revision ID: 011
Revises: 010
Create Date: 2026-04-07 00:00:00.000000

У двух партнёров может совпасть внешний код магазина, поэтому уникальность
должна быть по паре (external_code, partner_id), а не только по external_code.

PostgreSQL: NULL != NULL в unique constraints, поэтому строки с NULL в любом
из полей не конфликтуют между собой — это ожидаемое поведение.
"""
from alembic import op

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    # Удалить старый unique constraint на external_code
    # Имя формируется PostgreSQL автоматически при inline unique=True
    op.drop_constraint('stores_external_code_key', 'stores', type_='unique')

    # Добавить составной unique (external_code, partner_id)
    op.create_unique_constraint(
        'uq_stores_external_code_partner',
        'stores',
        ['external_code', 'partner_id'],
    )


def downgrade():
    op.drop_constraint('uq_stores_external_code_partner', 'stores', type_='unique')
    op.create_unique_constraint('stores_external_code_key', 'stores', ['external_code'])
