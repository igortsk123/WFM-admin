import type { Subtask } from "@/lib/types";

/**
 * @endpoint GET /api/subtasks?task_id=:id
 * 60+ subtasks mapped to 12 work_type groups (3-5 per type).
 *
 * Naming convention: Subtask (formerly "operations" — that term is DEPRECATED).
 * task_id references MOCK_TASKS.
 * review_state: most are ACCEPTED (standard); some PENDING (proposed by worker, awaiting moderation).
 * One subtask is custom (added by manager, review_state=ACCEPTED, different name pattern).
 *
 * Grouped by work_type_id for clarity:
 *   4  = Выкладка (MERCH)
 *   5  = Переоценка (REPRICE)
 *   6  = Инвентаризация (INVENTORY)
 *   9  = Мерчендайзинг (MERCH_PLAN)
 *  10  = Ценообразование (PRICING)
 *  11  = Контроль качества (QUALITY)
 *  12  = Уборка (CLEANING)
 *  13  = Складские работы (WAREHOUSE)
 *   2  = Касса (CASHIER)
 *   3  = КСО (SELF_CHECKOUT)
 *   7  = Другие работы (OTHER_RETAIL)
 *   1  = Менеджерские операции (MGR_OPS)
 */

// ══════════════════════════════════════════════════════════════════
// work_type 4 — Выкладка (task-006, task-007)
// ══════════════════════════════════════════════════════════════════

const MERCH_TASK_ID = "task-006";
const MERCH_TASK2_ID = "task-007";

// ── task-006 subtasks ──
const subtasksMerch1: Subtask[] = [
  {
    id: 1,
    task_id: MERCH_TASK_ID,
    name: "Убрать упавшие и смещённые позиции",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 5,
    order: 1,
  },
  {
    id: 2,
    task_id: MERCH_TASK_ID,
    name: "Пополнить полки из тележки",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 2,
  },
  {
    id: 3,
    task_id: MERCH_TASK_ID,
    name: "Выставить фронт строго к покупателю (фейсинг)",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 8,
    order: 3,
  },
  {
    id: 4,
    task_id: MERCH_TASK_ID,
    name: "Проверить ценники на выложенных позициях",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 5,
    order: 4,
  },
  {
    id: 5,
    task_id: MERCH_TASK_ID,
    name: "Убрать тележку и инструмент после выкладки",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 5,
  },
];

// ── task-007 subtasks ──
const subtasksMerch2: Subtask[] = [
  {
    id: 6,
    task_id: MERCH_TASK2_ID,
    name: "Убрать упавшие и смещённые позиции",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 5,
    order: 1,
  },
  {
    id: 7,
    task_id: MERCH_TASK2_ID,
    name: "Пополнить пивной стеллаж из склада",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 12,
    order: 2,
  },
  {
    id: 8,
    task_id: MERCH_TASK2_ID,
    name: "Выставить фронт по планограмме ПП-06/2026",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 3,
  },
  {
    id: 9,
    task_id: MERCH_TASK2_ID,
    name: "Ротация сроков годности (ближние вперёд)",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 8,
    order: 4,
  },
  /**
   * Кастомная подзадача — добавлена менеджером вручную,
   * review_state=ACCEPTED (уже одобрена).
   */
  {
    id: 10,
    task_id: MERCH_TASK2_ID,
    name: "Проверить наличие промо-стикеров «Цена снижена»",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 5,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 5 — Переоценка (task-008, task-009)
// ══════════════════════════════════════════════════════════════════

const REPRICE_TASK_ID  = "task-008";
const REPRICE_TASK2_ID = "task-009";

const subtasksReprice1: Subtask[] = [
  {
    id: 11,
    task_id: REPRICE_TASK_ID,
    name: "Получить файл новых цен из терминала",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 1,
  },
  {
    id: 12,
    task_id: REPRICE_TASK_ID,
    name: "Снять старые ценники (складывать отдельно, не выкидывать)",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 15,
    order: 2,
  },
  {
    id: 13,
    task_id: REPRICE_TASK_ID,
    name: "Напечатать новые ценники на принтере",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 3,
  },
  {
    id: 14,
    task_id: REPRICE_TASK_ID,
    name: "Разместить новые ценники: приоритет — front-line полки",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 18,
    order: 4,
  },
  /** Предложена работником — ожидает модерации */
  {
    id: 15,
    task_id: REPRICE_TASK_ID,
    name: "Сфотографировать итоговый вид полки после переоценки",
    review_state: "PENDING",
    hints_count: 0,
    duration_min: 2,
    order: 5,
  },
];

const subtasksReprice2: Subtask[] = [
  {
    id: 16,
    task_id: REPRICE_TASK2_ID,
    name: "Получить промо-лист и сверить с терминалом",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 4,
    order: 1,
  },
  {
    id: 17,
    task_id: REPRICE_TASK2_ID,
    name: "Снять старые ценники акционных стеллажей",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 2,
  },
  {
    id: 18,
    task_id: REPRICE_TASK2_ID,
    name: "Поклеить промо-ценники «Спецпредложение»",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 3,
  },
  {
    id: 19,
    task_id: REPRICE_TASK2_ID,
    name: "Передать старые ценники администратору",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 2,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 6 — Инвентаризация (task-012, task-016)
// ══════════════════════════════════════════════════════════════════

const INVENTORY_TASK_ID  = "task-012";
const INVENTORY_TASK2_ID = "task-016";

const subtasksInventory1: Subtask[] = [
  {
    id: 20,
    task_id: INVENTORY_TASK_ID,
    name: "Подготовить терминал сбора данных (ТСД)",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 1,
  },
  {
    id: 21,
    task_id: INVENTORY_TASK_ID,
    name: "Сканировать товары: справа налево, сверху вниз",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 45,
    order: 2,
  },
  {
    id: 22,
    task_id: INVENTORY_TASK_ID,
    name: "Подсчитать ручные остатки нечитаемых штрих-кодов",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 15,
    order: 3,
  },
  {
    id: 23,
    task_id: INVENTORY_TASK_ID,
    name: "Сверить ТСД с данными системы учёта",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 15,
    order: 4,
  },
  {
    id: 24,
    task_id: INVENTORY_TASK_ID,
    name: "Зафиксировать расхождения — фото обязательно",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 10,
    order: 5,
  },
];

const subtasksInventory2: Subtask[] = [
  {
    id: 25,
    task_id: INVENTORY_TASK2_ID,
    name: "Распечатать бланк пересчёта бакалеи",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 1,
  },
  {
    id: 26,
    task_id: INVENTORY_TASK2_ID,
    name: "Сканировать штрих-коды по стеллажам 3–5",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 60,
    order: 2,
  },
  {
    id: 27,
    task_id: INVENTORY_TASK2_ID,
    name: "Сверка с системой: внести корректировки",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 30,
    order: 3,
  },
  /** Предложена работником — ожидает модерации */
  {
    id: 28,
    task_id: INVENTORY_TASK2_ID,
    name: "Сфотографировать полки с расхождениями",
    review_state: "PENDING",
    hints_count: 0,
    duration_min: 5,
    order: 4,
  },
  {
    id: 29,
    task_id: INVENTORY_TASK2_ID,
    name: "Передать скан-лист участков супервайзеру",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 5,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 13 — Складские работы / Приёмка (task-004, task-014)
// ══════════════════════════════════════════════════════════════════

const WAREHOUSE_TASK_ID  = "task-004";
const WAREHOUSE_TASK2_ID = "task-014";

const subtasksWarehouse1: Subtask[] = [
  {
    id: 30,
    task_id: WAREHOUSE_TASK_ID,
    name: "Сверить накладную с фактическим количеством",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 1,
  },
  {
    id: 31,
    task_id: WAREHOUSE_TASK_ID,
    name: "Проверить температуру молочки при приёмке",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 7,
    order: 2,
  },
  {
    id: 32,
    task_id: WAREHOUSE_TASK_ID,
    name: "Проверить сроки годности каждой партии",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 3,
  },
  {
    id: 33,
    task_id: WAREHOUSE_TASK_ID,
    name: "Разместить товар в холодильной камере",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 15,
    order: 4,
  },
  {
    id: 34,
    task_id: WAREHOUSE_TASK_ID,
    name: "Оформить приходный ордер в системе",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 5,
  },
];

const subtasksWarehouse2: Subtask[] = [
  {
    id: 35,
    task_id: WAREHOUSE_TASK2_ID,
    name: "Проверить документы ЕГАИС и акцизные марки",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 15,
    order: 1,
  },
  {
    id: 36,
    task_id: WAREHOUSE_TASK2_ID,
    name: "Сверить накладную по количеству бутылок",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 2,
  },
  {
    id: 37,
    task_id: WAREHOUSE_TASK2_ID,
    name: "Отсканировать марки в систему ЕГАИС",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 20,
    order: 3,
  },
  {
    id: 38,
    task_id: WAREHOUSE_TASK2_ID,
    name: "Разместить алкоголь на складе по группам",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 10,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 11 — Контроль качества (task-005, task-017)
// ══════════════════════════════════════════════════════════════════

const QUALITY_TASK_ID  = "task-005";
const QUALITY_TASK2_ID = "task-017";

const subtasksQuality1: Subtask[] = [
  {
    id: 39,
    task_id: QUALITY_TASK_ID,
    name: "Обход холодильников 1–4 с термометром",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 1,
  },
  {
    id: 40,
    task_id: QUALITY_TASK_ID,
    name: "Проверить сроки годности молочной продукции",
    review_state: "ACCEPTED",
    hints_count: 2,
    duration_min: 15,
    order: 2,
  },
  {
    id: 41,
    task_id: QUALITY_TASK_ID,
    name: "Перенести просрочку и «предсрочку» на стол возврата",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 3,
  },
  {
    id: 42,
    task_id: QUALITY_TASK_ID,
    name: "Заполнить журнал актов списания",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 4,
  },
];

const subtasksQuality2: Subtask[] = [
  {
    id: 43,
    task_id: QUALITY_TASK2_ID,
    name: "Проверить температурный режим: должен быть −1…+4°C",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 1,
  },
  {
    id: 44,
    task_id: QUALITY_TASK2_ID,
    name: "Осмотреть конденсатор и уплотнители дверей",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 8,
    order: 2,
  },
  {
    id: 45,
    task_id: QUALITY_TASK2_ID,
    name: "Проверить сроки годности на видимых полках",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 7,
    order: 3,
  },
  /** Предложена работником — ожидает модерации */
  {
    id: 46,
    task_id: QUALITY_TASK2_ID,
    name: "Отметить замечания в мобильном чеклисте",
    review_state: "PENDING",
    hints_count: 0,
    duration_min: 3,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 12 — Уборка (task-013)
// ══════════════════════════════════════════════════════════════════

const CLEANING_TASK_ID = "task-013";

const subtasksCleaning: Subtask[] = [
  {
    id: 47,
    task_id: CLEANING_TASK_ID,
    name: "Протереть кассовые ленты и экраны",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 4,
    order: 1,
  },
  {
    id: 48,
    task_id: CLEANING_TASK_ID,
    name: "Влажная уборка пола прикассовой зоны",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 7,
    order: 2,
  },
  {
    id: 49,
    task_id: CLEANING_TASK_ID,
    name: "Продезинфицировать ручки тележек и корзин",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 5,
    order: 3,
  },
  {
    id: 50,
    task_id: CLEANING_TASK_ID,
    name: "Убрать инвентарь в место хранения",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 2,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 9 — Мерчендайзинг (task-022)
// ══════════════════════════════════════════════════════════════════

const MERCH_PLAN_TASK_ID = "task-022";

const subtasksMerchPlan: Subtask[] = [
  {
    id: 51,
    task_id: MERCH_PLAN_TASK_ID,
    name: "Сверить планограмму с текущим расположением",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 5,
    order: 1,
  },
  {
    id: 52,
    task_id: MERCH_PLAN_TASK_ID,
    name: "Переставить позиции согласно схеме",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 30,
    order: 2,
  },
  {
    id: 53,
    task_id: MERCH_PLAN_TASK_ID,
    name: "Сделать фото итогового стеллажа",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 3,
  },
  {
    id: 54,
    task_id: MERCH_PLAN_TASK_ID,
    name: "Заполнить чеклист выполнения планограммы",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 10 — Ценообразование (task-009)
// ══════════════════════════════════════════════════════════════════

const PRICING_TASK_ID = "task-009";

const subtasksPricing: Subtask[] = [
  {
    id: 55,
    task_id: PRICING_TASK_ID,
    name: "Загрузить актуальный промо-лист в ТСД",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 1,
  },
  {
    id: 56,
    task_id: PRICING_TASK_ID,
    name: "Сверить цены на торцах 7, 9, 12 с промо-листом",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 2,
  },
  {
    id: 57,
    task_id: PRICING_TASK_ID,
    name: "Заменить несоответствующие ценники",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 12,
    order: 3,
  },
  /** Предложена работником */
  {
    id: 58,
    task_id: PRICING_TASK_ID,
    name: "Проверить соответствие цен на электронных ценникодержателях",
    review_state: "PENDING",
    hints_count: 0,
    duration_min: 5,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 2 — Касса (task-001)
// ══════════════════════════════════════════════════════════════════

const CASHIER_TASK_ID = "task-001";

const subtasksCashier: Subtask[] = [
  {
    id: 59,
    task_id: CASHIER_TASK_ID,
    name: "Сформировать Z-отчёт на кассе",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 1,
  },
  {
    id: 60,
    task_id: CASHIER_TASK_ID,
    name: "Пересчитать купюры и сдачу",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 7,
    order: 2,
  },
  {
    id: 61,
    task_id: CASHIER_TASK_ID,
    name: "Подготовить пакет инкассации",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 5,
    order: 3,
  },
  {
    id: 62,
    task_id: CASHIER_TASK_ID,
    name: "Заполнить кассовый журнал",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 3,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 1 — Менеджерские операции (task-002)
// ══════════════════════════════════════════════════════════════════

const MGR_TASK_ID = "task-002";

const subtasksMgr: Subtask[] = [
  {
    id: 63,
    task_id: MGR_TASK_ID,
    name: "Обойти Торговый зал — внешний вид и чистота",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 8,
    order: 1,
  },
  {
    id: 64,
    task_id: MGR_TASK_ID,
    name: "Проверить состояние холодильников (температура)",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 5,
    order: 2,
  },
  {
    id: 65,
    task_id: MGR_TASK_ID,
    name: "Зафиксировать замечания в журнале открытия",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 3,
  },
  {
    id: 66,
    task_id: MGR_TASK_ID,
    name: "Поставить задачи по замечаниям исполнителям",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 4,
  },
];

// ══════════════════════════════════════════════════════════════════
// work_type 3 — КСО (task-010)
// ══════════════════════════════════════════════════════════════════

const SCO_TASK_ID = "task-010";

const subtasksSco: Subtask[] = [
  {
    id: 67,
    task_id: SCO_TASK_ID,
    name: "Включить самокассы и загрузить систему",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 1,
  },
  {
    id: 68,
    task_id: SCO_TASK_ID,
    name: "Проверить и заправить рулоны чеков (все 12 касс)",
    review_state: "ACCEPTED",
    hints_count: 1,
    duration_min: 10,
    order: 2,
  },
  {
    id: 69,
    task_id: SCO_TASK_ID,
    name: "Протестировать сканер на каждой кассе",
    review_state: "ACCEPTED",
    hints_count: 0,
    duration_min: 5,
    order: 3,
  },
];

// ══════════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════════

export const MOCK_SUBTASKS: Subtask[] = [
  ...subtasksMerch1,
  ...subtasksMerch2,
  ...subtasksReprice1,
  ...subtasksReprice2,
  ...subtasksInventory1,
  ...subtasksInventory2,
  ...subtasksWarehouse1,
  ...subtasksWarehouse2,
  ...subtasksQuality1,
  ...subtasksQuality2,
  ...subtasksCleaning,
  ...subtasksMerchPlan,
  ...subtasksPricing,
  ...subtasksCashier,
  ...subtasksMgr,
  ...subtasksSco,
];
