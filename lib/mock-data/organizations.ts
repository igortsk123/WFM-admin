import type { Organization } from "@/lib/types";

/**
 * @endpoint GET /api/organizations
 *
 * Три партнёра-тенанта с **полностью изолированными мок-данными**:
 *
 * 1. **ЛАМА** (org-lama) — FMCG_RETAIL. Зонтичный холдинг, под ним бренды
 *    SPAR (~13 магазинов: Томск, Новосибирск, Северск) и Food City (3 магазина).
 *    Полный фичсет: AI, freelance, NOMINAL_ACCOUNT, external HR sync.
 * 2. **ТехПродЗдрав** (org-tehprod) — PRODUCTION. Производство (швейный цех).
 *    Конвейерные задачи: 1 продукт «Подушка 12-модульная», 32 операции по
 *    9 этапам (Крой → Вышивка → Модули → Клеевая → Микросфера → Сборка →
 *    Окантовка → Закрепка → Финиш). Источник данных: Excel «Производственные
 *    задачи v1.3» (07.05.2026).
 * 3. **Левас** (org-levas) — FASHION_RETAIL. Малый бизнес, 3 магазина.
 *    CLIENT_DIRECT mode (агенты и реестр выплат скрыты, владелец сам).
 *    Подходит для маленьких сетей одежды.
 *
 * При переключении контекста через OrgSwitcher все API-функции в `lib/api/`
 * фильтруют моки по `currentOrgId` (через AuthContext).
 */
export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: "org-lama",
    name: "ЛАМА",
    type: "RETAIL",
    business_vertical: "FMCG_RETAIL",
    partner_id: "lama-holding",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: true,
    payment_mode: "NOMINAL_ACCOUNT",
    external_hr_enabled: true,
  },
  {
    id: "org-tehprod",
    name: "ТехПродЗдрав",
    type: "PRODUCTION",
    business_vertical: "PRODUCTION",
    partner_id: "tehprod-zdrav",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: false,
    payment_mode: "CLIENT_DIRECT",
    external_hr_enabled: false,
  },
  {
    /**
     * Small business: CLIENT_DIRECT mode.
     * «Агенты» и «Реестр выплат» скрыты в этом тенанте.
     * Стоимость показывается справочно. Нет STORE_DIRECTOR — владелец сам (NETWORK_OPS).
     */
    id: "org-levas",
    name: "Левас",
    type: "SMALL_BUSINESS",
    business_vertical: "FASHION_RETAIL",
    partner_id: "levas-fashion",
    default_locale: "ru",
    default_timezone: "Asia/Tomsk",
    default_currency: "RUB",
    ai_module_enabled: true,
    freelance_module_enabled: true,
    payment_mode: "CLIENT_DIRECT",
    external_hr_enabled: false,
  },
];
