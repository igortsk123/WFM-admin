import type { Zone } from "@/lib/types";

/**
 * @endpoint GET /api/zones
 * 6 global zones (approved=true, store_id=null) + 2 store-specific for SPAR-TOM-001 (id=1).
 * The unapproved zone (id=8) is awaiting supervisor + network director approval.
 */
export const MOCK_ZONES: Zone[] = [
  // ── Глобальные зоны ──────────────────────────────────────────────
  {
    id: 1,
    name: "Торговый зал",
    code: "SALES_FLOOR",
    store_id: null,
    icon: "store",
    approved: true,
    approved_by: 3,
  },
  {
    id: 2,
    name: "Склад",
    code: "WAREHOUSE",
    store_id: null,
    icon: "warehouse",
    approved: true,
    approved_by: 3,
  },
  {
    id: 3,
    name: "Касса",
    code: "CASHIER",
    store_id: null,
    icon: "cash-register",
    approved: true,
    approved_by: 3,
  },
  {
    id: 4,
    name: "Самокассы",
    code: "SELF_CHECKOUT",
    store_id: null,
    icon: "scan-barcode",
    approved: true,
    approved_by: 3,
  },
  {
    id: 5,
    name: "Прикассовая зона",
    code: "CHECKOUT_AREA",
    store_id: null,
    icon: "shopping-cart",
    approved: true,
    approved_by: 3,
  },
  {
    id: 6,
    name: "Холодильники",
    code: "COLD_ROOM",
    store_id: null,
    icon: "thermometer-snowflake",
    approved: true,
    approved_by: 3,
  },

  // ── Локальные зоны SPAR-TOM-001 (store_id=1) ───────────────────
  {
    /** Одобрена — активна */
    id: 7,
    name: "Кофейная зона",
    code: "COFFEE_AREA",
    store_id: 1,
    icon: "coffee",
    approved: true,
    approved_by: 4,
  },
  {
    /** Ожидает согласования — от директора магазина принята, ждёт SUPERVISOR + NETWORK_OPS */
    id: 8,
    name: "Зона возвратов",
    code: "RETURNS_AREA",
    store_id: 1,
    icon: "undo-2",
    approved: false,
  },

  // ═════════════════════════════════════════════════════════════════
  // LAMA таксономия товарных зон (FMCG-партнёр Lama).
  // Используется в распределении задач и нормативах. IDs от 100,
  // чтобы не конфликтовать со старыми store-organisational зонами.
  // ═════════════════════════════════════════════════════════════════

  {
    id: 100,
    name: "Фреш 1",
    code: "FRESH_1",
    store_id: null,
    icon: "drumstick",
    approved: true,
    approved_by: 3,
  },
  {
    id: 101,
    name: "Фреш 2",
    code: "FRESH_2",
    store_id: null,
    icon: "milk",
    approved: true,
    approved_by: 3,
  },
  {
    id: 102,
    name: "Бакалея",
    code: "GROCERY",
    store_id: null,
    icon: "wheat",
    approved: true,
    approved_by: 3,
  },
  {
    id: 103,
    name: "Заморозка",
    code: "FROZEN",
    store_id: null,
    icon: "snowflake",
    approved: true,
    approved_by: 3,
  },
  {
    id: 104,
    name: "Бытовая химия",
    code: "HOUSEHOLD",
    store_id: null,
    icon: "spray-can",
    approved: true,
    approved_by: 3,
  },
  {
    id: 105,
    name: "Non-Food",
    code: "NF",
    store_id: null,
    icon: "package",
    approved: true,
    approved_by: 3,
  },
  {
    id: 106,
    name: "Алкоголь",
    code: "ALCOHOL",
    store_id: null,
    icon: "wine",
    approved: true,
    approved_by: 3,
  },
  {
    id: 107,
    name: "ЗОЖ",
    code: "HEALTHY",
    store_id: null,
    icon: "leaf",
    approved: true,
    approved_by: 3,
  },
  {
    id: 108,
    name: "Кондитерка, чай, кофе",
    code: "CONFECTIONERY",
    store_id: null,
    icon: "cookie",
    approved: true,
    approved_by: 3,
  },
  {
    id: 109,
    name: "Пиво, чипсы",
    code: "BEER_SNACKS",
    store_id: null,
    icon: "beer",
    approved: true,
    approved_by: 3,
  },
  {
    id: 110,
    name: "Напитки б/а",
    code: "SOFT_DRINKS",
    store_id: null,
    icon: "cup-soda",
    approved: true,
    approved_by: 3,
  },

  // ═════════════════════════════════════════════════════════════════
  // ТехПродЗдрав — производственные этапы швейного цеха.
  // 9 stages: Крой → Вышивка → Модули → Клеевая → Микросфера →
  // Сборка → Окантовка → Закрепка → Финиш.
  // Источник: Excel «Производственные задачи v1.3» (07.05.2026).
  // IDs от 200 чтобы не конфликтовать с FMCG-зонами.
  // ═════════════════════════════════════════════════════════════════
  { id: 200, name: "Крой", code: "PROD_CUTTING", store_id: null, icon: "scissors", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 201, name: "Вышивка", code: "PROD_EMBROIDERY", store_id: null, icon: "shapes", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 202, name: "Модули", code: "PROD_MODULES", store_id: null, icon: "package-2", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 203, name: "Клеевая", code: "PROD_GLUE", store_id: null, icon: "droplet", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 204, name: "Микросфера", code: "PROD_MICROSPHERE", store_id: null, icon: "circle-dot", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 205, name: "Сборка", code: "PROD_ASSEMBLY", store_id: null, icon: "blocks", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 206, name: "Окантовка", code: "PROD_BINDING", store_id: null, icon: "frame", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 207, name: "Закрепка", code: "PROD_FASTENING", store_id: null, icon: "anchor", approved: true, approved_by: 3, org_id: "org-tehprod" },
  { id: 208, name: "Финиш", code: "PROD_FINISH", store_id: null, icon: "package-check", approved: true, approved_by: 3, org_id: "org-tehprod" },
];
