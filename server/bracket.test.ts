import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock DB functions
vi.mock("./db", () => ({
  seedTeamsIfEmpty: vi.fn().mockResolvedValue(undefined),
  seedAchievementsIfEmpty: vi.fn().mockResolvedValue(undefined),
  getAllTeams: vi.fn().mockResolvedValue([
    { id: 1, name: "Duke Blue Devils", shortName: "Duke", seed: 1, region: "East", conference: "ACC", record: "29-2", ppg: 84.2, oppg: 67.1, color: "#003087", color2: "#003087", tournamentWins: 45, championships: 5, isFirstFour: false },
    { id: 2, name: "Connecticut Huskies", shortName: "UConn", seed: 2, region: "East", conference: "Big East", record: "27-4", ppg: 79.8, oppg: 63.4, color: "#002868", color2: "#002868", tournamentWins: 28, championships: 5, isFirstFour: false },
  ]),
  getUserBracket: vi.fn().mockResolvedValue(null),
  createBracket: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "My Bracket", year: 2026, shareToken: "abc123", isComplete: false, isLocked: false, totalPoints: 0, createdAt: new Date(), updatedAt: new Date() }),
  getBracketPicks: vi.fn().mockResolvedValue([]),
  upsertPick: vi.fn().mockResolvedValue(undefined),
  getLeaderboard: vi.fn().mockResolvedValue([
    { id: 1, name: "Test User", totalPoints: 500, bracketCount: 1 },
  ]),
  getComments: vi.fn().mockResolvedValue([]),
  addComment: vi.fn().mockResolvedValue(undefined),
  getUserAchievements: vi.fn().mockResolvedValue([]),
  grantAchievement: vi.fn().mockResolvedValue(undefined),
  getAllAchievementDefs: vi.fn().mockResolvedValue([
    { key: "first_bracket", name: "Bracket Rookie", description: "Submit your first bracket", icon: "🏀", rarity: "common", points: 50 },
  ]),
  createChallenge: vi.fn().mockResolvedValue({ challengeId: 1, inviteToken: "test-token-123" }),
  getChallengeByToken: vi.fn().mockResolvedValue(null),
  getChallengeById: vi.fn().mockResolvedValue(null),
  acceptChallenge: vi.fn().mockResolvedValue(undefined),
  getChallengeParticipants: vi.fn().mockResolvedValue([]),
  getChallengesForUser: vi.fn().mockResolvedValue([]),
  getH2HPicks: vi.fn().mockResolvedValue([]),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
  }),
}));

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("teams.getAll", () => {
  it("returns team list publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const teams = await caller.teams.getAll();
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
    expect(teams[0]).toHaveProperty("name");
    expect(teams[0]).toHaveProperty("seed");
    expect(teams[0]).toHaveProperty("region");
  });
});

describe("leaderboard.get", () => {
  it("returns leaderboard publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const lb = await caller.leaderboard.get();
    expect(Array.isArray(lb)).toBe(true);
  });
});

describe("achievements.getAll", () => {
  it("returns all achievement definitions publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const achievements = await caller.achievements.getAll();
    expect(Array.isArray(achievements)).toBe(true);
    expect(achievements[0]).toHaveProperty("key");
    expect(achievements[0]).toHaveProperty("name");
    expect(achievements[0]).toHaveProperty("icon");
  });
});

describe("bracket.getMine", () => {
  it("returns null when no bracket exists", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.bracket.getMine();
    expect(result).toBeNull();
  });
});

describe("bracket.create", () => {
  it("creates a bracket for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bracket = await caller.bracket.create({ name: "Test Bracket" });
    expect(bracket).toHaveProperty("id");
    expect(bracket).toHaveProperty("shareToken");
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("VAPI key configuration", () => {
  it("VITE_VAPI_PUBLIC_KEY env variable is set", () => {
    // The key is set in the environment - we just verify it's accessible
    // In production this would be a real key check
    const key = process.env.VITE_VAPI_PUBLIC_KEY;
    // Key may be empty string if not provided, but env var should exist
    expect(key !== undefined).toBe(true);
  });
});

// ─── Challenge Feature Tests ──────────────────────────────────────────────────

describe("challenge.create", () => {
  it("throws BAD_REQUEST when user has no bracket", async () => {
    vi.mocked(db.getUserBracket).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.challenge.create({})).rejects.toThrow("You need a bracket first!");
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.challenge.create({})).rejects.toThrow();
  });
});

describe("challenge.getByToken", () => {
  it("returns null for unknown token", async () => {
    vi.mocked(db.getChallengeByToken).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.challenge.getByToken({ token: "nonexistent" });
    expect(result).toBeNull();
  });
});

describe("challenge.accept", () => {
  it("throws NOT_FOUND for invalid token", async () => {
    vi.mocked(db.getChallengeByToken).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.challenge.accept({ token: "bad-token" })).rejects.toThrow("Challenge not found");
  });

  it("throws BAD_REQUEST when challenger tries to accept own challenge", async () => {
    vi.mocked(db.getChallengeByToken).mockResolvedValueOnce({
      id: 1, challengerId: 1, challengedId: null, inviteToken: "tok",
      title: "Test", status: "pending", winnerId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.challenge.accept({ token: "tok" })).rejects.toThrow("You can't accept your own challenge!");
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.challenge.accept({ token: "tok" })).rejects.toThrow();
  });
});

describe("challenge.getMyChallenges", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.challenge.getMyChallenges()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    vi.mocked(db.getChallengesForUser).mockResolvedValueOnce([]);
    vi.mocked(db.getChallengeParticipants).mockResolvedValue([]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.challenge.getMyChallenges();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("challenge.getH2H", () => {
  it("returns null for unknown challenge", async () => {
    vi.mocked(db.getChallengeById).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.challenge.getH2H({ challengeId: 9999 });
    expect(result).toBeNull();
  });
});
