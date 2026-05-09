"""Add reference tables: operation_types, zones, categories

Revision ID: 004
Revises: 003
Create Date: 2026-02-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Создание справочника operation_types ---
    op.create_table(
        'operation_types',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
    )

    op.bulk_insert(
        sa.table('operation_types',
            sa.column('id', sa.Integer),
            sa.column('name', sa.String),
        ),
        [
            {'id': 1, 'name': 'Менеджерские операции'},
            {'id': 2, 'name': 'Касса'},
            {'id': 3, 'name': 'КСО'},
            {'id': 4, 'name': 'Выкладка'},
            {'id': 5, 'name': 'Переоценка'},
            {'id': 6, 'name': 'Инвентаризация'},
            {'id': 7, 'name': 'Другие работы'},
        ],
    )

    # Обновляем sequence после ручной вставки id
    op.execute("SELECT setval('operation_types_id_seq', (SELECT COALESCE(MAX(id), 0) FROM operation_types))")

    # --- Создание справочника zones ---
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('priority', sa.Integer(), nullable=False, default=0),
    )

    op.bulk_insert(
        sa.table('zones',
            sa.column('id', sa.Integer),
            sa.column('name', sa.String),
            sa.column('priority', sa.Integer),
        ),
        [
            {'id': 1, 'name': 'Фреш 1', 'priority': 1},
            {'id': 2, 'name': 'Фреш 2', 'priority': 2},
            {'id': 3, 'name': 'Напитки б/а', 'priority': 3},
            {'id': 4, 'name': 'Пиво, чипсы', 'priority': 4},
            {'id': 5, 'name': 'Кондитерка, чай, кофе', 'priority': 5},
            {'id': 6, 'name': 'Бакалея', 'priority': 6},
            {'id': 7, 'name': 'Алкоголь (УМ)', 'priority': 7},
            {'id': 8, 'name': 'ЗОЖ (ЗУМ)', 'priority': 8},
            {'id': 9, 'name': 'Заморозка', 'priority': 9},
            {'id': 10, 'name': 'Бытовая химия', 'priority': 10},
            {'id': 11, 'name': 'NF', 'priority': 11},
            {'id': 12, 'name': 'ФРОВ', 'priority': 12},
            {'id': 13, 'name': 'Алкоголь', 'priority': 13},
            {'id': 14, 'name': 'ЗОЖ', 'priority': 14},
        ],
    )

    op.execute("SELECT setval('zones_id_seq', (SELECT COALESCE(MAX(id), 0) FROM zones))")

    # --- Создание справочника categories ---
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
    )

    categories = [
        'АВТОТОВАРЫ',
        'БЫТОВАЯ ТЕХНИКА, ЭЛЕКТРОНИКА, КОМПЬЮТЕРЫ',
        'ГАЛАНТЕРЕЯ',
        'ИГРУШКИ',
        'ИНСТРУМЕНТЫ',
        'КАНЦЕЛЯРИЯ',
        'ОДЕЖДА, ОБУВЬ',
        'ПАРАФАРМАЦЕВТИЧЕСКИЕ ТОВАРЫ',
        'ПЕЧАТНАЯ ПРОДУКЦИЯ',
        'САД, ПИКНИК, ТУРИЗМ',
        'ТОВАРЫ ДЛЯ ДОМА',
        'ТОВАРЫ ДЛЯ НОВОРОЖДЕННЫХ',
        'ТОВАРЫ К ПРАЗДНИКАМ',
        'ХОЗЯЙСТВЕННЫЕ ТОВАРЫ',
        'ЭЛЕКТРОТОВАРЫ',
        'НАПИТКИ АЛКОГОЛЬНЫЕ',
        'БАКАЛЕЯ',
        'ДЕТСКОЕ ПИТАНИЕ',
        'КОНСЕРВАЦИЯ',
        'СНЕКИ, ТОВАРЫ ДЛЯ ЗАВТРАКА',
        'СОУСЫ КЕТЧУПЫ МАЙОНЕЗЫ',
        'БЫТОВАЯ ХИМИЯ',
        'ДЕТСКАЯ ПАРФЮМЕРИЯ И ГИГИЕНА',
        'ПАРФЮМЕРНО-КОСМЕТИЧЕСКИЕ ТОВАРЫ',
        'ПРЕДМЕТЫ ГИГИЕНЫ',
        'ТОВАРЫ ДЛЯ ЖИВОТНЫХ',
        'ЗАМОРОЖЕННАЯ РЫБА И МОРЕПРОДУКТЫ',
        'МАСЛО-ЖИРОВАЯ ПРОДУКЦИЯ',
        'МОРОЖЕНОЕ',
        'МЯСО ЗАМОРОЖЕННОЕ',
        'ОВОЩИ, ФРУКТЫ ЗАМОРОЖЕННЫЕ',
        'ПОЛУФАБРИКАТЫ ЗАМОРОЖЕННЫЕ',
        'ЗДОРОВЫЙ ОБРАЗ ЖИЗНИ',
        'КОНФЕТЫ, СЛАДОСТИ',
        'МУЧНЫЕ КОНДИТЕРСКИЕ ИЗДЕЛИЯ',
        'ЧАЙ КОФЕ КАКАО',
        'НАПИТКИ БЕЗАЛКОГОЛЬНЫЕ',
        'НАПИТКИ СЛАБОАЛКОГОЛЬНЫЕ, ПИВО',
        'ПРОДУКТЫ ДЛЯ АПЕРИТИВА',
        'ГАСТРОНОМИЯ МЯСНАЯ',
        'ГАСТРОНОМИЯ РЫБНАЯ',
        'КОНДИТЕРСКОЕ ПРОИЗВОДСТВО (СП) !',
        'КУЛИНАРИЯ',
        'КУЛИНАРИЯ ПРОИЗВОДСТВО (СП) !',
        'ПЕКАРНЯ ПРОМ.ПРОИЗВОДСТВА',
        'ПРЕСЕРВЫ',
        'ПТИЦА ПРОИЗВОДСТВО (СП) !',
        'РЫБА ПРОИЗВОДСТВО (СП) !',
        'СВЕЖЕЕ МЯСО И ПТИЦА',
        'МОЛОЧНЫЕ ПРОДУКТЫ',
        'СЫРЫ',
        'ЯЙЦО',
        'ФРУКТЫ И ОВОЩИ',
    ]

    op.bulk_insert(
        sa.table('categories',
            sa.column('id', sa.Integer),
            sa.column('name', sa.String),
        ),
        [{'id': i + 1, 'name': name} for i, name in enumerate(categories)],
    )

    op.execute("SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 0) FROM categories))")

    # --- Добавление FK колонок в tasks ---
    op.add_column('tasks', sa.Column('operation_type_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('zone_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('category_id', sa.Integer(), nullable=True))

    # Миграция данных: operation_work → operation_type_id
    op.execute("""
        UPDATE tasks t
        SET operation_type_id = ot.id
        FROM operation_types ot
        WHERE t.operation_work = ot.name
          AND t.operation_work IS NOT NULL
    """)

    # Миграция данных: operation_zone → zone_id
    op.execute("""
        UPDATE tasks t
        SET zone_id = z.id
        FROM zones z
        WHERE t.operation_zone = z.name
          AND t.operation_zone IS NOT NULL
    """)

    # Миграция данных: category → category_id
    op.execute("""
        UPDATE tasks t
        SET category_id = c.id
        FROM categories c
        WHERE t.category = c.name
          AND t.category IS NOT NULL
    """)

    # Вставляем неизвестные operation_work в справочник и обновляем tasks
    op.execute("""
        INSERT INTO operation_types (name)
        SELECT DISTINCT operation_work
        FROM tasks
        WHERE operation_work IS NOT NULL
          AND operation_type_id IS NULL
        ON CONFLICT (name) DO NOTHING
    """)
    op.execute("""
        UPDATE tasks t
        SET operation_type_id = ot.id
        FROM operation_types ot
        WHERE t.operation_work = ot.name
          AND t.operation_type_id IS NULL
          AND t.operation_work IS NOT NULL
    """)

    # Вставляем неизвестные operation_zone в справочник и обновляем tasks
    op.execute("""
        INSERT INTO zones (name, priority)
        SELECT DISTINCT operation_zone, 0
        FROM tasks
        WHERE operation_zone IS NOT NULL
          AND zone_id IS NULL
        ON CONFLICT (name) DO NOTHING
    """)
    op.execute("""
        UPDATE tasks t
        SET zone_id = z.id
        FROM zones z
        WHERE t.operation_zone = z.name
          AND t.zone_id IS NULL
          AND t.operation_zone IS NOT NULL
    """)

    # Вставляем неизвестные category в справочник и обновляем tasks
    op.execute("""
        INSERT INTO categories (name)
        SELECT DISTINCT category
        FROM tasks
        WHERE category IS NOT NULL
          AND category_id IS NULL
        ON CONFLICT (name) DO NOTHING
    """)
    op.execute("""
        UPDATE tasks t
        SET category_id = c.id
        FROM categories c
        WHERE t.category = c.name
          AND t.category_id IS NULL
          AND t.category IS NOT NULL
    """)

    # Создание FK
    op.create_foreign_key('fk_tasks_operation_type_id', 'tasks', 'operation_types', ['operation_type_id'], ['id'])
    op.create_foreign_key('fk_tasks_zone_id', 'tasks', 'zones', ['zone_id'], ['id'])
    op.create_foreign_key('fk_tasks_category_id', 'tasks', 'categories', ['category_id'], ['id'])

    # Удаление старых текстовых колонок
    op.drop_column('tasks', 'operation_work')
    op.drop_column('tasks', 'operation_zone')
    op.drop_column('tasks', 'category')


def downgrade() -> None:
    # Восстанавливаем текстовые колонки
    op.add_column('tasks', sa.Column('operation_work', sa.String(255), nullable=True))
    op.add_column('tasks', sa.Column('operation_zone', sa.String(255), nullable=True))
    op.add_column('tasks', sa.Column('category', sa.String(255), nullable=True))

    # Обратная миграция данных
    op.execute("""
        UPDATE tasks t
        SET operation_work = ot.name
        FROM operation_types ot
        WHERE t.operation_type_id = ot.id
    """)
    op.execute("""
        UPDATE tasks t
        SET operation_zone = z.name
        FROM zones z
        WHERE t.zone_id = z.id
    """)
    op.execute("""
        UPDATE tasks t
        SET category = c.name
        FROM categories c
        WHERE t.category_id = c.id
    """)

    # Удаление FK и новых колонок
    op.drop_constraint('fk_tasks_category_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_zone_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_operation_type_id', 'tasks', type_='foreignkey')

    op.drop_column('tasks', 'category_id')
    op.drop_column('tasks', 'zone_id')
    op.drop_column('tasks', 'operation_type_id')

    # Удаление справочников
    op.drop_table('categories')
    op.drop_table('zones')
    op.drop_table('operation_types')
