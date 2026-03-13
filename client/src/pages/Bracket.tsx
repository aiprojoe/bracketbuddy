import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Zap, Share2, RotateCcw, ChevronRight, Trophy, Sparkles } from "lucide-react";
import { type TeamData, SEED_PAIRS_R64, type Region, type Round } from "../../../shared/bracketData";
import VoiceAssistant from "@/components/VoiceAssistant";
import AIAnalysis from "@/components/AIAnalysis";
import { Link } from "wouter";

type PicksMap = Record<string, number>; // matchupId -> pickedTeamId

const REGIONS: Region[] = ["East", "West", "South", "Midwest"];

const ROUND_SEQUENCE: Round[] = ["round64", "round32", "sweet16", "elite8", "finalfour", "championship"];

const ROUND_LABELS: Record<Round, string> = {
  firstfour: "First Four",
  round64: "Round of 64",
  round32: "Round of 32",
  sweet16: "Sweet 16",
  elite8: "Elite Eight",
  finalfour: "Final Four",
  championship: "Championship",
};

function getMatchupId(region: string, round: string, slot: number) {
  return `${region}-${round}-${slot}`;
}

function TeamSlot({
  team,
  picked,
  eliminated,
  onClick,
}: {
  team?: TeamData;
  picked: boolean;
  eliminated: boolean;
  onClick?: () => void;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-white/5 bg-white/3 min-h-[36px]">
        <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-xs text-white/20">?</div>
        <span className="text-white/20 text-xs">TBD</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={eliminated || !onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border text-left transition-all min-h-[36px] ${
        picked
          ? "bg-[oklch(0.65_0.22_35/0.2)] border-[oklch(0.65_0.22_35/0.6)] text-white"
          : eliminated
          ? "bg-white/3 border-white/5 text-white/25 cursor-not-allowed"
          : "bg-[oklch(0.14_0.015_260)] border-white/10 text-white/80 hover:border-[oklch(0.65_0.22_35/0.5)] hover:bg-[oklch(0.65_0.22_35/0.08)]"
      }`}
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white"
        style={{ backgroundColor: team.color ?? "#333" }}
      >
        {team.seed}
      </div>
      <span className="text-xs font-medium truncate flex-1">{team.shortName}</span>
      {picked && <span className="text-[oklch(0.65_0.22_35)] text-xs">✓</span>}
    </button>
  );
}

function Matchup({
  team1,
  team2,
  pickedTeamId,
  eliminatedTeamId,
  onPick,
  matchupId,
}: {
  team1?: TeamData;
  team2?: TeamData;
  pickedTeamId?: number;
  eliminatedTeamId?: number;
  onPick: (teamId: number, team1Seed: number, team2Seed: number | null) => void;
  matchupId: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[130px] max-w-[150px]">
      <TeamSlot
        team={team1}
        picked={pickedTeamId === team1?.id}
        eliminated={eliminatedTeamId === team1?.id}
        onClick={team1 && team2 ? () => onPick(team1.id, team1.seed, team2?.seed ?? null) : undefined}
      />
      <div className="text-center text-[10px] text-white/20 leading-none">vs</div>
      <TeamSlot
        team={team2}
        picked={pickedTeamId === team2?.id}
        eliminated={eliminatedTeamId === team2?.id}
        onClick={team2 && team1 ? () => onPick(team2.id, team1?.seed ?? 99, team2.seed) : undefined}
      />
    </div>
  );
}

export default function Bracket() {
  const { user, isAuthenticated, loading } = useAuth();
  const [picks, setPicks] = useState<PicksMap>({});
  const [bracketId, setBracketId] = useState<number | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [activeRegion, setActiveRegion] = useState<Region>("East");
  const [totalPicks, setTotalPicks] = useState(0);

  const { data: teamsData } = trpc.teams.getAll.useQuery();
  const { data: bracketData, refetch: refetchBracket } = trpc.bracket.getMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createBracket = trpc.bracket.create.useMutation();
  const makePick = trpc.bracket.makePick.useMutation();

  const teams = teamsData ?? [];

  // Load existing picks
  useEffect(() => {
    if (bracketData) {
      setBracketId(bracketData.bracket.id);
      const picksMap: PicksMap = {};
      bracketData.picks.forEach((p) => {
        picksMap[p.matchupId] = p.pickedTeamId;
      });
      setPicks(picksMap);
      setTotalPicks(bracketData.picks.length);
    }
  }, [bracketData]);

  // Create bracket if logged in and none exists
  useEffect(() => {
    if (isAuthenticated && !loading && !bracketData && !bracketId) {
      createBracket.mutateAsync({}).then((b) => {
        setBracketId(b.id);
        refetchBracket();
      });
    }
  }, [isAuthenticated, loading, bracketData]);

  const getTeamsByRegion = (region: Region) =>
    teams.filter((t) => t.region === region).sort((a, b) => a.seed - b.seed);

  const getTeamBySeed = (region: Region, seed: number) =>
    teams.find((t) => t.region === region && t.seed === seed);

  // Build matchups for a region and round
  const getMatchupsForRound = useCallback(
    (region: Region, round: Round): Array<{ id: string; team1?: TeamData; team2?: TeamData }> => {
      if (round === "round64") {
        return SEED_PAIRS_R64.map(([s1, s2], i) => ({
          id: getMatchupId(region, round, i),
          team1: getTeamBySeed(region, s1),
          team2: getTeamBySeed(region, s2),
        }));
      }

      // For later rounds, winners of previous round
      const prevRound = ROUND_SEQUENCE[ROUND_SEQUENCE.indexOf(round) - 1];
      if (!prevRound) return [];
      const prevMatchups = getMatchupsForRound(region, prevRound);
      const result = [];
      for (let i = 0; i < prevMatchups.length; i += 2) {
        const m1 = prevMatchups[i];
        const m2 = prevMatchups[i + 1];
        if (!m1 || !m2) break;
        const winner1Id = picks[m1.id];
        const winner2Id = picks[m2.id];
        const winner1 = winner1Id ? teams.find((t) => t.id === winner1Id) : undefined;
        const winner2 = winner2Id ? teams.find((t) => t.id === winner2Id) : undefined;
        result.push({
          id: getMatchupId(region, round, Math.floor(i / 2)),
          team1: winner1,
          team2: winner2,
        });
      }
      return result;
    },
    [picks, teams]
  );

  // Final Four matchups
  const getFinalFourMatchups = useCallback(() => {
    const regions: Region[] = ["East", "West", "South", "Midwest"];
    const elite8Winners = regions.map((region) => {
      const elite8 = getMatchupsForRound(region, "elite8");
      const finalMatchup = elite8[0]; // last matchup in elite8 produces region winner
      // Actually get the winner of the last elite8 matchup
      const elite8Matchups = getMatchupsForRound(region, "elite8");
      // Elite 8 has 1 matchup per region
      const m = elite8Matchups[0];
      if (!m) return undefined;
      const winnerId = picks[m.id];
      return winnerId ? teams.find((t) => t.id === winnerId) : undefined;
    });

    return [
      {
        id: "FinalFour-0",
        team1: elite8Winners[0], // East
        team2: elite8Winners[1], // West
      },
      {
        id: "FinalFour-1",
        team1: elite8Winners[2], // South
        team2: elite8Winners[3], // Midwest
      },
    ];
  }, [picks, teams, getMatchupsForRound]);

  const getChampionshipMatchup = useCallback(() => {
    const ff = getFinalFourMatchups();
    const w1Id = picks[ff[0]?.id ?? ""];
    const w2Id = picks[ff[1]?.id ?? ""];
    return {
      id: "Championship-0",
      team1: w1Id ? teams.find((t) => t.id === w1Id) : undefined,
      team2: w2Id ? teams.find((t) => t.id === w2Id) : undefined,
    };
  }, [picks, teams, getFinalFourMatchups]);

  const handlePick = useCallback(
    async (
      matchupId: string,
      pickedTeamId: number,
      round: Round,
      team1Id: number,
      team2Id: number | null,
      team1Seed: number,
      team2Seed: number | null
    ) => {
      if (!isAuthenticated) {
        toast.error("Sign in to make picks!", {
          action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
        });
        return;
      }
      if (!bracketId) return;

      // Optimistic update
      const prevPicks = { ...picks };
      setPicks((prev) => ({ ...prev, [matchupId]: pickedTeamId }));
      setTotalPicks((prev) => prev + (prevPicks[matchupId] ? 0 : 1));

      // Clear downstream picks that depended on the old pick
      if (prevPicks[matchupId] && prevPicks[matchupId] !== pickedTeamId) {
        // Clear all picks that had the old winner advancing
        const oldWinnerId = prevPicks[matchupId];
        const newPicks = { ...prevPicks, [matchupId]: pickedTeamId };
        // Find and clear picks where old winner was picked
        Object.keys(newPicks).forEach((key) => {
          if (newPicks[key] === oldWinnerId && key !== matchupId) {
            delete newPicks[key];
          }
        });
        setPicks(newPicks);
      }

      try {
        const result = await makePick.mutateAsync({
          bracketId,
          round,
          matchupId,
          team1Id,
          team2Id,
          pickedTeamId,
          team1Seed,
          team2Seed,
        });
        if (result.isUpset) {
          toast.success("🔥 Upset pick! Bonus points if this hits!", { duration: 2000 });
        }
      } catch {
        setPicks(prevPicks);
        toast.error("Failed to save pick");
      }
    },
    [bracketId, picks, isAuthenticated, makePick]
  );

  const progressPct = Math.round((totalPicks / 63) * 100);

  const regionTeams = getTeamsByRegion(activeRegion);

  const rounds: Round[] = ["round64", "round32", "sweet16", "elite8"];
  const roundMatchups = rounds.map((r) => ({
    round: r,
    matchups: getMatchupsForRound(activeRegion, r),
  }));

  const champion = (() => {
    const champ = getChampionshipMatchup();
    const winnerId = picks[champ.id];
    return winnerId ? teams.find((t) => t.id === winnerId) : undefined;
  })();

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Header */}
      <div className="border-b border-white/10 bg-[oklch(0.12_0.01_260)]">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl text-white">MY BRACKET</h1>
              <p className="text-white/50 text-sm">2026 NCAA Tournament · {totalPicks}/63 picks made</p>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-white/50">Progress</span>
                  <span className="text-xs font-bold text-[oklch(0.65_0.22_35)]">{progressPct}%</span>
                </div>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <Button
                onClick={() => setShowAI(true)}
                variant="outline"
                size="sm"
                className="border-[oklch(0.55_0.2_250/0.4)] text-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.55_0.2_250/0.1)] bg-transparent"
              >
                <Sparkles size={14} className="mr-1" />
                AI Picks
              </Button>

              <Button
                onClick={() => setShowVoice(!showVoice)}
                size="sm"
                className={`font-bold ${
                  showVoice
                    ? "bg-[oklch(0.65_0.22_35)] text-white voice-active"
                    : "bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.4)] hover:bg-[oklch(0.65_0.22_35/0.3)]"
                }`}
              >
                {showVoice ? <MicOff size={14} className="mr-1" /> : <Mic size={14} className="mr-1" />}
                {showVoice ? "Stop Voice" : "Voice AI"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Champion Banner */}
      {champion && (
        <div className="bg-gradient-to-r from-[oklch(0.78_0.18_80/0.15)] to-[oklch(0.65_0.22_35/0.1)] border-b border-[oklch(0.78_0.18_80/0.3)] px-4 py-3">
          <div className="max-w-full mx-auto flex items-center gap-3">
            <Trophy size={18} className="text-[oklch(0.78_0.18_80)]" />
            <span className="text-sm font-bold text-[oklch(0.78_0.18_80)]">
              My Champion Pick: {champion.name} (#{champion.seed} seed)
            </span>
            <span className="text-xs text-white/40">320 pts if correct!</span>
          </div>
        </div>
      )}

      {/* Voice Assistant */}
      {showVoice && (
        <div className="border-b border-white/10 bg-[oklch(0.12_0.01_260)]">
          <div className="max-w-full mx-auto px-4 py-4">
            <VoiceAssistant />
          </div>
        </div>
      )}

      {/* Region Tabs */}
      <div className="border-b border-white/10 bg-[oklch(0.12_0.01_260)] sticky top-16 z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {REGIONS.map((region) => {
              const regionPicks = Object.keys(picks).filter((k) => k.startsWith(region)).length;
              return (
                <button
                  key={region}
                  onClick={() => setActiveRegion(region)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeRegion === region
                      ? "bg-[oklch(0.65_0.22_35)] text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {region}
                  <span className="ml-1.5 text-xs opacity-60">({regionPicks})</span>
                </button>
              );
            })}
            <button
              onClick={() => setActiveRegion("East")}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-[oklch(0.78_0.18_80)] hover:bg-[oklch(0.78_0.18_80/0.1)] transition-all"
            >
              <Trophy size={14} className="inline mr-1" />
              Final Four
            </button>
          </div>
        </div>
      </div>

      {/* Bracket Content */}
      <div className="max-w-full mx-auto px-4 py-6 overflow-x-auto">
        {activeRegion !== ("FinalFour" as any) ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-3xl text-white">{activeRegion.toUpperCase()} REGION</h2>
              <div className="text-sm text-white/40">
                {regionTeams.length} teams · Click to pick winners
              </div>
            </div>

            {/* Bracket Grid */}
            <div className="flex gap-6 min-w-max">
              {roundMatchups.map(({ round, matchups }) => (
                <div key={round} className="flex flex-col gap-2">
                  <div className="text-center text-xs font-condensed uppercase tracking-wider text-white/40 mb-2 px-2">
                    {ROUND_LABELS[round]}
                  </div>
                  <div
                    className="flex flex-col"
                    style={{
                      gap: round === "round64" ? "8px" : round === "round32" ? "52px" : round === "sweet16" ? "132px" : "292px",
                      paddingTop: round === "round64" ? 0 : round === "round32" ? "28px" : round === "sweet16" ? "68px" : "148px",
                    }}
                  >
                    {matchups.map((m) => (
                      <Matchup
                        key={m.id}
                        team1={m.team1}
                        team2={m.team2}
                        pickedTeamId={picks[m.id]}
                        onPick={(teamId, t1Seed, t2Seed) => {
                          const t1 = m.team1;
                          const t2 = m.team2;
                          if (!t1 || !t2) return;
                          handlePick(m.id, teamId, round, t1.id, t2.id, t1Seed, t2Seed);
                        }}
                        matchupId={m.id}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Region Winner */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-xs font-condensed uppercase tracking-wider text-[oklch(0.78_0.18_80)] mb-2 px-2">
                  Region Winner
                </div>
                <div style={{ paddingTop: "292px" }}>
                  {(() => {
                    const elite8 = getMatchupsForRound(activeRegion, "elite8");
                    const m = elite8[0];
                    if (!m) return null;
                    const winnerId = picks[m.id];
                    const winner = winnerId ? teams.find((t) => t.id === winnerId) : undefined;
                    return (
                      <div className="min-w-[130px] max-w-[150px]">
                        {winner ? (
                          <div className="flex items-center gap-2 px-2 py-2 rounded border border-[oklch(0.78_0.18_80/0.5)] bg-[oklch(0.78_0.18_80/0.1)]">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: winner.color ?? "#333" }}
                            >
                              {winner.seed}
                            </div>
                            <span className="text-xs font-bold text-[oklch(0.78_0.18_80)] truncate">
                              {winner.shortName}
                            </span>
                            <Trophy size={12} className="text-[oklch(0.78_0.18_80)] flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-2 rounded border border-[oklch(0.78_0.18_80/0.2)] bg-[oklch(0.78_0.18_80/0.05)] min-h-[36px]">
                            <Trophy size={14} className="text-[oklch(0.78_0.18_80/0.4)]" />
                            <span className="text-[10px] text-[oklch(0.78_0.18_80/0.4)]">Pick winner</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Final Four & Championship */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={20} className="text-[oklch(0.78_0.18_80)]" />
            <h2 className="font-display text-3xl text-white">FINAL FOUR & CHAMPIONSHIP</h2>
          </div>

          <div className="flex flex-wrap gap-8 items-start">
            {/* Final Four */}
            <div>
              <div className="text-xs font-condensed uppercase tracking-wider text-white/40 mb-3">Final Four</div>
              <div className="flex flex-col gap-6">
                {getFinalFourMatchups().map((m, i) => (
                  <div key={m.id}>
                    <div className="text-xs text-white/30 mb-1">
                      {i === 0 ? "East vs West" : "South vs Midwest"}
                    </div>
                    <Matchup
                      team1={m.team1}
                      team2={m.team2}
                      pickedTeamId={picks[m.id]}
                      onPick={(teamId, t1Seed, t2Seed) => {
                        if (!m.team1 || !m.team2) return;
                        handlePick(m.id, teamId, "finalfour", m.team1.id, m.team2.id, t1Seed, t2Seed);
                      }}
                      matchupId={m.id}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center self-center">
              <ChevronRight size={24} className="text-white/20" />
            </div>

            {/* Championship */}
            <div>
              <div className="text-xs font-condensed uppercase tracking-wider text-[oklch(0.65_0.22_35)] mb-3">
                🏆 Championship
              </div>
              {(() => {
                const m = getChampionshipMatchup();
                return (
                  <Matchup
                    team1={m.team1}
                    team2={m.team2}
                    pickedTeamId={picks[m.id]}
                    onPick={(teamId, t1Seed, t2Seed) => {
                      if (!m.team1 || !m.team2) return;
                      handlePick(m.id, teamId, "championship", m.team1.id, m.team2.id, t1Seed, t2Seed);
                    }}
                    matchupId={m.id}
                  />
                );
              })()}
            </div>

            <div className="flex items-center self-center">
              <ChevronRight size={24} className="text-white/20" />
            </div>

            {/* Champion */}
            <div>
              <div className="text-xs font-condensed uppercase tracking-wider text-[oklch(0.78_0.18_80)] mb-3">
                👑 National Champion
              </div>
              {champion ? (
                <div className="p-4 rounded-xl border-2 border-[oklch(0.78_0.18_80/0.6)] bg-[oklch(0.78_0.18_80/0.1)] glow-gold text-center min-w-[140px]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-2"
                    style={{ backgroundColor: champion.color ?? "#333" }}
                  >
                    {champion.seed}
                  </div>
                  <div className="font-bold text-[oklch(0.78_0.18_80)] text-sm">{champion.shortName}</div>
                  <div className="text-xs text-white/40 mt-1">{champion.conference}</div>
                  <div className="text-xs text-[oklch(0.78_0.18_80/0.7)] mt-1 font-condensed">320 pts</div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-dashed border-[oklch(0.78_0.18_80/0.3)] text-center min-w-[140px]">
                  <Trophy size={28} className="text-[oklch(0.78_0.18_80/0.3)] mx-auto mb-2" />
                  <div className="text-xs text-white/30">Make your picks</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share CTA */}
      {totalPicks >= 10 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Link href="/profile">
            <Button className="bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white font-bold shadow-2xl glow-blue">
              <Share2 size={16} className="mr-2" />
              Share My Bracket
            </Button>
          </Link>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAI && <AIAnalysis onClose={() => setShowAI(false)} />}
    </div>
  );
}
