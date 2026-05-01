/**
 * Single source of truth for mock "current date".
 * Import MOCK_TODAY in all freelance mock files that need relative dates.
 * All relative date helpers are calculated from this constant, not from Date.now(),
 * so mocks stay consistent regardless of when the app is run.
 */
export const MOCK_TODAY = new Date('2026-05-01T10:00:00Z');

/** Returns an ISO string for N days in the future relative to MOCK_TODAY */
export function daysFromNow(days: number): string {
  const d = new Date(MOCK_TODAY.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

/** Returns an ISO string for N days in the past relative to MOCK_TODAY */
export function daysAgoFrom(days: number): string {
  const d = new Date(MOCK_TODAY.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

/** Returns an ISO date string (YYYY-MM-DD) for N days from MOCK_TODAY */
export function dateFromNow(days: number): string {
  return daysFromNow(days).slice(0, 10);
}

/** Returns an ISO date string (YYYY-MM-DD) for N days ago from MOCK_TODAY */
export function dateAgo(days: number): string {
  return daysAgoFrom(days).slice(0, 10);
}
