/**
 * TypeScript типы зеркалят Pydantic schemas backend.
 *
 * Источник правды: backend/svc_users/app/domain/schemas.py + svc_tasks/.../schemas.py.
 * При изменении backend-контракта — обновлять здесь.
 *
 * Naming convention: `Backend{Entity}` чтобы не путать с admin domain types.
 */

// ── Common ──────────────────────────────────────────────────────────

export interface BackendStore {
  id: number;
  name: string;
  address?: string | null;
  external_code?: string | null;
  created_at: string; // ISO datetime
}

export interface BackendStoreListData {
  stores: BackendStore[];
}

// ── Permissions / Roles / Positions ──────────────────────────────────

export type BackendPermissionType =
  | "CASHIER"
  | "SALES_FLOOR"
  | "SELF_CHECKOUT"
  | "WAREHOUSE";

export interface BackendPermission {
  id: string; // UUID
  permission: BackendPermissionType;
  granted_at: string;
  granted_by: number;
}

export interface BackendRole {
  id: number;
  code: string; // "worker" | "manager"
  name: string;
  description?: string | null;
}

export interface BackendPosition {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  role?: BackendRole | null;
}

export interface BackendRank {
  id: number;
  code: string;
  name: string;
}

export interface BackendEmployeeType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

export interface BackendAssignment {
  id: number;
  external_id?: number | null;
  company_name?: string | null;
  position?: BackendPosition | null;
  rank?: BackendRank | null;
  store?: BackendStore | null;
  date_start?: string | null;
  date_end?: string | null;
}

export interface BackendUserMe {
  id: number;
  sso_id: string; // UUID
  external_id?: number | null;
  employee_type?: BackendEmployeeType | null;
  permissions: BackendPermission[];
  assignments: BackendAssignment[];
  // SSO-merged
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  gender?: string | null;
  birth_date?: string | null;
}
