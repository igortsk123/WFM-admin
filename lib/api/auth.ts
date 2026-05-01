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
        ? (roleAssignment.scope_ids[0] as string) ?? "org-spar"
        : "org-spar",
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
  console.log(`[v0] Switched to role: ${role}`);
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

  console.log(`[v0] Impersonating user: ${targetUser.first_name} ${targetUser.last_name}`);
  return { success: true };
}

/**
 * Exit impersonation mode and return to original user context.
 * @returns Success status
 * @endpoint POST /auth/exit-impersonation
 */
export async function exitImpersonation(): Promise<ApiMutationResponse> {
  await delay(200);
  console.log("[v0] Exited impersonation mode");
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

  console.log(`[v0] Verification code sent via ${channel} to ${phone}`);
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

  console.log(`[v0] Magic link sent to ${email}`);
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

  console.log("[v0] TOTP disabled for current user");
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

  console.log(`[v0] User locale updated to: ${locale}`);
  return { success: true };
}
