import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback } from "react";
import { useConfetti } from "@/hooks/useConfetti";
import { toast } from "sonner";
import { Mic, Zap, Share2, RotateCcw, ChevronRight, Trophy, Sparkles, Swords, Printer, Wand2, Info } from "lucide-react";
import ShareBracketModal from "@/components/ShareBracketModal";
import { type TeamData, SEED_PAIRS_R64, FIRST_FOUR_MATCHUPS, type Region, type Round, getUpsetProbability, getSeedH2H } from "../../../shared/bracketData";
import VoiceAssistant from "@/components/VoiceAssistant";
import AIAnalysis from "@/components/AIAnalysis";
import LiveScoresBanner from "@/components/LiveScoresBanner";
import { Link } from "wouter";
import AutoFillModal from "@/components/AutoFillModal";
import FactsTicker from "@/components/FactsTicker";
import ScoreTracker from "@/components/ScoreTracker";
import TeamInfoTooltip from "@/components/TeamInfoTooltip";

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
  hintText,
}: {
  team?: TeamData;
  picked: boolean;
  eliminated: boolean;
  onClick?: () => void;
  hintText?: string;
}) {
  if (!team) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded border border-white/5 bg-white/3 min-h-[36px]"
        title={hintText}
      >
        <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-xs text-white/20">?</div>
        <span className="text-white/20 text-xs">{hintText ? "Awaiting pick" : "TBD"}</span>
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

// SVG connector lines between a round column and the next
// Each matchup pair feeds into one slot in the next round.
// MATCHUP_H = height of one Matchup card (2 slots + vs divider + padding)
const MATCHUP_H = 96; // px — must match the card height in Matchup below
const CONNECTOR_W = 20; // px wide SVG strip between columns

// Tooltip state for connector hover
function ConnectorTooltip({
  seed1, seed2, x, y, visible,
}: { seed1: number; seed2: number; x: number; y: number; visible: boolean }) {
  if (!visible) return null;
  const h2h = getSeedH2H(seed1, seed2);
  if (!h2h) return null;
  const favPct = Math.round((h2h.favWins / h2h.total) * 100);
  const dogPct = 100 - favPct;
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left: x + 8, top: y - 8, transform: "translateY(-100%)" }}
    >
      <div className="bg-[oklch(0.12_0.015_260)] border border-white/20 rounded-lg p-3 shadow-2xl min-w-[200px] max-w-[240px]">
        <div className="text-xs font-bold text-white mb-1">
          Seed {h2h.favSeed} vs Seed {h2h.dogSeed}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <div className="text-[10px] text-white/50 mb-0.5">#{h2h.favSeed} seeds</div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[oklch(0.65_0.22_35)]"
                style={{ width: `${favPct}%` }}
              />
            </div>
            <div className="text-[10px] text-[oklch(0.65_0.22_35)] font-bold mt-0.5">{h2h.favWins}–{h2h.dogWins} ({favPct}%)</div>
          </div>
        </div>
        <div className="text-[10px] text-white/40 italic leading-tight">{h2h.funFact}</div>
      </div>
    </div>
  );
}

function BracketConnectors({
  count, gap, paddingTop, seedPairs,
}: {
  count: number;
  gap: number;
  paddingTop: number;
  seedPairs?: Array<[number, number] | null>; // seed pair for each matchup pair (top then bottom)
}) {
  const [hoveredPair, setHoveredPair] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = React.useRef<SVGSVGElement>(null);

  // 'count' = number of matchups in the LEFT round (e.g. 8 for R64)
  const pairs = Math.ceil(count / 2);
  const totalH = paddingTop + pairs * (MATCHUP_H * 2 + gap) - gap;
  const lines: React.ReactNode[] = [];

  for (let i = 0; i < pairs; i++) {
    const topMatchupCenter = paddingTop + i * (MATCHUP_H * 2 + gap) + MATCHUP_H / 2;
    const botMatchupCenter = topMatchupCenter + MATCHUP_H + gap;
    const midY = (topMatchupCenter + botMatchupCenter) / 2;

    // Get seed pair for this connector (top matchup's seeds, if available)
    const topSeedPair = seedPairs?.[i * 2] ?? null;
    const hasH2H = topSeedPair ? !!getSeedH2H(topSeedPair[0], topSeedPair[1]) : false;
    const isHovered = hoveredPair === i;

    lines.push(
      <g
        key={i}
        stroke={isHovered ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"}
        strokeWidth={isHovered ? "1.5" : "1"}
        fill="none"
        style={{ cursor: hasH2H ? "pointer" : "default" }}
        onMouseEnter={(e) => {
          if (!hasH2H) return;
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) setTooltipPos({ x: rect.left + CONNECTOR_W * 2, y: rect.top + midY });
          setHoveredPair(i);
        }}
        onMouseLeave={() => setHoveredPair(null)}
      >
        <line x1="0" y1={topMatchupCenter} x2={CONNECTOR_W} y2={topMatchupCenter} />
        <line x1="0" y1={botMatchupCenter} x2={CONNECTOR_W} y2={botMatchupCenter} />
        <line x1={CONNECTOR_W} y1={topMatchupCenter} x2={CONNECTOR_W} y2={botMatchupCenter} />
        <line x1={CONNECTOR_W} y1={midY} x2={CONNECTOR_W * 2} y2={midY} />
        {/* Invisible wider hit area for easier hover */}
        {hasH2H && (
          <rect
            x={0} y={topMatchupCenter - 4}
            width={CONNECTOR_W * 2} height={botMatchupCenter - topMatchupCenter + 8}
            fill="transparent" stroke="none"
          />
        )}
        {/* Small info dot on the vertical connector */}
        {hasH2H && (
          <circle
            cx={CONNECTOR_W} cy={midY}
            r="3"
            fill={isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
            stroke="none"
          />
        )}
      </g>
    );
  }

  return (
    <div className="relative flex-shrink-0 self-start" style={{ marginTop: 28 }}>
      <svg ref={svgRef} width={CONNECTOR_W * 2} height={totalH}>
        {lines}
      </svg>
      {/* Tooltip rendered in a portal-like fixed div */}
      {hoveredPair !== null && seedPairs?.[hoveredPair * 2] && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 8, top: tooltipPos.y - 8, transform: "translateY(-100%)" }}
        >
          {(() => {
            const sp = seedPairs![hoveredPair * 2]!;
            const h2h = getSeedH2H(sp[0], sp[1]);
            if (!h2h) return null;
            const favPct = Math.round((h2h.favWins / h2h.total) * 100);
            return (
              <div className="bg-[oklch(0.12_0.015_260)] border border-white/20 rounded-lg p-3 shadow-2xl min-w-[200px] max-w-[250px]">
                <div className="text-xs font-bold text-white mb-2">
                  #{h2h.favSeed} vs #{h2h.dogSeed} Seeds — All-Time Record
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-white/50 mb-1">
                    <span>#{h2h.favSeed} seeds</span>
                    <span>{h2h.favWins}–{h2h.dogWins}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[oklch(0.65_0.22_35)] transition-all"
                      style={{ width: `${favPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className="text-[oklch(0.65_0.22_35)] font-bold">{favPct}% win rate</span>
                    <span className="text-white/30">{100 - favPct}% upsets</span>
                  </div>
                </div>
                <div className="text-[10px] text-white/40 italic leading-snug border-t border-white/10 pt-2">
                  {h2h.funFact}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function Matchup({
  team1,
  team2,
  pickedTeamId,
  eliminatedTeamId,
  onPick,
  matchupId,
  hintText,
  showCard,
}: {
  team1?: TeamData;
  team2?: TeamData;
  pickedTeamId?: number;
  eliminatedTeamId?: number;
  onPick: (teamId: number, team1Seed: number, team2Seed: number | null) => void;
  matchupId: string;
  hintText?: string;
  showCard?: boolean;
}) {
  // A matchup is fully TBD (no teams at all) — show locked placeholder
  const bothTBD = !team1 && !team2;

  // Upset badge: show if lower seed has meaningful upset chance
  const upsetChance = team1 && team2 ? getUpsetProbability(Math.min(team1.seed, team2.seed), Math.max(team1.seed, team2.seed)) : 0;
  const showUpsetBadge = upsetChance >= 25;

  const inner = (
    <div className={`flex flex-col gap-0.5 min-w-[140px] max-w-[160px] ${bothTBD ? "opacity-50" : ""}`}>
      {team1 ? (
        <TeamInfoTooltip team={team1} opponent={team2}>
          <TeamSlot
            team={team1}
            picked={pickedTeamId === team1?.id}
            eliminated={eliminatedTeamId === team1?.id}
            onClick={team1 ? () => onPick(team1.id, team1.seed, team2?.seed ?? null) : undefined}
            hintText={!team1 ? hintText : undefined}
          />
        </TeamInfoTooltip>
      ) : (
        <TeamSlot
          team={undefined}
          picked={false}
          eliminated={false}
          hintText={hintText}
        />
      )}
      <div className="text-center text-[10px] text-white/20 leading-none flex items-center justify-center gap-1 py-0.5">
        <span>vs</span>
        {showUpsetBadge && (
          <span className="text-[8px] text-[oklch(0.55_0.2_250)] font-bold" title={`${upsetChance}% upset chance`}>
            🔥{upsetChance}%
          </span>
        )}
      </div>
      {team2 ? (
        <TeamInfoTooltip team={team2} opponent={team1}>
          <TeamSlot
            team={team2}
            picked={pickedTeamId === team2?.id}
            eliminated={eliminatedTeamId === team2?.id}
            onClick={team2 ? () => onPick(team2.id, team1?.seed ?? 99, team2.seed) : undefined}
            hintText={!team2 ? hintText : undefined}
          />
        </TeamInfoTooltip>
      ) : (
        <TeamSlot
          team={undefined}
          picked={false}
          eliminated={false}
          hintText={hintText}
        />
      )}
    </div>
  );

  if (showCard) {
    return (
      <div className="rounded-lg border border-white/10 bg-[oklch(0.13_0.012_260)] p-1.5 shadow-sm">
        {inner}
      </div>
    );
  }
  return inner;
}

export default function Bracket() {
  const { user, isAuthenticated, loading } = useAuth();
  const { firePick, fireChampion } = useConfetti();
  const [picks, setPicks] = useState<PicksMap>({});
  const [bracketId, setBracketId] = useState<number | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState<Region | "FirstFour" | "FirstFourTab">("FirstFourTab");
  const [totalPicks, setTotalPicks] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(false);

  const { data: teamsData } = trpc.teams.getAll.useQuery();
  const { data: bracketData, refetch: refetchBracket } = trpc.bracket.getMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createBracket = trpc.bracket.create.useMutation();
  const makePick = trpc.bracket.makePick.useMutation();
  const resetPicks = trpc.bracket.resetPicks.useMutation();

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
  // Helper: get the team that should occupy a seed slot in the Round of 64.
  // For seeds 11 and 16, if there are First Four play-in teams, use the picked winner.
  const getR64Team = useCallback(
    (region: Region, seed: number): TeamData | undefined => {
      // Check if this is a First Four seed (11 or 16) with play-in teams
      const ff = FIRST_FOUR_MATCHUPS.find((f) => f.region === region && f.winnerSeed === seed);
      if (ff) {
        const playInTeams = teams.filter((t) => t.region === region && t.seed === seed && t.isFirstFour);
        if (playInTeams.length >= 2) {
          // Two play-in teams exist — use the picked winner, or undefined if no pick yet
          const winnerId = picks[ff.id];
          return winnerId ? teams.find((t) => t.id === winnerId) : undefined;
        }
      }
      // Normal case: find the single team with this seed
      return teams.find((t) => t.region === region && t.seed === seed && !t.isFirstFour) ??
             teams.find((t) => t.region === region && t.seed === seed);
    },
    [picks, teams]
  );

  const getMatchupsForRound = useCallback(
    (region: Region, round: Round): Array<{ id: string; team1?: TeamData; team2?: TeamData }> => {
      if (round === "round64") {
        return SEED_PAIRS_R64.map(([s1, s2], i) => ({
          id: getMatchupId(region, round, i),
          team1: getR64Team(region, s1),
          team2: getR64Team(region, s2),
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
          firePick(true);
        } else if (round === "championship") {
          fireChampion();
          toast.success("🏆 Champion locked in! 320 pts if correct!", { duration: 3000 });
        } else {
          firePick(false);
        }
      } catch {
        setPicks(prevPicks);
        toast.error("Failed to save pick");
      }
    },
    [bracketId, picks, isAuthenticated, makePick]
  );

  const progressPct = Math.round((totalPicks / 63) * 100);

  // Derive the active region for bracket rendering (only valid for region tabs)
  const activeRegion: Region = (activeTab === "FirstFourTab" || activeTab === "FirstFour")
    ? "East"
    : (activeTab as Region);

  const regionTeams = getTeamsByRegion(activeRegion);

  const rounds: Round[] = ["round64", "round32", "sweet16", "elite8"];
  const roundMatchups = rounds.map((r) => ({
    round: r,
    matchups: getMatchupsForRound(activeRegion, r),
  }));

  // Build First Four matchups from teams with isFirstFour=true
  const getFirstFourMatchups = useCallback(() => {
    return FIRST_FOUR_MATCHUPS.map((ff) => {
      // Find the two teams that are play-in teams for this region+seed
      const playInTeams = teams.filter(
        (t) => t.region === ff.region && t.seed === ff.winnerSeed && t.isFirstFour
      );
      return {
        ...ff,
        team1: playInTeams[0],
        team2: playInTeams[1],
      };
    });
  }, [teams]);

  const champion = (() => {
    const champ = getChampionshipMatchup();
    const winnerId = picks[champ.id];
    return winnerId ? teams.find((t) => t.id === winnerId) : undefined;
  })();

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />
      <LiveScoresBanner />

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
                onClick={() => setShowAutoFill(true)}
                variant="outline"
                size="sm"
                className="border-[oklch(0.78_0.18_80/0.4)] text-[oklch(0.78_0.18_80)] hover:bg-[oklch(0.78_0.18_80/0.1)] bg-transparent hidden sm:flex"
              >
                <Wand2 size={14} className="mr-1" />
                Auto-Fill
              </Button>

              <Button
                onClick={() => window.open("/bracket/print", "_blank")}
                variant="outline"
                size="sm"
                className="border-white/15 text-white/50 hover:text-white hover:border-white/30 bg-transparent hidden sm:flex"
              >
                <Printer size={14} className="mr-1" />
                Print
              </Button>

              <Button
                onClick={() => setShowVoicePanel(true)}
                size="sm"
                className="bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.4)] hover:bg-[oklch(0.65_0.22_35/0.3)] font-bold"
              >
                <Mic size={14} className="mr-1" />
                Ask Buddy
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

      {/* Voice Assistant — floating, always available on bracket page */}
      <VoiceAssistant
        forceOpen={showVoicePanel}
        onForceOpenHandled={() => setShowVoicePanel(false)}
        onPickByVoice={(teamId: number, teamName: string) => {
          // Find which matchup this team is currently in and pick them
          const allRegions: Region[] = ["East", "West", "South", "Midwest"];
          const allRounds: Round[] = ["round64", "round32", "sweet16", "elite8"];
          let picked = false;

          // Search all regions and rounds for an active matchup containing this team
          for (const region of allRegions) {
            for (const round of allRounds) {
              const matchups = getMatchupsForRound(region, round);
              for (const m of matchups) {
                // Skip if neither team is present
                if (!m.team1 && !m.team2) continue;
                if (m.team1?.id === teamId || m.team2?.id === teamId) {
                  const t1 = m.team1;
                  const t2 = m.team2;
                  const t1Seed = t1?.seed ?? 99;
                  const t2Seed = t2?.seed ?? null;
                  handlePick(m.id, teamId, round, t1?.id ?? teamId, t2?.id ?? null, t1Seed, t2Seed);
                  setActiveTab(region);
                  picked = true;
                  break;
                }
              }
              if (picked) break;
            }
            if (picked) break;
          }

          // Also check Final Four
          if (!picked) {
            const ffMatchups = getFinalFourMatchups();
            for (const m of ffMatchups) {
              if (!m.team1 && !m.team2) continue;
              if (m.team1?.id === teamId || m.team2?.id === teamId) {
                handlePick(m.id, teamId, "finalfour", m.team1?.id ?? teamId, m.team2?.id ?? null, m.team1?.seed ?? 99, m.team2?.seed ?? null);
                picked = true;
                break;
              }
            }
          }

          if (!picked) {
            toast.info(`${teamName} isn't in an active matchup yet — make earlier round picks first!`);
          }
        }}
      />

      {/* Region Tabs */}
      <div className="border-b border-white/10 bg-[oklch(0.12_0.01_260)] sticky top-16 z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {/* First Four tab */}
            <button
              onClick={() => setActiveTab("FirstFourTab")}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "FirstFourTab"
                  ? "bg-[oklch(0.55_0.2_250)] text-white"
                  : "text-[oklch(0.55_0.2_250/0.8)] hover:text-white hover:bg-white/5"
              }`}
            >
              🎯 First Four
            </button>

            {/* Region tabs */}
            {REGIONS.map((region) => {
              const regionPicks = Object.keys(picks).filter((k) => k.startsWith(region) && !k.startsWith("FirstFour")).length;
              return (
                <button
                  key={region}
                  onClick={() => setActiveTab(region)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === region
                      ? "bg-[oklch(0.65_0.22_35)] text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {region}
                  <span className="ml-1.5 text-xs opacity-60">({regionPicks})</span>
                </button>
              );
            })}

            {/* Final Four tab */}
            <button
              onClick={() => setActiveTab("FirstFour")}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "FirstFour"
                  ? "bg-[oklch(0.78_0.18_80/0.2)] text-[oklch(0.78_0.18_80)]"
                  : "text-[oklch(0.78_0.18_80/0.7)] hover:bg-[oklch(0.78_0.18_80/0.1)]"
              }`}
            >
              <Trophy size={14} className="inline mr-1" />
              Final Four
            </button>
          </div>
        </div>
      </div>

      {/* Bracket Content */}
      <div className="max-w-full mx-auto px-4 py-6 overflow-x-auto">
        {/* Facts Ticker + Score Tracker sidebar */}
        <div className="mb-4 max-w-2xl">
          <FactsTicker />
          <ScoreTracker />
        </div>

        {/* Mobile scroll hint */}
        <div className="flex items-center gap-2 text-white/30 text-xs mb-3 sm:hidden">
          <span>←</span>
          <span>Scroll to see all rounds</span>
          <span>→</span>
        </div>
        {/* First Four Tab */}
        {activeTab === "FirstFourTab" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-3xl text-white">FIRST FOUR</h2>
              <div className="text-sm text-white/40">Play-in games · March 18–19 · Winners advance to Round of 64 · Picks lock March 20</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              {getFirstFourMatchups().map((ff) => (
                <div key={ff.id} className="bg-white/3 border border-white/10 rounded-xl p-4">
                  <div className="text-xs font-condensed uppercase tracking-wider text-[oklch(0.55_0.2_250)] mb-1">{ff.label}</div>
                  <div className="text-[10px] text-white/30 mb-3">
                    Winner becomes #{ff.winnerSeed} seed in {ff.region} Region
                  </div>
                  <Matchup
                    team1={ff.team1}
                    team2={ff.team2}
                    pickedTeamId={picks[ff.id]}
                    onPick={(teamId, t1Seed, t2Seed) => {
                      if (!ff.team1 && !ff.team2) return;
                      handlePick(
                        ff.id, teamId, "firstfour",
                        ff.team1?.id ?? teamId, ff.team2?.id ?? null,
                        t1Seed, t2Seed
                      );
                    }}
                    matchupId={ff.id}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-[oklch(0.55_0.2_250/0.08)] border border-[oklch(0.55_0.2_250/0.2)] rounded-xl max-w-2xl">
              <p className="text-xs text-white/50">
                <span className="text-[oklch(0.55_0.2_250)] font-bold">How it works:</span> The 4 First Four winners take their seed slot in the Round of 64.
                If you don't pick a First Four winner, that slot in the Round of 64 will show as TBD — you can still pick the other team in that matchup.
              </p>
            </div>
          </div>
        )}

        {/* Region Bracket */}
        {(activeTab === "East" || activeTab === "West" || activeTab === "South" || activeTab === "Midwest") && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-3xl text-white">{activeTab.toUpperCase()} REGION</h2>
              <div className="text-sm text-white/40">
                {regionTeams.length} teams · Click to pick winners
              </div>
            </div>

            {/* Bracket Grid */}
            <div className="flex items-start min-w-max">
              {roundMatchups.map(({ round, matchups }, roundIdx) => {
                const prevRoundLabel = round === "round32" ? "Round of 64" : round === "sweet16" ? "Round of 32" : round === "elite8" ? "Sweet 16" : undefined;
                const allTBD = matchups.every((m) => !m.team1 && !m.team2);
                const hintText = prevRoundLabel ? `Pick ${prevRoundLabel} winners to unlock` : undefined;
                const isR64 = round === "round64";

                // Gap and paddingTop values (in px numbers for connector math)
                const gapPx = isR64 ? 12 : round === "round32" ? 108 : round === "sweet16" ? 228 : 468;
                const padTopPx = isR64 ? 0 : round === "round32" ? 54 : round === "sweet16" ? 114 : 234;

                // Show connectors between this round and the next
                const prevMatchups = roundIdx > 0 ? roundMatchups[roundIdx - 1].matchups : [];
                const prevRound = roundIdx > 0 ? roundMatchups[roundIdx - 1].round : null;
                const prevGapPx = prevRound === "round64" ? 12 : prevRound === "round32" ? 108 : prevRound === "sweet16" ? 228 : 468;
                const prevPadTopPx = prevRound === "round64" ? 0 : prevRound === "round32" ? 54 : prevRound === "sweet16" ? 114 : 234;

                // Build seedPairs for the connector: one entry per matchup in prevMatchups
                // Each entry is [team1.seed, team2.seed] or null if seeds unknown
                const connectorSeedPairs: Array<[number, number] | null> = prevMatchups.map((pm) => {
                  const s1 = pm.team1?.seed;
                  const s2 = pm.team2?.seed;
                  if (s1 !== undefined && s2 !== undefined) return [s1, s2];
                  return null;
                });

                return (
                  <React.Fragment key={round}>
                    {/* SVG connector lines from previous round into this one */}
                    {roundIdx > 0 && (
                      <BracketConnectors
                        count={prevMatchups.length}
                        gap={prevGapPx}
                        paddingTop={prevPadTopPx}
                        seedPairs={connectorSeedPairs}
                      />
                    )}

                    <div key={round} className="flex flex-col">
                      <div className="text-center mb-3 px-2">
                        <div className="text-xs font-condensed uppercase tracking-wider text-white/40">
                          {ROUND_LABELS[round]}
                        </div>
                        {allTBD && hintText && (
                          <div className="text-[9px] text-[oklch(0.65_0.22_35/0.7)] mt-0.5 font-medium">
                            ← {prevRoundLabel} first
                          </div>
                        )}
                      </div>
                      <div
                        className="flex flex-col"
                        style={{
                          gap: `${gapPx}px`,
                          paddingTop: `${padTopPx}px`,
                        }}
                      >
                        {matchups.map((m) => (
                          <Matchup
                            key={m.id}
                            team1={m.team1}
                            team2={m.team2}
                            pickedTeamId={picks[m.id]}
                            showCard={isR64}
                            onPick={(teamId, t1Seed, t2Seed) => {
                              const t1 = m.team1;
                              const t2 = m.team2;
                              // Allow picking even when opponent is TBD
                              // At least one team must be present (the one being picked)
                              if (!t1 && !t2) return;
                              const pickedTeam = t1?.id === teamId ? t1 : t2;
                              if (!pickedTeam) return;
                              handlePick(
                                m.id,
                                teamId,
                                round,
                                t1?.id ?? teamId,
                                t2?.id ?? null,
                                t1Seed,
                                t2Seed
                              );
                            }}
                            matchupId={m.id}
                            hintText={hintText}
                          />
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Connector from Elite Eight into Region Winner */}
              <BracketConnectors count={1} gap={0} paddingTop={234} />

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
        )}

        {/* Final Four & Championship — shown when Final Four tab is active */}
        {activeTab === "FirstFour" && (
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
                        if (!m.team1 && !m.team2) return;
                        handlePick(
                          m.id, teamId, "finalfour",
                          m.team1?.id ?? teamId, m.team2?.id ?? null,
                          t1Seed, t2Seed
                        );
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
                      if (!m.team1 && !m.team2) return;
                      handlePick(
                        m.id, teamId, "championship",
                        m.team1?.id ?? teamId, m.team2?.id ?? null,
                        t1Seed, t2Seed
                      );
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
        )}
      </div>

      {/* Share + Challenge CTAs */}
      {totalPicks >= 10 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
          <Link href="/challenges">
            <Button className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold shadow-2xl glow-orange">
              <Swords size={16} className="mr-2" />
              Challenge a Friend
            </Button>
          </Link>
          <Button
            onClick={() => setShowShare(true)}
            className="bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white font-bold shadow-2xl glow-blue"
          >
            <Share2 size={16} className="mr-2" />
            Share My Bracket
          </Button>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAI && <AIAnalysis onClose={() => setShowAI(false)} />}

      {/* Auto-Fill Modal */}
      <AutoFillModal
        open={showAutoFill}
        onClose={() => setShowAutoFill(false)}
        onFilled={() => {
          refetchBracket();
          toast.success("Bracket filled! Edit any picks you want to change.");
        }}
      />

      {/* Share Modal */}
      <ShareBracketModal
        open={showShare}
        onClose={() => setShowShare(false)}
        shareToken={bracketData?.bracket.shareToken ?? undefined}
        userName={user?.name ?? undefined}
        championPick={champion?.name}
        totalPoints={bracketData?.bracket.totalPoints ?? 0}
        completionPct={progressPct}
      />

      {/* Reset Picks button (bottom left, only when picks exist) */}
      {totalPicks > 0 && (
        <button
          onClick={async () => {
            if (!confirm("Reset all picks? This cannot be undone.")) return;
            try {
              await resetPicks.mutateAsync();
              setPicks({});
              setTotalPicks(0);
              toast.success("All picks cleared!");
            } catch {
              toast.error("Failed to reset picks");
            }
          }}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <RotateCcw size={12} />
          Reset picks
        </button>
      )}
    </div>
  );
}
