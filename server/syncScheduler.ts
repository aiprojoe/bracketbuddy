/**
 * ESPN Sync Scheduler
 *
 * Runs syncEspnScores() on a smart interval:
 *  - Every 5 minutes  during active tournament game windows (game days, 11am–midnight ET)
 *  - Every 60 minutes during the tournament off-hours (overnight, between rounds)
 *  - Every 6 hours    outside the tournament window entirely
 *
 * Tournament 2026 window: March 18 – April 7
 *
 * Designed to be started once at server boot and cleaned up on graceful shutdown.
 */

import { syncEspnScores } from "./espnSync";

// ─── Tournament Calendar ──────────────────────────────────────────────────────

// UTC dates for 2026 tournament (inclusive)
const TOURNAMENT_START = new Date("2026-03-18T00:00:00Z");
const TOURNAMENT_END   = new Date("2026-04-08T06:00:00Z"); // day after championship

// Game-day dates (YYYY-MM-DD in ET, stored as UTC date strings for comparison)
const GAME_DAYS = new Set([
  "2026-03-18", "2026-03-19", // First Four
  "2026-03-20", "2026-03-21", // Round of 64
  "2026-03-22", "2026-03-23", // Round of 32
  "2026-03-27", "2026-03-28", // Sweet 16
  "2026-03-29", "2026-03-30", // Elite Eight
  "2026-04-04", "2026-04-05", // Final Four
  "2026-04-07",               // Championship
]);

// Game hours in ET (UTC-4 during DST): games run roughly 12pm–midnight ET = 16:00–04:00 UTC
const GAME_HOUR_START_UTC = 15; // 11am ET = 3pm UTC (buffer)
const GAME_HOUR_END_UTC   = 5;  // midnight ET = 4am UTC (next day, so we wrap around)

function isWithinTournamentWindow(): boolean {
  const now = new Date();
  return now >= TOURNAMENT_START && now <= TOURNAMENT_END;
}

function isGameDay(): boolean {
  // Check today and yesterday (for late games that bleed past midnight)
  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayUTC = yesterday.toISOString().slice(0, 10);
  return GAME_DAYS.has(todayUTC) || GAME_DAYS.has(yesterdayUTC);
}

function isActiveGameHour(): boolean {
  const hour = new Date().getUTCHours();
  // Game hours wrap midnight: 15:00–23:59 or 00:00–05:00
  return hour >= GAME_HOUR_START_UTC || hour <= GAME_HOUR_END_UTC;
}

function getIntervalMs(): number {
  if (!isWithinTournamentWindow()) {
    return 6 * 60 * 60 * 1000;   // 6 hours — off-season
  }
  if (isGameDay() && isActiveGameHour()) {
    return 5 * 60 * 1000;         // 5 minutes — active game window
  }
  return 60 * 60 * 1000;          // 1 hour — tournament but no games right now
}

function getIntervalLabel(ms: number): string {
  if (ms <= 5 * 60 * 1000) return "5 min (active game window)";
  if (ms <= 60 * 60 * 1000) return "1 hr (tournament off-hours)";
  return "6 hr (off-season)";
}

// ─── Scheduler State ──────────────────────────────────────────────────────────

export interface SchedulerStatus {
  running: boolean;
  currentIntervalMs: number;
  currentIntervalLabel: string;
  lastRunAt: Date | null;
  lastRunResult: string | null;
  nextRunAt: Date | null;
  totalRuns: number;
  totalPicksScored: number;
  errors: string[];
}

const state: SchedulerStatus = {
  running: false,
  currentIntervalMs: 0,
  currentIntervalLabel: "not started",
  lastRunAt: null,
  lastRunResult: null,
  nextRunAt: null,
  totalRuns: 0,
  totalPicksScored: 0,
  errors: [],
};

let timerId: ReturnType<typeof setTimeout> | null = null;

export function getSchedulerStatus(): SchedulerStatus {
  return { ...state };
}

// ─── Core Sync Loop ───────────────────────────────────────────────────────────

async function runSync(): Promise<void> {
  if (!state.running) return;

  const startedAt = new Date();
  console.log(`[SyncScheduler] Running ESPN sync at ${startedAt.toISOString()}`);

  try {
    const result = await syncEspnScores(2026);
    state.lastRunAt = startedAt;
    state.totalRuns++;
    state.totalPicksScored += result.picksScored;
    state.lastRunResult = `✅ ${result.gamesCompleted} games complete, ${result.picksScored} picks scored`;

    if (result.errors.length > 0) {
      const errMsg = `⚠️ ${result.errors.length} error(s): ${result.errors[0]}`;
      state.lastRunResult += ` | ${errMsg}`;
      // Keep last 5 errors
      state.errors = [...result.errors.slice(0, 3), ...state.errors].slice(0, 5);
      console.warn(`[SyncScheduler] Errors:`, result.errors);
    }

    console.log(`[SyncScheduler] ${state.lastRunResult}`);
  } catch (err) {
    const errMsg = `❌ Sync failed: ${err}`;
    state.lastRunResult = errMsg;
    state.errors = [errMsg, ...state.errors].slice(0, 5);
    console.error(`[SyncScheduler] ${errMsg}`);
  }

  // Schedule next run with the current smart interval
  scheduleNext();
}

function scheduleNext(): void {
  if (!state.running) return;

  const intervalMs = getIntervalMs();
  state.currentIntervalMs = intervalMs;
  state.currentIntervalLabel = getIntervalLabel(intervalMs);
  state.nextRunAt = new Date(Date.now() + intervalMs);

  timerId = setTimeout(runSync, intervalMs);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the sync scheduler. Safe to call multiple times — will no-op if already running.
 */
export function startSyncScheduler(): void {
  if (state.running) {
    console.log("[SyncScheduler] Already running, skipping start.");
    return;
  }

  state.running = true;
  const intervalMs = getIntervalMs();
  state.currentIntervalMs = intervalMs;
  state.currentIntervalLabel = getIntervalLabel(intervalMs);

  console.log(`[SyncScheduler] Started. Initial interval: ${state.currentIntervalLabel}`);

  // Run an initial sync immediately (with a short delay to let DB connect)
  timerId = setTimeout(runSync, 10_000); // 10s delay on startup
  state.nextRunAt = new Date(Date.now() + 10_000);
}

/**
 * Stop the scheduler gracefully. Called on SIGTERM/SIGINT.
 */
export function stopSyncScheduler(): void {
  if (!state.running) return;
  state.running = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  console.log("[SyncScheduler] Stopped.");
}

/**
 * Trigger an immediate sync outside the normal schedule (e.g. admin "Sync Now" button).
 * Resets the next scheduled run timer.
 */
export async function triggerImmediateSync(): Promise<void> {
  // Cancel the pending timer
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  await runSync();
}
