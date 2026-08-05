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
  { wt_id: 2, wt_name: "Касса", zone_id: 112, zone_name: "Без зоны", minutes: 735, samples: 4387 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 111, zone_name: "ФРОВ", minutes: 540, samples: 4830 },
  { wt_id: 3, wt_name: "КСО", zone_id: 112, zone_name: "Без зоны", minutes: 480, samples: 3209 },
  { wt_id: 1, wt_name: "Менеджерские операции", zone_id: 112, zone_name: "Без зоны", minutes: 300, samples: 4639 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 101, zone_name: "Фреш 2", minutes: 240, samples: 4315 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 100, zone_name: "Фреш 1", minutes: 210, samples: 4803 },
  { wt_id: 6, wt_name: "Инвентаризация", zone_id: 112, zone_name: "Без зоны", minutes: 150, samples: 4155 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 102, zone_name: "Бакалея", minutes: 135, samples: 4460 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 108, zone_name: "Кондитерка, чай, кофе", minutes: 120, samples: 4184 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 109, zone_name: "Пиво, чипсы", minutes: 120, samples: 4413 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 110, zone_name: "Напитки б/а", minutes: 120, samples: 4018 },
  { wt_id: 7, wt_name: "Другие работы", zone_id: 112, zone_name: "Без зоны", minutes: 90, samples: 2716 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 103, zone_name: "Заморозка", minutes: 75, samples: 3666 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 104, zone_name: "Бытовая химия", minutes: 75, samples: 2268 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 106, zone_name: "Алкоголь", minutes: 75, samples: 3692 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 130, zone_name: "FCMG, NF", minutes: 75, samples: 1344 },
  { wt_id: 5, wt_name: "Переоценка", zone_id: 112, zone_name: "Без зоны", minutes: 75, samples: 4780 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 105, zone_name: "NF", minutes: 60, samples: 1778 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 129, zone_name: "Прикассовая зона", minutes: 60, samples: 3559 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 131, zone_name: "FTG", minutes: 45, samples: 1349 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 133, zone_name: "Товары для животных", minutes: 45, samples: 1218 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 107, zone_name: "ЗОЖ", minutes: 30, samples: 3232 },
  { wt_id: 4, wt_name: "Выкладка", zone_id: 132, zone_name: "Рыбная гастрономия", minutes: 30, samples: 1225 },
];
