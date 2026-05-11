// ═══════════════════════════════════════════════════════════════════
// LOCALE
// ═══════════════════════════════════════════════════════════════════

export type Locale = "ru" | "en";

// ═══════════════════════════════════════════════════════════════════
// CORE ENUMS
// ═══════════════════════════════════════════════════════════════════

export type TaskState = "NEW" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";

export type TaskReviewState = "NONE" | "ON_REVIEW" | "ACCEPTED" | "REJECTED";

/** BONUS — задачи на 10% KPI */
export type TaskType = "PLANNED" | "BONUS";

/** SINGLE — обычная, CHAIN — задача в конвейере (производство, передача) */
export type TaskKind = "SINGLE" | "CHAIN";

export type AcceptancePolicy = "AUTO" | "MANUAL";

export type ShiftStatus = "NEW" | "OPENED" | "CLOSED";

/** Тип объекта (магазин/цех/отдел/офис/распределительный центр) — экран один, отличается label */
export type ObjectType =
  | "STORE"
  | "WORKSHOP"
  | "DEPARTMENT"
  | "OFFICE"
  | "WAREHOUSE_HUB";

/**
 * Privileges работника. Backend: CASHIER, SALES_FLOOR, SELF_CHECKOUT, WAREHOUSE.
 * PRODUCTION_LINE — @admin-extension для multi-tenant ТехПродЗдрав (швейный цех).
 * Backend дотянет когда добавится не-ритейл клиент.
 */
export type Permission =
  | "CASHIER"
  | "SALES_FLOOR"
  | "SELF_CHECKOUT"
  | "WAREHOUSE"
  /** @admin-only — для производственных клиентов; backend пока не отдаёт. */
  | "PRODUCTION_LINE";

/** 1=worker, 2=manager в БД */
export type DbRoleId = 1 | 2;

/**
 * UI-сценарная sub-role; все non-WORKER → role_id=2.
 * AGENT — внешняя роль (видит только свой кабинет на /agent).
 * PLATFORM_ADMIN — наш staff (Beyond Violet), cross-tenant, меняет договорные настройки организации.
 */
export type FunctionalRole =
  | "STORE_DIRECTOR"
  | "SUPERVISOR"
  | "REGIONAL"
  | "NETWORK_OPS"
  | "HR_MANAGER"
  | "OPERATOR"
  | "WORKER"
  | "AGENT"
  | "PLATFORM_ADMIN";

/** STAFF=штатный, FREELANCE=внештатный (документы обязательны) */
export type EmployeeType = "STAFF" | "FREELANCE";

/**
 * FREELANCE_APPLICATION_PENDING — заявка на согласование
 * FREELANCE_BUDGET_OVERLIMIT — перерасход
 * FREELANCE_NO_TASKS — внештат согласован но задач не назначено
 * FREELANCE_SERVICE_NOT_CONFIRMED — директор не подтвердил услугу в конце дня
 * FREELANCE_NO_SHOW — невыход
 * FREELANCE_EXTERNAL_SYNC — пришли заявки из внешней HR
 * FREELANCE_PAYOUT_DONE — выплата исполнителю прошла
 */
export type NotificationCategory =
  | "TASK_REVIEW"
  | "TASK_REJECTED"
  | "TASK_STATE_CHANGED"
  | "BONUS_AVAILABLE"
  | "GOAL_UPDATE"
  | "AI_SUGGESTION_NEW"
  | "AI_ANOMALY"
  | "FREELANCE_APPLICATION_PENDING"
  | "FREELANCE_BUDGET_OVERLIMIT"
  | "FREELANCE_NO_TASKS"
  | "FREELANCE_SERVICE_NOT_CONFIRMED"
  | "FREELANCE_NO_SHOW"
  | "FREELANCE_EXTERNAL_SYNC"
  | "FREELANCE_PAYOUT_DONE"
  | "GENERIC";

/** Подзадачи (ранее operations) — статус модерации */
/** Совпадает с backend OperationReviewState. */
export type OperationReviewState = "PENDING" | "ACCEPTED" | "REJECTED";
/** @deprecated Используй OperationReviewState (совпадает с backend). */
export type SubtaskReviewState = OperationReviewState;

export type ArchiveReason =
  | "CLOSED"
  | "DUPLICATE"
  | "WRONG_DATA"
  | "OBSOLETE"
  | "OTHER";

/** CUSTOM — для произвольных целей под любую вертикаль (fashion, production) */
export type GoalCategory =
  | "OOS_REDUCTION"
  | "WRITE_OFFS"
  | "PROMO_QUALITY"
  | "PRICE_ACCURACY"
  | "IMPULSE_ZONES"
  | "PRODUCTIVITY"
  | "CUSTOM";

export type GoalStatus = "PROPOSED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

/**
 * Источник создания задачи:
 * MANAGER — создал менеджер руками
 * AI — предложил ИИ (приняли)
 * PLANNED — плановая (из настройки системы / планировщика)
 */
export type TaskSource = "MANAGER" | "AI" | "PLANNED";

export type AISuggestionType =
  | "TASK_SUGGESTION"
  | "GOAL_SUGGESTION"
  | "BONUS_TASK_SUGGESTION"
  | "INSIGHT";

export type AISuggestionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EDITED";

export type AISuggestionPriority = "high" | "medium" | "low";

export type AIChatContextType =
  | "general"
  | "suggestion"
  | "goal"
  | "task"
  | "chart";

export type AIChatRole = "user" | "assistant";

/**
 * PLANNER — generic коннектор расписания/смен/задач
 * (для текущего клиента SPAR это LAMA-инстанс, для других может быть Verme / Kronos / собственный)
 */
export type DataConnectorType =
  | "POS"
  | "INVENTORY"
  | "SUPPLY"
  | "PROMO"
  | "MARKETING_CHANNEL"
  | "UNIVERSAL"
  | "PLANNER"
  | "EXCEL"
  | "WEBHOOKS"
  | "PUBLIC_API";

export type DataConnectorStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "ACTIVE"
  | "DEGRADED"
  | "DISCONNECTED";

/**
 * Вертикаль = что за бизнес.
 * Размер компании отдельно: Organization.type ('RETAIL' / 'PRODUCTION' / 'SMALL_BUSINESS').
 * Малый бизнес может быть FMCG_RETAIL или FASHION_RETAIL — не путать вертикаль с размером.
 */
export type BusinessVertical =
  | "FMCG_RETAIL"
  | "FASHION_RETAIL"
  | "PRODUCTION"
  | "OTHER";

// ═══════════════════════════════════════════════════════════════════
// FREELANCE MODULE ENUMS
// ═══════════════════════════════════════════════════════════════════

/** INTERNAL — заявку создали в нашей админке; EXTERNAL — пришла синхронизацией из HR-системы клиента */
export type ApplicationSource = "INTERNAL" | "EXTERNAL";

/**
 * MIXED = часть внештат + часть бонусом
 * REPLACED_WITH_BONUS = вся заявка ушла в бонусный пул
 */
export type ApplicationStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED_FULL"
  | "APPROVED_PARTIAL"
  | "REJECTED"
  | "REPLACED_WITH_BONUS"
  | "MIXED"
  | "CANCELLED";

/**
 * Настройка организации:
 * NOMINAL_ACCOUNT — платим через сервис «Номинальный счёт» (полный финансовый контур + агенты)
 * CLIENT_DIRECT — клиент платит сам, у нас только управленческий контур
 */
export type PaymentMode = "NOMINAL_ACCOUNT" | "CLIENT_DIRECT";

/** Статус внештатного исполнителя. ACTIVE — допущен к работе и оферта подписана */
export type FreelancerStatus =
  | "NEW"
  | "VERIFICATION"
  | "ACTIVE"
  | "BLOCKED"
  | "ARCHIVED";

/**
 * Жизненный цикл оказанной услуги:
 * CONFIRMED — директор подтвердил в мобиле
 * READY_TO_PAY — попала в реестр выплат
 * PAID — деньги ушли
 * NO_SHOW — исполнитель не вышел
 */
export type ServiceStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CONFIRMED"
  | "READY_TO_PAY"
  | "PAID"
  | "NO_SHOW"
  | "DISPUTED";

/** Статус выплаты в реестре (NOMINAL_ACCOUNT режим) */
export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

export type AgentStatus = "ACTIVE" | "BLOCKED" | "ARCHIVED";

/** Используется в BudgetLimit и BudgetUsage */
export type BudgetPeriod = "DAY" | "WEEK" | "MONTH";

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

/**
 * User interface.
 * email — для Email magic link auth (опционально)
 * preferred_locale/timezone — настройка профиля
 * totp_enabled — включён ли TOTP
 * freelancer_status / agent_id / oferta_accepted_at / source — релевантны только для type='FREELANCE'
 * source — как заведён исполнитель (руками или из внешней HR)
 * rating — общий рейтинг (для STAFF и FREELANCE), агенту НЕ показывается
 */
/**
 * User. Совпадает с backend `UserResponse` по основным полям.
 * Admin-extensions (помечены `@admin-extension`):
 *  - phone/email/first_name/etc. — backend отдаёт в /users/me, в /users/{id} нет (надо дописать)
 *  - type, freelancer_status, agent_id, oferta_accepted_at, rating, source — модуль внештата
 *  - hired_at, archived/archive_reason — admin profile fields
 *  - avatar_url — backend отдаёт photo_url в /users/me, в /users/{id} нет
 */
export interface User {
  id: number;
  sso_id: string;
  phone: string;
  email?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string;
  /** @admin-extension: backend отдаёт photo_url только в /users/me. */
  avatar_url?: string;
  /** @admin-extension: STAFF|FREELANCE — backend пока знает только employee_type. */
  type: EmployeeType;
  /** @admin-extension: для счётчика стажа в карточке. */
  hired_at?: string;
  /** @admin-extension: backend не различает archived. */
  archived: boolean;
  archive_reason?: ArchiveReason;
  /** @admin-extension. */
  preferred_locale?: Locale;
  preferred_timezone?: string;
  totp_enabled?: boolean;
  /** @admin-extension: модуль внештата. */
  freelancer_status?: FreelancerStatus;
  /** @admin-extension: модуль внештата (агентство). */
  agent_id?: string | null;
  /** @admin-extension: модуль внештата (оферта). */
  oferta_accepted_at?: string | null;
  /** @admin-extension: рейтинг для распределения задач. */
  rating?: number;
  /** @admin-extension: HR-sync source. */
  source?: "MANUAL" | "EXTERNAL_SYNC";
  /** Внешний ID из LAMA (employee_id из их БД). Backend имеет (external_id в UserResponse). */
  external_id?: number;
  /**
   * @admin-extension Ручная корректировка типов работ директором.
   *
   * По умолчанию `work_types` сотрудника автоматически выводится из истории
   * (`LAMA_EMPLOYEE_WORK_TYPES[user.id]`). Директор в карточке сотрудника
   * (`/employees/{id}` вкладка «Типы») может перепроставить галочки —
   * результат сохраняется сюда и переопределяет авто-derive.
   *
   * Используется алгоритмом распределения (`autoDistribute`) через
   * `EmployeeUtilization.user.work_types` (см. `lib/api/distribution.ts`).
   * Backend пока не отдаёт — admin-only поле. См. MIGRATION-NOTES.md.
   */
  preferred_work_types?: string[];
}

/**
 * ФОРМАЛЬНАЯ должность из штатки.
 * Совпадает с backend `PositionResponse` (id, code, name, description, role).
 * Admin-extensions: default_rank, org_id (multi-tenant).
 */
export interface Position {
  id: number;
  code: string;
  name: string;
  description?: string;
  role_id: DbRoleId;
  /** @admin-extension: дефолтный разряд при создании сотрудника. */
  default_rank?: number;
  /** @admin-extension: multi-tenant scope. */
  org_id?: string;
}

/**
 * ФУНКЦИОНАЛЬНАЯ роль и scope.
 * scope_ids — числа для STORE/STORE_LIST (store.id), строки для ORGANIZATION (organization.id) и REGION (region code).
 * Для PLATFORM_ADMIN — пустой массив (cross-tenant) или массив organization.id если ограничен подмножеством.
 */
export interface FunctionalRoleAssignment {
  id: number;
  user_id: number;
  functional_role: FunctionalRole;
  scope_type: "STORE" | "STORE_LIST" | "REGION" | "ORGANIZATION";
  scope_ids: Array<number | string>;
}

export interface Assignment {
  id: number;
  user_id: number;
  position_id: number;
  position_name: string;
  store_id: number;
  store_name: string;
  rank: {
    id: number;
    code: string;
    name: string;
  };
  external_id?: string;
  active: boolean;
}

export interface WorkerPermission {
  id: number;
  user_id: number;
  permission: Permission;
  granted_at: string;
  granted_by_name: string;
  revoked_at?: string;
  revoked_by_name?: string;
}

/**
 * Юр.лица внутри организации (для retail-сетей с несколькими ИП).
 * Поля inn/kpp/ogrn — для tax_jurisdiction='RU'
 * companies_house/vat_number — для 'UK'
 */
export interface LegalEntity {
  id: number;
  name: string;
  organization_id: string;
  tax_jurisdiction: "RU" | "UK" | "OTHER";
  inn?: string;
  kpp?: string | null;
  ogrn?: string;
  companies_house?: string;
  vat_number?: string;
  /** LAMA: internal_company.code (часто = INN, но отдельный учётный код). */
  code?: string;
  /** ID в 1C ERP, null если не реплицируется. */
  rec_id?: string | null;
}

export type ObjectFormat =
  | "SUPERMARKET"
  | "HYPERMARKET"
  | "CONVENIENCE"
  | "SMALL_SHOP"
  | "SEWING_WORKSHOP"
  | "PRODUCTION_LINE"
  | "WAREHOUSE_HUB"
  | "OFFICE";

/**
 * object_type — тип объекта (STORE/WORKSHOP/DEPARTMENT/OFFICE), один и тот же UI экран.
 * organization_id — прямая связь с организацией (помимо legal_entity_id),
 * чтобы фильтрация по тенанту не зависела от вычислений через legal_entity.
 * object_format — формат объекта (нужен для маппинга на ServiceNorm в модуле внештата)
 */
/**
 * Store. Backend отдаёт минимум {id, name, address, external_code, created_at}
 * в /users/stores. Admin использует много extras — backend дотянет.
 *
 * Совпадение с backend StoreResponse: id, name, address, external_code.
 * Admin-extensions: organization_id, legal_entity_id, manager_id, supervisor_id,
 * object_type/object_format/format_shop_name, geo, lama_*, internal_company.
 */
export interface Store {
  id: number;
  name: string;
  external_code: string;
  address: string;
  /** @admin-extension: backend не возвращает (admin UI metadata). */
  city?: string;
  /** @admin-extension: legacy. Используй object_format / format_shop_name. */
  store_type?: string;
  /** @admin-extension: backend не различает (всегда STORE). */
  object_type: ObjectType;
  /** @admin-extension: multi-tenant scoping (admin invent). */
  organization_id: string;
  /** @admin-extension: FK на user (директор магазина). */
  manager_id?: number;
  /** @admin-extension: FK на user (супервайзер). */
  supervisor_id?: number;
  /** @admin-extension: для региональной отчётности. */
  region?: string;
  /** @admin-extension: backend не имеет таблицы legal_entity. */
  legal_entity_id: number;
  /** Полный объект юрлица (зеркалит LAMA /shops/.internal_company). */
  internal_company?: LegalEntity;
  /** Сырое название формата как в LAMA: «Гипермаркет», «Универсам», «Дискаунтер». */
  format_shop_name?: string;
  /** Время работы магазина HH:MM:SS. */
  time_start?: string;
  time_end?: string;
  /** Код склада в 1C (storage_code в LAMA). */
  storage_code?: string;
  /** Магазин в составе сети (in_group в LAMA). */
  in_group?: boolean;
  /** rec_id магазина в 1C ERP. */
  lama_rec_id?: number;
  lama_synced_at?: string;
  active: boolean;
  archived: boolean;
  archive_reason?: ArchiveReason;
  geo?: {
    lat: number;
    lng: number;
  };
  object_format?: ObjectFormat;
}

/** store_id=null → глобальная; локальная ждёт approve от supervisor + main director */
export interface Zone {
  id: number;
  name: string;
  code: string;
  store_id?: number | null;
  icon: string;
  approved: boolean;
  approved_by?: number;
  /** Multi-tenant scope: организация-владелец. Опционально для backward compat. */
  org_id?: string;
  /** ID зоны в реальной LAMA БД (1-32). Используется для матчинга operations/hints из LAMA. */
  lama_z_id?: number;
}

/** group вместо category — НЕ путать с категорией товара */
export interface WorkType {
  id: number;
  code: string;
  name: string;
  description?: string;
  group: string;
  default_duration_min: number;
  requires_photo_default: boolean;
  requires_report_default: boolean;
  acceptance_policy_default: AcceptancePolicy;
  allow_new_subtasks: boolean;
  hints_count: number;
  /**
   * Дефолтный приоритет задачи этого типа (1-100, по соглашению LAMA):
   *   1   — критичные операции (КСО, Касса, Менеджерские)
   *   2-13 — выкладка по зонам (раздаётся вручную при создании)
   *   100 — другие работы (низший приоритет, в самом низу очереди)
   * Используется UI как стартовое значение в Task Form.
   */
  default_priority?: number;
  /** Multi-tenant scope: организация-владелец. Опционально для backward compat. */
  org_id?: string;
}

export interface Hint {
  id: number;
  work_type_id: number;
  zone_id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface TaskHistoryBrief {
  opened_at?: string;
  paused_intervals: Array<{ from: string; to: string }>;
  completed_at?: string;
  work_intervals: Array<{ from: string; to: string }>;
  transferred_at?: string;
  transferred_to?: number;
}

/**
 * Task interface.
 * id — UUID (string).
 * assignee_id, creator_id, store_id, zone_id, work_type_id — internal int (number).
 *
 * Совпадает с backend `TaskResponse` (svc_tasks/api/tasks.py) по основным полям.
 * Admin-extensions (помечены `@admin-extension` в JSDoc полей):
 *  - goal_id, bonus_points, marketing_channel_target — модуль целей/бонусов
 *  - freelance_application_id/assignment_id, service_id — модуль внештата
 *  - ai_suggestion_id — модуль AI
 *  - history_brief.transferred_* — admin transfer flow
 *  - kind: CHAIN — admin цепочки задач (backend пока только SINGLE)
 *  - is_overdue, editable_by_store — UI-helpers
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  /** @admin-extension: SINGLE|CHAIN. Backend пока только SINGLE. */
  kind: TaskKind;
  /** @admin-extension: WFM|LAMA|MANAGER|AI|PLANNED. Backend пока возвращает строку source. */
  source: TaskSource;
  /** @admin-extension: ссылка на AI suggestion если source=AI. */
  ai_suggestion_id?: string | null;
  planned_minutes: number;
  store_id: number;
  store_name: string;
  zone_id: number;
  zone_name: string;
  work_type_id: number;
  work_type_name: string;
  product_category_id?: number | null;
  product_category_name?: string | null;
  creator_id: number;
  creator_name: string;
  assignee_id?: number | null;
  assignee_name?: string | null;
  /** Задача может быть назначена на зону (permission) вместо конкретного исполнителя */
  assigned_to_permission?: Permission | null;
  /** @admin-extension: следующий исполнитель в цепочке (kind=CHAIN). */
  next_assignee_id?: number | null;
  next_assignee_name?: string | null;
  /** @admin-extension: позиция в цепочке (1, 2, 3...). */
  chain_position?: number;
  state: TaskState;
  review_state: TaskReviewState;
  acceptance_policy: AcceptancePolicy;
  requires_photo: boolean;
  /** @admin-extension: override на уровне задачи. */
  requires_photo_override?: boolean;
  comment?: string;
  review_comment?: string;
  report_text?: string;
  report_image_url?: string;
  time_start?: string;
  time_end?: string;
  /** @admin-extension: backend не различает archived. */
  archived: boolean;
  /** @admin-extension: причина архивации. */
  archive_reason?: ArchiveReason;
  /** @admin-extension. */
  archived_at?: string;
  /** @admin-extension. */
  archived_by?: number;
  /** Краткая история: когда открыта, интервалы пауз, когда завершена.
   *  Backend отдаёт похожую history_brief, но без transferred_*. */
  history_brief?: TaskHistoryBrief;
  /** @admin-extension: модуль целей. */
  goal_id?: string | null;
  /** @admin-extension: модуль бонусов. */
  bonus_points?: number | null;
  /** @admin-extension: для fashion-сегмента. */
  marketing_channel_target?: string | null;
  /** @admin-extension: модуль внештата. */
  freelance_application_id?: string | null;
  /** @admin-extension: модуль внештата. */
  freelance_assignment_id?: string | null;
  /** @admin-extension: модуль внештата (services). */
  service_id?: string | null;
  /** @admin-extension: server-computed на нашей стороне (backend пока не считает). */
  is_overdue?: boolean;
  /**
   * Приоритет 1-100 (LAMA-стандарт):
   *   1   — критичные операции (КСО, Касса, Менеджерские)
   *   2-13 — выкладка/переоценка/инвентаризация по зонам
   *   100 — другие работы
   * UI distribution-page сортирует по этому полю по умолчанию.
   */
  priority?: number;
  /**
   * Может ли STORE_DIRECTOR редактировать эту задачу.
   * false для задач спущенных сверху (создатель ≥ SUPERVISOR) — директор только распределяет.
   * true для задач созданных самим директором.
   * Подзадачи директор может ДОБАВЛЯТЬ всегда (см. canAddSubtask в task-detail).
   */
  editable_by_store?: boolean;
  /** ID смены (FK на Shift.id), к которой задача привязана. LAMA возвращает per shift_id. */
  shift_id?: number;
  /** Внешний ID из LAMA (api task id). Используется для sync с прод-источником. */
  external_id?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskEvent {
  id: number;
  task_id: string;
  event_type:
    | "START"
    | "PAUSE"
    | "RESUME"
    | "COMPLETE"
    | "SEND_TO_REVIEW"
    | "AUTO_ACCEPT"
    | "ACCEPT"
    | "REJECT"
    | "TRANSFER"
    | "ARCHIVE"
    | "RESTORE";
  actor_id: number;
  actor_name: string;
  actor_role: FunctionalRole;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/**
 * Источник предложения подзадачи (для review_state='PENDING'):
 *   - worker — сотрудник предложил при выполнении (только work_type='Другие работы')
 *   - store_director — управляющий магазина из task-detail предложил отредактировать
 */
/** Совпадает с backend (предлагает worker, утверждает store_director). */
export type OperationSuggestionSource = "worker" | "store_director";
/** @deprecated Используй OperationSuggestionSource. */
export type SubtaskSuggestionSource = OperationSuggestionSource;

/**
 * UnassignedTaskBlock — блок задач от LAMA, ожидающий распределения.
 *
 * Из LAMA приходит так: «Выкладка / Алкоголь / 8 часов на магазин».
 * Это не одна задача на одного сотрудника, а сводка трудозатрат
 * на пару (work_type, zone) которую директор/ИИ должен лопнуть на
 * конкретные Task'и для конкретных сотрудников.
 *
 * После распределения:
 *   - блок становится `is_distributed: true`
 *   - в MOCK_TASKS появляются N новых Task с assignee_id'ами
 *   - distributed_minutes растёт, remaining_minutes падает
 *
 * Backend пока не имеет такого endpoint'а. Admin-only концепция,
 * нужно дописать на backend сервисе LAMA-sync чтобы возвращал
 * блоки до их раскладки. См. MIGRATION-NOTES.md.
 */
export interface UnassignedTaskBlock {
  id: string;
  store_id: number;
  store_name: string;
  /** Дата на которую этот блок (yyyy-MM-dd). */
  date: string;
  work_type_id: number;
  work_type_name: string;
  zone_id: number;
  zone_name: string;
  /** Опционально — категория товара. */
  product_category_id?: number | null;
  product_category_name?: string | null;
  /** Заголовок блока, например «Выкладка: Алкоголь». */
  title: string;
  /** Общее запланированное время в минутах (от LAMA). */
  total_minutes: number;
  /** Уже распределено (сумма minutes из всех allocations). */
  distributed_minutes: number;
  /** total_minutes - distributed_minutes. */
  remaining_minutes: number;
  /** Приоритет 1-100 (LAMA-стандарт). */
  priority?: number;
  /** Откуда блок: LAMA-выгрузка / директор вручную / ИИ-предложение. */
  source: "LAMA" | "MANAGER" | "AI";
  /** Время создания/прихода блока. */
  created_at: string;
  /** Все ли минуты распределены. */
  is_distributed: boolean;
  /** ID конкретных Task'ов которые получились после распределения этого блока. */
  spawned_task_ids: string[];
}

/**
 * Operation — шаг выполнения внутри задачи.
 * Совпадает с backend `Operation` (svc_tasks/api/operations.py).
 *
 * Admin-extensions поверх backend-полей:
 *   - hints_count: int — UI badge (backend пока не отдаёт)
 *   - duration_min: optional — оценка времени для UX
 *   - order: int — UI sort
 *   - suggestion_source/suggested_by_*: модерация PENDING (backend через
 *     POST /tasks/{id}/complete + new_operations[])
 */
export interface Operation {
  id: number;
  task_id: string;
  name: string;
  review_state: OperationReviewState;
  /** @admin-extension: счётчик подсказок для UI badge. */
  hints_count: number;
  /** @admin-extension: оценка длительности (минуты). */
  duration_min?: number;
  /** @admin-extension: порядок в UI. */
  order: number;
  /** @admin-extension: модерация PENDING — кто предложил. */
  suggestion_source?: OperationSuggestionSource;
  suggested_by_user_id?: number;
  suggested_by_user_name?: string;
}

/** @deprecated Используй Operation (совпадает с backend терминологией). */
export type Subtask = Operation;

/**
 * Shift interface.
 * ВАЖНО: id, plan_id — number (int в backend, не UUID).
 * Не путать с Task.id (UUID = string).
 */
/**
 * Тип смены:
 *   REGULAR     — штатная смена в родном магазине сотрудника
 *   SUBSTITUTE  — подработка: тот же STAFF в свой выходной вышел в другой магазин
 *                 того же юрлица. Должность не меняется, ЗП по штатному расписанию.
 *                 На циклограмме / pie chart канал закрытия = PART_TIME.
 */
export type ShiftKind = "REGULAR" | "SUBSTITUTE";

export interface Shift {
  id: number;
  plan_id: number;
  status: ShiftStatus;
  user_id: number;
  user_name: string;
  store_id: number;
  store_name: string;
  zone_id?: number;
  zone_name?: string;
  shift_date: string;
  planned_start: string;
  planned_end: string;
  actual_start?: string;
  actual_end?: string;
  late_minutes: number;
  overtime_minutes: number;
  /** Default REGULAR. SUBSTITUTE = подработка в другом магазине в выходной. */
  shift_kind?: ShiftKind;
  /** Если shift_kind=SUBSTITUTE — id «родного» магазина сотрудника. Optional для REGULAR. */
  home_store_id?: number;
}

export interface Notification {
  id: string;
  user_id: number;
  category: NotificationCategory;
  /**
   * RU-литерал по умолчанию. `title_en`/`body_en` — опциональные EN-переводы
   * для bilingual demo. UI выбирает текст через `pickLocalized(title, title_en, locale)`.
   */
  title: string;
  body: string;
  title_en?: string;
  body_en?: string;
  data: Record<string, unknown>;
  link?: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  occurred_at: string;
  actor: {
    id: number;
    name: string;
    avatar_url?: string;
    role: FunctionalRole;
    email?: string;
  };
  action: string;
  action_label: string;
  /** Опциональный EN-перевод `action_label` для bilingual demo. */
  action_label_en?: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  /** Опциональный EN-перевод `entity_name` для bilingual demo (если сущность синтетическая). */
  entity_name_en?: string;
  entity_url?: string;
  payload: Record<string, unknown>;
  diff?: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
  ip_address?: string;
  user_agent?: string;
  device_type?: "desktop" | "mobile" | "tablet";
  /** PLATFORM_ADMIN action affecting multiple tenants — для cross-tenant audit. */
  platform_action?: boolean;
  /** Метод аутентификации (для login событий): "phone_otp.telegram", "totp.authenticator" и т.д. */
  login_method?: string;
}

/**
 * Organization interface.
 * business_vertical — conditional UI
 * ai_module_enabled — флаг AI-аддона
 * freelance_module_enabled — флаг модуля внештата (если false — раздел внештата скрыт целиком)
 * payment_mode — как платим исполнителям (NOMINAL_ACCOUNT / CLIENT_DIRECT), меняется только PLATFORM_ADMIN
 * external_hr_enabled — включена ли синхронизация заявок из внешней HR-системы клиента
 */
export interface Organization {
  id: string;
  name: string;
  type: "RETAIL" | "PRODUCTION" | "SMALL_BUSINESS";
  business_vertical: BusinessVertical;
  partner_id?: string;
  default_locale: Locale;
  default_timezone: string;
  default_currency: "RUB" | "GBP" | "USD";
  ai_module_enabled: boolean;
  freelance_module_enabled: boolean;
  payment_mode: PaymentMode;
  external_hr_enabled: boolean;
}

/** 53 категории товаров из LAMA — для тегирования задач, НЕ путать с group в WorkType */
export interface ProductCategory {
  id: number;
  code: string;
  name: string;
  /** LAMA-зона (id из MOCK_ZONES, 100+). Optional — старые категории без привязки. */
  zone_id?: number;
  /** Multi-tenant scope: организация-владелец. Опционально для backward compat. */
  org_id?: string;
}

/** Направление метрики цели — растущая (увеличение good) или убывающая (снижение good). */
export type GoalDirection = "increase" | "decrease";

/**
 * Источник AI-сигнала, на основании которого создана цель / proposal.
 *
 * Прозрачность: директор должен видеть, ОТКУДА AI взял основание для цели.
 * 3 главных источника + смешанный режим:
 *
 * - `pos-cheque`       — анализ POS-чеков (anomaly detection, basket analysis,
 *                        RFM cohorts, time-series gaps по SKU/категории)
 * - `erp-stock`        — движения в ERP: остатки, приёмки, сроки годности
 * - `erp-price-master` — расхождение ERP master-цены и POS-цены на чеке
 * - `photo-bonus`      — фото от сотрудника через бонусную задачу
 *                        (crowdsourced shelf monitoring, паттерн Trax/Pensa
 *                        но дешевле: камеру не ставим, сотрудник снимает)
 * - `wfm-schedule`     — график смен vs пики продаж (covered slots vs traffic)
 * - `egais`            — ЕГАИС / Честный знак / маркировка
 * - `mixed`            — несколько источников одновременно
 *
 * Используется в `Goal.ai_signal_source` и `AIEvidenceItem.source`.
 */
export type AISignalSource =
  | "pos-cheque"
  | "erp-stock"
  | "erp-price-master"
  | "photo-bonus"
  | "wfm-schedule"
  | "egais"
  | "mixed";

/**
 * Конкретный signal — кусок «доказательства», что AI заметил проблему.
 *
 * Один сигнал = один факт из одного источника. Goal обычно агрегирует
 * 1-3 таких item'а в `Goal.ai_evidence` для рендера в expandable секции
 * «Откуда AI это взял?» на странице цели.
 *
 * Photo-bonus паттерн (★ инновация WFM):
 *  - AI генерит бонусную задачу «иди сфоткай витрину Молочка в 14:00»
 *  - Сотрудник снимает на телефон → получает бонус
 *  - AI прогоняет фото через CV → детектит проблему → создаёт основную задачу
 *  - Директор видит на странице цели: «выявил по фото от Иванова И.И.
 *    от 5 мая 09:15» с photo_url и photo_taken_by для audit-trail.
 */
export interface AIEvidenceItem {
  source: AISignalSource;
  /** 1-2 строки описания самого signal'а (рендерится в expandable списке). */
  summary: string;
  /** EN-перевод summary для bilingual demo. */
  summary_en?: string;
  /** Начало периода наблюдения (ISO date или ISO datetime). */
  observed_from?: string;
  /** Конец периода наблюдения. */
  observed_to?: string;
  /** SKU / категория / зона / магазин где детектится. */
  scope_hint?: string;
  /** EN-перевод scope_hint. */
  scope_hint_en?: string;
  /** Ссылка на фото (только для photo-bonus). */
  photo_url?: string;
  /** Имя сотрудника, снявшего фото (для photo-bonus, audit trail). */
  photo_taken_by?: string;
  /** ISO datetime когда сделано фото (для photo-bonus). */
  photo_taken_at?: string;
}

/** Период расчёта денежного эффекта. */
export type MoneyImpactPeriod = "week" | "month" | "quarter" | "year";

/**
 * Тип эффекта от достижения цели.
 *  - `money`      — есть монетизация (отображается в ₽).
 *  - `compliance` — регуляторное / hygiene (EGAIS, инвентаризация); сортируется по significance.
 *  - `quality`    — качество (audit-streak, KPI lever без прямого ₽).
 *  - `training`   — обучение / онбординг (риск ухода кадра).
 */
export type MoneyImpactType = "money" | "compliance" | "quality" | "training";

/**
 * Денежная выгода (или другой эффект) от достижения цели.
 * `amount` в рублях за `period`. `rationale_short` — 1 строка для пилюли.
 * `rationale_breakdown` — пункты для popover/sheet «Подробнее».
 *
 * `*_en` — опциональные EN-переводы для bilingual demo. Если не заданы —
 * fallback на `rationale_short` / `rationale_breakdown` (RU).
 *
 * Для целей где прямого ₽-эффекта нет (`impact_type !== "money"`):
 *  - `amount` ставим 0 (или smallest meaningful)
 *  - `significance_score` 1-10 — tie-breaker для сортировки на UI
 */
export interface MoneyImpact {
  amount: number;
  period: MoneyImpactPeriod;
  rationale_short: string;
  rationale_breakdown: string[];
  rationale_short_en?: string;
  rationale_breakdown_en?: string[];
  /** Тип эффекта. Default 'money' для обратной совместимости. */
  impact_type: MoneyImpactType;
  /** 1-10, для не-money целей. Используется как sort tie-breaker. */
  significance_score?: number;
}

/**
 * Уровень приоритета цели в портфеле AI-целей.
 *  - `priority`  — одна из 5 foundation-целей (deep-research отчёт): OOS,
 *                  phantom stock, fresh write-offs, post-promo leftovers,
 *                  slow-moving inventory. Идут наверх каталога.
 *  - `secondary` — расширенные сценарии (basket cross-sell, RFM, planogram,
 *                  productivity, ЕГАИС и т.п.) — полезны как catalog, но
 *                  ниже priority-5 по приоритету пилотирования.
 *
 * Если поле не задано — UI считает цель `secondary`.
 */
export type GoalTier = "priority" | "secondary";

/**
 * Какая волна пилотирования из deep-research roadmap'а.
 *  - `A` — OOS + Phantom (foundation, 4 нед baseline + 8 нед test)
 *  - `B` — Fresh write-offs (4 нед baseline + 12 нед test)
 *  - `C` — Promo allocation optimizer (8-10 нед, 3 промо-цикла)
 *  - `D` — Slow stock cleanup (12-16 нед)
 *
 * Только у `tier: "priority"` целей; secondary получают undefined.
 * См. `.memory_bank/_claude/AI-GOALS-ROADMAP.md`.
 */
export type PilotWave = "A" | "B" | "C" | "D";

/** AI-Assistant цель + ручная */
export interface Goal {
  id: string;
  category: GoalCategory;
  /**
   * RU-литерал по умолчанию (исторически весь код использует `title`/`description`).
   * Для bilingual demo задаются опциональные `title_en`/`description_en` —
   * UI выбирает нужный текст по `useLocale()` через helper `pickLocalized`.
   */
  title: string;
  description: string;
  title_en?: string;
  description_en?: string;
  /**
   * Значение метрики на момент установки цели — нужно для прогресса
   * (closedGap = |starting - current| при decrease, current - starting при increase).
   * Optional для backward compat — если не задано, прогресс считаем как
   * `current_value / target_value` (старая логика для растущих метрик).
   */
  starting_value?: number;
  target_value: number;
  target_unit: string;
  current_value: number;
  /**
   * Направление метрики. Если не задано — выводим из target vs starting:
   * target < starting → "decrease", иначе "increase".
   */
  direction?: GoalDirection;
  status: GoalStatus;
  store_id?: number | null;
  scope: "STORE" | "NETWORK";
  proposed_by: "AI" | "MANAGER";
  selected_by?: number;
  selected_at?: string;
  period_start: string;
  period_end: string;
  /**
   * Денежная выгода от достижения цели. Optional —
   * не у всех целей оценка есть (новые / custom).
   */
  money_impact?: MoneyImpact;
  /**
   * Главный источник AI-сигнала (для compact-чипа в карточке цели).
   * Если signal'ов несколько разных источников — ставим `"mixed"` и
   * детали отдаём через `ai_evidence`.
   */
  ai_signal_source?: AISignalSource;
  /**
   * 1-2 строки про конкретный механизм детекции — что именно AI «смотрит».
   * Пример: «AI смотрит почасовые продажи молочки за 30 дней и ищет провалы
   * больше 4 часов при норме 6 продаж/час».
   *
   * Рендерится в expandable секции «Откуда AI это взял?» как заголовок.
   */
  ai_detection_method?: string;
  /** EN-перевод `ai_detection_method` для bilingual demo. */
  ai_detection_method_en?: string;
  /**
   * Список конкретных signal'ов (≤3 штук обычно), которые AI использовал.
   * Каждый item — отдельный факт с источником, scope'ом и (для photo-bonus)
   * фото-thumbnail'ом + ФИО снявшего сотрудника.
   */
  ai_evidence?: AIEvidenceItem[];
  /**
   * Уровень приоритета в портфеле (deep-research отчёт). Если не задан —
   * UI считает цель `secondary`. См. `GoalTier`.
   */
  tier?: GoalTier;
  /**
   * Волна пилотирования (`A`/`B`/`C`/`D`) из roadmap'а.
   * Заполняется только для `tier: "priority"`; для `secondary` — undefined.
   * См. `PilotWave` и `.memory_bank/_claude/AI-GOALS-ROADMAP.md`.
   */
  pilot_wave?: PilotWave;
}

/** Источник бонуса. GOAL_LINKED — бонус привязан к active Goal */
export type BonusTaskSource =
  | "YESTERDAY_INCOMPLETE"
  | "SUPERVISOR_BUDGET"
  | "GOAL_LINKED";

export interface BonusBudget {
  id: string;
  store_id?: number;
  supervisor_id?: number;
  period_start: string;
  period_end: string;
  total_points: number;
  spent_points: number;
  source: BonusTaskSource;
}

/**
 * Предложение от внешнего аналитического модуля.
 * proposed_payload содержит готовую структуру задачи/цели/бонуса.
 */
export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  title: string;
  /** EN-перевод заголовка для билингв-демо. Если пусто — fallback на RU. */
  title_en?: string;
  description: string;
  /** EN-перевод описания для билингв-демо. */
  description_en?: string;
  rationale: string;
  /** EN-перевод обоснования для билингв-демо. */
  rationale_en?: string;
  proposed_payload: Record<string, unknown>;
  context_data?: {
    chart_data?: unknown;
    related_skus?: unknown;
    related_tasks?: string[];
    anomaly_metric?: string;
  };
  status: AISuggestionStatus;
  priority: AISuggestionPriority;
  target_object_type: "STORE" | "STORE_LIST" | "NETWORK" | "WORKSHOP";
  target_object_ids: number[];
  created_at: string;
  decided_at?: string;
  decided_by?: number;
  decision_reason?: string;
  decision_comment?: string;
  /** Тип созданной из предложения сущности (заполняется только когда status=ACCEPTED) */
  linked_object_type?: "task" | "goal" | "bonus_task";
  /** ID созданной из предложения сущности (заполняется только когда status=ACCEPTED) */
  linked_object_id?: string;
  /** Заголовок созданной из предложения сущности — для отображения в карточке */
  linked_object_title?: string;
}

export interface AIChatThread {
  id: string;
  user_id: number;
  title?: string;
  context_type: AIChatContextType;
  context_id?: string | null;
  last_message_at: string;
  message_count: number;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  thread_id: string;
  role: AIChatRole;
  content: string;
  /** EN-перевод текста сообщения для билингв-демо. */
  content_en?: string;
  attached_data?: {
    data_type:
      | "chart"
      | "task_preview"
      | "table"
      | "document_excerpt"
      | "suggestion_preview";
    payload: Record<string, unknown>;
  };
  helpful?: boolean | null;
  created_at: string;
}

/** Загруженные регламенты, ИИ грузит в контекст когда работник просит «подробнее» */
export interface Regulation {
  id: string;
  /**
   * RU-литерал по умолчанию. `name_en`/`description_en` — опциональные EN-переводы
   * для bilingual demo. UI выбирает текст через `pickLocalized(name, name_en, locale)`.
   */
  name: string;
  description?: string;
  name_en?: string;
  description_en?: string;
  file_url: string;
  file_type: "PDF" | "WORD" | "TXT";
  file_size_bytes: number;
  work_type_ids?: number[];
  zone_ids?: number[];
  version: number;
  is_archived: boolean;
  replaces_id?: string | null;
  uploaded_by: number;
  uploaded_at: string;
  ai_usage_count_30d: number;
}

/**
 * Data connector for external systems.
 * POS / Остатки / Поставки / Промо / Маркетинг — внешние коннекторы данных.
 * UNIVERSAL = один master-ключ к нескольким источникам.
 */
export interface DataConnector {
  id: string;
  type: DataConnectorType;
  name: string;
  status: DataConnectorStatus;
  config?: Record<string, unknown>;
  stats?: {
    records_per_day?: number;
    last_sync_at?: string;
    total_records?: number;
  };
  organization_id: string;
  scope?: {
    store_ids?: number[];
  };
}

/** Метрики работы ИИ для дашборда контроля */
export interface AIPerformanceMetrics {
  scope_type: "NETWORK" | "REGION" | "SUPERVISOR_LIST" | "STORE";
  scope_id?: string | number;
  period_start: string;
  period_end: string;
  suggestions_generated: number;
  suggestions_accepted: number;
  suggestions_rejected: number;
  accept_rate_pct: number;
  average_decision_time_min: number;
  helpful_rate_pct?: number;
  top_reject_reasons: Array<{
    reason: string;
    count: number;
  }>;
  anomalies?: Array<{
    type: string;
    description: string;
    severity: "low" | "med" | "high";
  }>;
}

// ═══════════════════════════════════════════════════════════════════
// FREELANCE MODULE INTERFACES
// ═══════════════════════════════════════════════════════════════════

/**
 * Freelance application.
 * urgent — заявка <3 дней до выхода (только SUPERVISOR+)
 * retroactive — задним числом (только SUPERVISOR+)
 * external_ref — ID заявки в HR-системе клиента (только source=EXTERNAL)
 * replaced_with_bonus_budget_id — если status=REPLACED_WITH_BONUS / MIXED
 * approved_hours — часы которые согласовали
 * mixed_* — для MIXED заявки распределение
 */
export interface FreelanceApplication {
  id: string;
  source: ApplicationSource;
  status: ApplicationStatus;
  store_id: number;
  store_name: string;
  planned_date: string;
  requested_hours: number;
  approved_hours?: number | null;
  work_type_id: number;
  work_type_name: string;
  comment?: string;
  /**
   * Опциональный EN-перевод `comment` для bilingual demo.
   * UI выбирает через `pickLocalized(app.comment, app.comment_en, locale)`.
   */
  comment_en?: string;
  created_by: number;
  created_by_name: string;
  created_by_role: FunctionalRole;
  created_at: string;
  decided_by?: number | null;
  decided_by_name?: string | null;
  decided_at?: string | null;
  decision_comment?: string | null;
  /** Опциональный EN-перевод `decision_comment` для bilingual demo. */
  decision_comment_en?: string | null;
  replaced_with_bonus_budget_id?: string | null;
  mixed_bonus_hours?: number | null;
  mixed_freelance_hours?: number | null;
  external_ref?: string | null;
  urgent: boolean;
  retroactive: boolean;
}

/** Привязка исполнителя к заявке. geo_check_in_match=false блокирует открытие смены */
export interface FreelancerAssignment {
  id: string;
  application_id: string;
  freelancer_id: number;
  freelancer_name: string;
  freelancer_phone: string;
  agent_id?: string | null;
  agent_name?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  geo_check_in?: {
    lat: number;
    lng: number;
    occurred_at: string;
  } | null;
  geo_check_in_match: boolean | null;
  oferta_accepted_at?: string | null;
  status: "SCHEDULED" | "CHECKED_IN" | "WORKING" | "DONE" | "NO_SHOW";
}

// ───────────────────────────────────────────────────────────────────
// Task offer routing — последовательное предложение задания фрилансерам
// по рейтингу с эксклюзивным окном (60/30/15 мин)
// ───────────────────────────────────────────────────────────────────

/** Тип tier'а: TOP_3 → 60 мин, TOP_5 → 30 мин, REST → 15 мин */
export type OfferTier = "TOP_3" | "TOP_5" | "REST";

export type TaskOfferStatus =
  | "ROUTING"      // в процессе обзвона очереди
  | "FILLED"       // кто-то принял
  | "EXPIRED_ALL"  // вся очередь прошла, никто не принял
  | "CANCELLED";

export type OfferAttemptStatus =
  | "PENDING"          // активная попытка, ждём ответ в окне эксклюзива
  | "ACCEPTED"         // принял в своём окне (или из fallback'а)
  | "DECLINED"         // явно отказался в своём окне
  | "EXPIRED"          // окно истекло, фрилансер не отреагировал
  | "WAITING"          // ещё не отправлено (стоит в очереди)
  | "LATE_FALLBACK";   // окно истекло, но фрилансер откликнулся позже — ждёт fallback'а

/**
 * Задание, отправляемое на routing-обзвон.
 * Содержит параметры задачи + параметры routing'а (очередь кандидатов).
 */
export interface TaskOffer {
  id: string;
  // Параметры задания
  work_type_id: number;
  work_type_name: string;
  store_id: number;
  store_name: string;
  shift_date: string;       // YYYY-MM-DD
  start_time: string;       // HH:mm
  duration_hours: number;
  price_rub: number;
  note?: string;
  /** Опциональный EN-перевод `note` для bilingual demo. */
  note_en?: string;
  // Routing
  status: TaskOfferStatus;
  candidate_count: number;
  /** Текущая активная попытка (PENDING). null если все отработали или offer FILLED. */
  current_attempt_id: string | null;
  filled_by_freelancer_id?: number | null;
  filled_by_attempt_id?: string | null;
  created_at: string;
  filled_at?: string | null;
  expires_all_at?: string | null;  // когда последний кандидат потеряет окно
  created_by_user_id: number;
}

/**
 * Одна попытка предложить задание конкретному фрилансеру в очереди.
 * Создаются все сразу при createTaskOffer, но статус активной — только у одной за раз
 * (та у которой shortest exclusive_until среди PENDING).
 */
export interface OfferAttempt {
  id: string;
  offer_id: string;
  freelancer_id: number;
  freelancer_name: string;
  freelancer_avatar_url?: string;
  rating: number | null;
  /** Позиция в очереди (1 = top by rating). */
  rank: number;
  tier: OfferTier;
  /** Длительность эксклюзивного окна в минутах (60/30/15 от tier'а). */
  exclusive_minutes: number;
  /** Когда отправлено фрилансеру push'ом. null если ещё в WAITING. */
  sent_at: string | null;
  /** Когда заканчивается эксклюзивное окно. null если ещё не отправлено. */
  exclusive_until: string | null;
  status: OfferAttemptStatus;
  responded_at?: string | null;
}

/**
 * Оказанная услуга.
 * scheduled_hours — обещано часов (заявлено в application)
 * actual_hours — фактически отработано (по геолокации check-in / check-out)
 * payable_hours — к оплате (обычно = scheduled_hours; если был дозагрузка не по вине исполнителя, payable_hours остаётся = scheduled_hours)
 * underload_not_fault — если true, исполнителю заплатят за обещанные часы, не за фактические
 * total_amount = payable_hours × hourly_rate (для NOMINAL_ACCOUNT)
 * total_amount_indicative — справочно для CLIENT_DIRECT (по нормативам)
 * manually_adjusted — корректировка ИТОГОВОЙ суммы (только REGIONAL+)
 * task_ids — список Task.id, выполненных в рамках этой услуги
 */
export interface Service {
  id: string;
  freelancer_id: number;
  freelancer_name: string;
  freelancer_phone: string;
  agent_id?: string | null;
  agent_name?: string | null;
  application_id?: string | null;
  assignment_id?: string | null;
  task_ids?: string[];
  store_id: number;
  store_name: string;
  service_date: string;
  work_type_id: number;
  work_type_name: string;
  scheduled_hours: number;
  actual_hours: number;
  payable_hours: number;
  underload_not_fault?: boolean;
  adjustment_reason?: string | null;
  /** Опциональный EN-перевод `adjustment_reason` для bilingual demo. */
  adjustment_reason_en?: string | null;
  normative_volume: number;
  normative_unit: string;
  hourly_rate?: number | null;
  total_amount?: number | null;
  total_amount_indicative?: number | null;
  status: ServiceStatus;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  no_show_reason?: string | null;
  /** Опциональный EN-перевод `no_show_reason` для bilingual demo. */
  no_show_reason_en?: string | null;
  dispute_reason?: string | null;
  /** Опциональный EN-перевод `dispute_reason` для bilingual demo. */
  dispute_reason_en?: string | null;
  payout_id?: string | null;
  manually_adjusted?: {
    adjusted_by: number;
    adjusted_by_name: string;
    adjusted_at: string;
    from_amount: number;
    to_amount: number;
    reason: string;
    /** Опциональный EN-перевод `reason` для bilingual demo. */
    reason_en?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Запись в реестре выплат.
 * Один день × один исполнитель = одна запись (агрегирует все его сервисы за день).
 * nominal_account_fee=5%.
 * Релевантно только для payment_mode=NOMINAL_ACCOUNT
 */
export interface Payout {
  id: string;
  payout_date: string;
  freelancer_id: number;
  freelancer_name: string;
  agent_id?: string | null;
  services: string[];
  gross_amount: number;
  nominal_account_fee: number;
  net_amount: number;
  agent_commission?: number | null;
  status: PayoutStatus;
  nominal_account_ref?: string | null;
  closing_doc_url?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
  /** Опциональный EN-перевод `failure_reason` для bilingual demo. */
  failure_reason_en?: string | null;
  created_at: string;
}

/** Лимит бюджета на внештат для объекта. Управляется REGIONAL+ */
export interface BudgetLimit {
  id: string;
  store_id: number;
  store_name: string;
  period: BudgetPeriod;
  amount: number;
  currency: "RUB" | "GBP" | "USD";
  valid_from: string;
  valid_to?: string | null;
  set_by: number;
  set_by_name: string;
  set_at: string;
}

/** Вычисляется на лету: planned_amount = pro-rata по дням, overspend = actual - planned (если > 0) */
export interface BudgetUsage {
  store_id: number;
  store_name: string;
  period: BudgetPeriod;
  period_start: string;
  period_end: string;
  limit_amount: number;
  planned_amount: number;
  actual_amount: number;
  overspend: number;
  overspend_pct: number;
  currency: "RUB" | "GBP" | "USD";
}

export type ServiceNormUnit =
  | "SKU"
  | "PCS"
  | "KG"
  | "PALLETS"
  | "POSITIONS"
  | "BOXES"
  | "M2"
  | "CHECKS";

/**
 * Справочник «формат объекта × тип работ → норматив».
 * unit включает M2 (квадратные метры — для уборки) и CHECKS (чеки на кассе).
 * hourly_rate — для расчёта стоимости (используется в обоих режимах оплаты, в CLIENT_DIRECT справочно).
 * Утверждает SUPERVISOR+
 */
export interface ServiceNorm {
  id: string;
  object_format: ObjectFormat;
  work_type_id: number;
  work_type_name: string;
  normative_per_hour: number;
  unit: ServiceNormUnit;
  hourly_rate?: number | null;
  currency: "RUB" | "GBP" | "USD";
  approved_by: number;
  approved_by_name: string;
  approved_at: string;
  archived: boolean;
}

/**
 * Справочник агентов.
 * Скрыт целиком в payment_mode=CLIENT_DIRECT
 */
export interface Agent {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "COMPANY";
  inn?: string;
  kpp?: string;
  ogrn?: string;
  contact_person_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contract_url?: string | null;
  contract_signed_at?: string | null;
  commission_pct: number;
  status: AgentStatus;
  freelancers_count: number;
  total_earned_30d: number;
  total_earned_all_time: number;
  created_at: string;
}

/**
 * Запись начисления агентского.
 * Создаётся в момент выплаты исполнителю (одновременно), не отдельно раз в месяц
 */
export interface AgentEarning {
  id: string;
  agent_id: string;
  period_date: string;
  freelancer_id: number;
  freelancer_name: string;
  service_id: string;
  gross_amount_base: number;
  commission_pct: number;
  commission_amount: number;
  payout_id?: string | null;
  status: "CALCULATED" | "PAID";
  created_at: string;
}

/** Лог синхронизаций с внешней HR. Виден в карточке интеграции */
export interface ExternalHrSyncLog {
  id: string;
  occurred_at: string;
  applications_received: number;
  freelancers_created: number;
  errors_count: number;
  errors?: Array<{
    external_ref: string;
    error: string;
  }>;
  triggered_by: "SCHEDULE" | "MANUAL";
  triggered_by_user?: number;
}

/**
 * Запись о невыходе для юридической работы.
 * Это preset фильтра реестра услуг (status=NO_SHOW), хранится как агрегатная сущность для удобства юристов
 */
export interface NoShowReport {
  id: string;
  service_id: string;
  freelancer_id: number;
  freelancer_name: string;
  agent_id?: string | null;
  store_id: number;
  store_name: string;
  scheduled_date: string;
  scheduled_hours: number;
  actual_hours: 0;
  reported_at: string;
  status: "OPEN" | "IN_LEGAL" | "RESOLVED" | "WRITTEN_OFF";
  legal_comment?: string;
  /** Опциональный EN-перевод `legal_comment` для bilingual demo. */
  legal_comment_en?: string;
}

// ═══════════════════════════════════════════════════════════════════
// API WRAPPERS
// ═══════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * warning — мягкое предупреждение когда операция прошла успешно, но требует внимания.
 * Например: «Заявка из внешней HR-системы, бюджет справочный».
 * UI показывает warning в info-toast, не destructive.
 */
export interface ApiMutationResponse {
  success: boolean;
  id?: string;
  warning?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiListParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD — NETWORK HEALTH & BUDGET (SUPERVISOR+ ROLES)
// ═══════════════════════════════════════════════════════════════════

/** Период для агрегированных метрик дашборда. */
export type DashboardPeriod = "7d" | "30d" | "current_month" | "prev_month";

/** Статус магазина по health-метрике. */
export type StoreHealthStatus = "IDLE" | "ANOMALY" | "NORMAL";

/** Статус магазина по бюджету. */
export type StoreBudgetStatus = "EXCEEDED" | "RISK" | "NORMAL";

/** Группировка по формату объекта для сводок. */
export interface FormatHealthRow {
  format: ObjectFormat;
  /** Изменение покрытия в % vs предыдущий период (-12, +19). */
  diff_pct: number;
}

export interface FormatBudgetRow {
  format: ObjectFormat;
  spent_rub: number;
  total_rub: number;
}

/** Строка списка магазинов на вкладке "Здоровье сети". */
export interface StoreHealthRow {
  store_id: number;
  store_name: string;
  format: ObjectFormat;
  /** Прогноз часов на период (план + ИИ-корректировка). */
  forecast_hours: number;
  /** Реально назначено часов сотрудникам и внештатникам. */
  assigned_hours: number;
  /** Изменение покрытия за период в % (-12, +20). */
  coverage_pct_diff: number;
  /** Если ANOMALY — на сколько % отклонение от нормы. */
  anomaly_pct?: number;
  status: StoreHealthStatus;
  supervisor_id?: number;
  supervisor_name?: string;
  supervisor_avatar_url?: string | null;
}

/** Сводка по здоровью сети за период (агрегирует все магазины в скоупе роли). */
export interface NetworkHealthSummary {
  /** Общий health score 0-100. */
  score: number;
  period: DashboardPeriod;
  /** Тренд за 7 дней: +5 покрытие, -1 объект с аномалией. */
  trend_7d: {
    coverage_pct_diff: number;
    anomalies_diff_count: number;
  };
  by_format: FormatHealthRow[];
  stores: StoreHealthRow[];
}

/** Строка списка магазинов на вкладке "Бюджет". */
export interface StoreBudgetRow {
  store_id: number;
  store_name: string;
  format: ObjectFormat;
  spent_rub: number;
  total_rub: number;
  status: StoreBudgetStatus;
  /** При статусе RISK / EXCEEDED — сумма риска или превышения в ₽. */
  risk_amount_rub?: number;
  supervisor_id?: number;
  supervisor_name?: string;
  supervisor_avatar_url?: string | null;
}

/** Сводка по бюджету внештата за период. */
export interface BudgetSummary {
  spent_rub: number;
  total_rub: number;
  /** OK | RISK | EXCEEDED — общая оценка по сети. */
  status: "OK" | "RISK" | "EXCEEDED";
  /** Кол-во заявок на внештат, ожидающих подтверждения супервайзером+. */
  pending_approvals_count: number;
  /** Скорость траты vs план (%). +5 = на 5% выше плана. */
  pace_diff_pct: number;
  /** Сумма риска нехватки (в ₽). 0 если нет риска. */
  risk_amount_rub: number;
  by_format: FormatBudgetRow[];
  stores: StoreBudgetRow[];
  period: DashboardPeriod;
}
