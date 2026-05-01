import type { Organization } from "@/lib/types";

/**
 * @endpoint GET /api/organizations
 * 3 organizations: FMCG SPAR (full feature set), FMCG Food City, Fashion Alfa (CLIENT_DIRECT / small business).
 */
export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: "org-spar",
    name: "СПАР Сибирь",
    type: "RETAIL",
    business_vertical: "FMCG_RETAIL",
    partner_id: "spar-sibir",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: true,
    payment_mode: "NOMINAL_ACCOUNT",
    external_hr_enabled: true,
  },
  {
    id: "org-foodcity",
    name: "Food City Томск",
    type: "RETAIL",
    business_vertical: "FMCG_RETAIL",
    partner_id: "foodcity-tomsk",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: true,
    payment_mode: "NOMINAL_ACCOUNT",
    external_hr_enabled: false,
  },
  {
    /**
     * Small business: CLIENT_DIRECT mode.
     * «Агенты» и «Реестр выплат» скрыты в этом тенанте.
     * Стоимость показывается справочно. Нет STORE_DIRECTOR — владелец сам (NETWORK_OPS).
     */
    id: "org-fashion-alfa",
    name: "Магазин одежды Альфа",
    type: "SMALL_BUSINESS",
    business_vertical: "FASHION_RETAIL",
    partner_id: "alfa-fashion",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: true,
    payment_mode: "CLIENT_DIRECT",
    external_hr_enabled: false,
  },
];
