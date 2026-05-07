"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import type {
  User,
  Organization,
  FunctionalRole,
  FunctionalRoleAssignment,
  Store,
  EmployeeType,
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { ADMIN_ROUTES, AGENT_ROUTES } from "@/lib/constants/routes";
import { getCurrentOrgId, setCurrentOrgId } from "@/lib/api/_org-context";
import { USE_REAL_API } from "@/lib/api/_config";
import { getAuthToken } from "@/lib/api/_auth-token";
import { getCurrentUserMe } from "@/lib/api/users";
import type { BackendUserMe } from "@/lib/api/_backend-types";

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
    // Multi-tenant: override scope_ids текущим org из OrgSwitcher.
    // Иначе после смены org user.scope продолжает указывать на исходный
    // (например LAMA) → сторы не переключаются вместе с контекстом.
    stores = MOCK_STORES.filter(
      (s) =>
        s.organization_id === organization.id && !s.archived && s.active
    );
  } else if (roleAssignment.scope_type === "REGION") {
    stores = MOCK_STORES.filter(
      (s) =>
        s.region != null &&
        roleAssignment.scope_ids.includes(s.region) &&
        !s.archived &&
        s.active
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

/**
 * Адаптер: backend GET /users/me → admin AuthUser.
 *
 * Mapping:
 *   - User поля: ID/sso/external_id/ФИО/email/phone напрямую из BackendUserMe
 *   - FunctionalRole: backend role.code (worker | manager) → STORE_DIRECTOR / WORKER
 *     (admin верхние роли SUPERVISOR/REGIONAL/etc. backend пока не различает)
 *   - Stores: дёргаем из assignments[].store (admin shape Store)
 *   - Organization: backend не отдаёт — берём из getCurrentOrgId() (admin invent)
 *
 * При смене org через topbar AuthProvider не пере-вызывает /users/me — backend
 * не имеет понятия org-context, scope магазинов вычисляется из assignments.
 */
function backendUserMeToAuthUser(me: BackendUserMe): AuthUser {
  // Role detection: проверяем role.code в первом ассайнменте
  const firstPosition = me.assignments[0]?.position;
  const roleCode = firstPosition?.role?.code?.toLowerCase() ?? "worker";
  const functional_role: FunctionalRole =
    roleCode === "manager" ? "STORE_DIRECTOR" : "WORKER";

  // Adapt stores из assignments
  const stores: Store[] = me.assignments
    .map((a) => a.store)
    .filter((s): s is NonNullable<typeof s> => s != null)
    .map((bs) => ({
      id: bs.id,
      name: bs.name,
      external_code: bs.external_code ?? "",
      address: bs.address ?? "",
      object_type: "STORE",
      organization_id: getCurrentOrgId(),
      legal_entity_id: 0,
      active: true,
      archived: false,
    }));

  // Synthetic FunctionalRoleAssignment (admin invent — backend не отдаёт)
  const roleAssignment: FunctionalRoleAssignment = {
    id: -me.id, // negative = synthetic from backend
    user_id: me.id,
    functional_role,
    scope_type: stores.length > 0 ? "STORE_LIST" : "ORGANIZATION",
    scope_ids: stores.length > 0
      ? stores.map((s) => s.id)
      : [getCurrentOrgId()],
  };

  // Organization из admin org-context (backend не отдаёт)
  const organization =
    MOCK_ORGANIZATIONS.find((o) => o.id === getCurrentOrgId()) ??
    MOCK_ORGANIZATIONS[0];

  // Build admin User (merge SSO + LAMA полей)
  const user: User = {
    id: me.id,
    sso_id: me.sso_id,
    external_id: me.external_id ?? undefined,
    phone: me.phone ?? "",
    email: me.email,
    first_name: me.first_name ?? "",
    last_name: me.last_name ?? "",
    middle_name: me.middle_name ?? undefined,
    avatar_url: me.photo_url ?? undefined,
    type: "STAFF" as EmployeeType,
    archived: false,
    preferred_locale: "ru",
    preferred_timezone: "Asia/Tomsk",
    totp_enabled: false,
  };

  return {
    ...user,
    role: functional_role,
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

/**
 * Возвращает FunctionalRoleAssignment пользователя.
 * Если запись отсутствует (актуально для свежезалитых LAMA-юзеров без явных
 * назначений ролей), синтезируем WORKER в scope их первого Assignment'а
 * — чтоб impersonation/builAuthUser не падал.
 */
function resolveRoleAssignmentForUser(
  user: User
): FunctionalRoleAssignment | null {
  const explicit = MOCK_FUNCTIONAL_ROLES.find((ra) => ra.user_id === user.id);
  if (explicit) return explicit;

  const assignment =
    MOCK_ASSIGNMENTS.find((a) => a.user_id === user.id && a.active) ??
    MOCK_ASSIGNMENTS.find((a) => a.user_id === user.id);
  if (!assignment) return null;

  return {
    id: -user.id, // negative = synthetic
    user_id: user.id,
    functional_role: "WORKER",
    scope_type: "STORE",
    scope_ids: [assignment.store_id],
  };
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
// DEFAULT USER: Соколова А. В. (NETWORK_OPS).
// Org берём из localStorage (через _org-context) чтобы переживал reload
// после OrgSwitcher. Default org-lama если нет saved.
// ═══════════════════════════════════════════════════════════════════

const defaultUser = MOCK_USERS.find((u) => u.id === 3)!; // Соколова А. В.
const defaultRoleAssignment = MOCK_FUNCTIONAL_ROLES.find(
  (ra) => ra.user_id === 3
)!;
const defaultOrganization =
  MOCK_ORGANIZATIONS.find((o) => o.id === getCurrentOrgId()) ??
  MOCK_ORGANIZATIONS.find((o) => o.id === "org-lama")!;
// Sync обратно — на случай если localStorage был с org'ом которого
// больше нет в моках, fallback на org-lama.
setCurrentOrgId(defaultOrganization.id);
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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"mock" | "backend">("mock");

  // Mock notification counts
  const unreadNotificationsCount = 5;
  const pendingAISuggestionsCount = 3;

  // ── Real backend auth: при USE_REAL_API=true и наличии JWT ──
  // загружаем текущего пользователя из /users/me. Если падает —
  // продолжаем работать на mock-default'е (graceful degradation).
  useEffect(() => {
    if (!USE_REAL_API) return;
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;
    setIsAuthLoading(true);
    getCurrentUserMe()
      .then((me) => {
        if (cancelled) return;
        try {
          const adapted = backendUserMeToAuthUser(me);
          setUser(adapted);
          setAuthMode("backend");
        } catch (e) {
          console.warn("[auth] failed to adapt /users/me response", e);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn(
            "[auth] /users/me failed, продолжаем на mock-default:",
            (e as Error).message,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      const roleAssignment = resolveRoleAssignmentForUser(targetUser);
      if (!roleAssignment) {
        console.warn(
          `[v0] Cannot impersonate user ${targetUser.id} — no assignment in MOCK_ASSIGNMENTS`
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
