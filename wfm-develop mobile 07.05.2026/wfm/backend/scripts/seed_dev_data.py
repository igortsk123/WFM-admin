"""
Seed script: создаёт тестовые смены и задачи на сегодня для проверки функционала менеджера.

Запуск на сервере:
    docker cp backend/scripts/seed_dev_data.py backend-svc_tasks-1:/tmp/
    docker exec \
        -e USERS_DB_URL="postgresql://wfm_users_user:wfm_users_password@postgres:5432/wfm_users" \
        backend-svc_tasks-1 python3 /tmp/seed_dev_data.py

Пересоздать (удалить старые данные за сегодня и создать заново):
    docker exec \
        -e USERS_DB_URL="postgresql://wfm_users_user:wfm_users_password@postgres:5432/wfm_users" \
        -e RESET=1 \
        backend-svc_tasks-1 python3 /tmp/seed_dev_data.py
"""
import os
import random
import uuid
from datetime import date, datetime, time
import psycopg2
from psycopg2.extras import RealDictCursor

TASKS_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://wfm_tasks_user:wfm_tasks_password@postgres:5432/wfm_tasks",
)
USERS_DB_URL = os.environ.get(
    "USERS_DB_URL",
    "postgresql://wfm_users_user:wfm_users_password@postgres:5432/wfm_users",
)
RESET = os.environ.get("RESET", "0") == "1"
TODAY = date.today()

# Шаблоны задач: (название, описание, планируемые минуты)
TASK_TEMPLATES = [
    ("Выкладка товара", "Разложить товар по полкам согласно планограмме", 45),
    ("Переоценка товаров", "Заменить ценники после изменения цен", 30),
    ("Проверка срока годности", "Убрать просроченную продукцию", 60),
    ("Уборка торгового зала", "Подмести и вымыть пол в торговом зале", 40),
    ("Приёмка товара", "Принять товар от поставщика, проверить накладную", 90),
    ("Инвентаризация", "Пересчёт остатков по секции", 120),
    ("Зонирование полок", "Переставить товары по новой схеме зонирования", 50),
    ("Контроль ценников", "Проверить соответствие ценников на полках", 35),
]

# Статусы для демонстрации всех состояний задачи
# (state, review_state, acceptance_policy)
TASK_STATES = [
    ("NEW",       "NONE",      "AUTO"),
    ("NEW",       "NONE",      "MANUAL"),
    ("IN_PROGRESS","NONE",     "AUTO"),
    ("PAUSED",    "NONE",      "AUTO"),
    ("COMPLETED", "NONE",      "AUTO"),       # AUTO → сразу NONE (не ждём review)
    ("COMPLETED", "ON_REVIEW", "MANUAL"),
    ("COMPLETED", "ACCEPTED",  "MANUAL"),
    ("COMPLETED", "REJECTED",  "MANUAL"),
]


def connect(url):
    return psycopg2.connect(url)


def get_assignments(users_conn):
    """Все назначения с ролью, у которых есть store_id"""
    with users_conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                a.id  AS assignment_id,
                a.user_id,
                a.store_id,
                a.external_id,
                r.code AS role_code
            FROM assignments a
            LEFT JOIN positions p ON a.position_id = p.id
            LEFT JOIN roles r ON p.role_id = r.id
            WHERE a.store_id IS NOT NULL
            ORDER BY a.id
        """)
        return cur.fetchall()


def get_or_create_work_types(tasks_conn):
    names = ["Мерчендайзинг", "Ценообразование", "Контроль качества", "Уборка", "Складские работы"]
    result = {}
    with tasks_conn.cursor() as cur:
        for name in names:
            cur.execute(
                "INSERT INTO work_types (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (name,),
            )
            cur.execute("SELECT id FROM work_types WHERE name = %s", (name,))
            row = cur.fetchone()
            if row:
                result[name] = row[0]
    tasks_conn.commit()
    return result


def get_or_create_zones(tasks_conn):
    zones = [("Торговый зал", 1), ("Склад", 2), ("Касса", 3), ("Входная группа", 4)]
    result = {}
    with tasks_conn.cursor() as cur:
        for name, priority in zones:
            cur.execute(
                "INSERT INTO zones (name, priority) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
                (name, priority),
            )
            cur.execute("SELECT id FROM zones WHERE name = %s", (name,))
            row = cur.fetchone()
            if row:
                result[name] = row[0]
    tasks_conn.commit()
    return result


def reset_today(tasks_conn):
    """Удалить все смены и задачи за сегодня (для пересоздания)"""
    with tasks_conn.cursor() as cur:
        cur.execute("SELECT id FROM shifts_plan WHERE shift_date = %s", (TODAY,))
        plan_ids = [r[0] for r in cur.fetchall()]

        if plan_ids:
            cur.execute(
                "DELETE FROM tasks WHERE shift_id = ANY(%s)",
                (plan_ids,),
            )
            cur.execute(
                "DELETE FROM shifts_fact WHERE plan_id = ANY(%s)",
                (plan_ids,),
            )
            cur.execute(
                "DELETE FROM shifts_plan WHERE id = ANY(%s)",
                (plan_ids,),
            )

        tasks_conn.commit()
        print(f"RESET: удалено {len(plan_ids)} плановых смен за {TODAY}")


def create_shift(tasks_conn, assignment_id):
    """Создать плановую + фактическую смену. Возвращает (plan_id, fact_id)."""
    with tasks_conn.cursor() as cur:
        # Проверяем существующую
        cur.execute(
            "SELECT id FROM shifts_plan WHERE assignment_id = %s AND shift_date = %s",
            (assignment_id, TODAY),
        )
        existing = cur.fetchone()
        if existing:
            plan_id = existing[0]
        else:
            cur.execute(
                """
                INSERT INTO shifts_plan (assignment_id, shift_date, start_time, end_time, duration)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (assignment_id, TODAY, time(8, 0), time(20, 0), 12),
            )
            plan_id = cur.fetchone()[0]

        # Фактическая смена
        cur.execute("SELECT id FROM shifts_fact WHERE plan_id = %s", (plan_id,))
        existing_fact = cur.fetchone()
        if existing_fact:
            fact_id = existing_fact[0]
        else:
            cur.execute(
                "INSERT INTO shifts_fact (plan_id, opened_at) VALUES (%s, %s) RETURNING id",
                (plan_id, datetime.utcnow()),
            )
            fact_id = cur.fetchone()[0]

    tasks_conn.commit()
    return plan_id, fact_id


def create_tasks(tasks_conn, assignee_id, creator_id, shift_id, work_type_ids, zone_ids):
    """Создать по одной задаче для каждого статуса из TASK_STATES."""
    wt_list = list(work_type_ids.values())
    zone_list = list(zone_ids.values())
    templates = TASK_TEMPLATES[:]
    random.shuffle(templates)

    created = []
    with tasks_conn.cursor() as cur:
        for i, (state, review_state, policy) in enumerate(TASK_STATES):
            title, desc, minutes = templates[i % len(templates)]

            report_text = "Задача выполнена в срок" if state == "COMPLETED" else None
            review_comment = (
                "Качество не соответствует стандарту, переделать"
                if review_state == "REJECTED"
                else None
            )

            cur.execute(
                """
                INSERT INTO tasks (
                    id, title, description, planned_minutes,
                    creator_id, assignee_id,
                    state, review_state, acceptance_policy,
                    shift_id, work_type_id, zone_id, source,
                    report_text, review_comment,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, 'WFM',
                    %s, %s,
                    %s, %s
                )
                """,
                (
                    str(uuid.uuid4()), title, desc, minutes,
                    creator_id, assignee_id,
                    state, review_state, policy,
                    shift_id,
                    random.choice(wt_list) if wt_list else None,
                    random.choice(zone_list) if zone_list else None,
                    report_text, review_comment,
                    datetime.utcnow(), datetime.utcnow(),
                ),
            )
            created.append((title, state, review_state))

    tasks_conn.commit()
    return created


def main():
    print(f"=== Seed dev data — {TODAY} ===\n")

    users_conn = connect(USERS_DB_URL)
    tasks_conn = connect(TASKS_DB_URL)

    try:
        if RESET:
            reset_today(tasks_conn)
            print()

        assignments = get_assignments(users_conn)
        if not assignments:
            print("❌  Нет assignments с store_id. Сначала запусти синхронизацию LAMA.")
            return

        managers = [a for a in assignments if a["role_code"] == "manager"]
        workers  = [a for a in assignments if a["role_code"] != "manager"]

        print(f"Assignments в БД: {len(assignments)} (менеджеров: {len(managers)}, работников: {len(workers)})")

        if not managers:
            print("⚠️   Нет менеджеров — creator_id будет NULL.")

        creator_id = managers[0]["user_id"] if managers else None

        work_types = get_or_create_work_types(tasks_conn)
        zones      = get_or_create_zones(tasks_conn)
        print(f"Справочники: {len(work_types)} типов работ, {len(zones)} зон\n")

        # Берём менеджера + до 5 работников
        sample = (managers[:1] + workers[:5]) if managers else workers[:5]

        total_shifts = 0
        total_tasks  = 0

        for a in sample:
            assignment_id = a["assignment_id"]
            user_id       = a["user_id"]
            role          = a["role_code"] or "worker"

            plan_id, fact_id = create_shift(tasks_conn, assignment_id)
            tasks_created    = create_tasks(
                tasks_conn,
                assignee_id=user_id,
                creator_id=creator_id,
                shift_id=plan_id,
                work_type_ids=work_types,
                zone_ids=zones,
            )

            total_shifts += 1
            total_tasks  += len(tasks_created)

            print(f"  [{role}] user_id={user_id} assignment={assignment_id}")
            print(f"    смена: plan={plan_id}  fact={fact_id}")
            for title, state, review_state in tasks_created:
                print(f"    • {title!r:40s} {state}/{review_state}")
            print()

        print(f"✅  Готово: {total_shifts} смен, {total_tasks} задач создано на {TODAY}")

    finally:
        users_conn.close()
        tasks_conn.close()


if __name__ == "__main__":
    main()
