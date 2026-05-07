/**
 * Auth API - Authentication and session management.
 * Mocks Beyond Violet SSO integration with phone/email/TOTP authentication.
 */

import type {
  ApiResponse,
  ApiMutationResponse,
  User,
  FunctionalRole,
  Locale,
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

/** Extended user type returned by getCurrentUser */
export interface CurrentUser extends User {
  role: FunctionalRole;
  organization_id: string;
  preferred_locale: Locale;
  totp_enabled: boolean;
}

/** Auth token response for login flows */
export interface AuthTokenResponse {
  access_token: string;
  user: User;
}

/** TOTP setup response */
export interface TotpSetupResponse {
  secret: string;
  qr_url: string;
  backup_codes: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Current User & Role Management
// ═══════════════════════════════════════════════════════════════════

/**
 * Get current authenticated user with role and organization context.
 * @returns Current user with functional role and org assignment
 * @endpoint GET /users/me
 */
export async function getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
  await delay(300);

  // Default to SUPERVISOR (Романов И.А.) for demo
  const user = MOCK_USERS.find((u) => u.id === 4)!;
  const roleAssignment = MOCK_FUNCTIONAL_ROLES.find((r) => r.user_id === user.id);

  const currentUser: CurrentUser = {
    ...user,
    role: roleAssignment?.functional_role ?? "WORKER",
    organization_id:
      roleAssignment?.scope_type === "ORGANIZATION"
        ? (roleAssignment.scope_ids[0] as string) ?? "org-lama"
        : "org-lama",
    preferred_locale: user.preferred_locale ?? "ru",
    totp_enabled: user.totp_enabled ?? false,
  };

  return { data: currentUser };
}

/**
 * Dev-only: Switch functional role for testing different permission levels.
 * Updates AuthContext in the browser — does not persist to backend.
 * @param role New functional role to simulate
 */
export function mockSwitchRole(role: FunctionalRole): void {
  if (process.env.NODE_ENV !== "development") {
    console.warn("[v0] mockSwitchRole is only available in development mode");
    return;
  }
  // In real implementation, this would update React context
}

/**
 * Impersonate another user (NETWORK_OPS / HR_MANAGER only).
 * Creates audit log entry for compliance.
 * @param targetUserId User ID to impersonate
 * @returns Success status
 * @endpoint POST /auth/impersonate
 */
export async function impersonateUser(
  targetUserId: number
): Promise<ApiMutationResponse> {
  await delay(400);

  const targetUser = MOCK_USERS.find((u) => u.id === targetUserId);
  if (!targetUser) {
    return {
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: `User with ID ${targetUserId} not found`,
      },
    };
  }

  if (targetUser.archived) {
    return {
      success: false,
      error: {
        code: "USER_ARCHIVED",
        message: "Cannot impersonate archived user",
      },
    };
  }

  return { success: true };
}

/**
 * Exit impersonation mode and return to original user context.
 * @returns Success status
 * @endpoint POST /auth/exit-impersonation
 */
export async function exitImpersonation(): Promise<ApiMutationResponse> {
  await delay(200);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// Phone-based Authentication (Beyond Violet SSO)
// ═══════════════════════════════════════════════════════════════════

/**
 * Request verification code via selected channel (Telegram/Max/Call/SMS).
 * @param phone Phone number in format +7 (XXX) XXX-XX-XX
 * @param channel Delivery channel for the code
 * @returns Success status
 * @endpoint POST /auth/phone/request
 */
export async function requestPhoneCode(
  phone: string,
  channel: "telegram" | "max" | "call" | "sms"
): Promise<ApiMutationResponse> {
  await delay(800);

  // Basic phone validation
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return {
      success: false,
      error: {
        code: "INVALID_PHONE",
        message: "Invalid phone number format",
      },
    };
  }

  return { success: true };
}

/**
 * Verify phone code and authenticate user.
 * @param phone Phone number used for code request
 * @param code 6-digit verification code
 * @returns Access token and user data
 * @endpoint POST /auth/phone/verify
 */
export async function verifyPhoneCode(
  phone: string,
  code: string
): Promise<ApiResponse<AuthTokenResponse>> {
  await delay(500);

  // Mock: any 6-digit code is valid
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Invalid verification code format");
  }

  // Find user by phone or return first SUPERVISOR for demo
  const user =
    MOCK_USERS.find((u) => u.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")) ??
    MOCK_USERS.find((u) => u.id === 4)!;

  return {
    data: {
      access_token: `mock_token_${user.id}_${Date.now()}`,
      user,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// Email Magic Link Authentication
// ═══════════════════════════════════════════════════════════════════

/**
 * Request magic link via email (works in RU without SMS dependencies).
 * @param email User email address
 * @returns Success status
 * @endpoint POST /auth/email/request
 */
export async function requestEmailMagicLink(
  email: string
): Promise<ApiMutationResponse> {
  await delay(800);

  // Basic email validation
  if (!email.includes("@")) {
    return {
      success: false,
      error: {
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      },
    };
  }

  return { success: true };
}

/**
 * Verify email magic link token and authenticate user.
 * @param token Magic link token from email
 * @returns Access token and user data
 * @endpoint GET /auth/email/verify
 */
export async function verifyEmailMagicLink(
  token: string
): Promise<ApiResponse<AuthTokenResponse>> {
  await delay(400);

  if (!token || token.length < 10) {
    throw new Error("Invalid magic link token");
  }

  // Return default SUPERVISOR for demo
  const user = MOCK_USERS.find((u) => u.id === 4)!;

  return {
    data: {
      access_token: `mock_email_token_${user.id}_${Date.now()}`,
      user,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// TOTP Authentication (Generic Authenticator App)
// ═══════════════════════════════════════════════════════════════════

/**
 * Setup TOTP for current user (generates secret and backup codes).
 * @returns TOTP secret, QR code URL, and backup codes
 * @endpoint POST /auth/totp/setup
 */
export async function setupTotp(): Promise<ApiResponse<TotpSetupResponse>> {
  await delay(500);

  // Generate mock TOTP setup data
  const secret = "JBSWY3DPEHPK3PXP"; // Base32 encoded mock secret
  const qr_url = `otpauth://totp/WFM:user@example.com?secret=${secret}&issuer=WFM`;
  const backup_codes = [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890",
    "UVWX-1234",
  ];

  return {
    data: {
      secret,
      qr_url,
      backup_codes,
    },
  };
}

/**
 * Verify TOTP code and authenticate user.
 * @param userId User ID attempting authentication
 * @param code 6-digit TOTP code from authenticator app
 * @returns Access token and user data
 * @endpoint POST /auth/totp/verify
 */
export async function verifyTotp(
  userId: number,
  code: string
): Promise<ApiResponse<AuthTokenResponse>> {
  await delay(400);

  // Mock: any 6-digit code is valid
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Invalid TOTP code format");
  }

  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    data: {
      access_token: `mock_totp_token_${user.id}_${Date.now()}`,
      user,
    },
  };
}

/**
 * Disable TOTP for current user (requires valid code for confirmation).
 * @param code Current valid TOTP code for verification
 * @returns Success status
 * @endpoint POST /auth/totp/disable
 */
export async function disableTotp(code: string): Promise<ApiMutationResponse> {
  await delay(400);

  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      error: {
        code: "INVALID_CODE",
        message: "Invalid TOTP code format",
      },
    };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// Locale Preferences
// ═══════════════════════════════════════════════════════════════════

/**
 * Update current user's locale preference.
 * @param locale New locale preference ('ru' | 'en')
 * @returns Success status
 * @endpoint PATCH /users/me/locale
 */
export async function updateUserLocale(
  locale: Locale
): Promise<ApiMutationResponse> {
  await delay(300);

  if (!["ru", "en"].includes(locale)) {
    return {
      success: false,
      error: {
        code: "INVALID_LOCALE",
        message: "Locale must be 'ru' or 'en'",
      },
    };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// Sessions (chat 35)
// ═══════════════════════════════════════════════════════════════════

/** Активная сессия пользователя — устройство + IP + местоположение */
export interface ActiveSession {
  id: string;
  device_name: string;
  device_type: "desktop" | "mobile" | "tablet";
  ip: string;
  city: string;
  last_activity_at: string;
  is_current: boolean;
}

/**
 * Get active sessions for the current user.
 * @returns List of active sessions
 * @endpoint GET /auth/sessions
 */
export async function getActiveSessions(): Promise<ApiResponse<ActiveSession[]>> {
  await delay(300);

  const sessions: ActiveSession[] = [
    {
      id: "sess-001",
      device_name: "Chrome on macOS",
      device_type: "desktop",
      ip: "213.87.143.12",
      city: "Томск",
      last_activity_at: new Date().toISOString(),
      is_current: true,
    },
    {
      id: "sess-002",
      device_name: "Safari on iPhone",
      device_type: "mobile",
      ip: "79.111.55.22",
      city: "Томск",
      last_activity_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_current: false,
    },
  ];

  return { data: sessions };
}

/**
 * Terminate a specific session (other than current).
 * @param sessionId Session ID to terminate
 * @returns Success status
 * @endpoint DELETE /auth/sessions/:id
 */
export async function terminateSession(
  sessionId: string,
): Promise<ApiMutationResponse> {
  await delay(300);

  if (!sessionId) {
    return {
      success: false,
      error: { code: "MISSING_SESSION_ID", message: "Session ID is required" },
    };
  }

  return { success: true };
}

/**
 * Terminate all sessions except current.
 * @returns Success status
 * @endpoint DELETE /auth/sessions
 */
export async function terminateAllOtherSessions(): Promise<ApiMutationResponse> {
  await delay(400);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// Profile Settings (chat 35)
// ═══════════════════════════════════════════════════════════════════

/** Профиль payload — full update личных данных. */
export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  phone?: string;
  date_of_birth?: string;
  avatar_url?: string;
  preferred_timezone?: string;
}

/**
 * Update current user profile (личные данные + аватар + таймзона).
 * @endpoint PATCH /users/me
 */
export async function updateProfile(
  data: ProfileUpdateData,
): Promise<ApiMutationResponse> {
  await delay(350);

  if (data.phone && !/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(data.phone)) {
    return {
      success: false,
      error: { code: "INVALID_PHONE", message: "Phone must match +7 (XXX) XXX-XX-XX format" },
    };
  }

  return { success: true };
}

/**
 * Upload new avatar (mock — returns generated URL).
 * @endpoint POST /users/me/avatar
 */
export async function uploadAvatar(
  fileName: string,
  fileSize: number,
): Promise<ApiResponse<{ url: string }>> {
  await delay(500);

  if (fileSize > 2 * 1024 * 1024) {
    throw new Error("Avatar file size must be less than 2 MB");
  }

  const url = `/avatars/${Date.now()}-${fileName}`;
  return { data: { url } };
}

/**
 * Remove user avatar (mock).
 * @endpoint DELETE /users/me/avatar
 */
export async function removeAvatar(): Promise<ApiMutationResponse> {
  await delay(250);
  return { success: true };
}

/**
 * Change password (mock — для users без SSO).
 * @endpoint POST /auth/change-password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiMutationResponse> {
  await delay(400);

  if (!currentPassword) return { success: false, error: { code: "EMPTY_CURRENT", message: "Current password required" } };
  if (newPassword.length < 8) return { success: false, error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters" } };
  return { success: true };
}
