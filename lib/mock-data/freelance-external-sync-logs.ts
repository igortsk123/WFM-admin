import type { ExternalHrSyncLog } from "@/lib/types";
import { daysAgoFrom } from "./_today";

/**
 * @endpoint GET /api/freelance/external-sync-logs
 * 5 ExternalHrSyncLog records from the last 7 days.
 * 2 successful + 1 partial (with error) + 1 manual trigger + 1 empty (just now).
 */
export const MOCK_EXTERNAL_SYNC_LOGS: ExternalHrSyncLog[] = [
  {
    /** Successful sync 6 days ago */
    id: "sync-001",
    occurred_at: daysAgoFrom(6),
    applications_received: 2,
    freelancers_created: 3,
    errors_count: 0,
    triggered_by: "SCHEDULE",
  },
  {
    /** Successful sync 4 days ago, brought external freelancers */
    id: "sync-002",
    occurred_at: daysAgoFrom(4),
    applications_received: 2,
    freelancers_created: 2,
    errors_count: 0,
    triggered_by: "SCHEDULE",
  },
  {
    /** Partial sync: 5 received, 4 processed, 1 error (bad phone format) */
    id: "sync-003",
    occurred_at: daysAgoFrom(3),
    applications_received: 5,
    freelancers_created: 4,
    errors_count: 1,
    errors: [
      {
        external_ref: "HR-2026-04-29-0099",
        error: "Неверный формат телефона",
      },
    ],
    triggered_by: "SCHEDULE",
  },
  {
    /** Manually triggered by Романов И.А. (id=4) — re-sync after error */
    id: "sync-004",
    occurred_at: daysAgoFrom(2),
    applications_received: 1,
    freelancers_created: 1,
    errors_count: 0,
    triggered_by: "MANUAL",
    triggered_by_user: 4,
  },
  {
    /** Fresh sync 5 minutes ago, nothing received */
    id: "sync-005",
    occurred_at: new Date(new Date('2026-05-01T10:00:00Z').getTime() - 5 * 60 * 1000).toISOString(),
    applications_received: 0,
    freelancers_created: 0,
    errors_count: 0,
    triggered_by: "SCHEDULE",
  },
];
