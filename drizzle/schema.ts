import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatar: text("avatar"),
  totalPoints: int("totalPoints").default(0).notNull(),
  bracketCount: int("bracketCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 2026 NCAA Tournament Teams
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  shortName: varchar("shortName", { length: 20 }).notNull(),
  seed: int("seed").notNull(),
  region: mysqlEnum("region", ["East", "West", "South", "Midwest"]).notNull(),
  conference: varchar("conference", { length: 50 }),
  record: varchar("record", { length: 20 }),
  ppg: float("ppg"), // points per game
  oppg: float("oppg"), // opponent points per game
  color: varchar("color", { length: 7 }).default("#1a1a2e"), // team primary color hex
  color2: varchar("color2", { length: 7 }).default("#16213e"),
  logoUrl: text("logoUrl"),
  // Tournament history stats
  tournamentWins: int("tournamentWins").default(0),
  championships: int("championships").default(0),
  isFirstFour: boolean("isFirstFour").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;

// User Brackets
export const brackets = mysqlTable("brackets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).default("My Bracket"),
  year: int("year").default(2026).notNull(),
  isComplete: boolean("isComplete").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(), // locked after tournament starts
  totalPoints: int("totalPoints").default(0).notNull(),
  maxPossiblePoints: int("maxPossiblePoints").default(0).notNull(),
  correctPicks: int("correctPicks").default(0).notNull(),
  totalPicks: int("totalPicks").default(0).notNull(),
  upsetPicks: int("upsetPicks").default(0).notNull(),
  correctUpsets: int("correctUpsets").default(0).notNull(),
  championPick: int("championPick"), // team id
  shareToken: varchar("shareToken", { length: 32 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bracket = typeof brackets.$inferSelect;

// Individual picks within a bracket
export const picks = mysqlTable("picks", {
  id: int("id").autoincrement().primaryKey(),
  bracketId: int("bracketId").notNull(),
  userId: int("userId").notNull(),
  round: mysqlEnum("round", [
    "firstfour",
    "round64",
    "round32",
    "sweet16",
    "elite8",
    "finalfour",
    "championship",
  ]).notNull(),
  matchupId: varchar("matchupId", { length: 50 }).notNull(), // e.g. "East-1-1" region-round-slot
  team1Id: int("team1Id").notNull(),
  team2Id: int("team2Id"),
  pickedTeamId: int("pickedTeamId").notNull(),
  actualWinnerId: int("actualWinnerId"), // set after game is played
  isCorrect: boolean("isCorrect"),
  isUpset: boolean("isUpset").default(false).notNull(),
  pointsEarned: int("pointsEarned").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pick = typeof picks.$inferSelect;

// Achievement definitions
export const achievementDefs = mysqlTable("achievementDefs", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 10 }).notNull(), // emoji
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).default("common").notNull(),
  points: int("points").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// User earned achievements
export const userAchievements = mysqlTable("userAchievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bracketId: int("bracketId"),
  achievementKey: varchar("achievementKey", { length: 50 }).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;

// Leaderboard comments / trash talk
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  likes: int("likes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;

// Bracket Challenges — head-to-head duels between users
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  challengerId: int("challengerId").notNull(), // user who created the challenge
  challengedId: int("challengedId"),           // user who accepted (null until accepted)
  inviteToken: varchar("inviteToken", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 120 }).default("Bracket Challenge"),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  winnerId: int("winnerId"),                   // set when tournament ends
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;

// Participants in a challenge (challenger + challenged, each with their bracket)
export const challengeParticipants = mysqlTable("challengeParticipants", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  userId: int("userId").notNull(),
  bracketId: int("bracketId"),                 // linked bracket (set on accept)
  score: int("score").default(0).notNull(),
  correctPicks: int("correctPicks").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;

// Tournament game results — synced from ESPN API
export const gameResults = mysqlTable("gameResults", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").default(2026).notNull(),
  round: mysqlEnum("round", [
    "firstfour",
    "round64",
    "round32",
    "sweet16",
    "elite8",
    "finalfour",
    "championship",
  ]).notNull(),
  matchupId: varchar("matchupId", { length: 50 }).notNull(), // e.g. "East-round64-0"
  espnGameId: varchar("espnGameId", { length: 20 }).unique(), // ESPN event ID for dedup
  espnStatus: varchar("espnStatus", { length: 30 }).default("STATUS_SCHEDULED"), // STATUS_FINAL, STATUS_IN_PROGRESS, etc.
  team1Id: int("team1Id").notNull(),
  team2Id: int("team2Id").notNull(),
  team1EspnId: varchar("team1EspnId", { length: 20 }), // ESPN team ID for matching
  team2EspnId: varchar("team2EspnId", { length: 20 }),
  winnerId: int("winnerId"),        // our DB team id of winner
  team1Score: int("team1Score"),
  team2Score: int("team2Score"),
  isComplete: boolean("isComplete").default(false).notNull(),
  isScored: boolean("isScored").default(false).notNull(), // true after bracket picks have been scored
  playedAt: timestamp("playedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameResult = typeof gameResults.$inferSelect;

// Tournament configuration — controls sync and lock state
export const tournamentConfig = mysqlTable("tournamentConfig", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").default(2026).notNull().unique(),
  isLocked: boolean("isLocked").default(false).notNull(), // true = no more bracket edits
  isSyncEnabled: boolean("isSyncEnabled").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastSyncStatus: varchar("lastSyncStatus", { length: 200 }),
  gamesFound: int("gamesFound").default(0).notNull(),
  gamesCompleted: int("gamesCompleted").default(0).notNull(),
  picksScored: int("picksScored").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TournamentConfig = typeof tournamentConfig.$inferSelect;

// Magic link tokens for passwordless email sign-in
export const magicLinkTokens = mysqlTable("magicLinkTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
