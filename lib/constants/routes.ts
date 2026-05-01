/**
 * Typed route constants — language-agnostic business paths.
 * Locale prefix is added automatically via next-intl <Link> / useRouter().
 * Usage: ADMIN_ROUTES.taskDetail(id) → "/tasks/abc123"
 */

export const ADMIN_ROUTES = {
  // Core
  dashboard: "/dashboard",
  navigation: "/navigation",

  // Tasks
  tasks: "/tasks",
  taskNew: "/tasks/new",
  taskDetail: (id: string) => `/tasks/${id}`,
  taskEdit: (id: string) => `/tasks/${id}/edit`,
  tasksReview: "/tasks/review",
  tasksArchive: "/tasks?archived=true",
  subtasksModeration: "/subtasks/moderation",

  // Goals
  goals: "/goals",
  goalDetail: (id: string) => `/goals/${id}`,
  networkGoals: "/goals/network",

  // Bonus & Payouts
  bonusTasks: "/bonus/tasks",
  payouts: "/payouts",

  // AI
  aiSuggestions: "/ai/suggestions",
  aiSuggestionDetail: (id: string) => `/ai/suggestions?id=${id}`,
  aiChat: "/ai/chat",
  aiChatThread: (threadId: string) => `/ai/chat?thread_id=${threadId}`,
  aiCoach: "/ai/coach",

  // Schedule
  schedule: "/schedule",
  shiftDetail: (id: string) => `/schedule/${id}`,

  // Employees
  employees: "/employees",
  employeeDetail: (id: string) => `/employees/${id}`,
  employeeNew: "/employees/new",
  permissions: "/employees/permissions",

  // Stores
  stores: "/stores",
  storeDetail: (id: string) => `/stores/${id}`,

  // Taxonomy
  taxonomyWorkTypes: "/taxonomy/work-types",
  taxonomyZones: "/taxonomy/zones",
  taxonomyPositions: "/taxonomy/positions",
  hints: "/taxonomy/hints",
  hintsManager: "/taxonomy/hints/manager",
  regulations: "/taxonomy/regulations",
  taxonomyServiceNorms: "/taxonomy/service-norms",

  // Notifications
  notifications: "/notifications",

  // Settings
  settingsProfile: "/settings/profile",
  settingsOrganization: "/settings/organization",
  integrations: "/integrations",

  // Admin / Ops
  audit: "/audit",
  riskRules: "/risk/rules",
  leaderboards: "/leaderboards",

  // Reports
  reportsKpi: "/reports/kpi",
  reportsPlanFact: "/reports/plan-fact",
  reportsCompare: "/reports/compare",

  // Freelance module
  freelanceDashboard: "/freelance",
  freelanceApplications: "/freelance/applications",
  freelanceApplicationNew: "/freelance/applications/new",
  freelanceApplicationDetail: (id: string) => `/freelance/applications/${id}`,
  freelanceServices: "/freelance/services",
  freelancePayouts: "/freelance/payouts",
  freelanceNoShows: "/freelance/services?status=NO_SHOW",
  freelanceBudgetLimits: "/freelance/budget-limits",
  freelanceAgents: "/freelance/agents",
  freelanceAgentDetail: (id: string) => `/freelance/agents/${id}`,
} as const;

/**
 * Isolated Agent cabinet — separate mini-app, own layout and sidebar.
 * No access to any ADMIN_ROUTES. Login as AGENT redirects here.
 */
export const AGENT_ROUTES = {
  dashboard: "/agent",
  freelancers: "/agent/freelancers",
  freelancerDetail: (id: string) => `/agent/freelancers/${id}`,
  earnings: "/agent/earnings",
  documents: "/agent/documents",
  profile: "/agent/profile",
} as const;

export const AUTH_ROUTES = {
  login: "/login",
} as const;

export const DEMO_ROUTES = {
  sharedDisplay: "/shared-demo",
} as const;
