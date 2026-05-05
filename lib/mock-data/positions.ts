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

export const MOCK_POSITIONS: PositionWithFunctionalRole[] = [
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
];
