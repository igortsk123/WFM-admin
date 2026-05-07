import type { Position } from "@/lib/types";

/**
 * @endpoint GET /api/positions
 * 6 formal HR positions used in chat-32 taxonomy screen.
 * role_id=1 → WORKER, role_id=2 → MANAGER.
 * functional_role_default — default functional role assigned to an employee
 * holding this position (can be overridden per employee card).
 */

export interface PositionWithFunctionalRole extends Position {
  /** Optional default functional role for employees in this position */
  functional_role_default?: string | null;
  /** Whether the position is active */
  is_active?: boolean;
}

const BASE_POSITIONS: PositionWithFunctionalRole[] = [
  {
    id: 1,
    code: "POS-UNIVERSAL",
    name: "Универсал",
    description: "Выполняет различные торговые и складские операции",
    role_id: 1,
    default_rank: 1,
    functional_role_default: "WORKER",
    is_active: true,
  },
  {
    id: 2,
    code: "POS-CASHIER",
    name: "Кассир",
    description: "Обслуживание покупателей на кассовых узлах",
    role_id: 1,
    default_rank: 1,
    functional_role_default: "WORKER",
    is_active: true,
  },
  {
    id: 3,
    code: "POS-SALES-CONSULTANT",
    name: "Продавец-консультант",
    description: "Консультирование покупателей и выкладка товара в торговом зале",
    role_id: 1,
    default_rank: 1,
    functional_role_default: "WORKER",
    is_active: true,
  },
  {
    id: 4,
    code: "POS-MERCHANDISER",
    name: "Мерчендайзер",
    description: "Обеспечение планограмм, выкладки и ценообразования",
    role_id: 1,
    default_rank: 1,
    functional_role_default: "OPERATOR",
    is_active: true,
  },
  {
    id: 5,
    code: "POS-MANAGER",
    name: "Директор магазина",
    description: "Оперативное управление магазином, распределение задач",
    role_id: 2,
    default_rank: 1,
    functional_role_default: "STORE_DIRECTOR",
    is_active: true,
  },
  {
    id: 6,
    code: "POS-SUPERVISOR",
    name: "Супервайзер",
    description: "Надзор за несколькими объектами, принятие управленческих решений",
    role_id: 2,
    default_rank: 1,
    functional_role_default: "SUPERVISOR",
    is_active: true,
  },

  // ═════════════════════════════════════════════════════════════════
  // ТехПродЗдрав — швейный цех. 9 production positions из Excel.
  // ═════════════════════════════════════════════════════════════════
  { id: 10, code: "POS-CUTTER", name: "Закройщик", description: "Раскрой ткани, осноровка деталей", role_id: 1, default_rank: 2, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 11, code: "POS-EMBROIDERER", name: "Вышивальщица", description: "Машинная вышивка по разметке", role_id: 1, default_rank: 2, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 12, code: "POS-COMPLECT", name: "Комплектовщица", description: "Сбор деталей по пачкам, маркировка", role_id: 1, default_rank: 1, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 13, code: "POS-SEAMSTRESS", name: "Швея", description: "Машинная шитьё на промышленных машинах", role_id: 1, default_rank: 3, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 14, code: "POS-HAND-SEWER", name: "Ручница", description: "Ручные операции: выворачивание, подрезка швов", role_id: 1, default_rank: 2, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 15, code: "POS-GLUE-OP", name: "Оператор клеевого станка", description: "Проклейка швов на клеевом станке", role_id: 1, default_rank: 3, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 16, code: "POS-DOSER-OP", name: "Оператор дозатора", description: "Наполнение модулей микросферой через дозатор", role_id: 1, default_rank: 3, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 17, code: "POS-BINDER", name: "Швея-окантовщица", description: "Окантовка готовых изделий трикотажной тесьмой", role_id: 1, default_rank: 3, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
  { id: 18, code: "POS-PACKER", name: "Упаковщик", description: "Финальная проверка качества и упаковка готовых изделий", role_id: 1, default_rank: 1, functional_role_default: "WORKER", is_active: true, org_id: "org-tehprod" },
];

import { REAL_LAMA_POSITIONS } from "./_lama-real";

export const MOCK_POSITIONS: PositionWithFunctionalRole[] = [
  ...BASE_POSITIONS,
  ...REAL_LAMA_POSITIONS,
];
