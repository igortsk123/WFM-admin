/**
 * Typed route constants for admin panel.
 * Locale prefix is handled automatically by next-intl Link/useRouter.
 */
export const ADMIN_ROUTES = {
  // Dashboard
  dashboard: "/dashboard",

  // Tasks
  tasks: "/tasks",
  taskDetail: (id: string) => `/tasks/${id}`,
  tasksReview: "/tasks/review",
  subtasksModeration: "/tasks/subtasks-moderation",
  tasksArchive: "/tasks/archive",

  // Goals
  goals: "/goals",
  goalDetail: (id: string) => `/goals/${id}`,
  bonusTasks: "/bonus-tasks",

  // Finance
  payouts: "/payouts",

  // People
  employees: "/employees",
  employeeDetail: (id: string) => `/employees/${id}`,
  permissions: "/permissions",
  schedule: "/schedule",

  // Stores
  stores: "/stores",
  storeDetail: (id: string) => `/stores/${id}`,

  // Taxonomy
  taxonomyWorkTypes: "/taxonomy/work-types",
  taxonomyZones: "/taxonomy/zones",
  taxonomyPositions: "/taxonomy/positions",
  taxonomyHints: "/taxonomy/hints",

  // Reports
  reportsPlanFact: "/reports/plan-fact",
  reportsKpi: "/reports/kpi",
  reportsCompare: "/reports/compare",

  // Settings
  profile: "/settings/profile",
  organization: "/settings/organization",
  integrations: "/settings/integrations",
  audit: "/audit",

  // Notifications
  notifications: "/notifications",

  // AI
  aiSuggestions: "/ai/suggestions",
  aiChat: "/ai/chat",
} as const;

export const AGENT_ROUTES = {
  home: "/agent",
  freelancers: "/agent/freelancers",
  earnings: "/agent/earnings",
  documents: "/agent/documents",
} as const;

export const AUTH_ROUTES = {
  login: "/login",
} as const;
