import type { Position } from "@/lib/types";

/**
 * @endpoint GET /api/positions
 * 8 formal HR positions. role_id=1 → WORKER, role_id=2 → manager (Supervisor / Director).
 */
export const MOCK_POSITIONS: Position[] = [
  {
    id: 1,
    code: "POS-UNIVERSAL",
    name: "Универсал",
    description: "Выполняет различные торговые и складские операции",
    role_id: 1,
    default_rank: 1,
  },
  {
    id: 2,
    code: "POS-CASHIER",
    name: "Кассир",
    description: "Обслуживание покупателей на кассовых узлах",
    role_id: 1,
    default_rank: 1,
  },
  {
    id: 3,
    code: "POS-SENIOR-CASHIER",
    name: "Старший кассир",
    description: "Кассир с повышенными полномочиями и функцией наставничества",
    role_id: 1,
    default_rank: 2,
  },
  {
    id: 4,
    code: "POS-SALES-CONSULTANT",
    name: "Продавец-консультант",
    description: "Консультирование покупателей и выкладка товара в торговом зале",
    role_id: 1,
    default_rank: 1,
  },
  {
    id: 5,
    code: "POS-WAREHOUSE",
    name: "Кладовщик",
    description: "Приём, хранение и отпуск товарно-материальных ценностей",
    role_id: 1,
    default_rank: 1,
  },
  {
    id: 6,
    code: "POS-MERCHANDISER",
    name: "Мерчендайзер",
    description: "Обеспечение планограмм, выкладки и ценообразования",
    role_id: 1,
    default_rank: 1,
  },
  {
    id: 7,
    code: "POS-MANAGER",
    name: "Директор магазина",
    description: "Оперативное управление магазином, распределение задач",
    role_id: 2,
    default_rank: 1,
  },
  {
    id: 8,
    code: "POS-SUPERVISOR",
    name: "Супервайзер",
    description: "Надзор за несколькими объектами, принятие управленческих решений",
    role_id: 2,
    default_rank: 1,
  },
];
