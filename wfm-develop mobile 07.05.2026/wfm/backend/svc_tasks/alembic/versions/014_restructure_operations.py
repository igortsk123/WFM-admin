"""Реструктурировать таблицу operations: вынести work_type_id и zone_id в маппинг-таблицу

- Создать таблицу operation_work_type_zone (маппинг операций на тип работы и зону)
- Перенести данные из operations в новую таблицу
- Удалить дубли в operations (одинаковый name → оставляем строку с меньшим id)
- Удалить столбцы work_type_id и zone_id из operations
- Добавить уникальность по name в operations

Revision ID: 014
Revises: 013
Create Date: 2026-03-06

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Создать таблицу маппинга
    op.create_table(
        'operation_work_type_zone',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('operation_id', sa.Integer(), sa.ForeignKey('operations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('work_type_id', sa.Integer(), sa.ForeignKey('work_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('zone_id', sa.Integer(), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('operation_id', 'work_type_id', 'zone_id', name='uq_operation_work_type_zone'),
    )
    op.create_index('ix_owtz_operation_id', 'operation_work_type_zone', ['operation_id'])
    op.create_index('ix_owtz_work_type_id', 'operation_work_type_zone', ['work_type_id'])
    op.create_index('ix_owtz_zone_id', 'operation_work_type_zone', ['zone_id'])

    # 2. Перенести существующие маппинги из operations в новую таблицу
    op.execute("""
        INSERT INTO operation_work_type_zone (operation_id, work_type_id, zone_id)
        SELECT id, work_type_id, zone_id
        FROM operations
        WHERE work_type_id IS NOT NULL AND zone_id IS NOT NULL
    """)

    # 3. Обновить маппинги для дублей: перепривязать к минимальному id по name
    op.execute("""
        UPDATE operation_work_type_zone owtz
        SET operation_id = keeper.min_id
        FROM (
            SELECT name, MIN(id) AS min_id
            FROM operations
            GROUP BY name
            HAVING COUNT(*) > 1
        ) keeper
        JOIN operations dup ON dup.name = keeper.name AND dup.id != keeper.min_id
        WHERE owtz.operation_id = dup.id
    """)

    # 4. Удалить дублирующиеся маппинги (если после перепривязки появились дубли)
    op.execute("""
        DELETE FROM operation_work_type_zone
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM operation_work_type_zone
            GROUP BY operation_id, work_type_id, zone_id
        )
    """)

    # 5. Удалить дублирующиеся строки в operations (оставить строку с меньшим id)
    op.execute("""
        DELETE FROM operations
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM operations
            GROUP BY name
        )
    """)

    # 6. Удалить unique constraint и FK constraints из operations (имена могут варьироваться)
    op.execute("ALTER TABLE operations DROP CONSTRAINT IF EXISTS uq_operations_work_type_zone_name")
    op.execute("ALTER TABLE operations DROP CONSTRAINT IF EXISTS uq_operations_type_zone_name")
    op.execute("ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_operation_type_id_fkey")
    op.execute("ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_work_type_id_fkey")
    op.execute("ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_zone_id_fkey")

    # 7. Удалить индексы
    op.execute("DROP INDEX IF EXISTS ix_operations_work_type_id")
    op.execute("DROP INDEX IF EXISTS ix_operations_operation_type_id")
    op.execute("DROP INDEX IF EXISTS ix_operations_zone_id")

    # 8. Удалить столбцы
    op.drop_column('operations', 'work_type_id')
    op.drop_column('operations', 'zone_id')

    # 9. Добавить уникальность по name
    op.create_unique_constraint('uq_operations_name', 'operations', ['name'])


def downgrade() -> None:
    op.drop_constraint('uq_operations_name', 'operations', type_='unique')

    op.add_column('operations', sa.Column('work_type_id', sa.Integer(), nullable=True))
    op.add_column('operations', sa.Column('zone_id', sa.Integer(), nullable=True))

    # Восстановить данные из маппинг-таблицы (берём первую запись для каждой операции)
    op.execute("""
        UPDATE operations o
        SET work_type_id = owtz.work_type_id,
            zone_id = owtz.zone_id
        FROM (
            SELECT DISTINCT ON (operation_id) operation_id, work_type_id, zone_id
            FROM operation_work_type_zone
            ORDER BY operation_id, id
        ) owtz
        WHERE o.id = owtz.operation_id
    """)

    op.create_foreign_key(None, 'operations', 'work_types', ['work_type_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'operations', 'zones', ['zone_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_operations_work_type_id', 'operations', ['work_type_id'])
    op.create_index('ix_operations_zone_id', 'operations', ['zone_id'])
    op.create_unique_constraint('uq_operations_work_type_zone_name', 'operations', ['work_type_id', 'zone_id', 'name'])

    op.drop_index('ix_owtz_zone_id', 'operation_work_type_zone')
    op.drop_index('ix_owtz_work_type_id', 'operation_work_type_zone')
    op.drop_index('ix_owtz_operation_id', 'operation_work_type_zone')
    op.drop_table('operation_work_type_zone')
