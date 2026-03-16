/**
 * 2026 NCAA Tournament Tip-Off Schedule
 * All times in UTC. Source: NCAA.com official schedule.
 *
 * Per-game locking: a user cannot change their pick for a matchup once
 * that game's tip-off time has passed, even if the global bracket lock
 * has not been triggered.
 */

export interface TipoffEntry {
  matchupId: string;   // matches the matchupId format used in picks table
  tipoffUtc: string;   // ISO 8601 UTC timestamp
  label: string;       // human-readable description
}

// First Four — Dayton, OH (UD Arena)
// Tuesday March 17 & Wednesday March 18
// All times converted from ET to UTC (ET = UTC-4 in March)
export const TIPOFF_SCHEDULE_2026: TipoffEntry[] = [
  // ── FIRST FOUR ──────────────────────────────────────────────────────────────
  // TUE March 17 6:40 PM ET = 22:40 UTC
  { matchupId: "Midwest-firstfour-16", tipoffUtc: "2026-03-17T22:40:00Z", label: "First Four: UMBC vs Howard (Midwest #16)" },
  // TUE March 17 9:15 PM ET = 01:15 UTC (next day)
  { matchupId: "West-firstfour-11",   tipoffUtc: "2026-03-18T01:15:00Z", label: "First Four: Texas vs NC State (West #11)" },
  // WED March 18 6:40 PM ET = 22:40 UTC
  { matchupId: "South-firstfour-16",  tipoffUtc: "2026-03-18T22:40:00Z", label: "First Four: Prairie View vs Lehigh (South #16)" },
  // WED March 18 9:15 PM ET = 01:15 UTC (next day)
  { matchupId: "Midwest-firstfour-11",tipoffUtc: "2026-03-19T01:15:00Z", label: "First Four: Miami OH vs SMU (Midwest #11)" },

  // ── ROUND OF 64 — THURSDAY MARCH 19 ─────────────────────────────────────────
  // 12:15 PM ET = 16:15 UTC
  { matchupId: "East-round64-0",   tipoffUtc: "2026-03-19T16:15:00Z", label: "Duke vs Siena (East 1/16)" },
  // 12:40 PM ET = 16:40 UTC
  { matchupId: "South-round64-3",  tipoffUtc: "2026-03-19T16:40:00Z", label: "Nebraska vs Troy (South 4/13)" },
  // 1:30 PM ET = 17:30 UTC
  { matchupId: "East-round64-5",   tipoffUtc: "2026-03-19T17:30:00Z", label: "Louisville vs USF (East 6/11)" },
  // 1:50 PM ET = 17:50 UTC
  { matchupId: "West-round64-4",   tipoffUtc: "2026-03-19T17:50:00Z", label: "Wisconsin vs High Point (West 5/12)" },
  // 2:50 PM ET = 18:50 UTC
  { matchupId: "East-round64-1",   tipoffUtc: "2026-03-19T18:50:00Z", label: "Ohio State vs TCU (East 8/9)" },
  // 3:15 PM ET = 19:15 UTC
  { matchupId: "South-round64-4",  tipoffUtc: "2026-03-19T19:15:00Z", label: "Vanderbilt vs McNeese (South 5/12)" },
  // 4:05 PM ET = 20:05 UTC
  { matchupId: "East-round64-6",   tipoffUtc: "2026-03-19T20:05:00Z", label: "Michigan State vs NDSU (East 3/14)" },
  // 4:25 PM ET = 20:25 UTC
  { matchupId: "West-round64-3",   tipoffUtc: "2026-03-19T20:25:00Z", label: "Arkansas vs Hawaii (West 4/13)" },
  // 6:50 PM ET = 22:50 UTC
  { matchupId: "South-round64-5",  tipoffUtc: "2026-03-19T22:50:00Z", label: "UNC vs VCU (South 6/11)" },
  // 7:35 PM ET = 23:35 UTC
  { matchupId: "South-round64-6",  tipoffUtc: "2026-03-19T23:35:00Z", label: "Saint Mary's vs Texas A&M (South 7/10)" },
  // 9:25 PM ET = 01:25 UTC (next day)
  { matchupId: "South-round64-7",  tipoffUtc: "2026-03-20T01:25:00Z", label: "Illinois vs Penn (South 3/14)" },
  // 9:45 PM ET = 01:45 UTC (next day)
  { matchupId: "Midwest-round64-1",tipoffUtc: "2026-03-20T01:45:00Z", label: "Georgia vs Saint Louis (Midwest 8/9)" },
  // 10:00 PM ET = 02:00 UTC (next day)
  { matchupId: "West-round64-6",   tipoffUtc: "2026-03-20T02:00:00Z", label: "Gonzaga vs Kennesaw State (West 3/14)" },
  // 10:10 PM ET = 02:10 UTC (next day)
  { matchupId: "South-round64-0",  tipoffUtc: "2026-03-20T02:10:00Z", label: "Houston vs Idaho (South 2/15)" },

  // ── ROUND OF 64 — FRIDAY MARCH 20 ───────────────────────────────────────────
  // 12:15 PM ET = 16:15 UTC
  { matchupId: "Midwest-round64-6",tipoffUtc: "2026-03-20T16:15:00Z", label: "Kentucky vs Santa Clara (Midwest 7/10)" },
  // 12:40 PM ET = 16:40 UTC
  { matchupId: "Midwest-round64-4",tipoffUtc: "2026-03-20T16:40:00Z", label: "Texas Tech vs Akron (Midwest 5/12)" },
  // 1:35 PM ET = 17:35 UTC
  { matchupId: "West-round64-0",   tipoffUtc: "2026-03-20T17:35:00Z", label: "Arizona vs LIU (West 1/16)" },
  // 1:50 PM ET = 17:50 UTC
  { matchupId: "Midwest-round64-7",tipoffUtc: "2026-03-20T17:50:00Z", label: "Virginia vs Wright State (Midwest 3/14)" },
  // 2:50 PM ET = 18:50 UTC
  { matchupId: "Midwest-round64-0",tipoffUtc: "2026-03-20T18:50:00Z", label: "Michigan vs Tennessee State (Midwest 1/16)" },
  // 3:15 PM ET = 19:15 UTC
  { matchupId: "Midwest-round64-3",tipoffUtc: "2026-03-20T19:15:00Z", label: "Alabama vs Hofstra (Midwest 4/13)" },
  // 4:10 PM ET = 20:10 UTC
  { matchupId: "West-round64-1",   tipoffUtc: "2026-03-20T20:10:00Z", label: "Villanova vs Utah State (West 8/9)" },
  // 6:50 PM ET = 22:50 UTC
  { matchupId: "South-round64-1",  tipoffUtc: "2026-03-20T22:50:00Z", label: "Clemson vs Iowa (South 8/9)" },
  // 7:10 PM ET = 23:10 UTC
  { matchupId: "East-round64-4",   tipoffUtc: "2026-03-20T23:10:00Z", label: "St. John's vs Northern Iowa (East 5/12)" },
  // 7:25 PM ET = 23:25 UTC
  { matchupId: "East-round64-7",   tipoffUtc: "2026-03-20T23:25:00Z", label: "UCLA vs UCF (East 7/10)" },
  // 7:35 PM ET = 23:35 UTC
  { matchupId: "West-round64-7",   tipoffUtc: "2026-03-20T23:35:00Z", label: "Purdue vs Queens (West 2/15)" },
  // 9:45 PM ET = 01:45 UTC (next day)
  { matchupId: "East-round64-3",   tipoffUtc: "2026-03-21T01:45:00Z", label: "Kansas vs Cal Baptist (East 4/13)" },
  // 10:00 PM ET = 02:00 UTC (next day)
  { matchupId: "East-round64-2",   tipoffUtc: "2026-03-21T02:00:00Z", label: "UConn vs Furman (East 2/15)" },
  // 10:10 PM ET = 02:10 UTC (next day)
  { matchupId: "West-round64-5",   tipoffUtc: "2026-03-21T02:10:00Z", label: "BYU vs Missouri (West 6/10)" },
  // 10:10 PM ET = 02:10 UTC (next day) - Midwest #2 slot
  { matchupId: "Midwest-round64-2",tipoffUtc: "2026-03-21T02:10:00Z", label: "Iowa State vs Tennessee State (Midwest 2/15)" },
];

/**
 * Returns true if the given matchupId's game has already tipped off.
 * Used server-side to block pick changes after tip-off.
 */
export function isMatchupLocked(matchupId: string, now: Date = new Date()): boolean {
  const entry = TIPOFF_SCHEDULE_2026.find(e => e.matchupId === matchupId);
  if (!entry) return false; // unknown matchup = not locked by schedule (use global lock)
  return now >= new Date(entry.tipoffUtc);
}

/**
 * Returns the tip-off time for a matchup, or null if not in schedule.
 */
export function getTipoffTime(matchupId: string): Date | null {
  const entry = TIPOFF_SCHEDULE_2026.find(e => e.matchupId === matchupId);
  return entry ? new Date(entry.tipoffUtc) : null;
}
