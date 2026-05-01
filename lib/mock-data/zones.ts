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
];
