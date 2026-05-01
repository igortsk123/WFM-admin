"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import type {
  User,
  Organization,
  FunctionalRole,
  FunctionalRoleAssignment,
  Store,
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { ADMIN_ROUTES, AGENT_ROUTES } from "@/lib/constants/routes";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface AuthUser extends User {
  role: FunctionalRole;
  organization: Organization;
  roleAssignment: FunctionalRoleAssignment;
  stores: Store[];
}

export interface AuthContextValue {
  user: AuthUser;
  impersonatingUser: AuthUser | null;
  isImpersonating: boolean;
  switchRole: (role: FunctionalRole) => void;
  startImpersonation: (targetUser: User) => void;
  exitImpersonation: () => void;
  unreadNotificationsCount: number;
  pendingAISuggestionsCount: number;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function buildAuthUser(
  user: User,
  roleAssignment: FunctionalRoleAssignment,
  organization: Organization
): AuthUser {
  // Get stores based on scope
  let stores: Store[] = [];
  if (
    roleAssignment.scope_type === "STORE" ||
    roleAssignment.scope_type === "STORE_LIST"
  ) {
    stores = MOCK_STORES.filter(
      (s) =>
        roleAssignment.scope_ids.includes(s.id) && !s.archived && s.active
    );
  } else if (roleAssignment.scope_type === "ORGANIZATION") {
    stores = MOCK_STORES.filter(
      (s) =>
        roleAssignment.scope_ids.includes(s.organization_id) &&
        !s.archived &&
        s.active
    );
  } else if (roleAssignment.scope_type === "REGION") {
    stores = MOCK_STORES.filter(
      (s) =>
        roleAssignment.scope_ids.includes(s.region) && !s.archived && s.active
    );
  }

  return {
    ...user,
    role: roleAssignment.functional_role,
    organization,
    roleAssignment,
    stores,
  };
}

function findRoleAssignmentForRole(
  role: FunctionalRole
): FunctionalRoleAssignment | null {
  return (
    MOCK_FUNCTIONAL_ROLES.find((ra) => ra.functional_role === role) || null
  );
}

function findUserForRoleAssignment(
  roleAssignment: FunctionalRoleAssignment
): User | null {
  return MOCK_USERS.find((u) => u.id === roleAssignment.user_id) || null;
}

function findOrganizationForRoleAssignment(
  roleAssignment: FunctionalRoleAssignment
): Organization | null {
  if (roleAssignment.scope_type === "ORGANIZATION") {
    const orgId = roleAssignment.scope_ids[0] as string;
    return MOCK_ORGANIZATIONS.find((o) => o.id === orgId) || null;
  }

  // For STORE / STORE_LIST / REGION — find org via first store
  if (
    roleAssignment.scope_type === "STORE" ||
    roleAssignment.scope_type === "STORE_LIST"
  ) {
    const storeId = roleAssignment.scope_ids[0] as number;
    const store = MOCK_STORES.find((s) => s.id === storeId);
    if (store) {
      return (
        MOCK_ORGANIZATIONS.find((o) => o.id === store.organization_id) || null
      );
    }
  }

  // PLATFORM_ADMIN — cross-tenant, default to first org
  if (roleAssignment.functional_role === "PLATFORM_ADMIN") {
    return MOCK_ORGANIZATIONS[0];
  }

  return MOCK_ORGANIZATIONS[0];
}

// ═══════════════════════════════════════════════════════════════════
// DEFAULT USER: Соколова А. В. (NETWORK_OPS, org-spar)
// ═══════════════════════════════════════════════════════════════════

const defaultUser = MOCK_USERS.find((u) => u.id === 3)!; // Соколова А. В.
const defaultRoleAssignment = MOCK_FUNCTIONAL_ROLES.find(
  (ra) => ra.user_id === 3
)!;
const defaultOrganization = MOCK_ORGANIZATIONS.find(
  (o) => o.id === "org-spar"
)!;
const defaultAuthUser = buildAuthUser(
  defaultUser,
  defaultRoleAssignment,
  defaultOrganization
);

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(defaultAuthUser);
  const [impersonatingUser, setImpersonatingUser] = useState<AuthUser | null>(
    null
  );

  // Mock notification counts
  const unreadNotificationsCount = 5;
  const pendingAISuggestionsCount = 3;

  const switchRole = useCallback(
    (role: FunctionalRole) => {
      const roleAssignment = findRoleAssignmentForRole(role);
      if (!roleAssignment) {
        console.warn(`[v0] No role assignment found for role: ${role}`);
        return;
      }

      const targetUser = findUserForRoleAssignment(roleAssignment);
      if (!targetUser) {
        console.warn(
          `[v0] No user found for role assignment: ${roleAssignment.id}`
        );
        return;
      }

      const organization = findOrganizationForRoleAssignment(roleAssignment);
      if (!organization) {
        console.warn(
          `[v0] No organization found for role assignment: ${roleAssignment.id}`
        );
        return;
      }

      const newAuthUser = buildAuthUser(
        targetUser,
        roleAssignment,
        organization
      );
      setUser(newAuthUser);
      setImpersonatingUser(null);

      // Persist role in cookie so middleware can read it for route guards
      document.cookie = `wfm-current-role=${role}; path=/; samesite=lax; max-age=86400`;

      // Redirect based on role
      if (role === "AGENT") {
        router.push(AGENT_ROUTES.dashboard);
      } else {
        router.push(ADMIN_ROUTES.dashboard);
      }
    },
    [router]
  );

  const startImpersonation = useCallback(
    (targetUser: User) => {
      const roleAssignment = MOCK_FUNCTIONAL_ROLES.find(
        (ra) => ra.user_id === targetUser.id
      );
      if (!roleAssignment) {
        console.warn(
          `[v0] Cannot impersonate user ${targetUser.id} — no role assignment`
        );
        return;
      }

      const organization = findOrganizationForRoleAssignment(roleAssignment);
      if (!organization) {
        console.warn(
          `[v0] Cannot impersonate user ${targetUser.id} — no organization`
        );
        return;
      }

      const authUser = buildAuthUser(targetUser, roleAssignment, organization);
      setImpersonatingUser(authUser);

      // Redirect based on impersonated role
      if (roleAssignment.functional_role === "AGENT") {
        router.push(AGENT_ROUTES.dashboard);
      } else {
        router.push(ADMIN_ROUTES.dashboard);
      }
    },
    [router]
  );

  const exitImpersonation = useCallback(() => {
    setImpersonatingUser(null);
    router.push(ADMIN_ROUTES.dashboard);
  }, [router]);

  const effectiveUser = impersonatingUser ?? user;

  const value: AuthContextValue = {
    user: effectiveUser,
    impersonatingUser,
    isImpersonating: impersonatingUser !== null,
    switchRole,
    startImpersonation,
    exitImpersonation,
    unreadNotificationsCount,
    pendingAISuggestionsCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
