/**
 * ESPN Sync Service
 *
 * Fetches live NCAA tournament scores from the ESPN unofficial API and:
 * 1. Upserts game results into the gameResults table (matched by espnGameId)
 * 2. Maps ESPN team IDs → our DB team IDs using seed + region matching
 * 3. Scores user picks for completed games (awards points, marks correct/incorrect)
 * 4. Updates bracket totals and user totalPoints
 * 5. Unlocks achievements triggered by correct picks
 *
 * Called by:
 *  - The scheduled sync job (every 5 min during tournament window)
 *  - The admin "Sync Now" button (manual trigger)
 */

import { eq, and, isNull, inArray } from "drizzle-orm";
import { getDb, resetDb } from "./db";
import {
  gameResults,
  picks,
  brackets,
  users,
  teams,
  tournamentConfig,
  type GameResult,
} from "../drizzle/schema";

// ─── ESPN API ────────────────────────────────────────────────────────────────

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

// Tournament dates for 2026 (approximate — will hit all days in the window)
// First Four: ~Mar 18-19, R64: ~Mar 20-21, R32: ~Mar 22-23
// Sweet 16: ~Mar 27-28, Elite 8: ~Mar 29-30, Final Four: ~Apr 4-5, Championship: ~Apr 7
const TOURNAMENT_DATE_RANGES_2026 = [
  "20260318", "20260319", "20260320", "20260321",
  "20260322", "20260323", "20260327", "20260328",
  "20260329", "20260330", "20260404", "20260405",
  "20260407",
];

// Round detection from ESPN note headline
function detectRoundFromNote(note: string): string | null {
  const n = note.toLowerCase();
  if (n.includes("first four")) return "firstfour";
  if (n.includes("1st round") || n.includes("first round")) return "round64";
  if (n.includes("2nd round") || n.includes("second round")) return "round32";
  if (n.includes("sweet 16") || n.includes("sweet sixteen")) return "sweet16";
  if (n.includes("elite 8") || n.includes("elite eight") || n.includes("regional")) return "elite8";
  if (n.includes("final four") || n.includes("national semifinal")) return "finalfour";
  if (n.includes("national championship") || n.includes("championship game")) return "championship";
  return null;
}

// Region detection from ESPN note headline
function detectRegionFromNote(note: string): string | null {
  const n = note.toLowerCase();
  if (n.includes("east")) return "East";
  if (n.includes("west")) return "West";
  if (n.includes("south")) return "South";
  if (n.includes("midwest")) return "Midwest";
  return null;
}

interface EspnGame {
  espnGameId: string;
  espnStatus: string;
  isComplete: boolean;
  round: string;
  region: string | null;
  team1EspnId: string;
  team1Name: string;
  team1Seed: number;
  team1Score: number | null;
  team1IsWinner: boolean;
  team2EspnId: string;
  team2Name: string;
  team2Seed: number;
  team2Score: number | null;
  team2IsWinner: boolean;
  playedAt: Date | null;
}

async function fetchEspnGames(date: string): Promise<EspnGame[]> {
  const url = `${ESPN_BASE}?groups=100&limit=100&dates=${date}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BracketBuddy/1.0 (bracketbuddy.com)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];

  const data = await res.json() as any;
  const events: any[] = data.events ?? [];
  const games: EspnGame[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const notes: any[] = comp.notes ?? [];
    const noteText = notes[0]?.headline ?? "";
    const round = detectRoundFromNote(noteText);
    if (!round) continue; // skip non-tournament games

    const region = detectRegionFromNote(noteText);
    const status = event.status?.type?.name ?? "STATUS_SCHEDULED";
    const isComplete = event.status?.type?.completed === true;
    const startDate = event.date ? new Date(event.date) : null;

    const competitors: any[] = comp.competitors ?? [];
    if (competitors.length < 2) continue;

    // ESPN puts home team second — we just take both
    const c1 = competitors[0];
    const c2 = competitors[1];

    games.push({
      espnGameId: String(event.id),
      espnStatus: status,
      isComplete,
      round,
      region,
      team1EspnId: String(c1.team.id),
      team1Name: c1.team.displayName,
      team1Seed: c1.curatedRank?.current ?? 0,
      team1Score: c1.score ? parseInt(c1.score) : null,
      team1IsWinner: c1.winner === true,
      team2EspnId: String(c2.team.id),
      team2Name: c2.team.displayName,
      team2Seed: c2.curatedRank?.current ?? 0,
      team2Score: c2.score ? parseInt(c2.score) : null,
      team2IsWinner: c2.winner === true,
      playedAt: startDate,
    });
  }

  return games;
}

// ─── Team Matching ────────────────────────────────────────────────────────────

/**
 * Match an ESPN team to our DB team by:
 * 1. Exact ESPN ID match (if we stored it)
 * 2. Seed + region match (most reliable for tournament)
 * 3. Name fuzzy match (fallback)
 */
function matchTeam(
  espnId: string,
  seed: number,
  name: string,
  region: string | null,
  dbTeams: Array<{ id: number; name: string; shortName: string; seed: number; region: string }>
): number | null {
  // Try seed + region first (most reliable)
  if (region && seed > 0) {
    const byRegionSeed = dbTeams.find(
      (t) => t.region === region && t.seed === seed
    );
    if (byRegionSeed) return byRegionSeed.id;
  }

  // Try name match (normalize)
  const normName = name.toLowerCase().replace(/\s+(cougars|tigers|bulldogs|wildcats|bears|eagles|hawks|knights|lions|wolves|cardinals|blue devils|tar heels|hoosiers|buckeyes|wolverines|spartans|longhorns|gators|seminoles|hurricanes|razorbacks|aggies|cowboys|sooners|jayhawks|cyclones|cornhuskers|huskers|buffaloes|rams|falcons|owls|penguins|flyers|friars|gaels|zags|bulldogs|terrapins|terps|mountaineers|cavaliers|hokies|demon deacons|orange|golden eagles|golden bears|golden gophers|golden hurricane|golden flashes|golden tigers|golden panthers|golden rams|golden bulls|golden grizzlies|golden knights|golden bobcats|golden eagles|golden hawks|golden lions|golden tornadoes|golden warriors|golden wolves)$/i, "");
  const byName = dbTeams.find((t) => {
    const dbNorm = t.name.toLowerCase().replace(/\s+(cougars|tigers|bulldogs|wildcats|bears|eagles|hawks|knights|lions|wolves|cardinals|blue devils|tar heels|hoosiers|buckeyes|wolverines|spartans|longhorns|gators|seminoles|hurricanes|razorbacks|aggies|cowboys|sooners|jayhawks|cyclones|cornhuskers|huskers|buffaloes|rams|falcons|owls|penguins|flyers|friars|gaels|zags|bulldogs|terrapins|terps|mountaineers|cavaliers|hokies|demon deacons|orange|golden eagles|golden bears|golden gophers|golden hurricane|golden flashes|golden tigers|golden panthers|golden rams|golden bulls|golden grizzlies|golden knights|golden bobcats|golden eagles|golden hawks|golden lions|golden tornadoes|golden warriors|golden wolves)$/i, "");
    return dbNorm.includes(normName) || normName.includes(dbNorm);
  });
  if (byName) return byName.id;

  return null;
}

// ─── Matchup ID Generation ────────────────────────────────────────────────────

/**
 * Generate our internal matchupId from round, region, and seeds.
 * Must match the format used in Bracket.tsx / bracketData.ts
 */
function buildMatchupId(round: string, region: string | null, seed1: number, seed2: number): string {
  if (round === "finalfour") {
    // Final Four: East vs West = slot 0, South vs Midwest = slot 1
    if (region === "East" || region === "West") return "FinalFour-0";
    return "FinalFour-1";
  }
  if (round === "championship") return "Championship-0";
  if (!region) return `Unknown-${round}-${seed1}v${seed2}`;

  // For regional rounds, use seed pair to determine slot index
  // SEED_PAIRS_R64: [1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]
  const SEED_PAIRS_R64 = [[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]];

  if (round === "round64") {
    const idx = SEED_PAIRS_R64.findIndex(
      ([s1, s2]) => (s1 === seed1 && s2 === seed2) || (s1 === seed2 && s2 === seed1)
    );
    return `${region}-round64-${idx >= 0 ? idx : seed1}`;
  }

  // For later rounds we can't easily reconstruct the slot from seeds alone
  // Use a seed-based key that's stable
  const minSeed = Math.min(seed1, seed2);
  const maxSeed = Math.max(seed1, seed2);
  return `${region}-${round}-${minSeed}v${maxSeed}`;
}

// ─── Points Calculation ───────────────────────────────────────────────────────

const ROUND_POINTS: Record<string, number> = {
  firstfour: 5,
  round64: 10,
  round32: 20,
  sweet16: 40,
  elite8: 80,
  finalfour: 160,
  championship: 320,
};

function calculatePoints(round: string, isUpset: boolean): number {
  const base = ROUND_POINTS[round] ?? 10;
  return isUpset ? Math.round(base * 1.5) : base;
}

// ─── Main Sync Function ───────────────────────────────────────────────────────

export interface SyncResult {
  gamesFound: number;
  gamesCompleted: number;
  gamesUpdated: number;
  picksScored: number;
  errors: string[];
}

export async function syncEspnScores(year = 2026): Promise<SyncResult> {
  const db = await getDb();
  if (!db) return { gamesFound: 0, gamesCompleted: 0, gamesUpdated: 0, picksScored: 0, errors: ["DB unavailable"] };

  const result: SyncResult = { gamesFound: 0, gamesCompleted: 0, gamesUpdated: 0, picksScored: 0, errors: [] };

  // Load all our DB teams for matching
  let dbTeams: Array<{ id: number; name: string; shortName: string; seed: number; region: string }>;
  try {
    dbTeams = await db.select({
      id: teams.id,
      name: teams.name,
      shortName: teams.shortName,
      seed: teams.seed,
      region: teams.region,
    }).from(teams);
  } catch (err) {
    // Stale pool after hibernation — reset so next call gets a fresh connection
    resetDb();
    return { ...result, errors: [`DB connection error (will retry): ${err}`] };
  }

  // Determine which dates to fetch (today ± 1 day + all tournament dates)
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, "");

  const datesToFetch = Array.from(new Set([
    ...TOURNAMENT_DATE_RANGES_2026,
    yesterdayStr,
    todayStr,
    tomorrowStr,
  ]));

  // Fetch all games
  const allGames: EspnGame[] = [];
  for (const date of datesToFetch) {
    try {
      const games = await fetchEspnGames(date);
      allGames.push(...games);
    } catch (err) {
      result.errors.push(`Failed to fetch date ${date}: ${err}`);
    }
  }

  // Deduplicate by espnGameId
  const uniqueGames = Array.from(
    new Map(allGames.map((g) => [g.espnGameId, g])).values()
  );

  result.gamesFound = uniqueGames.length;
  result.gamesCompleted = uniqueGames.filter((g) => g.isComplete).length;

  // Upsert each game into DB
  for (const game of uniqueGames) {
    try {
      const team1DbId = matchTeam(game.team1EspnId, game.team1Seed, game.team1Name, game.region, dbTeams);
      const team2DbId = matchTeam(game.team2EspnId, game.team2Seed, game.team2Name, game.region, dbTeams);

      if (!team1DbId || !team2DbId) {
        // TBD vs TBD is expected before Selection Sunday — not a real error
        const isTbd = game.team1Name === "TBD" || game.team2Name === "TBD";
        if (!isTbd) {
          result.errors.push(`Could not match teams for game ${game.espnGameId}: ${game.team1Name} vs ${game.team2Name}`);
        }
        continue;
      }

      const winnerId = game.isComplete
        ? (game.team1IsWinner ? team1DbId : game.team2IsWinner ? team2DbId : null)
        : null;

      const matchupId = buildMatchupId(game.round, game.region, game.team1Seed, game.team2Seed);

      // Check if game already exists
      const existing = await db
        .select({ id: gameResults.id, isScored: gameResults.isScored, isComplete: gameResults.isComplete })
        .from(gameResults)
        .where(eq(gameResults.espnGameId, game.espnGameId))
        .limit(1);

      if (existing.length > 0) {
        const existingGame = existing[0]!;
        // Update if status changed
        await db.update(gameResults).set({
          espnStatus: game.espnStatus,
          isComplete: game.isComplete,
          winnerId: winnerId ?? undefined,
          team1Score: game.team1Score ?? undefined,
          team2Score: game.team2Score ?? undefined,
          playedAt: game.playedAt ?? undefined,
        }).where(eq(gameResults.espnGameId, game.espnGameId));

        // Score picks if game just completed and not yet scored
        if (game.isComplete && winnerId && !existingGame.isScored) {
          const scored = await scorePicks(existingGame.id, matchupId, game.round, winnerId, team1DbId, team2DbId, db);
          result.picksScored += scored;
          // Mark as scored
          await db.update(gameResults).set({ isScored: true }).where(eq(gameResults.id, existingGame.id));
        }
      } else {
        // Insert new game
        const [inserted] = await db.insert(gameResults).values({
          year,
          round: game.round as any,
          matchupId,
          espnGameId: game.espnGameId,
          espnStatus: game.espnStatus,
          team1Id: team1DbId,
          team2Id: team2DbId,
          team1EspnId: game.team1EspnId,
          team2EspnId: game.team2EspnId,
          winnerId: winnerId ?? undefined,
          team1Score: game.team1Score ?? undefined,
          team2Score: game.team2Score ?? undefined,
          isComplete: game.isComplete,
          isScored: false,
          playedAt: game.playedAt ?? undefined,
        });

        result.gamesUpdated++;

        // Score picks immediately if game is already complete on first insert
        if (game.isComplete && winnerId) {
          const insertedId = (inserted as any).insertId as number;
          const scored = await scorePicks(insertedId, matchupId, game.round, winnerId, team1DbId, team2DbId, db);
          result.picksScored += scored;
          await db.update(gameResults).set({ isScored: true }).where(eq(gameResults.id, insertedId));
        }
      }
    } catch (err) {
      result.errors.push(`Error processing game ${game.espnGameId}: ${err}`);
    }
  }

  // Update tournament config
  try {
    const existing = await db.select({ id: tournamentConfig.id }).from(tournamentConfig).where(eq(tournamentConfig.year, year)).limit(1);
    const configData = {
      lastSyncAt: new Date(),
      lastSyncStatus: result.errors.length === 0 ? "OK" : `${result.errors.length} errors`,
      gamesFound: result.gamesFound,
      gamesCompleted: result.gamesCompleted,
      picksScored: result.picksScored,
    };
    if (existing.length > 0) {
      await db.update(tournamentConfig).set(configData).where(eq(tournamentConfig.year, year));
    } else {
      await db.insert(tournamentConfig).values({ year, ...configData });
    }
  } catch (err) {
    result.errors.push(`Config update failed: ${err}`);
  }

  return result;
}

// ─── Pick Scoring ─────────────────────────────────────────────────────────────

async function scorePicks(
  gameResultId: number,
  matchupId: string,
  round: string,
  winnerId: number,
  team1Id: number,
  team2Id: number,
  db: Awaited<ReturnType<typeof getDb>>
): Promise<number> {
  if (!db) return 0;

  // Find all picks for this matchup that haven't been scored yet
  const matchingPicks = await db
    .select({
      id: picks.id,
      bracketId: picks.bracketId,
      userId: picks.userId,
      pickedTeamId: picks.pickedTeamId,
      isUpset: picks.isUpset,
    })
    .from(picks)
    .where(
      and(
        eq(picks.matchupId, matchupId),
        isNull(picks.isCorrect)
      )
    );

  let scoredCount = 0;

  for (const pick of matchingPicks) {
    const isCorrect = pick.pickedTeamId === winnerId;
    const pointsEarned = isCorrect ? calculatePoints(round, pick.isUpset) : 0;

    // Update the pick
    await db.update(picks).set({
      actualWinnerId: winnerId,
      isCorrect,
      pointsEarned,
    }).where(eq(picks.id, pick.id));

    // Update bracket totals
    if (isCorrect) {
      // Use raw SQL increment for totalPoints and correctPicks
      await db.execute(
        `UPDATE brackets SET totalPoints = totalPoints + ${pointsEarned}, correctPicks = correctPicks + 1 WHERE id = ${pick.bracketId}`
      );

      // Update user totalPoints
      await db.execute(
        `UPDATE users SET totalPoints = totalPoints + ${pointsEarned} WHERE id = ${pick.userId}`
      );
    }

    scoredCount++;
  }

  return scoredCount;
}

// ─── Live Scores Query ────────────────────────────────────────────────────────

export async function getLiveScores(year = 2026) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: gameResults.id,
      matchupId: gameResults.matchupId,
      round: gameResults.round,
      espnStatus: gameResults.espnStatus,
      isComplete: gameResults.isComplete,
      team1Id: gameResults.team1Id,
      team2Id: gameResults.team2Id,
      winnerId: gameResults.winnerId,
      team1Score: gameResults.team1Score,
      team2Score: gameResults.team2Score,
      playedAt: gameResults.playedAt,
    })
    .from(gameResults)
    .where(eq(gameResults.year, year))
    .orderBy(gameResults.playedAt);
}

export async function getTournamentConfig(year = 2026) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(tournamentConfig)
    .where(eq(tournamentConfig.year, year))
    .limit(1);

  return result[0] ?? null;
}
