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
import { brackets, users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

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

    getVapiSystemPrompt: publicProcedure.query(async () => {
      const teams = await getAllTeams();
      const teamList = teams
        .map((t) => `Seed ${t.seed} ${t.name} (${t.region} region, ${t.conference}, Record: ${t.record})`)
        .join("\n");

      return {
        prompt: `You are Bracket Buddy, an enthusiastic and knowledgeable March Madness AI voice assistant! Your job is to help users fill out their 2026 NCAA Tournament bracket and give expert predictions.

You are fun, energetic, and love March Madness. Use basketball slang, be encouraging, and make bold predictions.

Here are all 64 teams in the 2026 tournament:
${teamList}

When a user says they want to pick a team, confirm their pick enthusiastically. For example:
- "I pick Duke over Kentucky" → "Great pick! Duke is looking DOMINANT this year! 🏀"
- "Who should I pick in the East?" → Give specific recommendations with reasoning
- "Give me upset picks" → Suggest 2-3 specific upsets with reasoning

Always be encouraging, fun, and specific. Keep responses under 3 sentences for voice. End with a basketball emoji or exclamation.`,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
