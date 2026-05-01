/**
 * @endpoint GET /api/reports/compare
 * Cross-store comparison: 8 stores, completion_rate / return_rate / on_time_rate / FOT diff.
 * Sparklines: 7 data points (last 7 weeks).
 * Quadrant: leaders / growing / stable / declining.
 */

export type StoreQuadrant = "LEADERS" | "GROWING" | "STABLE" | "DECLINING";

export interface StoreComparisonRow {
  store_id: number;
  store_name: string;
  store_external_code: string;
  completion_rate: number;
  return_rate: number;
  on_time_rate: number;
  hours_diff_pct: number;
  fot_diff_pct: number;
  sparkline_completion: number[];
  sparkline_return: number[];
  quadrant: StoreQuadrant;
  rank: number;
}

export interface NetworkMedians {
  completion_rate: number;
  return_rate: number;
  on_time_rate: number;
  hours_diff_pct: number;
  fot_diff_pct: number;
}

export interface StoreCompareReport {
  period_start: string;
  period_end: string;
  stores: StoreComparisonRow[];
  network_medians: NetworkMedians;
}

const spark7 = (base: number, variance: number) =>
  Array.from({ length: 7 }, () =>
    Math.round((base + (Math.random() * variance * 2 - variance)) * 10) / 10
  );

const rows: Omit<StoreComparisonRow, "rank">[] = [
  // LEADERS (high completion + good trend)
  {
    store_id: 7,
    store_name: "Food City Томск Global Market, пр. Ленина 217",
    store_external_code: "FC-TOM-001",
    completion_rate: 93.8,
    return_rate: 3.4,
    on_time_rate: 96.2,
    hours_diff_pct: -1.8,
    fot_diff_pct: -2.1,
    sparkline_completion: spark7(93, 2.5),
    sparkline_return: spark7(3.4, 0.8),
    quadrant: "LEADERS",
  },
  {
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    store_external_code: "SPAR-TOM-001",
    completion_rate: 91.4,
    return_rate: 4.1,
    on_time_rate: 93.7,
    hours_diff_pct: -3.2,
    fot_diff_pct: -3.5,
    sparkline_completion: spark7(90, 3),
    sparkline_return: spark7(4.1, 0.9),
    quadrant: "LEADERS",
  },
  // GROWING (improving trend, below median)
  {
    store_id: 8,
    store_name: "Food City Томск, ул. Учебная 39",
    store_external_code: "FC-TOM-002",
    completion_rate: 88.7,
    return_rate: 5.2,
    on_time_rate: 90.4,
    hours_diff_pct: -0.9,
    fot_diff_pct: -1.2,
    sparkline_completion: [83.1, 84.5, 85.9, 86.8, 87.4, 88.1, 88.7],
    sparkline_return: [6.8, 6.5, 6.1, 5.8, 5.5, 5.3, 5.2],
    quadrant: "GROWING",
  },
  {
    store_id: 6,
    store_name: "СПАР Кемерово, пр. Советский 50",
    store_external_code: "SPAR-KEM-001",
    completion_rate: 86.3,
    return_rate: 5.8,
    on_time_rate: 89.1,
    hours_diff_pct: -1.4,
    fot_diff_pct: -1.7,
    sparkline_completion: [81.4, 82.7, 83.5, 84.1, 85.0, 85.8, 86.3],
    sparkline_return: [7.2, 7.0, 6.7, 6.4, 6.2, 5.9, 5.8],
    quadrant: "GROWING",
  },
  // STABLE (median range, flat trend)
  {
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    store_external_code: "SPAR-TOM-002",
    completion_rate: 87.1,
    return_rate: 5.5,
    on_time_rate: 88.9,
    hours_diff_pct: -2.1,
    fot_diff_pct: -2.4,
    sparkline_completion: spark7(87, 1.5),
    sparkline_return: spark7(5.5, 0.5),
    quadrant: "STABLE",
  },
  {
    store_id: 3,
    store_name: "СПАР Томск, пр. Фрунзе 92а",
    store_external_code: "SPAR-TOM-003",
    completion_rate: 85.9,
    return_rate: 6.1,
    on_time_rate: 87.3,
    hours_diff_pct: -4.1,
    fot_diff_pct: -4.3,
    sparkline_completion: spark7(86, 2),
    sparkline_return: spark7(6.1, 0.7),
    quadrant: "STABLE",
  },
  // DECLINING (below median, worsening trend)
  {
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    store_external_code: "SPAR-NSK-001",
    completion_rate: 82.6,
    return_rate: 7.4,
    on_time_rate: 84.9,
    hours_diff_pct: -5.8,
    fot_diff_pct: -6.1,
    sparkline_completion: [87.1, 86.3, 85.4, 84.7, 83.9, 83.2, 82.6],
    sparkline_return: [5.9, 6.2, 6.5, 6.8, 7.1, 7.3, 7.4],
    quadrant: "DECLINING",
  },
  {
    store_id: 5,
    store_name: "СПАР Новосибирск, Красный пр. 200",
    store_external_code: "SPAR-NSK-002",
    completion_rate: 80.1,
    return_rate: 7.9,
    on_time_rate: 83.4,
    hours_diff_pct: -7.3,
    fot_diff_pct: -7.8,
    sparkline_completion: [85.4, 84.7, 83.8, 82.6, 81.9, 81.1, 80.1],
    sparkline_return: [5.6, 6.1, 6.6, 7.1, 7.4, 7.7, 7.9],
    quadrant: "DECLINING",
  },
];

// Sort by completion_rate desc for rank
const sorted = [...rows].sort((a, b) => b.completion_rate - a.completion_rate);
const stores: StoreComparisonRow[] = sorted.map((s, i) => ({ ...s, rank: i + 1 }));

const vals = (key: keyof StoreComparisonRow): number[] =>
  stores.map((s) => s[key] as number);

const median = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export const MOCK_STORE_COMPARE: StoreCompareReport = {
  period_start: "2026-04-01",
  period_end: "2026-04-30",
  stores,
  network_medians: {
    completion_rate: median(vals("completion_rate")),
    return_rate: median(vals("return_rate")),
    on_time_rate: median(vals("on_time_rate")),
    hours_diff_pct: median(vals("hours_diff_pct")),
    fot_diff_pct: median(vals("fot_diff_pct")),
  },
};
