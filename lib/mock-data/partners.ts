/**
 * @endpoint GET /api/partners
 *
 * Партнёр = клиент Beyond Violet (юридический контракт). Внутри партнёра
 * может быть несколько Organization (бренды/юрлица), несколько брендов магазинов.
 *
 * Текущие партнёры:
 *  - **Lama** (FMCG ритейл): orgs `org-spar`, `org-foodcity`. Бренды магазинов:
 *    SPAR, Abricos, Первоцвет. Города: Томск, Новосибирск, Северск, Кемерово.
 *  - **Левушка** (fashion ритейл): org `org-fashion-alfa`. Один бренд "Левушка".
 *  - **Техпроиздрав** (производство): org `org-fashion-alfa` (общий с fashion временно — есть workshop).
 *
 * При выборе партнёра в TopBar — UI фильтрует контекст ВЕЗДЕ:
 *   только магазины этого партнёра, только сотрудники, только задачи и т.д.
 */

import type { Locale } from "@/lib/types";

export type BusinessVertical = "FMCG_RETAIL" | "FASHION_RETAIL" | "PRODUCTION";

export interface Partner {
  id: string;
  name: string;
  business_vertical: BusinessVertical;
  /** Идентификаторы Organization из MOCK_ORGANIZATIONS */
  organization_ids: string[];
  /** Бренды магазинов (для UI группировки) */
  store_brands: string[];
  /** Города присутствия */
  cities: string[];
  default_locale: Locale;
}

export const MOCK_PARTNERS: Partner[] = [
  {
    id: "lama",
    name: "Lama",
    business_vertical: "FMCG_RETAIL",
    organization_ids: ["org-lama", "org-lama"],
    store_brands: ["SPAR", "Abricos", "Первоцвет"],
    cities: ["Томск", "Новосибирск", "Северск", "Кемерово"],
    default_locale: "ru",
  },
  {
    id: "levushka",
    name: "Левушка",
    business_vertical: "FASHION_RETAIL",
    organization_ids: ["org-levas"],
    store_brands: ["Левушка"],
    cities: ["Томск"],
    default_locale: "ru",
  },
  {
    id: "tehproizdrav",
    name: "Техпроиздрав",
    business_vertical: "PRODUCTION",
    organization_ids: ["org-levas"],
    store_brands: ["Швейный цех"],
    cities: ["Томск"],
    default_locale: "ru",
  },
];

/**
 * Default партнёр для текущей сессии — "lama".
 * Будет переопределяться через UI partner-switcher (отдельный V0-чат позже).
 */
export const DEFAULT_PARTNER_ID = "lama";
