# План: Multi-tenant моки — 3 партнёра с изоляцией данных

**Статус:** В работе
**Создан:** 2026-05-07
**Последнее обновление:** 2026-05-07

## Цель

Сейчас моки в `lib/mock-data/` — единый pool, перемешанный по проектам. Need сделать **3 изолированных тенанта**, при переключении контекста все данные (магазины, сотрудники, задачи, зоны, категории, work types) меняются полностью.

## 3 партнёра

| Org | Vertical | Источник данных | Stores | Сотрудников |
|---|---|---|---|---|
| **ЛАМА** | FMCG_RETAIL | `.memory_bank/` (уже есть базовые) | 18 SPAR + Food City | ~100 |
| **ТехПродЗдрав** | PRODUCTION (new vertical) | `Производство 07.05.2026/Производственные_задачи_v1_3.xlsx` | 1 швейный цех | 9 (из Excel) |
| **Левас** | FASHION_RETAIL | Собственная генерация | 3 fashion-магазина | ~30 |

## Phase 0 — Discovery (DONE)

- ✅ Inventoried 40 mock-data файлов в `lib/mock-data/`
- ✅ Memory bank LAMA: 11 zones (id 100-110), 53 categories, 13 work types
- ✅ Excel parsed: 1 продукт «Подушка 12-модульная 40x50», 32 операции по 9 этапам, 9 сотрудников с ФИО+телефонами + нормами времени
- ✅ Mobile project structure: `wfm-develop mobile 07.05.2026/wfm/backend/` — есть seed_dev_data.py, lama_service для интеграции

## Phase 1 — Org context infrastructure

- [ ] 1.1 Rename MOCK_ORGANIZATIONS: «СПАР Сибирь»/«Food City Томск»/«Магазин одежды Альфа» → «ЛАМА»/«ТехПродЗдрав»/«Левас». Расширить `Organization.business_vertical` enum на `PRODUCTION`.
- [ ] 1.2 Аудит типов: где уже есть `org_id` / `partner_id`, где нет. Добавить `org_id: string` в `Store`, `User`, `Zone`, `WorkType`, `ProductCategory`, `Position`, `Task`, `Shift`, `Assignment`, `WorkerPermission`, `Goal`, `Hint`.
- [ ] 1.3 auth-context: `currentOrgId` в стейте + setter. Default — первая org из mocks.
- [ ] 1.4 Все API функции в `lib/api/*.ts` фильтруют по `currentOrgId` (читать из контекста или принимать аргумент).
- [ ] 1.5 OrgSwitcher в topbar (уже есть): по клику смена `currentOrgId`, refetch всех данных через React Query инвалидацию.
- [ ] 1.6 Empty states когда у org мало/нет данных в каком-то модуле.

## Phase 2 — ЛАМА mocks (FMCG, приоритет 1)

- [ ] 2.1 Tag существующие моки `org_id="org-lama"`: stores (18), users (~100), positions, assignments, zones (100-110), product categories (53), work types (1-13).
- [ ] 2.2 Удалить «Food City Томск» как отдельную org — это магазин внутри ЛАМА (move stores: оставить как просто магазины ЛАМА с другим брендом).
- [ ] 2.3 Tasks (распределение): сейчас 25, расширить до 100+ из реальных задач FMCG.
- [ ] 2.4 KPI/goals: tag по org.
- [ ] 2.5 Notifications mock: tag по org.

## Phase 3 — ТехПродЗдрав mocks (PRODUCTION, приоритет 2)

- [ ] 3.1 Org type: добавить `business_vertical: "PRODUCTION"` в enum.
- [ ] 3.2 1 store: «Швейный цех Тшева» (или «Производство ТехПродЗдрав»). org_id="org-tehprod".
- [ ] 3.3 Zones (id 200-208): Крой, Вышивка, Модули, Клеевая, Микросфера, Сборка, Окантовка, Закрепка, Финиш.
- [ ] 3.4 Work types: добавить production-specific из Excel (Закрой, Вышивка, Комплектовка, Клеевая, Дозатор, Окантовка, Закрепка, Упаковка). + существующие 21-25 (SEWING etc.).
- [ ] 3.5 Positions: Закройщик, Швея, Ручница, Оператор клеевого станка, Оператор дозатора, Швея-окантовщица, Упаковщик, Вышивка, Комплектовка.
- [ ] 3.6 Users: 9 из Excel — Болтушкина Ольга, Сахибаева Зухра, Терещенко Алина, Топоровски Анна, Львова Надежда, Новикова Юлия, Иванова Екатерина, Леднёва Александра, Насурова Людмила. С phones.
- [ ] 3.7 Product categories: 1 товар «Подушка 12-модульная 40x50». Добавить `Product` структуру для производства (отличается от FMCG).
- [ ] 3.8 Tasks: 32 операции из Excel = chain. Конвейер задач (Task.next_position / chain_id). С нормами времени из колонки «Мин 1, сек».
- [ ] 3.9 Hints: «Подсказки для сотрудника» из Excel → Hint mock.

## Phase 4 — Левас mocks (FASHION_RETAIL, приоритет 3)

- [ ] 4.1 Rename «Магазин одежды Альфа» → «Левас». business_vertical=FASHION_RETAIL.
- [ ] 4.2 3 stores: «Левас на Ленина», «Левас в ТРЦ Изумрудный город», «Левас на пр. Фрунзе».
- [ ] 4.3 Zones (id 300-307): Торговый зал, Примерочные, Склад, Касса, Витрина, Зона новинок, Зона распродажи.
- [ ] 4.4 Work types: subset (Выкладка, Переоценка, Контроль качества, Уборка, Касса) — те же ID 4/5/11/12/2.
- [ ] 4.5 Categories: Мужская одежда, Женская, Детская, Аксессуары, Обувь, Спорт, Сезон.
- [ ] 4.6 Positions: Продавец-консультант, Кассир, Старший продавец, Кладовщик, Управляющий магазином.
- [ ] 4.7 Users: ~30 (10 на магазин), сгенерировать русские ФИО.
- [ ] 4.8 Tasks: 15-20 типичных fashion (выкладка новой коллекции, переоценка с распродажи, чистота примерочных, вечерняя инвентаризация).

## Phase 5 — Polish + verification

- [ ] 5.1 Тест: переключение org → все экраны (dashboard, tasks, employees, stores, schedule, distribute) показывают данные только этой org.
- [ ] 5.2 Memory bank update: новый файл `_claude/MULTI-TENANT.md` с описанием 3 orgs и их особенностей.
- [ ] 5.3 Edge cases: org с 0 задач, 0 сотрудников и т.п.
- [ ] 5.4 Перекрёстные case'ы: PLATFORM_ADMIN видит все orgs (через role); STORE_DIRECTOR видит только свою.

## Implementation strategy

**Каждая фаза = несколько коммитов**, push в main по одному. После Phase 1 (infra) — приоритет на Phase 2 (ЛАМА), потом 3 (production), потом 4 (fashion).

Phase 1 — самая рискованная (touches много файлов). Делаю сначала её **без удаления старых данных**, добавляя org_id с дефолтом «org-lama» — старая логика не сломается до завершения Phase 2-4.

## Лог выполнения

### 2026-05-07
- Создан план. Сделана discovery (моки + memory bank + excel + mobile structure).
