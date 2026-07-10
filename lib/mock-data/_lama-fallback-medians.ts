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
 * 23 пар (work_type × zone).
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
  { wt_id: 2, wt_name: "Касса", zone_id: 112, zone_name: "Без зоны", minutes: 735, samples: 3140 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 111, zone_name: "ФРОВ", minutes: 540, samples: 3453 },
  { wt_id: 3, wt_name: "КСО", zone_id: 112, zone_name: "Без зоны", minutes: 480, samples: 2331 },
  { wt_id: 1, wt_name: "Менеджерские операции", zone_id: 112, zone_name: "Без зоны", minutes: 285, samples: 3321 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 100, zone_name: "Фреш 1", minutes: 240, samples: 3501 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 101, zone_name: "Фреш 2", minutes: 240, samples: 3143 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 102, zone_name: "Бакалея", minutes: 150, samples: 3202 },
  { wt_id: 6, wt_name: "Инвентаризация", zone_id: 112, zone_name: "Без зоны", minutes: 150, samples: 2964 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 108, zone_name: "Кондитерка, чай, кофе", minutes: 120, samples: 3031 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 109, zone_name: "Пиво, чипсы", minutes: 120, samples: 3169 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 110, zone_name: "Напитки б/а", minutes: 120, samples: 2861 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 130, zone_name: "FCMG, NF", minutes: 90, samples: 344 },
  { wt_id: 7, wt_name: "Другие работы", zone_id: 112, zone_name: "Без зоны", minutes: 90, samples: 1908 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 103, zone_name: "Заморозка", minutes: 75, samples: 2646 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 104, zone_name: "Бытовая химия", minutes: 75, samples: 2268 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 106, zone_name: "Алкоголь", minutes: 75, samples: 2671 },
  { wt_id: 5, wt_name: "Переоценка", zone_id: 112, zone_name: "Без зоны", minutes: 75, samples: 3396 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 105, zone_name: "NF", minutes: 60, samples: 1778 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 129, zone_name: "Прикассовая зона", minutes: 60, samples: 2551 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 131, zone_name: "FTG", minutes: 60, samples: 355 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 133, zone_name: "Товары для животных", minutes: 60, samples: 310 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 107, zone_name: "ЗОЖ", minutes: 30, samples: 2302 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 132, zone_name: "Рыбная гастрономия", minutes: 30, samples: 329 },
];
