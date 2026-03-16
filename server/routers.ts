import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isMatchupLocked } from "../shared/tipoffSchedule";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  acceptChallenge,
  addComment,
  createBracket,
  createChallenge,
  getAllAchievementDefs,
  getAllTeams,
  getBracketPicks,
  getChallengeById,
  getChallengeByToken,
  getChallengeParticipants,
  getChallengesForUser,
  getComments,
  getH2HPicks,
  getLeaderboard,
  getUserAchievements,
  getUserBracket,
  grantAchievement,
  seedAchievementsIfEmpty,
  seedTeamsIfEmpty,
  upsertPick,
} from "./db";
import { getDb } from "./db";
import { brackets, users, gameResults, tournamentConfig, teams, picks } from "../drizzle/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { syncEspnScores, getLiveScores, getTournamentConfig } from "./espnSync";
import { getSchedulerStatus, triggerImmediateSync } from "./syncScheduler";
import { sendBulkLockReminders, sendWelcomeEmail } from "./email";

// ─── Seed on startup ──────────────────────────────────────────────────────────
seedTeamsIfEmpty().catch(console.error);
seedAchievementsIfEmpty().catch(console.error);

const roundEnum = z.enum([
  "firstfour",
  "round64",
  "round32",
  "sweet16",
  "elite8",
  "finalfour",
  "championship",
]);

// Points per round
const ROUND_POINTS: Record<string, number> = {
  firstfour: 5,
  round64: 10,
  round32: 20,
  sweet16: 40,
  elite8: 80,
  finalfour: 160,
  championship: 320,
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Teams ──────────────────────────────────────────────────────────────────
  teams: router({
    getAll: publicProcedure.query(async () => {
      return getAllTeams();
    }),
  }),

  // ─── Brackets ───────────────────────────────────────────────────────────────
  bracket: router({
    getMine: protectedProcedure.query(async ({ ctx }) => {
      const bracket = await getUserBracket(ctx.user.id);
      if (!bracket) return null;
      const picks = await getBracketPicks(bracket.id);
      return { bracket, picks };
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserBracket(ctx.user.id);
        if (existing) return existing;
        const bracket = await createBracket(ctx.user.id, input.name ?? "My Bracket");
        // Grant first bracket achievement
        await grantAchievement(ctx.user.id, "first_bracket", bracket.id);
        // Update user bracket count
        const db = await getDb();
        if (db) {
          await db
            .update(users)
            .set({ bracketCount: sql`${users.bracketCount} + 1` })
            .where(eq(users.id, ctx.user.id));
        }
        return bracket;
      }),

    makePick: protectedProcedure
      .input(
        z.object({
          bracketId: z.number(),
          round: roundEnum,
          matchupId: z.string(),
          team1Id: z.number(),
          team2Id: z.number().nullable(),
          pickedTeamId: z.number(),
          team1Seed: z.number(),
          team2Seed: z.number().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify bracket belongs to user
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const bracketRows = await db
          .select()
          .from(brackets)
          .where(eq(brackets.id, input.bracketId))
          .limit(1);
        if (!bracketRows[0] || bracketRows[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (bracketRows[0].isLocked) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Bracket is locked" });
        }

        // Per-game tip-off lock: block picks for games that have already tipped off
        if (isMatchupLocked(input.matchupId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This game has already tipped off — picks are locked for this matchup.",
          });
        }

        // Determine if this is an upset (higher seed number = lower seed)
        const pickedSeed =
          input.pickedTeamId === input.team1Id ? input.team1Seed : input.team2Seed ?? 99;
        const opponentSeed =
          input.pickedTeamId === input.team1Id
            ? input.team2Seed ?? 99
            : input.team1Seed;
        const isUpset = pickedSeed > opponentSeed;

        await upsertPick({
          bracketId: input.bracketId,
          userId: ctx.user.id,
          round: input.round,
          matchupId: input.matchupId,
          team1Id: input.team1Id,
          team2Id: input.team2Id,
          pickedTeamId: input.pickedTeamId,
          isUpset,
        });

        // Check for voice_picker achievement (handled on frontend count)
        // Check for upset_caller achievement
        const allPicks = await getBracketPicks(input.bracketId);
        const upsetPicks = allPicks.filter((p) => p.isUpset).length;
        if (upsetPicks >= 3) await grantAchievement(ctx.user.id, "upset_caller", input.bracketId);
        if (upsetPicks >= 10) await grantAchievement(ctx.user.id, "upset_king", input.bracketId);

        // Check complete bracket
        const totalPicks = allPicks.length;
        if (totalPicks >= 63) {
          await grantAchievement(ctx.user.id, "complete_bracket", input.bracketId);
          await db
            .update(brackets)
            .set({ isComplete: true })
            .where(eq(brackets.id, input.bracketId));
        }

        return { success: true, isUpset };
      }),

    // Auto-fill bracket by mode: chalk (best seeds), random, or upset-heavy
    autoFill: protectedProcedure
      .input(z.object({ mode: z.enum(["chalk", "random", "upset"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const bracket = await getUserBracket(ctx.user.id);
        if (!bracket) throw new TRPCError({ code: "NOT_FOUND", message: "No bracket found" });
        if (bracket.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Bracket is locked" });

        const allTeams = await getAllTeams();
        const SEED_PAIRS_R64 = [[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]];
        const REGIONS = ["East", "West", "South", "Midwest"] as const;
        const ROUNDS = ["round64", "round32", "sweet16", "elite8"] as const;

        // Historical upset rates for random/upset mode
        const UPSET_RATES: Record<number, number> = {
          1:1,2:6,3:15,4:21,5:35,6:37,7:39,8:51,9:49,10:61,11:63,12:65,13:79,14:85,15:94,16:99
        };

        function pickWinner(t1Seed: number, t2Seed: number, mode: string): number {
          const fav = Math.min(t1Seed, t2Seed);
          const dog = Math.max(t1Seed, t2Seed);
          if (mode === "chalk") return fav;
          const dogWinPct = UPSET_RATES[dog] ?? 50;
          if (mode === "upset") {
            // Upset mode: weight toward upsets but not always
            return Math.random() * 100 < Math.min(dogWinPct * 2, 70) ? dog : fav;
          }
          // Random: use historical rates
          return Math.random() * 100 < dogWinPct ? dog : fav;
        }

        type TeamEntry = { id: number; seed: number; region: string };
        const picksToSave: Array<{ matchupId: string; round: string; team1: TeamEntry; team2: TeamEntry; winnerId: number }> = [];

        // Build picks for each region
        for (const region of REGIONS) {
          const regionTeams = allTeams.filter((t) => t.region === region);
          const getTeam = (seed: number) => regionTeams.find((t) => t.seed === seed);

          // Track current round's winners
          let currentRoundTeams: (TeamEntry | undefined)[] = SEED_PAIRS_R64.flatMap(([s1, s2]) => [
            getTeam(s1), getTeam(s2)
          ]);

          for (let ri = 0; ri < ROUNDS.length; ri++) {
            const round = ROUNDS[ri];
            const nextRoundTeams: (TeamEntry | undefined)[] = [];
            for (let i = 0; i < currentRoundTeams.length; i += 2) {
              const t1 = currentRoundTeams[i];
              const t2 = currentRoundTeams[i + 1];
              if (!t1 || !t2) { nextRoundTeams.push(undefined); continue; }
              const winnerSeed = pickWinner(t1.seed, t2.seed, input.mode);
              const winner = winnerSeed === t1.seed ? t1 : t2;
              const matchupId = `${region}-${round}-${Math.floor(i / 2)}`;
              picksToSave.push({ matchupId, round, team1: t1, team2: t2, winnerId: winner.id });
              nextRoundTeams.push(winner);
            }
            currentRoundTeams = nextRoundTeams;
          }
        }

        // Final Four: East vs West, South vs Midwest
        const regionWinners: Record<string, TeamEntry | undefined> = {};
        for (const region of REGIONS) {
          const e8Picks = picksToSave.filter((p) => p.matchupId === `${region}-elite8-0`);
          if (e8Picks[0]) {
            regionWinners[region] = allTeams.find((t) => t.id === e8Picks[0].winnerId);
          }
        }

        const ffPairs = [["East", "West"], ["South", "Midwest"]] as const;
        const ffWinners: (TeamEntry | undefined)[] = [];
        for (let i = 0; i < ffPairs.length; i++) {
          const [r1, r2] = ffPairs[i];
          const t1 = regionWinners[r1];
          const t2 = regionWinners[r2];
          if (t1 && t2) {
            const winnerSeed = pickWinner(t1.seed, t2.seed, input.mode);
            const winner = winnerSeed === t1.seed ? t1 : t2;
            picksToSave.push({ matchupId: `FinalFour-${i}`, round: "finalfour", team1: t1, team2: t2, winnerId: winner.id });
            ffWinners.push(winner);
          } else {
            ffWinners.push(undefined);
          }
        }

        // Championship
        const ct1 = ffWinners[0];
        const ct2 = ffWinners[1];
        if (ct1 && ct2) {
          const winnerSeed = pickWinner(ct1.seed, ct2.seed, input.mode);
          const winner = winnerSeed === ct1.seed ? ct1 : ct2;
          picksToSave.push({ matchupId: "Championship-0", round: "championship", team1: ct1, team2: ct2, winnerId: winner.id });
        }

        // Save all picks via upsert
        for (const p of picksToSave) {
          const isUpset = p.winnerId === p.team2.id && p.team2.seed > p.team1.seed
            ? false // team2 is always higher seed in our setup
            : false;
          await upsertPick({
            bracketId: bracket.id,
            userId: ctx.user.id,
            round: p.round as any,
            matchupId: p.matchupId,
            team1Id: p.team1.id,
            team2Id: p.team2.id,
            pickedTeamId: p.winnerId,
            isUpset,
          });
        }

        return { success: true, picksCount: picksToSave.length };
      }),

    // Reset all picks for the user's bracket
    resetPicks: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bracket = await getUserBracket(ctx.user.id);
      if (!bracket) throw new TRPCError({ code: "NOT_FOUND" });
      if (bracket.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Bracket is locked" });
      await db.delete(picks).where(eq(picks.bracketId, bracket.id));
      await db.update(brackets).set({ totalPoints: 0, correctPicks: 0, totalPicks: 0, isComplete: false }).where(eq(brackets.id, bracket.id));
      return { success: true };
    }),

    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const bracketRows = await db
          .select()
          .from(brackets)
          .where(eq(brackets.shareToken, input.token))
          .limit(1);
        if (!bracketRows[0]) return null;
        const picks = await getBracketPicks(bracketRows[0].id);
        const owner = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, bracketRows[0].userId))
          .limit(1);
        return { bracket: bracketRows[0], picks, ownerName: owner[0]?.name ?? "Anonymous" };
      }),
  }),

  // ─── Leaderboard ────────────────────────────────────────────────────────────
  leaderboard: router({
    get: publicProcedure.query(async () => {
      return getLeaderboard(50);
    }),
    getComments: publicProcedure.query(async () => {
      return getComments(30);
    }),
    addComment: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(280) }))
      .mutation(async ({ ctx, input }) => {
        await addComment(ctx.user.id, input.content);
        // Grant trash talker achievement after 5 comments
        await grantAchievement(ctx.user.id, "trash_talker");
        return { success: true };
      }),
  }),

  // ─── Achievements ────────────────────────────────────────────────────────────
  achievements: router({
    getAll: publicProcedure.query(async () => {
      return getAllAchievementDefs();
    }),
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return getUserAchievements(ctx.user.id);
    }),
    grant: protectedProcedure
      .input(z.object({ key: z.string(), bracketId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await grantAchievement(ctx.user.id, input.key, input.bracketId);
        return { success: true };
      }),
  }),

  // ─── Challenges ──────────────────────────────────────────────────────────────
  challenge: router({
    create: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // User must have a bracket to challenge
        const bracket = await getUserBracket(ctx.user.id);
        if (!bracket) throw new TRPCError({ code: "BAD_REQUEST", message: "You need a bracket first!" });
        const { challengeId, inviteToken } = await createChallenge(ctx.user.id, bracket.id, input.title);
        // Grant challenger achievement
        await grantAchievement(ctx.user.id, "challenger");
        return { challengeId, inviteToken };
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const challenge = await getChallengeByToken(input.token);
        if (!challenge) return null;
        const participants = await getChallengeParticipants(challenge.id);
        const db = await getDb();
        if (!db) return null;
        // Get challenger name
        const challenger = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, challenge.challengerId))
          .limit(1);
        return { challenge, participants, challengerName: challenger[0]?.name ?? "Someone" };
      }),

    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const challenge = await getChallengeByToken(input.token);
        if (!challenge) throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
        if (challenge.challengerId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You can't accept your own challenge!" });
        }
        if (challenge.status === "active" && challenge.challengedId !== ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This challenge has already been accepted by someone else." });
        }
        const bracket = await getUserBracket(ctx.user.id);
        if (!bracket) throw new TRPCError({ code: "BAD_REQUEST", message: "You need a bracket to accept a challenge!" });
        await acceptChallenge(challenge.id, ctx.user.id, bracket.id);
        await grantAchievement(ctx.user.id, "challenger");
        return { challengeId: challenge.id };
      }),

    getH2H: publicProcedure
      .input(z.object({ challengeId: z.number() }))
      .query(async ({ input }) => {
        const challenge = await getChallengeById(input.challengeId);
        if (!challenge) return null;
        const participants = await getChallengeParticipants(input.challengeId);
        const h2hPicks = await getH2HPicks(input.challengeId);
        return { challenge, participants, h2hPicks };
      }),

    getMyChallenges: protectedProcedure.query(async ({ ctx }) => {
      const myChallenges = await getChallengesForUser(ctx.user.id);
      // Enrich each challenge with participants
      const enriched = await Promise.all(
        myChallenges.map(async (c) => {
          const participants = await getChallengeParticipants(c.id);
          return { ...c, participants };
        })
      );
      return enriched;
    }),
  }),

  // ─── AI Analysis ─────────────────────────────────────────────────────────────
  ai: router({
    analyzeBracket: protectedProcedure
      .input(
        z.object({
          region: z.string().optional(),
          question: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const teams = await getAllTeams();
        const teamSummary = teams
          .slice(0, 32)
          .map((t) => `${t.seed} ${t.shortName} (${t.conference}, ${t.record})`)
          .join(", ");

        const prompt = input.question
          ? `You are a March Madness expert AI assistant named "Bracket Buddy". Answer this question about the 2026 NCAA Tournament: ${input.question}\n\nTeams in the field: ${teamSummary}\n\nBe fun, energetic, and give specific predictions with reasoning. Use emojis. Keep it under 200 words.`
          : `You are a March Madness expert AI assistant named "Bracket Buddy". Give 3 bold upset predictions and 1 Cinderella team pick for the 2026 NCAA Tournament.\n\nTeams: ${teamSummary}\n\nBe fun, specific, and use emojis. Format as: 🔥 UPSET ALERT: [team] over [team] because... Keep it under 200 words.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are Bracket Buddy, a fun and knowledgeable March Madness AI assistant. Be energetic, use emojis, and make bold predictions." },
            { role: "user", content: prompt },
          ],
        });

        return {
          analysis: response.choices[0]?.message?.content ?? "Let's go! Time to bust some brackets! 🏀",
        };
      }),

    // Parse voice speech to detect a bracket pick intent
    // Returns { isPick: true, teamName, teamId, confirmMessage } or { isPick: false, response }
    parseVoicePick: publicProcedure
      .input(z.object({ speech: z.string().min(1).max(500) }))
      .mutation(async ({ input }) => {
        const teams = await getAllTeams();
        const teamList = teams.map((t) => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          seed: t.seed,
          region: t.region,
        }));
        const teamListStr = teamList
          .map((t) => `id:${t.id} "${t.shortName}" (${t.name}, seed ${t.seed}, ${t.region})`)
          .join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a bracket pick parser for March Madness. Your ONLY job is to detect if the user is trying to pick a team to advance in their bracket.

Available teams:\n${teamListStr}\n
If the user says something like "I pick Duke", "Duke wins", "take Duke", "Duke over Kentucky", "go with Duke", "Duke all the way" — that is a PICK.
If they are asking a question or requesting analysis — that is NOT a pick.

Respond with ONLY valid JSON in this exact format:
- If it IS a pick: {"isPick": true, "teamId": <number>, "teamName": "<shortName>", "confirmMessage": "<fun 1-sentence confirmation with emoji>"}
- If it is NOT a pick: {"isPick": false, "response": "<helpful AI answer under 100 words with emojis>"}

IMPORTANT: Only output JSON. No other text.`,
            },
            { role: "user", content: input.speech },
          ],
          response_format: { type: "json_object" } as any,
        });

        const rawContent = response.choices[0]?.message?.content ?? "{}";
        const raw = typeof rawContent === "string" ? rawContent : "{}";
        try {
          const parsed = JSON.parse(raw);
          if (parsed.isPick && parsed.teamId) {
            // Validate teamId exists
            const team = teamList.find((t) => t.id === parsed.teamId);
            if (!team) return { isPick: false as const, response: "Hmm, I couldn't find that team. Try saying the team name more clearly! 🏀" };
            return {
              isPick: true as const,
              teamId: team.id,
              teamName: team.shortName,
              confirmMessage: parsed.confirmMessage ?? `🏀 ${team.shortName} advances! Great pick!`,
            };
          }
          return { isPick: false as const, response: parsed.response ?? "Let's go! 🏀" };
        } catch {
          return { isPick: false as const, response: "I didn't catch that — try saying a team name like 'I pick Duke'! 🏀" };
        }
      }),

    // Free text/voice chat — no VAPI, uses built-in LLM
    chat: publicProcedure
      .input(z.object({ message: z.string().min(1).max(500) }))
      .mutation(async ({ input }) => {
        const teams = await getAllTeams();
        const teamSummary = teams
          .slice(0, 32)
          .map((t) => `${t.seed} ${t.shortName} (${t.region}, ${t.conference}, ${t.record})`)
          .join(", ");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are Bracket Buddy, a fun and knowledgeable March Madness AI assistant. Be energetic, use emojis, and make bold predictions. Keep responses under 150 words. Teams in the 2026 field: ${teamSummary}`,
            },
            { role: "user", content: input.message },
          ],
        });

        return {
          response: response.choices[0]?.message?.content ?? "Let's go! Time to bust some brackets! 🏀",
        };
      }),
  }),

  // ─── Tournament / Live Scores ─────────────────────────────────────────────
  tournament: router({
    // Get live game results (public)
    liveScores: publicProcedure.query(async () => {
      return getLiveScores(2026);
    }),

    // Get tournament config/status (public)
    config: publicProcedure.query(async () => {
      return getTournamentConfig(2026);
    }),

    // Admin: trigger ESPN sync manually
    syncNow: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const result = await syncEspnScores(2026);
      return result;
    }),

    // Admin: lock/unlock brackets
    setLocked: protectedProcedure
      .input(z.object({ locked: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const existing = await db.select({ id: tournamentConfig.id }).from(tournamentConfig).where(eq(tournamentConfig.year, 2026)).limit(1);
        if (existing.length > 0) {
          await db.update(tournamentConfig).set({ isLocked: input.locked }).where(eq(tournamentConfig.year, 2026));
        } else {
          await db.insert(tournamentConfig).values({ year: 2026, isLocked: input.locked });
        }
        // Also lock/unlock all brackets
        await db.update(brackets).set({ isLocked: input.locked }).where(eq(brackets.year, 2026));
        return { success: true, locked: input.locked };
      }),

    // Get scheduler status (admin only)
    syncStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return getSchedulerStatus();
    }),

    // Admin: trigger immediate sync (uses scheduler so it resets the timer)
    syncNowImmediate: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      await triggerImmediateSync();
      return getSchedulerStatus();
    }),

    // Admin: manually set a game result (fallback if ESPN API doesn't have it)
    setResult: protectedProcedure
      .input(z.object({
        matchupId: z.string(),
        round: z.enum(["firstfour","round64","round32","sweet16","elite8","finalfour","championship"]),
        team1Id: z.number(),
        team2Id: z.number(),
        winnerId: z.number(),
        team1Score: z.number().optional(),
        team2Score: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const existing = await db.select({ id: gameResults.id, isScored: gameResults.isScored })
          .from(gameResults)
          .where(eq(gameResults.matchupId, input.matchupId))
          .limit(1);

        if (existing.length > 0) {
          await db.update(gameResults).set({
            winnerId: input.winnerId,
            team1Score: input.team1Score,
            team2Score: input.team2Score,
            isComplete: true,
            espnStatus: "STATUS_FINAL",
            playedAt: new Date(),
          }).where(eq(gameResults.matchupId, input.matchupId));
        } else {
          await db.insert(gameResults).values({
            year: 2026,
            round: input.round,
            matchupId: input.matchupId,
            team1Id: input.team1Id,
            team2Id: input.team2Id,
            winnerId: input.winnerId,
            team1Score: input.team1Score,
            team2Score: input.team2Score,
            isComplete: true,
            isScored: false,
            espnStatus: "STATUS_FINAL",
            playedAt: new Date(),
          });
        }

        return { success: true };
      }),

    // Admin: bulk-update teams with the real bracket (run after Selection Sunday reveal)
    updateTeams: protectedProcedure
      .input(z.object({
        teams: z.array(z.object({
          seed: z.number().min(1).max(16),
          region: z.enum(["East", "West", "South", "Midwest"]),
          name: z.string(),
          shortName: z.string(),
          conference: z.string().optional(),
          isFirstFour: z.boolean().optional(),
        })),
        clearPicks: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        let updated = 0;
        let inserted = 0;

        for (const t of input.teams) {
          // Try to find existing team by seed+region
          const existing = await db.select({ id: teams.id })
            .from(teams)
            .where(and(eq(teams.seed, t.seed), eq(teams.region, t.region)))
            .limit(1);

          if (existing.length > 0) {
            await db.update(teams).set({
              name: t.name,
              shortName: t.shortName,
              conference: t.conference ?? "",
              isFirstFour: t.isFirstFour ?? false,
            }).where(eq(teams.id, existing[0].id));
            updated++;
          } else {
            await db.insert(teams).values({
              seed: t.seed,
              region: t.region,
              name: t.name,
              shortName: t.shortName,
              conference: t.conference ?? "",
              isFirstFour: t.isFirstFour ?? false,
            });
            inserted++;
          }
        }

        // Optionally clear all picks so users start fresh with real teams
        let picksCleared = 0;
        if (input.clearPicks) {
          // Get all 2026 bracket IDs first, then delete their picks
          const bracketRows = await db.select({ id: brackets.id }).from(brackets).where(eq(brackets.year, 2026));
          const bracketIds = bracketRows.map((b) => b.id);
          if (bracketIds.length > 0) {
            const result = await db.delete(picks).where(sql`${picks.bracketId} IN (${sql.join(bracketIds.map(id => sql`${id}`), sql`, `)})`);
            picksCleared = result[0]?.affectedRows ?? 0;
          }
          // Reset bracket totals
          await db.update(brackets).set({ totalPoints: 0, correctPicks: 0, totalPicks: 0 }).where(eq(brackets.year, 2026));
        }

        return { success: true, updated, inserted, picksCleared };
      }),
  }),

  // ─── Email ──────────────────────────────────────────────────────────────────
  email: router({
    // Admin: send bracket lock reminder to all users with email
    sendLockReminders: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const allUsers = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
        const result = await sendBulkLockReminders(allUsers);
        return result;
      }),

    // Admin: send a test welcome email to yourself
    sendTestWelcome: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const me = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const email = me[0]?.email;
        const name = me[0]?.name ?? "Admin";
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "No email on your account" });
        const ok = await sendWelcomeEmail(email, name);
        return { success: ok, sentTo: email };
      }),
  }),
});

export type AppRouter = typeof appRouter;
