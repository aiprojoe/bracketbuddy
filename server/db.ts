import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import type { Pool } from "mysql2";
import {
  InsertUser,
  achievementDefs,
  brackets,
  challengeParticipants,
  challenges,
  comments,
  gameResults,
  picks,
  teams,
  userAchievements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

/**
 * Returns a drizzle instance backed by a connection pool.
 * The pool handles reconnects automatically after hibernation.
 * On any query error we reset the cached instance so the next
 * call creates a fresh pool (handles rare pool-level failures).
 */
export async function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("[Database] DATABASE_URL is not set. Check your environment variables.");
  }
  if (!_db) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30_000,
      });
      _db = drizzle(_pool);
    } catch (error) {
      _db = null;
      _pool = null;
      console.error("[Database] Failed to create connection pool:", error);
      throw new Error(`[Database] Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return _db;
}

/** Force-reset the cached pool (call after a fatal connection error). */
export function resetDb() {
  if (_pool) {
    _pool.end(() => {}); // mysql2 pool.end uses callback, not promise
    _pool = null;
  }
  _db = null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (
      user.openId === ENV.ownerOpenId ||
      (user.email && ENV.ownerEmail && user.email.toLowerCase() === ENV.ownerEmail.toLowerCase())
    ) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getAllTeams() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).orderBy(teams.region, teams.seed);
}

export async function seedTeamsIfEmpty() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(teams).limit(1);
  if (existing.length > 0) return;

  // 2026 NCAA Tournament projected field (based on bracketology as of Mar 13, 2026)
  const teamData = [
    // EAST REGION
    { name: "Duke Blue Devils", shortName: "Duke", seed: 1, region: "East" as const, conference: "ACC", record: "29-2", ppg: 84.2, oppg: 67.1, color: "#003087", color2: "#003087", tournamentWins: 45, championships: 5 },
    { name: "Connecticut Huskies", shortName: "UConn", seed: 2, region: "East" as const, conference: "Big East", record: "27-4", ppg: 79.8, oppg: 63.4, color: "#002868", color2: "#002868", tournamentWins: 28, championships: 5 },
    { name: "Iowa State Cyclones", shortName: "Iowa St", seed: 3, region: "East" as const, conference: "Big 12", record: "26-5", ppg: 78.3, oppg: 65.2, color: "#C8102E", color2: "#F1BE48", tournamentWins: 12, championships: 0 },
    { name: "Alabama Crimson Tide", shortName: "Alabama", seed: 4, region: "East" as const, conference: "SEC", record: "24-7", ppg: 82.1, oppg: 70.3, color: "#9E1B32", color2: "#9E1B32", tournamentWins: 14, championships: 0 },
    { name: "Vanderbilt Commodores", shortName: "Vandy", seed: 5, region: "East" as const, conference: "SEC", record: "23-8", ppg: 76.4, oppg: 68.9, color: "#866D4B", color2: "#1A1A2E", tournamentWins: 6, championships: 0 },
    { name: "Louisville Cardinals", shortName: "Louisville", seed: 6, region: "East" as const, conference: "ACC", record: "22-9", ppg: 74.8, oppg: 69.1, color: "#AD0000", color2: "#AD0000", tournamentWins: 22, championships: 1 },
    { name: "Kentucky Wildcats", shortName: "Kentucky", seed: 7, region: "East" as const, conference: "SEC", record: "21-10", ppg: 77.2, oppg: 71.4, color: "#0033A0", color2: "#0033A0", tournamentWins: 132, championships: 8 },
    { name: "Georgia Bulldogs", shortName: "Georgia", seed: 8, region: "East" as const, conference: "SEC", record: "20-11", ppg: 73.6, oppg: 70.8, color: "#BA0C2F", color2: "#000000", tournamentWins: 8, championships: 0 },
    { name: "Iowa Hawkeyes", shortName: "Iowa", seed: 9, region: "East" as const, conference: "Big Ten", record: "19-12", ppg: 75.1, oppg: 72.3, color: "#FFCD00", color2: "#000000", tournamentWins: 10, championships: 0 },
    { name: "Texas A&M Aggies", shortName: "Texas A&M", seed: 10, region: "East" as const, conference: "SEC", record: "19-12", ppg: 72.8, oppg: 70.1, color: "#500000", color2: "#500000", tournamentWins: 8, championships: 0 },
    { name: "Missouri Tigers", shortName: "Missouri", seed: 11, region: "East" as const, conference: "SEC", record: "18-13", ppg: 71.4, oppg: 69.8, color: "#F1B82D", color2: "#000000", tournamentWins: 6, championships: 0 },
    { name: "South Florida Bulls", shortName: "S. Florida", seed: 12, region: "East" as const, conference: "American", record: "22-9", ppg: 70.2, oppg: 68.4, color: "#006747", color2: "#CFC493", tournamentWins: 2, championships: 0 },
    { name: "Northern Iowa Panthers", shortName: "N. Iowa", seed: 13, region: "East" as const, conference: "MVC", record: "24-7", ppg: 68.9, oppg: 65.1, color: "#4B116F", color2: "#FFD100", tournamentWins: 4, championships: 0 },
    { name: "North Dakota State Bison", shortName: "NDSU", seed: 14, region: "East" as const, conference: "Summit", record: "25-6", ppg: 72.1, oppg: 67.3, color: "#006633", color2: "#FFC72C", tournamentWins: 3, championships: 0 },
    { name: "Tennessee State Tigers", shortName: "TN State", seed: 15, region: "East" as const, conference: "OVC", record: "22-8", ppg: 69.4, oppg: 68.2, color: "#4B5320", color2: "#4B5320", tournamentWins: 0, championships: 0 },
    { name: "Queens Royals", shortName: "Queens", seed: 16, region: "East" as const, conference: "Atlantic Sun", record: "26-5", ppg: 71.2, oppg: 70.1, color: "#6A0DAD", color2: "#FFD700", tournamentWins: 0, championships: 0 },

    // WEST REGION
    { name: "Arizona Wildcats", shortName: "Arizona", seed: 1, region: "West" as const, conference: "Big 12", record: "29-2", ppg: 83.7, oppg: 66.8, color: "#003366", color2: "#CC0033", tournamentWins: 38, championships: 1 },
    { name: "Houston Cougars", shortName: "Houston", seed: 2, region: "West" as const, conference: "Big 12", record: "27-4", ppg: 76.9, oppg: 61.2, color: "#C8102E", color2: "#63666A", tournamentWins: 24, championships: 0 },
    { name: "Nebraska Cornhuskers", shortName: "Nebraska", seed: 3, region: "West" as const, conference: "Big Ten", record: "25-6", ppg: 77.4, oppg: 66.9, color: "#E41C38", color2: "#E41C38", tournamentWins: 10, championships: 0 },
    { name: "Virginia Cavaliers", shortName: "Virginia", seed: 4, region: "West" as const, conference: "ACC", record: "24-7", ppg: 68.3, oppg: 58.7, color: "#232D4B", color2: "#F84C1E", tournamentWins: 18, championships: 1 },
    { name: "Arkansas Razorbacks", shortName: "Arkansas", seed: 5, region: "West" as const, conference: "SEC", record: "22-9", ppg: 75.8, oppg: 70.2, color: "#9D2235", color2: "#9D2235", tournamentWins: 20, championships: 1 },
    { name: "Tennessee Volunteers", shortName: "Tennessee", seed: 6, region: "West" as const, conference: "SEC", record: "22-9", ppg: 74.6, oppg: 68.3, color: "#FF8200", color2: "#58595B", tournamentWins: 14, championships: 0 },
    { name: "St. Mary's Gaels", shortName: "St. Mary's", seed: 7, region: "West" as const, conference: "WCC", record: "24-7", ppg: 71.3, oppg: 65.4, color: "#013087", color2: "#D01D2A", tournamentWins: 6, championships: 0 },
    { name: "UCLA Bruins", shortName: "UCLA", seed: 8, region: "West" as const, conference: "Big Ten", record: "20-11", ppg: 74.2, oppg: 71.6, color: "#2D68C4", color2: "#F2A900", tournamentWins: 42, championships: 11 },
    { name: "TCU Horned Frogs", shortName: "TCU", seed: 9, region: "West" as const, conference: "Big 12", record: "19-12", ppg: 72.8, oppg: 71.2, color: "#4D1979", color2: "#A3A9AC", tournamentWins: 4, championships: 0 },
    { name: "UCF Knights", shortName: "UCF", seed: 10, region: "West" as const, conference: "Big 12", record: "19-12", ppg: 71.6, oppg: 70.4, color: "#000000", color2: "#FFC904", tournamentWins: 2, championships: 0 },
    { name: "Santa Clara Broncos", shortName: "Santa Clara", seed: 11, region: "West" as const, conference: "WCC", record: "23-8", ppg: 70.8, oppg: 67.3, color: "#862633", color2: "#862633", tournamentWins: 2, championships: 0 },
    { name: "Yale Bulldogs", shortName: "Yale", seed: 12, region: "West" as const, conference: "Ivy", record: "22-7", ppg: 72.4, oppg: 68.9, color: "#00356B", color2: "#00356B", tournamentWins: 2, championships: 0 },
    { name: "Sam Houston Bearkats", shortName: "Sam Houston", seed: 13, region: "West" as const, conference: "C-USA", record: "23-8", ppg: 70.1, oppg: 66.8, color: "#F77F00", color2: "#002147", tournamentWins: 1, championships: 0 },
    { name: "UC Irvine Anteaters", shortName: "UC Irvine", seed: 14, region: "West" as const, conference: "Big West", record: "24-7", ppg: 68.7, oppg: 65.2, color: "#003764", color2: "#FFD200", tournamentWins: 1, championships: 0 },
    { name: "Furman Paladins", shortName: "Furman", seed: 15, region: "West" as const, conference: "SoCon", record: "23-8", ppg: 70.3, oppg: 68.1, color: "#582C83", color2: "#582C83", tournamentWins: 1, championships: 0 },
    { name: "UMBC Retrievers", shortName: "UMBC", seed: 16, region: "West" as const, conference: "America East", record: "22-9", ppg: 69.8, oppg: 69.2, color: "#000000", color2: "#F9A01B", tournamentWins: 1, championships: 0 },

    // SOUTH REGION
    { name: "Florida Gators", shortName: "Florida", seed: 1, region: "South" as const, conference: "SEC", record: "25-6", ppg: 80.4, oppg: 65.7, color: "#0021A5", color2: "#FA4616", tournamentWins: 36, championships: 2 },
    { name: "Michigan State Spartans", shortName: "Mich St", seed: 2, region: "South" as const, conference: "Big Ten", record: "26-5", ppg: 78.6, oppg: 66.4, color: "#18453B", color2: "#18453B", tournamentWins: 38, championships: 2 },
    { name: "Purdue Boilermakers", shortName: "Purdue", seed: 3, region: "South" as const, conference: "Big Ten", record: "24-7", ppg: 77.9, oppg: 67.8, color: "#CEB888", color2: "#000000", tournamentWins: 20, championships: 0 },
    { name: "Kansas Jayhawks", shortName: "Kansas", seed: 4, region: "South" as const, conference: "Big 12", record: "23-8", ppg: 79.2, oppg: 69.4, color: "#0051A5", color2: "#E8000D", tournamentWins: 48, championships: 3 },
    { name: "St. John's Red Storm", shortName: "St. John's", seed: 5, region: "South" as const, conference: "Big East", record: "23-8", ppg: 74.3, oppg: 68.7, color: "#CC0000", color2: "#CC0000", tournamentWins: 14, championships: 0 },
    { name: "Wisconsin Badgers", shortName: "Wisconsin", seed: 6, region: "South" as const, conference: "Big Ten", record: "22-9", ppg: 72.8, oppg: 66.3, color: "#C5050C", color2: "#C5050C", tournamentWins: 22, championships: 0 },
    { name: "Miami Hurricanes", shortName: "Miami FL", seed: 7, region: "South" as const, conference: "ACC", record: "21-10", ppg: 74.1, oppg: 70.8, color: "#005030", color2: "#F47321", tournamentWins: 8, championships: 0 },
    { name: "Clemson Tigers", shortName: "Clemson", seed: 8, region: "South" as const, conference: "ACC", record: "20-11", ppg: 73.4, oppg: 71.2, color: "#F66733", color2: "#522D80", tournamentWins: 6, championships: 0 },
    { name: "St. Louis Billikens", shortName: "St. Louis", seed: 9, region: "South" as const, conference: "A-10", record: "22-9", ppg: 71.8, oppg: 69.4, color: "#003DA5", color2: "#003DA5", tournamentWins: 4, championships: 0 },
    { name: "NC State Wolfpack", shortName: "NC State", seed: 10, region: "South" as const, conference: "ACC", record: "20-11", ppg: 72.6, oppg: 70.9, color: "#CC0000", color2: "#000000", tournamentWins: 10, championships: 1 },
    { name: "VCU Rams", shortName: "VCU", seed: 11, region: "South" as const, conference: "A-10", record: "22-9", ppg: 70.4, oppg: 67.8, color: "#000000", color2: "#FDBB30", tournamentWins: 8, championships: 0 },
    { name: "High Point Panthers", shortName: "High Point", seed: 12, region: "South" as const, conference: "Big South", record: "26-5", ppg: 73.2, oppg: 69.1, color: "#4B2683", color2: "#4B2683", tournamentWins: 1, championships: 0 },
    { name: "Utah Valley Wolverines", shortName: "Utah Valley", seed: 13, region: "South" as const, conference: "WAC", record: "24-7", ppg: 71.6, oppg: 68.3, color: "#046A38", color2: "#046A38", tournamentWins: 0, championships: 0 },
    { name: "Troy Trojans", shortName: "Troy", seed: 14, region: "South" as const, conference: "Sun Belt", record: "23-8", ppg: 70.8, oppg: 68.9, color: "#8B0000", color2: "#8B0000", tournamentWins: 0, championships: 0 },
    { name: "Idaho Vandals", shortName: "Idaho", seed: 15, region: "South" as const, conference: "Big Sky", record: "22-9", ppg: 69.2, oppg: 68.4, color: "#B3A369", color2: "#000000", tournamentWins: 0, championships: 0 },
    { name: "Lehigh Mountain Hawks", shortName: "Lehigh", seed: 16, region: "South" as const, conference: "Patriot", record: "21-10", ppg: 68.4, oppg: 68.1, color: "#653819", color2: "#653819", tournamentWins: 1, championships: 0 },

    // MIDWEST REGION
    { name: "Michigan Wolverines", shortName: "Michigan", seed: 1, region: "Midwest" as const, conference: "Big Ten", record: "29-2", ppg: 82.4, oppg: 66.3, color: "#00274C", color2: "#FFCB05", tournamentWins: 38, championships: 1 },
    { name: "Illinois Fighting Illini", shortName: "Illinois", seed: 2, region: "Midwest" as const, conference: "Big Ten", record: "26-5", ppg: 79.1, oppg: 65.8, color: "#E84A27", color2: "#13294B", tournamentWins: 14, championships: 0 },
    { name: "Gonzaga Bulldogs", shortName: "Gonzaga", seed: 3, region: "Midwest" as const, conference: "WCC", record: "27-4", ppg: 84.6, oppg: 70.2, color: "#002469", color2: "#CC0033", tournamentWins: 32, championships: 0 },
    { name: "Texas Tech Red Raiders", shortName: "Texas Tech", seed: 4, region: "Midwest" as const, conference: "Big 12", record: "23-8", ppg: 74.8, oppg: 65.4, color: "#CC0000", color2: "#000000", tournamentWins: 14, championships: 0 },
    { name: "North Carolina Tar Heels", shortName: "UNC", seed: 5, region: "Midwest" as const, conference: "ACC", record: "22-9", ppg: 78.3, oppg: 71.4, color: "#4B9CD3", color2: "#13294B", tournamentWins: 48, championships: 6 },
    { name: "BYU Cougars", shortName: "BYU", seed: 6, region: "Midwest" as const, conference: "Big 12", record: "22-9", ppg: 75.6, oppg: 69.8, color: "#002E5D", color2: "#002E5D", tournamentWins: 10, championships: 0 },
    { name: "Villanova Wildcats", shortName: "Villanova", seed: 7, region: "Midwest" as const, conference: "Big East", record: "21-10", ppg: 73.8, oppg: 69.6, color: "#003399", color2: "#003399", tournamentWins: 28, championships: 3 },
    { name: "Utah State Aggies", shortName: "Utah St", seed: 8, region: "Midwest" as const, conference: "MWC", record: "22-9", ppg: 74.2, oppg: 70.8, color: "#00263A", color2: "#8B7355", tournamentWins: 6, championships: 0 },
    { name: "Ohio State Buckeyes", shortName: "Ohio St", seed: 9, region: "Midwest" as const, conference: "Big Ten", record: "20-11", ppg: 73.6, oppg: 71.4, color: "#BB0000", color2: "#666666", tournamentWins: 18, championships: 1 },
    { name: "Miami (OH) RedHawks", shortName: "Miami OH", seed: 10, region: "Midwest" as const, conference: "MAC", record: "22-9", ppg: 71.4, oppg: 69.2, color: "#B61E2E", color2: "#B61E2E", tournamentWins: 4, championships: 0 },
    { name: "Auburn Tigers", shortName: "Auburn", seed: 11, region: "Midwest" as const, conference: "SEC", record: "19-12", ppg: 72.8, oppg: 71.6, color: "#0C2340", color2: "#E87722", tournamentWins: 12, championships: 0 },
    { name: "McNeese Cowboys", shortName: "McNeese", seed: 12, region: "Midwest" as const, conference: "Southland", record: "24-7", ppg: 73.6, oppg: 70.1, color: "#005DAA", color2: "#FFB81C", tournamentWins: 1, championships: 0 },
    { name: "Hofstra Pride", shortName: "Hofstra", seed: 13, region: "Midwest" as const, conference: "CAA", record: "23-8", ppg: 70.6, oppg: 67.8, color: "#003087", color2: "#FFD100", tournamentWins: 0, championships: 0 },
    { name: "Wright State Raiders", shortName: "Wright St", seed: 14, region: "Midwest" as const, conference: "Horizon", record: "22-9", ppg: 69.8, oppg: 67.4, color: "#006338", color2: "#006338", tournamentWins: 1, championships: 0 },
    { name: "Siena Saints", shortName: "Siena", seed: 15, region: "Midwest" as const, conference: "MAAC", record: "22-9", ppg: 68.9, oppg: 67.6, color: "#006747", color2: "#006747", tournamentWins: 1, championships: 0 },
    { name: "LIU Sharks", shortName: "LIU", seed: 16, region: "Midwest" as const, conference: "NEC", record: "20-11", ppg: 67.8, oppg: 67.2, color: "#00205B", color2: "#00205B", tournamentWins: 0, championships: 0 },
  ];

  await db.insert(teams).values(teamData);
  console.log("[DB] Seeded 64 teams");
}

export async function seedAchievementsIfEmpty() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(achievementDefs).limit(1);
  if (existing.length > 0) return;

  const achievementData = [
    { key: "first_bracket", name: "Bracket Rookie", description: "Submit your first bracket", icon: "🏀", rarity: "common" as const, points: 50 },
    { key: "complete_bracket", name: "Bracket Master", description: "Fill out a complete 68-team bracket", icon: "✅", rarity: "common" as const, points: 100 },
    { key: "first_correct", name: "Lucky Shot", description: "Get your first correct pick", icon: "🎯", rarity: "common" as const, points: 25 },
    { key: "upset_caller", name: "Upset Caller", description: "Correctly predict 3 upsets", icon: "💥", rarity: "rare" as const, points: 200 },
    { key: "upset_king", name: "Upset King", description: "Correctly predict 10 upsets", icon: "👑", rarity: "epic" as const, points: 500 },
    { key: "cinderella_story", name: "Cinderella Story", description: "Correctly pick a team seeded 10 or lower reaching the Final Four", icon: "🪄", rarity: "legendary" as const, points: 1000 },
    { key: "bracket_buster", name: "Bracket Buster", description: "Bust 5 other users' brackets with your picks", icon: "💣", rarity: "rare" as const, points: 300 },
    { key: "perfect_round", name: "Perfect Round", description: "Go perfect in any round", icon: "🌟", rarity: "epic" as const, points: 750 },
    { key: "march_oracle", name: "March Madness Oracle", description: "Finish in the top 10 on the leaderboard", icon: "🔮", rarity: "legendary" as const, points: 2000 },
    { key: "voice_picker", name: "Voice Commander", description: "Make 10 picks using voice assistant", icon: "🎤", rarity: "rare" as const, points: 150 },
    { key: "social_sharer", name: "Brag Master", description: "Share your bracket on social media", icon: "📱", rarity: "common" as const, points: 75 },
    { key: "final_four", name: "Final Four Prophet", description: "Correctly predict all 4 Final Four teams", icon: "🏆", rarity: "epic" as const, points: 800 },
    { key: "champion_pick", name: "Champion Whisperer", description: "Correctly predict the national champion", icon: "🥇", rarity: "legendary" as const, points: 1500 },
    { key: "hot_streak", name: "On Fire", description: "Get 5 correct picks in a row", icon: "🔥", rarity: "rare" as const, points: 250 },
    { key: "trash_talker", name: "Trash Talker", description: "Post 5 comments in the leaderboard", icon: "💬", rarity: "common" as const, points: 50 },
  ];

  await db.insert(achievementDefs).values(achievementData);
  console.log("[DB] Seeded achievements");
}

// ─── Brackets ─────────────────────────────────────────────────────────────────

export async function getUserBracket(userId: number, year = 2026) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.userId, userId), eq(brackets.year, year)))
    .limit(1);
  return result[0] ?? null;
}

export async function createBracket(userId: number, name = "My Bracket") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { nanoid } = await import("nanoid");
  const shareToken = nanoid(12);
  await db.insert(brackets).values({ userId, name, year: 2026, shareToken });
  const result = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.userId, userId), eq(brackets.year, 2026)))
    .limit(1);
  return result[0]!;
}

export async function getBracketPicks(bracketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(picks).where(eq(picks.bracketId, bracketId));
}

export async function upsertPick(data: {
  bracketId: number;
  userId: number;
  round: typeof picks.$inferSelect["round"];
  matchupId: string;
  team1Id: number;
  team2Id: number | null;
  pickedTeamId: number;
  isUpset: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(picks)
    .where(and(eq(picks.bracketId, data.bracketId), eq(picks.matchupId, data.matchupId)))
    .limit(1);

  if (existing.length > 0) {
    const prev = existing[0]!;
    // If the pick is being changed AND it was already scored as correct,
    // we must reverse the points from the bracket and user totals first.
    if (prev.pickedTeamId !== data.pickedTeamId && prev.isCorrect === true && prev.pointsEarned) {
      await db.execute(
        `UPDATE brackets SET totalPoints = GREATEST(0, totalPoints - ${prev.pointsEarned}), correctPicks = GREATEST(0, correctPicks - 1) WHERE id = ${data.bracketId}`
      );
      await db.execute(
        `UPDATE users SET totalPoints = GREATEST(0, totalPoints - ${prev.pointsEarned}) WHERE id = ${data.userId}`
      );
    }
    // When a pick changes, reset scoring fields so the sync job re-scores it
    const isChangingPick = prev.pickedTeamId !== data.pickedTeamId;
    await db
      .update(picks)
      .set({
        pickedTeamId: data.pickedTeamId,
        isUpset: data.isUpset,
        updatedAt: new Date(),
        // Reset scoring if pick changed so sync engine re-evaluates
        ...(isChangingPick ? { isCorrect: null, pointsEarned: 0, actualWinnerId: null } : {}),
      })
      .where(eq(picks.id, prev.id));
  } else {
    await db.insert(picks).values(data);
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  // Join brackets to get correctPicks for tiebreaking display
  return db
    .select({
      id: users.id,
      name: users.name,
      totalPoints: users.totalPoints,
      bracketCount: users.bracketCount,
      correctPicks: brackets.correctPicks,
      maxPossiblePoints: brackets.maxPossiblePoints,
      bracketId: brackets.id,
    })
    .from(users)
    .leftJoin(brackets, and(eq(brackets.userId, users.id), eq(brackets.year, 2026)))
    .orderBy(desc(users.totalPoints), desc(brackets.correctPicks))
    .limit(limit);
}

export async function getComments(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: comments.id,
      content: comments.content,
      likes: comments.likes,
      createdAt: comments.createdAt,
      userName: users.name,
      userId: users.id,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
  return result;
}

export async function addComment(userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(comments).values({ userId, content });
}

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      key: userAchievements.achievementKey,
      earnedAt: userAchievements.earnedAt,
      name: achievementDefs.name,
      description: achievementDefs.description,
      icon: achievementDefs.icon,
      rarity: achievementDefs.rarity,
      points: achievementDefs.points,
    })
    .from(userAchievements)
    .leftJoin(achievementDefs, eq(userAchievements.achievementKey, achievementDefs.key))
    .where(eq(userAchievements.userId, userId));
}

export async function grantAchievement(userId: number, achievementKey: string, bracketId?: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, achievementKey)))
    .limit(1);
  if (existing.length > 0) return; // already earned

  await db.insert(userAchievements).values({ userId, achievementKey, bracketId });

  // Add achievement points to user
  const achDef = await db
    .select()
    .from(achievementDefs)
    .where(eq(achievementDefs.key, achievementKey))
    .limit(1);
  if (achDef[0]) {
    await db
      .update(users)
      .set({ totalPoints: sql`${users.totalPoints} + ${achDef[0].points}` })
      .where(eq(users.id, userId));
  }
}

export async function getAllAchievementDefs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievementDefs);
}

export type BracketPick = typeof picks.$inferSelect;

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function createChallenge(challengerId: number, bracketId: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { nanoid } = await import("nanoid");
  const token = nanoid(16);
  const [result] = await db
    .insert(challenges)
    .values({ challengerId, inviteToken: token, title: title ?? "Bracket Challenge", status: "pending" });
  const challengeId = (result as any).insertId as number;
  // Add challenger as participant
  await db.insert(challengeParticipants).values({ challengeId, userId: challengerId, bracketId });
  return { challengeId, inviteToken: token };
}

export async function getChallengeByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.inviteToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function getChallengeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function acceptChallenge(challengeId: number, userId: number, bracketId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check not already a participant
  const existing = await db
    .select()
    .from(challengeParticipants)
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)))
    .limit(1);
  if (existing.length > 0) return; // already joined
  await db.insert(challengeParticipants).values({ challengeId, userId, bracketId });
  await db
    .update(challenges)
    .set({ challengedId: userId, status: "active" })
    .where(eq(challenges.id, challengeId));
}

export async function getChallengeParticipants(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      participantId: challengeParticipants.id,
      userId: challengeParticipants.userId,
      bracketId: challengeParticipants.bracketId,
      score: challengeParticipants.score,
      correctPicks: challengeParticipants.correctPicks,
      joinedAt: challengeParticipants.joinedAt,
      userName: users.name,
      bracketName: brackets.name,
      bracketTotalPicks: brackets.totalPicks,
      bracketUpsetPicks: brackets.upsetPicks,
      bracketIsComplete: brackets.isComplete,
    })
    .from(challengeParticipants)
    .leftJoin(users, eq(challengeParticipants.userId, users.id))
    .leftJoin(brackets, eq(challengeParticipants.bracketId, brackets.id))
    .where(eq(challengeParticipants.challengeId, challengeId));
}

export async function getChallengesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all challenge IDs this user participates in
  const participations = await db
    .select({ challengeId: challengeParticipants.challengeId })
    .from(challengeParticipants)
    .where(eq(challengeParticipants.userId, userId));
  if (participations.length === 0) return [];
  const ids = participations.map((p) => p.challengeId);
  // Fetch all those challenges
  const result = [];
  for (const cid of ids) {
    const rows = await db.select().from(challenges).where(eq(challenges.id, cid)).limit(1);
    if (rows[0]) result.push(rows[0]);
  }
  return result;
}

export async function getH2HPicks(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get participants' bracket IDs
  const participants = await db
    .select({ userId: challengeParticipants.userId, bracketId: challengeParticipants.bracketId })
    .from(challengeParticipants)
    .where(eq(challengeParticipants.challengeId, challengeId));
  if (participants.length === 0) return [];
  const result = [];
  for (const p of participants) {
    if (!p.bracketId) continue;
    const bracketPicks = await db
      .select({
        matchupId: picks.matchupId,
        round: picks.round,
        pickedTeamId: picks.pickedTeamId,
        isUpset: picks.isUpset,
        isCorrect: picks.isCorrect,
        pointsEarned: picks.pointsEarned,
        teamName: teams.name,
        teamShortName: teams.shortName,
        teamSeed: teams.seed,
        teamColor: teams.color,
      })
      .from(picks)
      .leftJoin(teams, eq(picks.pickedTeamId, teams.id))
      .where(eq(picks.bracketId, p.bracketId));
    result.push({ userId: p.userId, bracketId: p.bracketId, picks: bracketPicks });
  }
  return result;
}
