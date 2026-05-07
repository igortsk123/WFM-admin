/**
 * Топ-N ЛАМА-магазинов для статических фильтр-опций в демо-UI
 * (employees-list, applications-list, goals-screen и др.).
 *
 * При нормальной интеграции с backend эти места должны переехать на
 * динамический `getStores()` через useEffect. Сейчас даём статичный
 * fallback с реальными именами/id вместо хардкода старых СПАР/Food City.
 */
import { REAL_LAMA_STORES } from "@/lib/mock-data/_lama-real";

interface DemoStoreOption {
  id: number;
  name: string;
}

/** Первые 7 LAMA-магазинов (sorted по shop_code ascending). */
export const DEMO_TOP_STORES: DemoStoreOption[] = REAL_LAMA_STORES.slice(0, 7).map((s) => ({
  id: s.id,
  name: s.name,
}));

/** ID самого «головного» магазина для дефолтов (С-12 Некрасова, 41 — наш демо-store). */
export const DEMO_PRIMARY_STORE_ID =
  REAL_LAMA_STORES.find((s) => s.external_code === "0120")?.id ?? REAL_LAMA_STORES[0].id;

export const DEMO_PRIMARY_STORE_NAME =
  REAL_LAMA_STORES.find((s) => s.external_code === "0120")?.name ?? REAL_LAMA_STORES[0].name;
