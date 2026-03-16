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

/**
 * First Four matchup structure.
 * 4 games: 2 between at-large 11 seeds, 2 between automatic 16 seeds.
 * Winners advance to the Round of 64 in the specified region/slot.
 * region + slot must match the SEED_PAIRS_R64 index for seed 11 or 16.
 */
export interface FirstFourMatchup {
  id: string;          // e.g. "FirstFour-0"
  region: Region;      // which region the winner enters
  winnerSeed: 11 | 16; // the seed the winner takes in R64
  label: string;       // display label
}

// 2026 actual First Four matchups (matches ESPN/DB team data)
export const FIRST_FOUR_MATCHUPS: FirstFourMatchup[] = [
  { id: "FirstFour-0", region: "West",    winnerSeed: 11, label: "West 11 Play-In (Texas vs NC State)" },
  { id: "FirstFour-1", region: "South",   winnerSeed: 16, label: "South 16 Play-In (Prairie View vs Lehigh)" },
  { id: "FirstFour-2", region: "Midwest", winnerSeed: 11, label: "Midwest 11 Play-In (SMU vs Miami OH)" },
  { id: "FirstFour-3", region: "Midwest", winnerSeed: 16, label: "Midwest 16 Play-In (UMBC vs Howard)" },
];

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
 * All-time head-to-head records for each Round of 64 seed matchup (since 1985).
 * Each entry: [favoriteSeed, underdogSeed, favWins, underdogWins, funFact]
 * Source: NCAA official records through 2025 (160 total games per matchup = 4 regions × 40 years).
 */
export const SEED_H2H_RECORDS: Record<string, {
  favSeed: number;
  dogSeed: number;
  favWins: number;
  dogWins: number;
  total: number;
  funFact: string;
}> = {
  "1v16": { favSeed: 1, dogSeed: 16, favWins: 159, dogWins: 1,  total: 160, funFact: "UMBC's 2018 win over Virginia is the ONLY 16-over-1 upset ever" },
  "2v15": { favSeed: 2, dogSeed: 15, favWins: 150, dogWins: 10, total: 160, funFact: "15 seeds have pulled off 10 upsets — Saint Peter's 2022 was the most recent" },
  "3v14": { favSeed: 3, dogSeed: 14, favWins: 136, dogWins: 24, total: 160, funFact: "14 seeds win about 15% of the time — one per tournament on average" },
  "4v13": { favSeed: 4, dogSeed: 13, favWins: 127, dogWins: 33, total: 160, funFact: "13 seeds have caused chaos 33 times — never count them out" },
  "5v12": { favSeed: 5, dogSeed: 12, favWins: 104, dogWins: 56, total: 160, funFact: "The 5-12 upset is so common it has its own name: the '12-5 Rule'" },
  "6v11": { favSeed: 6, dogSeed: 11, favWins: 101, dogWins: 59, total: 160, funFact: "11 seeds have reached the Final Four 8 times — ultimate bracket busters" },
  "7v10": { favSeed: 7, dogSeed: 10, favWins: 98,  dogWins: 62, total: 160, funFact: "7 vs 10 is nearly a coin flip — 10 seeds win 39% of the time" },
  "8v9":  { favSeed: 8, dogSeed: 9,  favWins: 79,  dogWins: 81, total: 160, funFact: "9 seeds actually have a winning record against 8 seeds! 51% win rate" },
};

/**
 * Returns the H2H record for a seed matchup, or null if not a standard R64 pairing.
 */
export function getSeedH2H(seed1: number, seed2: number) {
  const fav = Math.min(seed1, seed2);
  const dog = Math.max(seed1, seed2);
  const key = `${fav}v${dog}`;
  return SEED_H2H_RECORDS[key] ?? null;
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
