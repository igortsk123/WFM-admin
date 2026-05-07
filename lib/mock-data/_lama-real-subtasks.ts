/**
 * Подзадачи для REAL_LAMA_TASKS (24 задачи из live API).
 *
 * Шаблоны подзадач по work_type — взяты из существующих MOCK_SUBTASKS
 * (subtasks.ts), реальные паттерны LAMA-ритейла.
 *
 * IDs стартуют с 1000 чтобы не пересекаться с existing 60-subtask пулом.
 */
import type { Subtask } from "@/lib/types";
import { REAL_LAMA_TASKS } from "./_lama-real";

interface SubtaskTemplate {
  name: string;
  duration_min: number;
  hints_count: number;
}

// Шаблоны по work_type_id (1-13 LAMA work types)
const TEMPLATES_BY_WT: Record<number, SubtaskTemplate[]> = {
  // 1 — Менеджерские операции
  1: [
    { name: "Сверка отчётов смены", duration_min: 15, hints_count: 1 },
    { name: "Планирование задач на завтра", duration_min: 20, hints_count: 1 },
    { name: "Обход магазина, контроль стандартов", duration_min: 25, hints_count: 2 },
    { name: "Обработка обращений сотрудников", duration_min: 10, hints_count: 0 },
  ],
  // 2 — Касса
  2: [
    { name: "Открытие смены кассы (внесение размена)", duration_min: 5, hints_count: 1 },
    { name: "Обслуживание покупателей в основной зоне", duration_min: 420, hints_count: 0 },
    { name: "Сверка наличной кассы (X-отчёт)", duration_min: 10, hints_count: 1 },
    { name: "Закрытие смены, инкассация", duration_min: 15, hints_count: 2 },
  ],
  // 3 — КСО (самокассы)
  3: [
    { name: "Подготовка зоны самокасс к работе", duration_min: 10, hints_count: 1 },
    { name: "Помощь покупателям, разрешение ошибок", duration_min: 60, hints_count: 0 },
    { name: "Контроль чек-зоны и весовой проверки", duration_min: 15, hints_count: 1 },
    { name: "Закрытие, очистка терминалов", duration_min: 10, hints_count: 0 },
  ],
  // 4 — Выкладка
  4: [
    { name: "Убрать упавшие и смещённые позиции", duration_min: 5, hints_count: 2 },
    { name: "Пополнить полки из тележки", duration_min: 10, hints_count: 1 },
    { name: "Выставить фронт строго к покупателю (фейсинг)", duration_min: 8, hints_count: 2 },
    { name: "Проверить ценники на выложенных позициях", duration_min: 5, hints_count: 1 },
    { name: "Убрать тележку и инструмент после выкладки", duration_min: 3, hints_count: 0 },
  ],
  // 5 — Переоценка
  5: [
    { name: "Получить выгрузку новых цен", duration_min: 5, hints_count: 1 },
    { name: "Распечатать новые ценники", duration_min: 8, hints_count: 0 },
    { name: "Снять старые ценники, наклеить новые", duration_min: 25, hints_count: 2 },
    { name: "Сверка с системой по выборке", duration_min: 7, hints_count: 1 },
  ],
  // 6 — Инвентаризация
  6: [
    { name: "Получить лист инвентаризации", duration_min: 5, hints_count: 1 },
    { name: "Пересчёт товара по позициям", duration_min: 60, hints_count: 1 },
    { name: "Сверка с остатками 1С", duration_min: 15, hints_count: 1 },
    { name: "Оформление акта расхождений", duration_min: 10, hints_count: 2 },
  ],
  // 7 — Другие работы
  7: [
    { name: "Уточнить детали задачи у управляющего", duration_min: 5, hints_count: 0 },
    { name: "Выполнить задачу", duration_min: 20, hints_count: 0 },
    { name: "Зафиксировать результат", duration_min: 5, hints_count: 0 },
  ],
  // 11 — Контроль качества
  11: [
    { name: "Проверить сроки годности по витрине", duration_min: 10, hints_count: 1 },
    { name: "Осмотреть товар на повреждения", duration_min: 8, hints_count: 1 },
    { name: "Зафиксировать брак, отделить", duration_min: 7, hints_count: 1 },
    { name: "Передать на утилизацию через журнал", duration_min: 5, hints_count: 1 },
  ],
  // 13 — Складские работы
  13: [
    { name: "Приёмка машины, сверка ТТН", duration_min: 30, hints_count: 1 },
    { name: "Разгрузка и проверка целостности", duration_min: 60, hints_count: 1 },
    { name: "Размещение по местам хранения", duration_min: 90, hints_count: 1 },
    { name: "Маркировка и регистрация в системе", duration_min: 20, hints_count: 1 },
  ],
};

// Default — fallback для work_type без шаблона
const DEFAULT_TEMPLATE: SubtaskTemplate[] = [
  { name: "Подготовка к выполнению", duration_min: 5, hints_count: 0 },
  { name: "Основное действие", duration_min: 15, hints_count: 0 },
  { name: "Проверка результата", duration_min: 5, hints_count: 0 },
];

let nextId = 1000;
const subtasks: Subtask[] = [];

for (const task of REAL_LAMA_TASKS) {
  const tpl = TEMPLATES_BY_WT[task.work_type_id] ?? DEFAULT_TEMPLATE;
  tpl.forEach((s, idx) => {
    subtasks.push({
      id: nextId++,
      task_id: task.id,
      name: s.name,
      review_state: "ACCEPTED",
      hints_count: s.hints_count,
      duration_min: s.duration_min,
      order: idx + 1,
    });
  });
}

export const REAL_LAMA_SUBTASKS: Subtask[] = subtasks;
