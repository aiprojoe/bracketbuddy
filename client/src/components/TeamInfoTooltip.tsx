import { useState, useRef, useEffect } from "react";
import { type TeamData, SEED_WIN_RATES_R64, getSeedMatchupLabel } from "../../../shared/bracketData";
import { Trophy, TrendingUp, TrendingDown, Star, Zap } from "lucide-react";

interface TeamInfoTooltipProps {
  team: TeamData;
  opponent?: TeamData;
  children: React.ReactNode;
}

export default function TeamInfoTooltip({ team, opponent, children }: TeamInfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceAbove > 200 ? "above" : "below");
    }
  }, [visible]);

  const winRate = SEED_WIN_RATES_R64[team.seed] ?? 50;
  const upsetChance = opponent
    ? team.seed > opponent.seed
      ? SEED_WIN_RATES_R64[team.seed] ?? 0
      : 0
    : 0;

  const matchupLabel = opponent ? getSeedMatchupLabel(team.seed, opponent.seed) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible((v) => !v)}
    >
      {children}

      {visible && (
        <div
          ref={tooltipRef}
          className={`absolute z-[100] w-52 rounded-xl border border-white/15 bg-[oklch(0.13_0.015_260)] shadow-2xl shadow-black/60 p-3 pointer-events-none ${
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          } left-1/2 -translate-x-1/2`}
          style={{ backdropFilter: "blur(12px)" }}
        >
          {/* Team header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: team.color ?? "#444" }}
            >
              {team.seed}
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">{team.name}</div>
              <div className="text-[10px] text-white/40">{team.conference ?? "Independent"}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {team.record && (
              <div className="bg-white/5 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider">Record</div>
                <div className="text-xs font-bold text-white">{team.record}</div>
              </div>
            )}
            {team.ppg !== null && (
              <div className="bg-white/5 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider flex items-center gap-0.5">
                  <TrendingUp size={8} /> PPG
                </div>
                <div className="text-xs font-bold text-[oklch(0.65_0.22_35)]">{team.ppg}</div>
              </div>
            )}
            {team.oppg !== null && (
              <div className="bg-white/5 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider flex items-center gap-0.5">
                  <TrendingDown size={8} /> Opp PPG
                </div>
                <div className="text-xs font-bold text-[oklch(0.55_0.2_250)]">{team.oppg}</div>
              </div>
            )}
            {team.championships !== null && team.championships > 0 && (
              <div className="bg-white/5 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider flex items-center gap-0.5">
                  <Trophy size={8} /> Titles
                </div>
                <div className="text-xs font-bold text-[oklch(0.78_0.18_80)]">{team.championships}</div>
              </div>
            )}
          </div>

          {/* Seed win rate */}
          <div className="bg-white/5 rounded-lg px-2 py-1.5 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-white/40 uppercase tracking-wider">#{team.seed} seed R64 win rate</span>
              <span className="text-[10px] font-bold text-white">{winRate}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${winRate}%`,
                  backgroundColor: winRate >= 70 ? "oklch(0.65 0.22 35)" : winRate >= 40 ? "oklch(0.78 0.18 80)" : "oklch(0.55 0.2 250)",
                }}
              />
            </div>
          </div>

          {/* Upset badge */}
          {upsetChance > 0 && (
            <div className="flex items-center gap-1.5 bg-[oklch(0.55_0.2_250/0.15)] border border-[oklch(0.55_0.2_250/0.3)] rounded-lg px-2 py-1.5 mb-2">
              <Zap size={10} className="text-[oklch(0.55_0.2_250)]" />
              <span className="text-[10px] text-[oklch(0.55_0.2_250)] font-semibold">
                {upsetChance}% upset chance!
              </span>
            </div>
          )}

          {/* Matchup history */}
          {matchupLabel && (
            <div className="text-[9px] text-white/40 leading-tight border-t border-white/5 pt-2">
              <Star size={8} className="inline mr-0.5 text-[oklch(0.78_0.18_80)]" />
              {matchupLabel}
            </div>
          )}

          {/* Tournament wins */}
          {team.tournamentWins !== null && team.tournamentWins > 0 && (
            <div className="text-[9px] text-white/30 mt-1">
              🏀 {team.tournamentWins} career tournament wins
            </div>
          )}
        </div>
      )}
    </div>
  );
}
