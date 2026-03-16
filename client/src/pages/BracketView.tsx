/**
 * BracketView — read-only public view of any user's bracket.
 * Route: /bracket/view/:bracketId
 */
import { useMemo } from "react";
import { useParams, Link } from "wouter";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { SEED_PAIRS_R64, FIRST_FOUR_MATCHUPS, type Region, type Round, type TeamData } from "../../../shared/bracketData";

type PicksMap = Record<string, number>;

const REGIONS: Region[] = ["East", "West", "South", "Midwest"];
const ROUND_SEQUENCE: Round[] = ["round64", "round32", "sweet16", "elite8"];

function getMatchupId(region: string, round: string, slot: number) {
  return `${region}-${round}-${slot}`;
}

function TeamSlot({
  team,
  picked,
  winner,
}: {
  team?: TeamData;
  picked?: boolean;
  winner?: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 min-h-[32px]">
        <span className="text-white/20 text-xs">TBD</span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 min-h-[32px] transition-all ${
        winner ? "bg-[oklch(0.65_0.22_35/0.25)] border-l-2 border-[oklch(0.65_0.22_35)]" :
        picked ? "bg-white/8" : ""
      }`}
    >
      <span
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: team.color ?? "#555" }}
      >
        {team.seed}
      </span>
      <span className={`text-sm truncate ${picked ? "text-white font-semibold" : "text-white/70"}`}>
        {team.shortName ?? team.name}
      </span>
      {winner && <span className="ml-auto text-[oklch(0.65_0.22_35)] text-xs">✓</span>}
    </div>
  );
}

function MatchupCard({
  team1,
  team2,
  pickedId,
  winnerId,
}: {
  team1?: TeamData;
  team2?: TeamData;
  pickedId?: number;
  winnerId?: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden bg-[oklch(0.14_0.01_260)] min-w-[140px] max-w-[160px]">
      <TeamSlot team={team1} picked={pickedId === team1?.id} winner={winnerId === team1?.id} />
      <div className="h-px bg-white/10" />
      <TeamSlot team={team2} picked={pickedId === team2?.id} winner={winnerId === team2?.id} />
    </div>
  );
}

export default function BracketView() {
  const params = useParams<{ bracketId: string }>();
  const bracketId = parseInt(params.bracketId ?? "0", 10);

  const { data: teamsData } = trpc.teams.getAll.useQuery();
  const { data, isLoading, error } = trpc.leaderboard.getBracketById.useQuery(
    { bracketId },
    { enabled: !!bracketId }
  );

  const teams: TeamData[] = useMemo(() => (teamsData ?? []) as TeamData[], [teamsData]);

  const picks: PicksMap = useMemo(() => {
    const map: PicksMap = {};
    data?.picks.forEach((p) => { map[p.matchupId] = p.pickedTeamId; });
    return map;
  }, [data]);

  function getTeam(id?: number | null): TeamData | undefined {
    if (!id) return undefined;
    return teams.find((t) => t.id === id);
  }

  function resolveTeam(region: Region, seed: number): TeamData | undefined {
    const ff = FIRST_FOUR_MATCHUPS.find((f) => f.region === region && f.winnerSeed === seed);
    if (ff) {
      const winnerId = picks[ff.id];
      if (winnerId) return getTeam(winnerId);
      return undefined;
    }
    return teams.find((t) => t.region === region && t.seed === seed && !t.isFirstFour);
  }

  function getMatchupsForRound(region: Region, round: Round) {
    return SEED_PAIRS_R64.map((pair, slot) => {
      const id = getMatchupId(region, round, slot);
      const pickedId = picks[id];
      if (round === "round64") {
        return { id, team1: resolveTeam(region, pair[0]), team2: resolveTeam(region, pair[1]), pickedId };
      }
      // For later rounds, derive teams from prior round picks
      const prevRound: Round = round === "round32" ? "round64" : round === "sweet16" ? "round32" : "elite8";
      const m1Id = getMatchupId(region, prevRound, slot * 2);
      const m2Id = getMatchupId(region, prevRound, slot * 2 + 1);
      const t1 = getTeam(picks[m1Id]);
      const t2 = getTeam(picks[m2Id]);
      return { id, team1: t1, team2: t2, pickedId };
    });
  }

  // Final Four
  function getFinalFourMatchups() {
    const elite8Ids = [
      getMatchupId("East", "elite8", 0),
      getMatchupId("West", "elite8", 0),
      getMatchupId("South", "elite8", 0),
      getMatchupId("Midwest", "elite8", 0),
    ];
    const ff0 = { id: "FinalFour-0", team1: getTeam(picks[elite8Ids[0]]), team2: getTeam(picks[elite8Ids[1]]), pickedId: picks["FinalFour-0"] };
    const ff1 = { id: "FinalFour-1", team1: getTeam(picks[elite8Ids[2]]), team2: getTeam(picks[elite8Ids[3]]), pickedId: picks["FinalFour-1"] };
    return [ff0, ff1];
  }

  const ffMatchups = useMemo(() => getFinalFourMatchups(), [picks, teams]);
  const champTeam1 = getTeam(picks["FinalFour-0"]);
  const champTeam2 = getTeam(picks["FinalFour-1"]);
  const champPickedId = picks["Championship-0"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-white/50">Bracket not found.</p>
          <Link href="/leaderboard">
            <button className="text-sm text-[oklch(0.65_0.22_35)] hover:underline">← Back to Leaderboard</button>
          </Link>
        </div>
      </div>
    );
  }

  const totalPicks = data.picks.length;
  const progressPct = Math.round((totalPicks / 67) * 100);

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Header */}
      <div className="border-b border-white/10 bg-[oklch(0.12_0.01_260)]">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/leaderboard">
                  <button className="text-white/40 hover:text-white text-sm transition-colors">← Leaderboard</button>
                </Link>
              </div>
              <h1 className="font-display text-3xl text-white">{data.ownerName}'s BRACKET</h1>
              <p className="text-white/50 text-sm">
                2026 NCAA Tournament · {totalPicks}/67 picks · {data.bracket.totalPoints ?? 0} pts
                {(data.bracket.correctPicks ?? 0) > 0 && ` · ${data.bracket.correctPicks} correct`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-white/50">Progress</span>
                  <span className="text-xs font-bold text-[oklch(0.65_0.22_35)]">{progressPct}%</span>
                </div>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/50 font-medium">
                👁 View Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* First Four */}
      <div className="px-4 pt-6 pb-2">
        <div className="max-w-full mx-auto">
          <h2 className="font-display text-lg text-white/60 mb-3 uppercase tracking-wider">First Four</h2>
          <div className="flex flex-wrap gap-4">
            {FIRST_FOUR_MATCHUPS.map((ff) => {
              const playInTeams = teams.filter((t) => t.region === ff.region && t.seed === ff.winnerSeed && t.isFirstFour);
              return (
                <div key={ff.id} className="flex flex-col gap-1">
                  <span className="text-xs text-white/40 mb-1">{ff.label}</span>
                  <MatchupCard
                    team1={playInTeams[0]}
                    team2={playInTeams[1]}
                    pickedId={picks[ff.id]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regional Brackets */}
      <div className="px-4 py-6 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {REGIONS.map((region) => (
            <div key={region} className="flex flex-col gap-2">
              <h2 className="font-display text-xl text-white/80 uppercase mb-2">{region}</h2>
              <div className="flex gap-4">
                {ROUND_SEQUENCE.map((round) => (
                  <div key={round} className="flex flex-col gap-2">
                    <span className="text-xs text-white/30 uppercase tracking-wider text-center mb-1">
                      {round === "round64" ? "R64" : round === "round32" ? "R32" : round === "sweet16" ? "S16" : "E8"}
                    </span>
                    <div className="flex flex-col gap-2">
                      {getMatchupsForRound(region, round).map((m) => (
                        <MatchupCard
                          key={m.id}
                          team1={m.team1}
                          team2={m.team2}
                          pickedId={m.pickedId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Four & Championship */}
      <div className="px-4 pb-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl text-white/80 uppercase mb-4 text-center">Final Four & Championship</h2>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {ffMatchups.map((ff) => (
              <MatchupCard
                key={ff.id}
                team1={ff.team1}
                team2={ff.team2}
                pickedId={ff.pickedId}
              />
            ))}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-white/30 uppercase tracking-wider mb-1">Champion</span>
              <MatchupCard
                team1={champTeam1}
                team2={champTeam2}
                pickedId={champPickedId}
              />
              {champPickedId && (
                <div className="mt-2 px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_35/0.2)] border border-[oklch(0.65_0.22_35/0.4)] text-center">
                  <div className="text-xs text-white/50 mb-0.5">Champion Pick</div>
                  <div className="font-display text-lg text-[oklch(0.65_0.22_35)]">
                    {getTeam(champPickedId)?.shortName ?? "?"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
