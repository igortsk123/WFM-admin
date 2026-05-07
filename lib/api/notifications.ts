/**
 * Notifications API — inbox management and preferences.
 * Notifications are archive-only (never deleted).
 */

import type {
  ApiResponse,
  ApiMutationResponse,
  ApiListParams,
  Notification,
  NotificationCategory,
} from "@/lib/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface NotificationsListResponse {
  data: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
  archived_count: number;
}

/** Filter params для notifications screen (chat 34). */
export interface NotificationListParams extends ApiListParams {
  search?: string;
  is_read?: boolean;
  /** Multi-фильтр по категориям. */
  categories?: NotificationCategory[];
  /** Single category (legacy). */
  category?: NotificationCategory;
  /** ISO date (created_at >= date_from). */
  date_from?: string;
  /** ISO date (created_at <= date_to). */
  date_to?: string;
  /** Включать ли архивные. По умолчанию false. */
  include_archived?: boolean;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  blocked_categories: NotificationCategory[];
}

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated notifications with unread/archived counts.
 * @endpoint GET /notifications/list
 */
export async function getNotifications(
  params: NotificationListParams = {}
): Promise<NotificationsListResponse> {
  await delay(300);

  const {
    is_read,
    category,
    categories,
    date_from,
    date_to,
    include_archived = false,
    search,
    page = 1,
    page_size = 20,
  } = params;

  let filtered = [...MOCK_NOTIFICATIONS];
  if (!include_archived) filtered = filtered.filter((n) => !n.is_archived);

  if (is_read !== undefined) filtered = filtered.filter((n) => n.is_read === is_read);

  // Multi-категории (если указаны) — иначе single category для legacy.
  const effectiveCategories = categories && categories.length > 0
    ? categories
    : (category ? [category] : null);
  if (effectiveCategories) {
    filtered = filtered.filter((n) => effectiveCategories.includes(n.category));
  }

  if (date_from) filtered = filtered.filter((n) => n.created_at >= date_from);
  if (date_to) filtered = filtered.filter((n) => n.created_at <= date_to);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const unread_count = MOCK_NOTIFICATIONS.filter((n) => !n.is_read && !n.is_archived).length;
  const archived_count = MOCK_NOTIFICATIONS.filter((n) => n.is_archived).length;

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size, unread_count, archived_count };
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mark a single notification as read.
 * @endpoint POST /notifications/:id/read
 */
export async function markRead(id: string): Promise<ApiMutationResponse> {
  await delay(200);
  const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
  if (!notif) return { success: false, error: { code: "NOT_FOUND", message: `Notification ${id} not found` } };
  return { success: true };
}

/**
 * Mark all unread notifications as read.
 * @endpoint POST /notifications/read-all
 */
export async function markAllRead(): Promise<ApiMutationResponse> {
  await delay(300);
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.is_read && !n.is_archived).length;
  return { success: true };
}

/**
 * Archive a notification (archive-only, never deleted).
 * @endpoint POST /notifications/:id/archive
 */
export async function archiveNotification(id: string): Promise<ApiMutationResponse> {
  await delay(200);
  const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
  if (!notif) return { success: false, error: { code: "NOT_FOUND", message: `Notification ${id} not found` } };
  if (notif.is_archived) return { success: false, error: { code: "ALREADY_ARCHIVED", message: "Already archived" } };
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get notification preferences for current user.
 * @endpoint GET /notifications/preferences
 */
export async function getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
  await delay(200);
  return {
    data: {
      push_enabled: true,
      blocked_categories: [],
    },
  };
}

/**
 * Update notification preferences.
 * @endpoint PATCH /notifications/preferences
 */
export async function updatePreferences(
  data: Partial<NotificationPreferences>
): Promise<ApiMutationResponse> {
  await delay(300);
  return { success: true };
}
