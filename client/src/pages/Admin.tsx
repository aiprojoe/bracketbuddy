/**
 * Admin Panel — Tournament Management
 * Only accessible to users with role = "admin"
 *
 * Features:
 * - Trigger ESPN sync manually
 * - Lock/unlock brackets
 * - View sync status and game results
 * - Manually enter game results (fallback)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Trophy,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

const ROUND_LABELS: Record<string, string> = {
  firstfour: "First Four",
  round64: "Round of 64",
  round32: "Round of 32",
  sweet16: "Sweet 16",
  elite8: "Elite Eight",
  finalfour: "Final Four",
  championship: "Championship",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "STATUS_FINAL")
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">Final</span>;
  if (status === "STATUS_IN_PROGRESS")
    return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">Live</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/40 border border-white/10">Scheduled</span>;
}

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const { data: config, refetch: refetchConfig } = trpc.tournament.config.useQuery();
  const { data: liveScores, refetch: refetchScores } = trpc.tournament.liveScores.useQuery();
  const { data: allTeams } = trpc.teams.getAll.useQuery();
  const { data: schedulerStatus, refetch: refetchScheduler } = trpc.tournament.syncStatus.useQuery(
    undefined,
    { refetchInterval: 15_000 } // refresh every 15s so countdown stays fresh
  );

  const syncImmediateMutation = trpc.tournament.syncNowImmediate.useMutation({
    onSuccess: (result) => {
      refetchScheduler();
      refetchConfig();
      refetchScores();
      toast.success(`Sync triggered — ${result.lastRunResult ?? "running..."}`);
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  const syncMutation = trpc.tournament.syncNow.useMutation({
    onSuccess: (result) => {
      const lines = [
        `✅ Sync complete at ${new Date().toLocaleTimeString()}`,
        `📊 Games found: ${result.gamesFound}`,
        `✔️  Completed: ${result.gamesCompleted}`,
        `🆕 Updated: ${result.gamesUpdated}`,
        `🏀 Picks scored: ${result.picksScored}`,
        ...(result.errors.length > 0 ? [`⚠️  Errors (${result.errors.length}):`, ...result.errors.map((e) => `   ${e}`)] : []),
      ];
      setSyncLog(lines);
      refetchConfig();
      refetchScores();
      toast.success(`Sync complete — ${result.gamesCompleted} games, ${result.picksScored} picks scored`);
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  const lockMutation = trpc.tournament.setLocked.useMutation({
    onSuccess: (result) => {
      refetchConfig();
      toast.success(result.locked ? "🔒 Brackets locked — no more edits!" : "🔓 Brackets unlocked");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const teamById = (id: number) => allTeams?.find((t) => t.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle size={48} className="text-yellow-400 mx-auto" />
            <h1 className="text-2xl font-bold">Admin Access Required</h1>
            <p className="text-white/50">You need admin privileges to view this page.</p>
            <Link href="/">
              <Button className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const completedGames = liveScores?.filter((g) => g.isComplete) ?? [];
  const liveGames = liveScores?.filter((g) => g.espnStatus === "STATUS_IN_PROGRESS") ?? [];
  const upcomingGames = liveScores?.filter((g) => !g.isComplete && g.espnStatus !== "STATUS_IN_PROGRESS") ?? [];

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-white">ADMIN PANEL</h1>
            <p className="text-white/50 text-sm">2026 NCAA Tournament Management</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            <Activity size={12} />
            Admin Mode
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Games Found", value: config?.gamesFound ?? 0, icon: "📊" },
            { label: "Completed", value: config?.gamesCompleted ?? 0, icon: "✅" },
            { label: "Picks Scored", value: config?.picksScored ?? 0, icon: "🏀" },
            { label: "Live Now", value: liveGames.length, icon: "🔴" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-white/10 bg-white/3">
              <div className="text-2xl font-display text-white">{stat.icon} {stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="p-5 rounded-xl border border-white/10 bg-white/3 space-y-4">
          <h2 className="font-bold text-white text-lg">Tournament Controls</h2>

          <div className="flex flex-wrap gap-3">
            {/* Sync Now (uses scheduler so it resets the timer) */}
            <Button
              onClick={() => syncImmediateMutation.mutate()}
              disabled={syncImmediateMutation.isPending}
              className="bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white font-bold"
            >
              {syncImmediateMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <RefreshCw size={16} className="mr-2" />
              )}
              {syncImmediateMutation.isPending ? "Syncing ESPN..." : "Sync ESPN Now"}
            </Button>

            {/* Lock/Unlock */}
            <Button
              onClick={() => lockMutation.mutate({ locked: !config?.isLocked })}
              disabled={lockMutation.isPending}
              className={config?.isLocked
                ? "bg-green-600 hover:bg-green-500 text-white font-bold"
                : "bg-red-600 hover:bg-red-500 text-white font-bold"
              }
            >
              {config?.isLocked ? (
                <><Unlock size={16} className="mr-2" /> Unlock Brackets</>
              ) : (
                <><Lock size={16} className="mr-2" /> Lock Brackets</>
              )}
            </Button>
          </div>

          {/* Status info */}
          <div className="text-xs text-white/40 space-y-1">
            <div>Bracket status: <span className={config?.isLocked ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>{config?.isLocked ? "🔒 LOCKED — no edits allowed" : "🔓 Open — users can edit picks"}</span></div>
            <div>Last sync: {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : "Never"}</div>
            <div>Last status: {config?.lastSyncStatus ?? "—"}</div>
          </div>

          {/* Scheduler Status Card */}
          {schedulerStatus && (
            <div className="mt-4 p-4 rounded-lg border border-white/10 bg-black/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className={`w-2 h-2 rounded-full ${schedulerStatus.running ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                Auto-Sync Scheduler — {schedulerStatus.running ? "Running" : "Stopped"}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/50">
                <div>Interval: <span className="text-white/80">{schedulerStatus.currentIntervalLabel}</span></div>
                <div>Total runs: <span className="text-white/80">{schedulerStatus.totalRuns}</span></div>
                <div>Last run: <span className="text-white/80">{schedulerStatus.lastRunAt ? new Date(schedulerStatus.lastRunAt).toLocaleTimeString() : "Not yet"}</span></div>
                <div>Total picks scored: <span className="text-white/80">{schedulerStatus.totalPicksScored}</span></div>
                <div>Next run: <span className="text-white/80">{schedulerStatus.nextRunAt ? new Date(schedulerStatus.nextRunAt).toLocaleTimeString() : "—"}</span></div>
                <div>Last result: <span className="text-white/70 break-all">{schedulerStatus.lastRunResult ?? "—"}</span></div>
              </div>
              {schedulerStatus.errors.length > 0 && (
                <div className="text-xs text-yellow-400/70 space-y-0.5">
                  <div className="font-semibold">Recent errors:</div>
                  {schedulerStatus.errors.map((e, i) => <div key={i} className="pl-2">• {e}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Sync log */}
          {syncLog.length > 0 && (
            <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
              {syncLog.map((line, i) => (
                <div key={i} className={line.startsWith("⚠️") || line.startsWith("   ") ? "text-yellow-400" : "text-green-400"}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-3">
            <h2 className="font-bold text-yellow-400 text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Live Games ({liveGames.length})
            </h2>
            <div className="space-y-2">
              {liveGames.map((g) => {
                const t1 = teamById(g.team1Id);
                const t2 = teamById(g.team2Id);
                return (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-sm font-semibold text-white">
                      {t1?.shortName ?? `Team ${g.team1Id}`} vs {t2?.shortName ?? `Team ${g.team2Id}`}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">{g.team1Score ?? "—"} – {g.team2Score ?? "—"}</span>
                      <StatusBadge status={g.espnStatus ?? "STATUS_IN_PROGRESS"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Games */}
        {completedGames.length > 0 && (
          <div className="p-5 rounded-xl border border-white/10 bg-white/3 space-y-3">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              Completed Games ({completedGames.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="text-left pb-2">Round</th>
                    <th className="text-left pb-2">Matchup</th>
                    <th className="text-left pb-2">Score</th>
                    <th className="text-left pb-2">Winner</th>
                    <th className="text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {completedGames.map((g) => {
                    const t1 = teamById(g.team1Id);
                    const t2 = teamById(g.team2Id);
                    const winner = g.winnerId ? teamById(g.winnerId) : null;
                    return (
                      <tr key={g.id} className="text-white/80">
                        <td className="py-2 text-white/40 text-xs">{ROUND_LABELS[g.round] ?? g.round}</td>
                        <td className="py-2 font-semibold">
                          {t1?.shortName ?? `#${g.team1Id}`} vs {t2?.shortName ?? `#${g.team2Id}`}
                        </td>
                        <td className="py-2 font-mono">
                          {g.team1Score ?? "—"} – {g.team2Score ?? "—"}
                        </td>
                        <td className="py-2">
                          {winner ? (
                            <span className="flex items-center gap-1 text-green-400 font-semibold">
                              <Trophy size={12} />
                              {winner.shortName}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2">
                          <StatusBadge status={g.espnStatus ?? "STATUS_FINAL"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upcoming Games */}
        {upcomingGames.length > 0 && (
          <div className="p-5 rounded-xl border border-white/10 bg-white/3 space-y-3">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Clock size={18} className="text-white/40" />
              Upcoming / Scheduled ({upcomingGames.length})
            </h2>
            <div className="space-y-2">
              {upcomingGames.slice(0, 10).map((g) => {
                const t1 = teamById(g.team1Id);
                const t2 = teamById(g.team2Id);
                return (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/5">
                    <div className="text-sm text-white/70">
                      <span className="text-white/30 text-xs mr-2">{ROUND_LABELS[g.round] ?? g.round}</span>
                      {t1?.shortName ?? `#${g.team1Id}`} vs {t2?.shortName ?? `#${g.team2Id}`}
                    </div>
                    <div className="text-xs text-white/30">
                      {g.playedAt ? new Date(g.playedAt).toLocaleDateString() : "TBD"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!liveScores?.length && (
          <div className="p-8 rounded-xl border border-dashed border-white/10 text-center">
            <Activity size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No game data yet. Click "Sync ESPN Now" to fetch tournament scores.</p>
            <p className="text-white/20 text-xs mt-1">The ESPN API will have data once the tournament begins (March 18, 2026).</p>
          </div>
        )}
      </div>
    </div>
  );
}
