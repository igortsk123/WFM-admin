"""Переход на internal integer user ID

Revision ID: 008
Revises: 007
Create Date: 2026-03-09 00:00:00.000000

Заменяет users.id UUID (из SSO) на auto-increment INTEGER.
SSO UUID сохраняется как users.sso_id (уникальный, NOT NULL).
Обновляет все FK: assignments.user_id, permissions.user_id,
permissions.granted_by, user_sso_cache.user_id, user_lama_cache.user_id.
Поле updated_by также переходит UUID → INTEGER.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # Шаг 1: Добавить sso_id в users (скопировать из id)
    # =========================================================================
    op.add_column('users', sa.Column('sso_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("UPDATE users SET sso_id = id")
    op.alter_column('users', 'sso_id', nullable=False)

    # =========================================================================
    # Шаг 2: Добавить временный int PK в users
    # =========================================================================
    op.execute("ALTER TABLE users ADD COLUMN id_new SERIAL")

    # =========================================================================
    # Шаг 3: assignments — добавить user_id_new INTEGER, заполнить через JOIN
    # =========================================================================
    op.execute("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_user_id_fkey")
    op.execute("ALTER TABLE assignments ADD COLUMN user_id_new INTEGER")
    op.execute("""
        UPDATE assignments a
        SET user_id_new = u.id_new
        FROM users u
        WHERE a.user_id = u.id
    """)

    # =========================================================================
    # Шаг 4: permissions — добавить user_id_new и granted_by_new
    # =========================================================================
    op.execute("ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_user_id_fkey")
    op.execute("ALTER TABLE permissions ADD COLUMN user_id_new INTEGER")
    op.execute("ALTER TABLE permissions ADD COLUMN granted_by_new INTEGER")
    op.execute("""
        UPDATE permissions p
        SET user_id_new = u.id_new
        FROM users u
        WHERE p.user_id = u.id
    """)
    op.execute("""
        UPDATE permissions p
        SET granted_by_new = u.id_new
        FROM users u
        WHERE p.granted_by = u.id
    """)

    # =========================================================================
    # Шаг 5: user_sso_cache — добавить user_id_new INTEGER
    # =========================================================================
    op.execute("ALTER TABLE user_sso_cache ADD COLUMN user_id_new INTEGER")
    op.execute("""
        UPDATE user_sso_cache c
        SET user_id_new = u.id_new
        FROM users u
        WHERE c.user_id = u.id
    """)

    # =========================================================================
    # Шаг 6: user_lama_cache — добавить user_id_new INTEGER
    # =========================================================================
    op.execute("ALTER TABLE user_lama_cache ADD COLUMN user_id_new INTEGER")
    op.execute("""
        UPDATE user_lama_cache c
        SET user_id_new = u.id_new
        FROM users u
        WHERE c.user_id = u.id
    """)

    # =========================================================================
    # Шаг 7: updated_by UUID → INTEGER
    # =========================================================================
    op.execute("ALTER TABLE users ADD COLUMN updated_by_new INTEGER")
    op.execute("""
        UPDATE users u
        SET updated_by_new = u2.id_new
        FROM users u2
        WHERE u.updated_by = u2.id
    """)

    # =========================================================================
    # Шаг 8: Пересобираем users — меняем PK
    # =========================================================================
    # Удаляем старый UUID PK
    op.execute("ALTER TABLE users DROP CONSTRAINT users_pkey")
    op.execute("ALTER TABLE users DROP COLUMN id")
    op.execute("ALTER TABLE users RENAME COLUMN id_new TO id")
    op.execute("ALTER TABLE users ADD PRIMARY KEY (id)")
    op.execute("ALTER TABLE users DROP COLUMN updated_by")
    op.execute("ALTER TABLE users RENAME COLUMN updated_by_new TO updated_by")

    # Уникальный индекс на sso_id
    op.create_unique_constraint('uq_users_sso_id', 'users', ['sso_id'])
    op.create_index('ix_users_sso_id', 'users', ['sso_id'])

    # =========================================================================
    # Шаг 9: assignments — заменить user_id
    # =========================================================================
    op.execute("ALTER TABLE assignments DROP COLUMN user_id")
    op.execute("ALTER TABLE assignments RENAME COLUMN user_id_new TO user_id")
    op.execute("ALTER TABLE assignments ALTER COLUMN user_id SET NOT NULL")
    op.create_foreign_key(
        'assignments_user_id_fkey', 'assignments', 'users', ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # =========================================================================
    # Шаг 10: permissions — заменить user_id и granted_by
    # =========================================================================
    op.execute("ALTER TABLE permissions DROP COLUMN user_id")
    op.execute("ALTER TABLE permissions RENAME COLUMN user_id_new TO user_id")
    op.execute("ALTER TABLE permissions ALTER COLUMN user_id SET NOT NULL")
    op.create_foreign_key(
        'permissions_user_id_fkey', 'permissions', 'users', ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.execute("ALTER TABLE permissions DROP COLUMN granted_by")
    op.execute("ALTER TABLE permissions RENAME COLUMN granted_by_new TO granted_by")
    op.execute("ALTER TABLE permissions ALTER COLUMN granted_by SET NOT NULL")

    # =========================================================================
    # Шаг 11: user_sso_cache — заменить user_id (PK)
    # =========================================================================
    op.execute("ALTER TABLE user_sso_cache DROP CONSTRAINT user_sso_cache_pkey")
    op.execute("ALTER TABLE user_sso_cache DROP COLUMN user_id")
    op.execute("ALTER TABLE user_sso_cache RENAME COLUMN user_id_new TO user_id")
    op.execute("ALTER TABLE user_sso_cache ALTER COLUMN user_id SET NOT NULL")
    op.execute("ALTER TABLE user_sso_cache ADD PRIMARY KEY (user_id)")

    # =========================================================================
    # Шаг 12: user_lama_cache — заменить user_id (PK)
    # =========================================================================
    op.execute("ALTER TABLE user_lama_cache DROP CONSTRAINT user_lama_cache_pkey")
    op.execute("ALTER TABLE user_lama_cache DROP COLUMN user_id")
    op.execute("ALTER TABLE user_lama_cache RENAME COLUMN user_id_new TO user_id")
    op.execute("ALTER TABLE user_lama_cache ALTER COLUMN user_id SET NOT NULL")
    op.execute("ALTER TABLE user_lama_cache ADD PRIMARY KEY (user_id)")

    # =========================================================================
    # Шаг 13: Настроить sequence для users.id
    # =========================================================================
    op.execute("""
        SELECT setval(
            pg_get_serial_sequence('users', 'id'),
            COALESCE((SELECT MAX(id) FROM users), 1)
        )
    """)


def downgrade() -> None:
    # Downgrade не поддерживается — это деструктивная миграция
    raise NotImplementedError(
        "Downgrade миграции 008 (UUID → INTEGER) не поддерживается. "
        "Восстановите базу данных из резервной копии."
    )
