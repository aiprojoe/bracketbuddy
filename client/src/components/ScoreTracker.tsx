import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trophy, Target } from "lucide-react";
import { ROUND_POINTS, UPSET_MULTIPLIER } from "../../../shared/bracketData";

export default function ScoreTracker() {
  const [expanded, setExpanded] = useState(false);
  const { data: bracketData } = trpc.bracket.getMine.useQuery(undefined, { retry: false });
  const { data: teamsData } = trpc.teams.getAll.useQuery();

  if (!bracketData || !teamsData) return null;

  const teams = teamsData;
  const picks = bracketData.picks;
  const bracket = bracketData.bracket;

  // Categorize picks (isCorrect is null when not yet scored)
  const correct = picks.filter((p) => p.isCorrect === true);
  const incorrect = picks.filter((p) => p.isCorrect === false);
  const pending = picks.filter((p) => p.isCorrect === null || p.isCorrect === undefined);

  const totalPossible = picks.reduce((sum, p) => {
    const pts = ROUND_POINTS[p.round as keyof typeof ROUND_POINTS] ?? 0;
    return sum + pts;
  }, 0);

  const earnedPoints = bracket.totalPoints ?? 0;
  const maxPossible = 63 * 10 + 32 * 20 + 16 * 40 + 8 * 80 + 4 * 160 + 2 * 320; // rough max with upsets

  const pct = totalPossible > 0 ? Math.round((earnedPoints / totalPossible) * 100) : 0;

  const roundBreakdown: Record<string, { correct: number; total: number; pts: number }> = {};
  for (const p of picks) {
    if (!roundBreakdown[p.round]) roundBreakdown[p.round] = { correct: 0, total: 0, pts: 0 };
    roundBreakdown[p.round].total++;
          if (p.isCorrect === true) {
              roundBreakdown[p.round].correct++;
              roundBreakdown[p.round].pts += p.pointsEarned;
            }
  }

  const ROUND_ORDER = ["round64", "round32", "sweet16", "elite8", "finalfour", "championship"];
  const ROUND_LABELS: Record<string, string> = {
    round64: "R64", round32: "R32", sweet16: "S16", elite8: "E8", finalfour: "FF", championship: "Champ",
  };

  const hasAnyScored = correct.length > 0 || incorrect.length > 0;

  return (
    <div className="bg-[oklch(0.12_0.01_260)] border border-white/10 rounded-xl overflow-hidden mb-4">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Target size={16} className="text-[oklch(0.65_0.22_35)]" />
          <span className="text-sm font-bold text-white">Score Tracker</span>
          {hasAnyScored ? (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)] px-2 py-0.5 rounded-full font-bold">
                {earnedPoints} pts
              </span>
              <span className="text-xs text-white/40">
                {correct.length}/{correct.length + incorrect.length} correct
              </span>
            </div>
          ) : (
            <span className="text-xs text-white/30">{pending.length} picks pending results</span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {!hasAnyScored ? (
            <div className="text-center py-6">
              <Clock size={28} className="text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">Games haven't started yet.</p>
              <p className="text-xs text-white/25 mt-1">Check back once the tournament begins!</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.3)] rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-[oklch(0.65_0.22_35)]">{earnedPoints}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider">Points</div>
                </div>
                <div className="bg-[oklch(0.55_0.2_250/0.1)] border border-[oklch(0.55_0.2_250/0.3)] rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-[oklch(0.55_0.2_250)]">
                    {correct.length}/{correct.length + incorrect.length}
                  </div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider">Correct</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-white">{pending.length}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider">Pending</div>
                </div>
              </div>

              {/* Round breakdown */}
              <div className="space-y-1.5">
                {ROUND_ORDER.filter((r) => roundBreakdown[r]).map((round) => {
                  const rb = roundBreakdown[round];
                  const pctCorrect = rb.total > 0 ? Math.round((rb.correct / rb.total) * 100) : 0;
                  return (
                    <div key={round} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white/40 w-10 flex-shrink-0">{ROUND_LABELS[round]}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pctCorrect}%`,
                            backgroundColor: pctCorrect >= 70 ? "oklch(0.65 0.22 35)" : pctCorrect >= 40 ? "oklch(0.78 0.18 80)" : "oklch(0.55 0.2 250)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 w-16 text-right flex-shrink-0">
                        {rb.correct}/{rb.total} · {Math.round(rb.pts)}pts
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recent results */}
              {(correct.length > 0 || incorrect.length > 0) && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Recent Results</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {[...correct.slice(-5), ...incorrect.slice(-5)]
                      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
                      .slice(0, 8)
                      .map((p) => {
                        const pickedTeam = teams.find((t) => t.id === p.pickedTeamId);
                        const isCorrect = p.isCorrect === true;
                        return (
                          <div key={p.id} className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle size={12} className="text-[oklch(0.65_0.22_35)] flex-shrink-0" />
                            ) : (
                              <XCircle size={12} className="text-[oklch(0.55_0.2_250)] flex-shrink-0" />
                            )}
                            <span className="text-xs text-white/60 truncate flex-1">
                              {pickedTeam?.shortName ?? "Unknown"}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] text-[oklch(0.65_0.22_35)] font-bold flex-shrink-0">
                                +{Math.round((ROUND_POINTS[p.round as keyof typeof ROUND_POINTS] ?? 0) * (p.isUpset ? UPSET_MULTIPLIER : 1))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
