/**
 * ТехПродЗдрав — 32 task-операции для производства «Подушка 12-модульная 40×50».
 * Источник: Excel «Производственные задачи v1.3» (07.05.2026).
 *
 * Конвейер: каждая операция назначена конкретной роли (assignee_id) и
 * передаёт следующей роли (next_assignee_id). chain_position 1..32
 * сохраняет порядок выполнения.
 *
 * Все задачи в state=NEW на 2026-05-07 → видны как «сегодня к выполнению»
 * у соответствующих сотрудников.
 *
 * Маппинг user_id (см. users.ts 200-208):
 *   200 Болтушкина Ольга — закройщик
 *   201 Сахибаева Зухра — вышивальщица
 *   202 Терещенко Алина — комплектовщица
 *   203 Топоровски Анна — швея
 *   204 Львова Надежда — ручница
 *   205 Новикова Юлия — оператор клеевого станка
 *   206 Иванова Екатерина — оператор дозатора
 *   207 Леднёва Александра — швея-окантовщица
 *   208 Насурова Людмила — упаковщик
 *
 * Маппинг zone_id (см. zones.ts 200-208):
 *   200 Крой, 201 Вышивка, 202 Модули, 203 Клеевая, 204 Микросфера,
 *   205 Сборка, 206 Окантовка, 207 Закрепка, 208 Финиш
 */
import type { Task } from "@/lib/types";

interface OpDescriptor {
  pos: number;            // chain_position (1..32)
  zone: number;           // zone_id (200-208)
  workType: number;       // work_type_id (21-25)
  assignee: number;       // user_id (200-208)
  next: number | null;    // next_assignee_id
  title: string;
  result: string;
  hint: string | null;
  minutes: number;        // planned_minutes (если в Excel секунды → /60, иначе default 5)
  store: number;          // 100 (Швейный цех)
}

const NAME_BY_ID: Record<number, string> = {
  200: "Болтушкина Ольга Викторовна",
  201: "Сахибаева Зухра Маратовна",
  202: "Терещенко Алина Игоревна",
  203: "Топоровски Анна Сергеевна",
  204: "Львова Надежда Александровна",
  205: "Новикова Юлия Андреевна",
  206: "Иванова Екатерина Михайловна",
  207: "Леднёва Александра Дмитриевна",
  208: "Насурова Людмила Олеговна",
};

const OPERATIONS: OpDescriptor[] = [
  // ── Крой (zone 200), Болтушкина 200, work-type 21 SEWING для большинства ──
  { pos: 1,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Сделать раскладку модулей на Таффете",                              result: "Зарисовка модулей на ткани",                          hint: "Выполнить раскладку согласно нормам",                                                              minutes: 5,  store: 100 },
  { pos: 2,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Выполнить настил до 200 слоёв",                                      result: "Ткань уложена по длине раскладки в несколько слоёв",   hint: "100 слоёв лицом вниз, 100 слоёв лицом вверх, сверху зарисовка",                                    minutes: 8,  store: 100 },
  { pos: 3,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Разрезать настил на части",                                          result: "Грубый крой модуля 11×21 см",                          hint: "Настил рассекается сабельным ножом",                                                                minutes: 4,  store: 100 },
  { pos: 4,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Осноровить детали грубого кроя",                                     result: "Чистый крой модуля 11×21 см",                          hint: "Осноровка на ленточной машине",                                                                     minutes: 6,  store: 100 },
  { pos: 5,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Раскладка наружнего чехла Дюспо и внутреннего чехла Таффета",        result: "Зарисовка комплектов лекал на ткани",                  hint: "Выполнить раскладку согласно нормам",                                                              minutes: 5,  store: 100 },
  { pos: 6,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Выполнить настил (Дюспо + Таффета)",                                 result: "Ткань уложена в несколько слоёв (до 200)",             hint: "50 слоёв Таффета лицом вниз+50 лицом вверх+50 Дюспо лицом вверх+50 лицом вниз",                    minutes: 8,  store: 100 },
  { pos: 7,  zone: 200, workType: 21, assignee: 200, next: 200, title: "Разрезать настил на части (Дюспо + Таффета)",                        result: "Грубый крой",                                          hint: "Настил рассекается сабельным ножом",                                                                minutes: 4,  store: 100 },
  { pos: 8,  zone: 200, workType: 22, assignee: 200, next: 201, title: "Осноровить детали (передать на вышивку)",                            result: "Чистый крой наружнего чехла Дюспо",                    hint: "Одну деталь наружнего чехла отдать на вышивку",                                                    minutes: 4,  store: 100 },
  { pos: 9,  zone: 200, workType: 21, assignee: 200, next: 202, title: "Осноровить детали (передать на комплектовку Дюспо)",                 result: "Чистый крой наружнего чехла Дюспо",                    hint: "Одну деталь наружнего чехла отдать на комплектовку",                                                minutes: 4,  store: 100 },
  { pos: 10, zone: 200, workType: 21, assignee: 200, next: 202, title: "Осноровить детали (передать на комплектовку Таффета)",               result: "Чистый крой внутреннего чехла Таффета",                hint: "Детали внутреннего чехла",                                                                          minutes: 4,  store: 100 },

  // ── Вышивка (zone 201) ──
  { pos: 11, zone: 201, workType: 22, assignee: 201, next: 202, title: "Наметить место расположения и выполнить вышивку",                    result: "Деталь наружнего чехла с вышивкой",                    hint: "Место расположения вышивки определять по разметке",                                                minutes: 12, store: 100 },

  // ── Комплектовка (zone 200, на стеллаже) ──
  { pos: 12, zone: 200, workType: 21, assignee: 202, next: 203, title: "Скомплектовать детали по пачкам",                                    result: "Скомплектованные детали по пачкам",                    hint: "Кол-во в пачке см. в таблице, пачки подписать, связать",                                            minutes: 6,  store: 100 },

  // ── Модули (zone 202) ──
  { pos: 13, zone: 202, workType: 21, assignee: 203, next: 204, title: "Стачать модули с двух сторон (12 шт.)",                              result: "Модули с 2 стачанными сторонами",                      hint: "Шов стачивания 1.5 см, связать в пачки по 60 модулей, подписать",                                  minutes: 5,  store: 100 },
  { pos: 14, zone: 202, workType: 21, assignee: 204, next: 205, title: "Вывернуть модули (12 шт.)",                                          result: "Вывернутые модули",                                    hint: "Вывернуть, расправить",                                                                              minutes: 2,  store: 100 },

  // ── Клеевая (zone 203) ──
  { pos: 15, zone: 203, workType: 24, assignee: 205, next: 204, title: "Проклеить с 2-х сторон",                                             result: "Проклеенные 2 стороны",                                hint: "Лента по центру шва",                                                                                minutes: 4,  store: 100 },
  { pos: 16, zone: 203, workType: 24, assignee: 204, next: 205, title: "Вывернуть, подрезать заклеенные припуски, рассечь по швам",          result: "Удалены излишки ленты",                                hint: null,                                                                                                  minutes: 5,  store: 100 },
  { pos: 17, zone: 203, workType: 24, assignee: 205, next: 206, title: "Проклеить 3-ю сторону",                                              result: "Проклеена 3 сторона",                                  hint: "Лента по центру шва",                                                                                minutes: 3,  store: 100 },

  // ── Микросфера (zone 204) ──
  { pos: 18, zone: 204, workType: 23, assignee: 206, next: 206, title: "Подрезать после 3-й клеевой",                                        result: "Удалены излишки ленты",                                hint: null,                                                                                                  minutes: 1,  store: 100 },
  { pos: 19, zone: 204, workType: 23, assignee: 206, next: 205, title: "Наполнение микросферой",                                             result: "Заполненный модуль",                                   hint: "Соблюдать соотношение 10:1",                                                                         minutes: 4,  store: 100 },

  // ── Клеевая (zone 203) — финальная ──
  { pos: 20, zone: 203, workType: 24, assignee: 205, next: 205, title: "Проклеить 4-ю сторону",                                              result: "Закрытый герметичный модуль",                          hint: "Лента по центру шва",                                                                                minutes: 3,  store: 100 },
  { pos: 21, zone: 203, workType: 24, assignee: 205, next: 203, title: "Подрезать после 4-й клеевой",                                        result: "Удалены излишки ленты",                                hint: null,                                                                                                  minutes: 2,  store: 100 },

  // ── Сборка (zone 205) ──
  { pos: 22, zone: 205, workType: 21, assignee: 203, next: 203, title: "Стачать модули по 3-й и 4-й стороне",                                result: "Застрочена 3 и 4 сторона модулей",                     hint: "Шов 0.7 см",                                                                                          minutes: 5,  store: 100 },
  { pos: 23, zone: 205, workType: 21, assignee: 203, next: 203, title: "Собрать модули в полосы",                                            result: "Сформированы полосы",                                  hint: "Стачать 6 модулей по длинной стороне накладным швом, перекрытие 1.5см. Две полосы.",                minutes: 5,  store: 100 },
  { pos: 24, zone: 205, workType: 21, assignee: 203, next: 203, title: "Собрать полосы между собой",                                         result: "Сформирован модульный блок из полос",                  hint: "Стачать 2 полосы накладным швом, перекрытие 1.5см",                                                  minutes: 5,  store: 100 },
  { pos: 25, zone: 205, workType: 21, assignee: 203, next: 203, title: "Настрочить подушку на Таффету шов 0.3 см",                           result: "Модульный блок закреплен на Таффете",                  hint: null,                                                                                                  minutes: 7,  store: 100 },
  { pos: 26, zone: 205, workType: 21, assignee: 203, next: 203, title: "Настрочить подушку на Дюспо шов 0.3 см",                             result: "Изделие с наружным слоем Дюспо",                       hint: null,                                                                                                  minutes: 5,  store: 100 },
  { pos: 27, zone: 205, workType: 21, assignee: 203, next: 203, title: "Собрать верхнюю часть Дюспо + Таффета шов 0.3 см",                   result: "Изделие с наружным слоем Дюспо",                       hint: null,                                                                                                  minutes: 4,  store: 100 },
  { pos: 28, zone: 205, workType: 21, assignee: 203, next: 203, title: "Стачать верхнюю и нижнюю часть с модулями (с символом по уходу)",    result: "Собранное изделие",                                    hint: "Символ подписать",                                                                                    minutes: 5,  store: 100 },
  { pos: 29, zone: 205, workType: 21, assignee: 203, next: 207, title: "Осноровить изделие, по углам сделать закругления",                   result: "Изделие с выровненной геометрией",                     hint: null,                                                                                                  minutes: 4,  store: 100 },

  // ── Окантовка (zone 206) ──
  { pos: 30, zone: 206, workType: 21, assignee: 207, next: 203, title: "Окантовать изделие трикотажной тесьмой",                             result: "Окантованное изделие",                                 hint: "Ровная строчка без волн",                                                                            minutes: 2,  store: 100 },

  // ── Закрепка (zone 207) ──
  { pos: 31, zone: 207, workType: 21, assignee: 203, next: 208, title: "Закрепить конец окантовки",                                          result: "Готовое изделие",                                      hint: "Ленту подвернуть на нижнюю сторону, настрочить в строчку окантовки, подрезать осмолить",            minutes: 1,  store: 100 },

  // ── Финиш (zone 208) ──
  { pos: 32, zone: 208, workType: 25, assignee: 208, next: null, title: "Упаковать изделие",                                                  result: "Упакованное изделие",                                  hint: "Проверка качества, вложить инструкцию в пакет, поставить дату, наклеить этикетку.",                 minutes: 3,  store: 100 },
];

const ZONE_NAME_BY_ID: Record<number, string> = {
  200: "Крой", 201: "Вышивка", 202: "Модули", 203: "Клеевая",
  204: "Микросфера", 205: "Сборка", 206: "Окантовка", 207: "Закрепка",
  208: "Финиш",
};

const WORK_TYPE_NAME_BY_ID: Record<number, string> = {
  21: "Машинный пошив",
  22: "Вышивка и маркировка",
  23: "Наполнение",
  24: "Герметизация",
  25: "Ручная отделка",
};

const TODAY_ISO = "2026-05-07T08:00:00+07:00";

export const TPZ_TASKS: Task[] = OPERATIONS.map((op) => ({
  id: `task-tpz-${String(op.pos).padStart(3, "0")}`,
  title: op.title,
  description: op.result,
  type: "PLANNED",
  kind: "SINGLE",
  source: "PLANNED",
  store_id: op.store,
  store_name: "ТехПродЗдрав, швейный цех",
  zone_id: op.zone,
  zone_name: ZONE_NAME_BY_ID[op.zone],
  work_type_id: op.workType,
  work_type_name: WORK_TYPE_NAME_BY_ID[op.workType],
  product_category_id: 100,
  product_category_name: "Подушка 12-модульная 40×50",
  priority: 5,
  editable_by_store: false,
  creator_id: 3,
  creator_name: "Соколова Анастасия Викторовна",
  assignee_id: op.assignee,
  assignee_name: NAME_BY_ID[op.assignee],
  assigned_to_permission: null,
  next_assignee_id: op.next,
  next_assignee_name: op.next ? NAME_BY_ID[op.next] : null,
  chain_position: op.pos,
  state: "NEW",
  review_state: "NONE",
  acceptance_policy: "MANUAL",
  requires_photo: false,
  comment: op.hint ?? undefined,
  archived: false,
  planned_minutes: op.minutes,
  created_at: TODAY_ISO,
  updated_at: TODAY_ISO,
}));
