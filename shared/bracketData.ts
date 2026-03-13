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
