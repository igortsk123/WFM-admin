/**
 * Fallback-медианы per (work_type, zone) — для магазинов БЕЗ LAMA-данных
 * (например, базовые СПАР/Abricos моки которые не прошли через LAMA fetch).
 * Используется в generateDefaultBlocksForStore() как шаблон блоков.
 *
 * Median minutes посчитаны по всем shop-day observations из снимков:
 * для пары (wt, zone) собираем суммы за день по магазинам, берём median,
 * округляем до 15 мин. Включаем только пары где >= 3 sample (для надёжности).
 *
 * Сгенерировано из всех snapshot'ов в .lama_snapshots/.
 * Регенерация: python tools/lama/regenerate-from-snapshots.py.
 *
 * 19 пар (work_type × zone).
 */
export interface LamaMedianBlock {
  wt_id: number;
  wt_name: string;
  zone_id: number;
  zone_name: string;
  minutes: number;
  samples: number;
}

export const LAMA_FALLBACK_MEDIANS: LamaMedianBlock[] = [
  { wt_id: 2, wt_name: "Касса", zone_id: 112, zone_name: "Без зоны", minutes: 720, samples: 323 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 111, zone_name: "ФРОВ", minutes: 540, samples: 333 },
  { wt_id: 3, wt_name: "КСО", zone_id: 112, zone_name: "Без зоны", minutes: 480, samples: 242 },
  { wt_id: 1, wt_name: "Менеджерские операции", zone_id: 112, zone_name: "Без зоны", minutes: 240, samples: 332 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 100, zone_name: "Фреш 1", minutes: 240, samples: 342 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 101, zone_name: "Фреш 2", minutes: 240, samples: 310 },
  { wt_id: 6, wt_name: "Инвентаризация", zone_id: 112, zone_name: "Без зоны", minutes: 150, samples: 273 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 102, zone_name: "Бакалея", minutes: 120, samples: 313 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 108, zone_name: "Кондитерка, чай, кофе", minutes: 120, samples: 299 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 109, zone_name: "Пиво, чипсы", minutes: 120, samples: 304 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 110, zone_name: "Напитки б/а", minutes: 120, samples: 270 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 104, zone_name: "Бытовая химия", minutes: 75, samples: 249 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 106, zone_name: "Алкоголь", minutes: 75, samples: 252 },
  { wt_id: 5, wt_name: "Переоценка", zone_id: 112, zone_name: "Без зоны", minutes: 75, samples: 322 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 103, zone_name: "Заморозка", minutes: 60, samples: 249 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 105, zone_name: "NF", minutes: 60, samples: 195 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 129, zone_name: "Прикассовая зона", minutes: 60, samples: 241 },
  { wt_id: 7, wt_name: "Другие работы", zone_id: 112, zone_name: "Без зоны", minutes: 60, samples: 158 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 107, zone_name: "ЗОЖ", minutes: 30, samples: 226 },
];
