import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { Swords, Trophy, Copy, Loader2, AlertCircle, Crown, Zap } from "lucide-react";

const ROUND_LABELS: Record<string, string> = {
  firstfour: "First Four",
  round64: "Round of 64",
  round32: "Round of 32",
  sweet16: "Sweet 16",
  elite8: "Elite Eight",
  finalfour: "Final Four",
  championship: "Championship",
};

const ROUND_ORDER = ["firstfour", "round64", "round32", "sweet16", "elite8", "finalfour", "championship"];

export default function ChallengeH2H() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const challengeId = parseInt(id ?? "0", 10);

  const { data, isLoading, error } = trpc.challenge.getH2H.useQuery(
    { challengeId },
    { enabled: !!challengeId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[oklch(0.65_0.22_35)]" size={40} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <AlertCircle size={48} className="text-red-400" />
          <h1 className="font-display text-4xl">Challenge Not Found</h1>
          <Button onClick={() => navigate("/")} className="bg-[oklch(0.65_0.22_35)] text-white">Go Home</Button>
        </div>
      </div>
    );
  }

  const { challenge, participants, h2hPicks } = data;
  const p1 = participants[0];
  const p2 = participants[1];
  const picks1 = h2hPicks.find((h) => h.userId === p1?.userId)?.picks ?? [];
  const picks2 = h2hPicks.find((h) => h.userId === p2?.userId)?.picks ?? [];

  // Build matchup comparison map
  const matchupIds = Array.from(new Set([...picks1, ...picks2].map((p) => p.matchupId)));

  // Group by round
  const byRound: Record<string, typeof matchupIds> = {};
  for (const mid of matchupIds) {
    // matchupId format: "Region-round-slot" or "finalfour-slot" or "championship-0"
    const parts = mid.split("-");
    const round = parts.length >= 2 ? parts[1] : parts[0];
    if (!byRound[round]) byRound[round] = [];
    byRound[round].push(mid);
  }

  const totalPicks = matchupIds.length;
  const agreements = matchupIds.filter((mid) => {
    const pick1 = picks1.find((p) => p.matchupId === mid);
    const pick2 = picks2.find((p) => p.matchupId === mid);
    return pick1 && pick2 && pick1.pickedTeamId === pick2.pickedTeamId;
  }).length;

  const inviteUrl = `${window.location.origin}/challenge/invite/${challenge.inviteToken}`;

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.65_0.22_35/0.15)] border border-[oklch(0.65_0.22_35/0.3)] text-[oklch(0.65_0.22_35)] text-sm font-semibold mb-4">
            ⚔️ Head-to-Head
          </div>
          <h1 className="font-display text-5xl text-white mb-2">{challenge.title ?? "Bracket Challenge"}</h1>
          <p className="text-white/50">Pick-by-pick comparison · {totalPicks} matchups</p>
        </div>

        {/* Score Banner */}
        <div className="rounded-2xl border border-white/10 bg-[oklch(0.14_0.015_260)] p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Player 1 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[oklch(0.65_0.22_35/0.2)] border-2 border-[oklch(0.65_0.22_35/0.5)] flex items-center justify-center text-xl font-bold text-[oklch(0.65_0.22_35)] mx-auto mb-2">
                {p1?.userName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="font-bold text-white">{p1?.userName ?? "Player 1"}</div>
              <div className="font-display text-4xl text-[oklch(0.65_0.22_35)] mt-1">{p1?.score ?? 0}</div>
              <div className="text-xs text-white/40">points</div>
              {p1?.correctPicks ? (
                <div className="text-xs text-white/40 mt-1">{p1.correctPicks} correct</div>
              ) : null}
            </div>

            {/* VS */}
            <div className="text-center">
              <Swords size={32} className="text-white/20 mx-auto mb-2" />
              <div className="font-display text-2xl text-white/30">VS</div>
              <div className="text-xs text-white/30 mt-2">{agreements}/{totalPicks} same picks</div>
              <div className="text-xs text-white/20 mt-1">
                {totalPicks > 0 ? Math.round((agreements / totalPicks) * 100) : 0}% agreement
              </div>
            </div>

            {/* Player 2 */}
            <div className="text-center">
              {p2 ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-[oklch(0.55_0.2_250/0.2)] border-2 border-[oklch(0.55_0.2_250/0.5)] flex items-center justify-center text-xl font-bold text-[oklch(0.55_0.2_250)] mx-auto mb-2">
                    {p2.userName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="font-bold text-white">{p2.userName ?? "Player 2"}</div>
                  <div className="font-display text-4xl text-[oklch(0.55_0.2_250)] mt-1">{p2.score ?? 0}</div>
                  <div className="text-xs text-white/40">points</div>
                  {p2.correctPicks ? (
                    <div className="text-xs text-white/40 mt-1">{p2.correctPicks} correct</div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center text-white/20 mx-auto mb-2 text-xl">
                    ?
                  </div>
                  <div className="text-white/30 font-semibold">Waiting...</div>
                  <div className="text-xs text-white/20 mt-1">No opponent yet</div>
                </>
              )}
            </div>
          </div>

          {/* Share / Copy */}
          <div className="mt-5 pt-5 border-t border-white/8 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("Challenge link copied! 📋");
              }}
              variant="outline"
              size="sm"
              className="flex-1 border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-transparent text-xs"
            >
              <Copy size={12} className="mr-1.5" /> Copy Invite Link
            </Button>
            <Button
              onClick={() => {
                const text = p2
                  ? `⚔️ I'm in a March Madness bracket duel! ${p1?.userName} vs ${p2?.userName} — ${p1?.score ?? 0} to ${p2?.score ?? 0} pts. Join the madness! 🏀`
                  : `⚔️ I just challenged someone to a March Madness bracket duel! Think you can beat me? 🏀`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteUrl)}`,
                  "_blank"
                );
              }}
              size="sm"
              className="flex-1 bg-[oklch(0.55_0.2_250/0.15)] hover:bg-[oklch(0.55_0.2_250/0.25)] text-[oklch(0.55_0.2_250)] border border-[oklch(0.55_0.2_250/0.3)] text-xs"
            >
              𝕏 Share on X
            </Button>
          </div>
        </div>

        {/* Pick-by-Pick Breakdown */}
        {p2 && matchupIds.length > 0 ? (
          <div className="space-y-6">
            {ROUND_ORDER.filter((r) => byRound[r]?.length).map((round) => (
              <div key={round}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40 px-2">
                    {ROUND_LABELS[round] ?? round}
                  </span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                <div className="space-y-2">
                  {byRound[round].map((mid) => {
                    const pick1 = picks1.find((p) => p.matchupId === mid);
                    const pick2 = picks2.find((p) => p.matchupId === mid);
                    const agree = pick1 && pick2 && pick1.pickedTeamId === pick2.pickedTeamId;
                    const p1Correct = pick1?.isCorrect;
                    const p2Correct = pick2?.isCorrect;

                    return (
                      <div
                        key={mid}
                        className={`grid grid-cols-3 gap-2 p-3 rounded-xl border ${
                          agree
                            ? "border-[oklch(0.58_0.18_145/0.2)] bg-[oklch(0.58_0.18_145/0.04)]"
                            : "border-white/8 bg-[oklch(0.14_0.015_260)]"
                        }`}
                      >
                        {/* P1 Pick */}
                        <div className="flex items-center gap-2">
                          {pick1 ? (
                            <>
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: pick1.teamColor ?? "#333" }}
                              >
                                {pick1.teamSeed}
                              </div>
                              <span className="text-xs text-white truncate">{pick1.teamShortName}</span>
                              {pick1.isUpset && <Zap size={10} className="text-[oklch(0.78_0.18_80)] flex-shrink-0" />}
                              {p1Correct === true && <span className="text-[oklch(0.58_0.18_145)] text-xs">✓</span>}
                              {p1Correct === false && <span className="text-red-400 text-xs">✗</span>}
                            </>
                          ) : (
                            <span className="text-white/20 text-xs italic">No pick</span>
                          )}
                        </div>

                        {/* Middle indicator */}
                        <div className="flex items-center justify-center">
                          {agree ? (
                            <span className="text-[oklch(0.58_0.18_145)] text-xs font-bold">✓ Agree</span>
                          ) : (
                            <span className="text-[oklch(0.65_0.22_35)] text-xs font-bold">⚔️ Differ</span>
                          )}
                        </div>

                        {/* P2 Pick */}
                        <div className="flex items-center gap-2 justify-end">
                          {pick2 ? (
                            <>
                              {p2Correct === true && <span className="text-[oklch(0.58_0.18_145)] text-xs">✓</span>}
                              {p2Correct === false && <span className="text-red-400 text-xs">✗</span>}
                              {pick2.isUpset && <Zap size={10} className="text-[oklch(0.78_0.18_80)] flex-shrink-0" />}
                              <span className="text-xs text-white truncate">{pick2.teamShortName}</span>
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: pick2.teamColor ?? "#333" }}
                              >
                                {pick2.teamSeed}
                              </div>
                            </>
                          ) : (
                            <span className="text-white/20 text-xs italic">No pick</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : p2 ? (
          <div className="text-center py-12 text-white/30">
            <Trophy size={40} className="mx-auto mb-3 opacity-20" />
            <p>No picks yet — start filling out your brackets!</p>
            <Button onClick={() => navigate("/bracket")} className="mt-4 bg-[oklch(0.65_0.22_35)] text-white">
              Build My Bracket
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
            <Swords size={40} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/40 mb-4">Waiting for your opponent to accept the challenge...</p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("Challenge link copied! 📋");
              }}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white"
            >
              <Copy size={14} className="mr-2" /> Copy Invite Link
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-4 text-xs text-white/30 justify-center">
          <span className="flex items-center gap-1"><span className="text-[oklch(0.58_0.18_145)]">✓</span> Correct pick</span>
          <span className="flex items-center gap-1"><span className="text-red-400">✗</span> Wrong pick</span>
          <span className="flex items-center gap-1"><Zap size={10} className="text-[oklch(0.78_0.18_80)]" /> Upset pick</span>
          <span className="flex items-center gap-1"><span className="text-[oklch(0.58_0.18_145)]">✓ Agree</span> Same pick</span>
          <span className="flex items-center gap-1"><span className="text-[oklch(0.65_0.22_35)]">⚔️ Differ</span> Different pick</span>
        </div>
      </div>
    </div>
  );
}
