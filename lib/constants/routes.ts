// Typed route constants will be added here
export const ADMIN_ROUTES = {
  dashboard: "/dashboard",
  tasks: "/tasks",
  taskDetail: (id: string) => `/tasks/${id}`,
  goals: "/goals",
  goalDetail: (id: string) => `/goals/${id}`,
  schedule: "/schedule",
  notifications: "/notifications",
  profile: "/profile",
  settings: "/settings",
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
