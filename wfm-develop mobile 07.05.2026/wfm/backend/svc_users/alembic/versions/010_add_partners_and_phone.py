"""Добавить таблицу partners, stores.partner_id, users.phone

Revision ID: 010
Revises: 009
Create Date: 2026-03-12 00:00:00.000000

Партнёры — пространство имён для магазинов не-LAMA клиентов (малый бизнес, кафе и т.д.).
users.phone — для ручного добавления сотрудников и merge при первом логине по телефону.
"""
from alembic import op
import sqlalchemy as sa

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'partners',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )

    op.add_column('stores', sa.Column('partner_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'stores_partner_id_fkey',
        'stores', 'partners',
        ['partner_id'], ['id'],
        ondelete='SET NULL',
    )

    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))
    op.create_unique_constraint('uq_users_phone', 'users', ['phone'])


def downgrade():
    op.drop_constraint('uq_users_phone', 'users', type_='unique')
    op.drop_column('users', 'phone')

    op.drop_constraint('stores_partner_id_fkey', 'stores', type_='foreignkey')
    op.drop_column('stores', 'partner_id')

    op.drop_table('partners')
