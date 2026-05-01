/**
 * API Layer - Single integration point for future Python backend.
 *
 * All data access MUST go through this layer. Components and pages
 * should never import from lib/mock-data/ directly.
 *
 * Each function is documented with JSDoc including the future REST endpoint
 * it will map to when connected to the real backend.
 */

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
} from "./types";

// ═══════════════════════════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type CurrentUser,
  type AuthTokenResponse,
  type TotpSetupResponse,
  // Current user & role
  getCurrentUser,
  mockSwitchRole,
  impersonateUser,
  exitImpersonation,
  // Phone auth (Beyond Violet SSO)
  requestPhoneCode,
  verifyPhoneCode,
  // Email magic link
  requestEmailMagicLink,
  verifyEmailMagicLink,
  // TOTP
  setupTotp,
  verifyTotp,
  disableTotp,
  // Locale
  updateUserLocale,
} from "./auth";

// ═══════════════════════════════════════════════════════════════════
// Users API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type UserWithAssignment,
  type UserDetail,
  type UserListParams,
  type UserCreateData,
  // List & Get
  getUsers,
  getUserById,
  // Create / Update / Archive
  createUser,
  updateUser,
  archiveUser,
  // Permissions
  updateUserPermissions,
  bulkAssignPermission,
  bulkRevokePermission,
} from "./users";

// ═══════════════════════════════════════════════════════════════════
// Tasks API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type TaskWithAvatar,
  type TaskDetail,
  type TaskListParams,
  type TaskFiltersResponse,
  type SubtaskWithTaskTitle,
  // List & Get
  getTasks,
  getTaskById,
  getTaskFilters,
  // Create / Update
  createTask,
  updateTask,
  // Archive & Restore
  archiveTask,
  restoreTask,
  bulkArchiveTasks,
  // Actions
  transferTask,
  approveTask,
  rejectTask,
  bulkAssignTasks,
  // Subtasks
  getSubtasksPending,
  approveSubtask,
  rejectSubtask,
  addSubtaskToTask,
  removeSubtask,
} from "./tasks";

// ═══════════════════════════════════════════════════════════════════
// Hints API
// ═══════════════════════════════════════════════════════════════════

export {
  getHints,
  createHint,
  updateHint,
  deleteHint,
} from "./hints";

// ═══════════════════════════════════════════════════════════════════
// Shifts API
// ═══════════════════════════════════════════════════════════════════

export {
  type ShiftListParams,
  type ShiftDetail,
  getShifts,
  getShiftById,
  syncLamaShifts,
} from "./shifts";

// ═══════════════════════════════════════════════════════════════════
// Stores API
// ═══════════════════════════════════════════════════════════════════

export {
  type StoreWithStats,
  type StoreDetail,
  type StoreListParams,
  getStores,
  getStoreById,
  createStore,
  updateStore,
  archiveStore,
  syncLama,
} from "./stores";

// ═══════════════════════════════════════════════════════════════════
// Taxonomy API
// ═══════════════════════════════════════════════════════════════════

export {
  type WorkTypeWithCount,
  type ZoneWithCounts,
  type PositionWithCounts,
  getWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  getZones,
  createZone,
  updateZone,
  deleteZone,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getProductCategories,
} from "./taxonomy";

// ═══════════════════════════════════════════════════════════════════
// Notifications API
// ═══════════════════════════════════════════════════════════════════

export {
  type NotificationsListResponse,
  type NotificationPreferences,
  getNotifications,
  markRead,
  markAllRead,
  archiveNotification,
  getPreferences,
  updatePreferences,
} from "./notifications";

// ═══════════════════════════════════════════════════════════════════
// Audit API
// ═══════════════════════════════════════════════════════════════════

export {
  getAuditEntries,
  getAuditEntryById,
} from "./audit";

// ═══════════════════════════════════════════════════════════════════
// Reports API
// ═══════════════════════════════════════════════════════════════════

export {
  type ReportPeriod,
  type ReportParams,
  type KpiReportData,
  type PlanFactReportData,
  type StoreCompareReportData,
  getKpiReport,
  getPlanFactReport,
  getStoreCompareReport,
  exportReport,
} from "./reports";

// ═══════════════════════════════════════════════════════════════════
// Integrations API
// ═══════════════════════════════════════════════════════════════════

export {
  type Webhook,
  type IntegrationsStatus,
  getIntegrationsStatus,
  syncLamaForce,
  uploadExcel,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "./integrations";

// ═══════════════════════════════════════════════════════════════════
// Goals API
// ═══════════════════════════════════════════════════════════════════

export {
  type GoalProposal,
  type GoalProgress,
  getGoals,
  getGoalProposals,
  selectGoal,
  removeGoal,
  createManualGoal,
  getGoalProgress,
} from "./goals";

// ═══════════════════════════════════════════════════════════════════
// Bonus API
// ═══════════════════════════════════════════════════════════════════

export {
  type BonusTaskWithSource,
  type BonusMetrics,
  getBonusBudgets,
  updateSupervisorBudget,
  getBonusTasks,
  getBonusProposals,
  createBonusTask,
  removeBonusTask,
  getBonusMetrics,
} from "./bonus";

// ═══════════════════════════════════════════════════════════════════
// Payouts API
// ═══════════════════════════════════════════════════════════════════

export {
  type PayoutPeriod,
  type PayoutRow,
  type PayoutPeriodStatus,
  getPayoutPeriods,
  getPayoutById,
  createPayoutPeriod,
  calculatePayout,
  finalizePayout,
  exportPayout,
} from "./payouts";

// ═══════════════════════════════════════════════════════════════════
// Hints Manager API (bulk Excel import)
// ═══════════════════════════════════════════════════════════════════

export {
  type HintRowStatus,
  type HintTemplateRow,
  type HintsParseResult,
  downloadHintsTemplate,
  parseHintsTemplate,
  applyHintsTemplate,
} from "./hints-manager";

// ═══════════════════════════════════════════════════════════════════
// AI Suggestions API
// ═══════════════════════════════════════════════════════════════════

export {
  type AISuggestionListParams,
  type AcceptResult,
  getAiSuggestions,
  getSuggestionById,
  acceptAiSuggestion,
  rejectAiSuggestion,
  editAiSuggestion,
  reportAiIssue,
} from "./ai-suggestions";

// ═══════════════════════════════════════════════════════════════════
// AI Chat API
// ═══════════════════════════════════════════════════════════════════

export {
  getAiChatThreads,
  getAiChatThread,
  createAiChatThread,
  sendAiChatMessage,
  sendAiFeedback,
  archiveAiChatThread,
} from "./ai-chat";

// ═══════════════════════════════════════════════════════════════════
// AI Performance API
// ═══════════════════════════════════════════════════════════════════

export {
  type AiPerformanceScope,
  type NetworkGoalStore,
  type SupervisorAiQuality,
  getAiPerformance,
  getNetworkGoals,
  getSupervisorsAiQuality,
} from "./ai-performance";

// ═══════════════════════════════════════════════════════════════════
// Regulations API
// ═══════════════════════════════════════════════════════════════════

export {
  type RegulationDetail,
  getRegulations,
  getRegulationById,
  uploadRegulation,
  updateRegulation,
  archiveRegulation,
  downloadRegulation,
} from "./regulations";

// ═══════════════════════════════════════════════════════════════════
// Data Connectors API
// ═══════════════════════════════════════════════════════════════════

export {
  getDataConnectors,
  configureDataConnector,
  testDataConnector,
  removeDataConnector,
} from "./data-connectors";
