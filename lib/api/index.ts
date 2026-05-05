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
  // Profile (chat 35)
  type ProfileUpdateData,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
} from "./auth";

// ═══════════════════════════════════════════════════════════════════
// Users API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type UserWithAssignment,
  type UserDetail,
  type UserStats,
  type UserFunctionalScope,
  type FreelanceDocument,
  type UserListParams,
  type UserCreateData,
  type InviteMethod,
  type OfertaChannel,
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
  // Permissions coverage (matrix stats)
  type PermissionCoverageRow,
  getPermissionsCoverage,
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
  type HintWithLabels,
  type HintsListParams,
  type HintsCoverage,
  getHints,
  createHint,
  updateHint,
  deleteHint,
  getAllHints,
  getHintsCoverage,
  reorderHints,
} from "./hints";

// ═══════════════════════════════════════════════════════════════════
// Shifts API
// ═══════════════════════════════════════════════════════════════════

export {
  type ShiftListParams,
  type ShiftDetail,
  type ShiftHistoryEvent,
  type ScheduleView,
  type ScheduleParams,
  type ScheduleSlot,
  type ScheduleResponse,
  getShifts,
  getShiftById,
  syncLamaShifts,
  getSchedule,
  reopenShift,
  forceCloseShift,
  // Shift-detail actions (chat 29)
  getShiftHistory,
  markShiftLate,
  markShiftOvertime,
  cancelShift,
} from "./shifts";

// ═══════════════════════════════════════════════════════════════════
// Stores API
// ═══════════════════════════════════════════════════════════════════

export {
  type StoreWithStats,
  type StoreDetail,
  type StoreListParams,
  type StoreZoneWithCounts,
  type StoreKpiToday,
  type StoreHistoryEvent,
  type StoreHistoryParams,
  getStores,
  getStoreById,
  getStoreHistory,
  createStore,
  updateStore,
  archiveStore,
  bulkArchiveStores,
  restoreStore,
  syncLama,
  syncLamaForStore,
} from "./stores";

// ═══════════════════════════════════════════════════════════════════
// Taxonomy API
// ═══════════════════════════════════════════════════════════════════

export {
  type WorkTypeWithCount,
  type WorkTypeListParams,
  type ZoneWithCounts,
  type ZoneListParams,
  type PositionWithCounts,
  type PositionListParams,
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
  type NotificationListParams,
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
  getBonusPayoutById,
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
  type RegulationListParams,
  type RegulationsStats,
  getRegulations,
  getRegulationById,
  uploadRegulation,
  updateRegulation,
  archiveRegulation,
  downloadRegulation,
  getRegulationsStats,
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

// ═══════════════════════════════════════════════════════════════════
// Freelance Applications API
// ═══════════════════════════════════════════════════════════════════

export {
  getFreelanceApplications,
  getFreelanceApplicationById,
  createFreelanceApplication,
  approveApplicationFull,
  approveApplicationPartial,
  rejectApplication,
  replaceWithBonus,
  approveMixed,
  cancelApplication,
  simulateApplicationApproval,
} from "./freelance-applications";

// ═══════════════════════════════════════════════════════════════════
// Freelance Assignments API
// ═══════════════════════════════════════════════════════════════════

export {
  getAssignmentsByApplication,
  createAssignment,
  removeAssignment,
} from "./freelance-assignments";

// ═══════════════════════════════════════════════════════════════════
// Freelance Services API
// ═══════════════════════════════════════════════════════════════════

export {
  getServices,
  getServiceById,
  confirmService,
  disputeService,
  markNoShow,
  adjustServiceAmount,
} from "./freelance-services";

// ═══════════════════════════════════════════════════════════════════
// Freelance Payouts API (NOMINAL_ACCOUNT mode only)
// ══�����════════════════════════════════════════════════════════════════

export {
  getPayouts,
  getPayoutById,
  getClosingDocumentUrl,
  retryPayout,
} from "./freelance-payouts";

// ═══════════════════════════════════════════════════════════════════
// Freelance Budget API
// ═══════════════════════════════════════════════════════════════════

export {
  getBudgetLimits,
  createBudgetLimit,
  updateBudgetLimit,
  getBudgetUsage,
} from "./freelance-budget";

// ═══════════════════════════════════════════════════════════════════
// Freelance Service Norms API
// ═══════════════════════════════════════════════════════════════════

export {
  getServiceNorms,
  createServiceNorm,
  updateServiceNorm,
  archiveServiceNorm,
} from "./freelance-norms";

// ═══════════════════════════════════════════════════════════════════
// Freelance Agents API (NOMINAL_ACCOUNT mode only)
// ═══════════════════════════════════════════════════════════════════

export {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  blockAgent,
  archiveAgent,
  getAgentEarnings,
} from "./freelance-agents";

// ═══════════════════════════════════════════════════════════════════
// Agent Cabinet API (AGENT role, NOMINAL_ACCOUNT mode only)
// ═══════════════════════════════════════════════════════════════════

export {
  type AgentDocumentType,
  type AgentDocument,
  getMyAgentDashboard,
  getMyFreelancers,
  getMyFreelancerById,
  getMyEarnings,
  getMyDocuments,
} from "./agent-cabinet";

// ═══════════════════════════════════════════════════════════════════
// External HR Sync API
// ═══════════════════════════════════════════════════════════════════

export {
  type ExternalHrConfig,
  getExternalHrSyncLogs,
  getExternalHrConfig,
  updateExternalHrConfig,
  triggerExternalHrSync,
} from "./external-hr-sync";

// ═══════════════════════════════════════════════════════════════════
// No-Show Reports API
// ═══════════════════════════════════════════════════════════════════

export {
  getNoShows,
  updateNoShowStatus,
} from "./no-show";

// ═══════════════════════════════════════════════════════════════════
// Freelance Config API (platform-level)
// ═══════════════════════════════════════════════════════════════════

export {
  type FreelanceConfig,
  getOrganizationFreelanceConfig,
  updatePaymentMode,
} from "./freelance-config";

// ═══════════════════════════════════════════════════════════════════
// Dashboard API
// ═══════════════════════════════════════════════════════════════════

export {
  type ResourceBalanceData,
  getDashboardResourceBalance,
  getNetworkHealth,
  getBudgetSummary,
} from "./dashboard";
