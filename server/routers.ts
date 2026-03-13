import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
import { brackets, users, gameResults, tournamentConfig } from "../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";
import { syncEspnScores, getLiveScores, getTournamentConfig } from "./espnSync";
import { getSchedulerStatus, triggerImmediateSync } from "./syncScheduler";

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
  }),
});

export type AppRouter = typeof appRouter;
