export type Region = "East" | "West" | "South" | "Midwest";

export type Round =
  | "firstfour"
  | "round64"
  | "round32"
  | "sweet16"
  | "elite8"
  | "finalfour"
  | "championship";

export const ROUND_LABELS: Record<Round, string> = {
  firstfour: "First Four",
  round64: "Round of 64",
  round32: "Round of 32",
  sweet16: "Sweet 16",
  elite8: "Elite Eight",
  finalfour: "Final Four",
  championship: "Championship",
};

export const ROUND_POINTS: Record<Round, number> = {
  firstfour: 5,
  round64: 10,
  round32: 20,
  sweet16: 40,
  elite8: 80,
  finalfour: 160,
  championship: 320,
};

export const UPSET_MULTIPLIER = 1.5;

export interface TeamData {
  id: number;
  name: string;
  shortName: string;
  seed: number;
  region: Region;
  conference: string | null;
  record: string | null;
  ppg: number | null;
  oppg: number | null;
  color: string | null;
  color2: string | null;
  tournamentWins: number | null;
  championships: number | null;
  isFirstFour: boolean;
}

// Matchup structure for the bracket
export interface Matchup {
  id: string; // e.g. "East-R64-1"
  round: Round;
  region: Region | "FinalFour" | "Championship";
  slot: number;
  team1?: TeamData;
  team2?: TeamData;
  pickedTeamId?: number;
  winnerId?: number; // actual result
}

// Standard seeding order for display
export const SEED_PAIRS_R64 = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

/**
 * Historical win rates for each seed in the Round of 64 (since 1985 expansion).
 * Source: NCAA official records through 2025.
 * Key: seed number → win percentage (0–100)
 */
export const SEED_WIN_RATES_R64: Record<number, number> = {
  1: 99,
  2: 94,
  3: 85,
  4: 79,
  5: 65,
  6: 63,
  7: 61,
  8: 49,
  9: 51,
  10: 39,
  11: 37,
  12: 35,
  13: 21,
  14: 15,
  15: 6,
  16: 1,
};

/**
 * Upset probability for each seed-pair matchup in Round of 64.
 * Returns the probability (0–100) that the LOWER seed (higher number) wins.
 * Key: `${higherSeed}v${lowerSeed}` e.g. "12v5"
 */
export function getUpsetProbability(favoriteSeed: number, underdogSeed: number): number {
  if (favoriteSeed >= underdogSeed) return 0; // not an upset scenario
  const underdogWinRate = SEED_WIN_RATES_R64[underdogSeed] ?? 0;
  return underdogWinRate;
}

/**
 * Seed matchup history label for display.
 * e.g. seed 1 vs 16 → "1 seeds win 99% historically"
 */
export function getSeedMatchupLabel(seed1: number, seed2: number): string {
  const fav = Math.min(seed1, seed2);
  const dog = Math.max(seed1, seed2);
  const favRate = SEED_WIN_RATES_R64[fav] ?? 50;
  const dogRate = 100 - favRate;

  if (dogRate >= 40) {
    return `Toss-up! ${fav} vs ${dog} seeds split ~50/50 historically`;
  }
  if (dogRate >= 25) {
    return `${dog} seeds pull the upset ${dogRate}% of the time`;
  }
  if (dogRate >= 10) {
    return `${dog} seeds upset ${fav} seeds ${dogRate}% historically`;
  }
  return `${fav} seeds win ${favRate}% of the time`;
}

/**
 * Fun March Madness facts for the rotating ticker.
 */
export const MARCH_MADNESS_FACTS = [
  "A 16 seed has only beaten a 1 seed ONCE in history — UMBC over Virginia in 2018 🏀",
  "12 seeds beat 5 seeds about 35% of the time — always worth the upset pick!",
  "The odds of a perfect bracket are 1 in 9.2 quintillion. You're more likely to be struck by lightning 3,000 times.",
  "Duke has the most Final Four appearances with 17 trips since 1986.",
  "The term 'March Madness' was first used for the Illinois state high school tournament in 1939.",
  "Only 1 team has ever gone undefeated through the tournament: the 1976 Indiana Hoosiers.",
  "8 vs 9 seed matchups are the closest in history — 9 seeds win 51% of the time!",
  "The Sweet 16 has never featured all 16 top seeds in the same year.",
  "UCLA holds the record for most championships with 11 titles.",
  "Cinderella stories: George Mason 2006, VCU 2011, Loyola-Chicago 2018 all made the Final Four as double-digit seeds.",
  "The average winning margin in the Round of 64 is just 12 points.",
  "Teams from power conferences win about 75% of their first-round games.",
  "The Big East has produced the most tournament champions of any conference.",
  "Selection Sunday has been held every year since 1939 — that's 87 consecutive tournaments!",
  "11 seeds have made the Final Four 8 times since 1985 — they're the ultimate bracket busters.",
  "The highest-scoring tournament game was UNLV's 131-101 win over Duke in the 1990 championship.",
  "Only 5 teams have ever won back-to-back championships: UCLA (7x), Duke, Florida, Kentucky, and Cincinnati.",
  "The 2023 tournament had the most upsets in history with 20 double-digit seed wins.",
  "Kansas has appeared in the most tournament games of any program.",
  "A 5 seed has won the championship twice: Villanova in 1985 and 2016.",
];
