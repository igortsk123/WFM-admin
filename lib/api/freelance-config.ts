/**
 * Freelance Config API — platform-level configuration endpoints.
 * updatePaymentMode is PLATFORM_ADMIN only; changes are audit-logged with platform_action=true.
 * All other roles see payment_mode and freelance settings as read-only.
 */

import type {
  ApiResponse,
  ApiMutationResponse,
  PaymentMode,
} from "@/lib/types";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// In-memory mutable org config (demo only; resets on refresh)
let _orgConfig = { ...MOCK_ORGANIZATIONS.find((o) => o.id === "org-lama")! };

export function _resetFreelanceConfigMock() {
  _orgConfig = { ...MOCK_ORGANIZATIONS.find((o) => o.id === "org-lama")! };
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG RESPONSE TYPE
// ═══════════════════════════════════════════════════════════════════

export interface FreelanceConfig {
  payment_mode: PaymentMode;
  freelance_module_enabled: boolean;
  external_hr_enabled: boolean;
  /** Connection status of the Nominal Account service (NOMINAL_ACCOUNT mode only) */
  nominal_account_status: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
}

// ═══════════════════════════════════════════════════════════════════
// GET CONFIG
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the current organization's freelance module configuration.
 * All roles can read this to determine which sections to show/hide.
 * @returns FreelanceConfig for the current tenant
 * @endpoint GET /organizations/me/freelance-config
 * @roles All authenticated roles (read-only for non-PLATFORM_ADMIN)
 */
export async function getOrganizationFreelanceConfig(): Promise<
  ApiResponse<FreelanceConfig>
> {
  await delay(rand(150, 300));

  const nominalAccountStatus: FreelanceConfig["nominal_account_status"] =
    _orgConfig.payment_mode === "NOMINAL_ACCOUNT" ? "CONNECTED" : "NOT_CONNECTED";

  return {
    data: {
      payment_mode: _orgConfig.payment_mode,
      freelance_module_enabled: _orgConfig.freelance_module_enabled,
      external_hr_enabled: _orgConfig.external_hr_enabled,
      nominal_account_status: nominalAccountStatus,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE PAYMENT MODE (PLATFORM_ADMIN only)
// ═══════════════════════════════════════════════════════════════════

/**
 * Change the organization's payment mode.
 * Restricted to PLATFORM_ADMIN. Audit-logged with platform_action=true.
 * Changing CLIENT_DIRECT → NOMINAL_ACCOUNT requires nominal account to be connected.
 * @param mode New payment mode
 * @returns Success or 403 FORBIDDEN
 * @endpoint PATCH /organizations/me/payment-mode
 * @roles PLATFORM_ADMIN only (all others → 403)
 */
export async function updatePaymentMode(
  mode: PaymentMode
): Promise<ApiMutationResponse> {
  await delay(rand(400, 600));

  const validModes: PaymentMode[] = ["NOMINAL_ACCOUNT", "CLIENT_DIRECT"];
  if (!validModes.includes(mode)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid payment_mode: ${mode}. Allowed: ${validModes.join(", ")}`,
      },
    };
  }

  const previousMode = _orgConfig.payment_mode;
  if (previousMode === mode) {
    return {
      success: false,
      error: {
        code: "NO_CHANGE",
        message: `Payment mode is already ${mode}`,
      },
    };
  }

  _orgConfig = { ..._orgConfig, payment_mode: mode };

  // Simulate audit log
  console.log(
    `[v0] audit: payment_mode_change org=org-spar from=${previousMode} to=${mode} platform_action=true`
  );

  return {
    success: true,
    warning:
      mode === "NOMINAL_ACCOUNT"
        ? "Режим сменён на NOMINAL_ACCOUNT. Убедитесь что Номинальный счёт подключён в настройках интеграций."
        : "Режим сменён на CLIENT_DIRECT. Разделы «Агенты» и «Реестр выплат» будут скрыты для всех ролей.",
  };
}
