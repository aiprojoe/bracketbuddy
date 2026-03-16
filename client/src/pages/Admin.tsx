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
  Users,
  ChevronDown,
  ChevronUp,
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

// Template for pasting in the real bracket — 68 teams in JSON format
// For First Four teams: add "isFirstFour": true and use the same seed as their play-in partner
// Example: two teams both with seed 11 in South, both with isFirstFour: true
const TEAM_TEMPLATE = `[
  { "seed": 1, "region": "East", "name": "Duke Blue Devils", "shortName": "Duke", "conference": "ACC" },
  { "seed": 2, "region": "East", "name": "Alabama Crimson Tide", "shortName": "Alabama", "conference": "SEC" },
  { "seed": 3, "region": "East", "name": "Wisconsin Badgers", "shortName": "Wisconsin", "conference": "Big Ten" },
  { "seed": 4, "region": "East", "name": "Maryland Terrapins", "shortName": "Maryland", "conference": "Big Ten" },
  { "seed": 5, "region": "East", "name": "Team E5", "shortName": "E5", "conference": "" },
  { "seed": 6, "region": "East", "name": "Team E6", "shortName": "E6", "conference": "" },
  { "seed": 7, "region": "East", "name": "Team E7", "shortName": "E7", "conference": "" },
  { "seed": 8, "region": "East", "name": "Team E8", "shortName": "E8", "conference": "" },
  { "seed": 9, "region": "East", "name": "Team E9", "shortName": "E9", "conference": "" },
  { "seed": 10, "region": "East", "name": "Team E10", "shortName": "E10", "conference": "" },
  { "seed": 11, "region": "East", "name": "Team E11", "shortName": "E11", "conference": "" },
  { "seed": 12, "region": "East", "name": "Team E12", "shortName": "E12", "conference": "" },
  { "seed": 13, "region": "East", "name": "Team E13", "shortName": "E13", "conference": "" },
  { "seed": 14, "region": "East", "name": "Team E14", "shortName": "E14", "conference": "" },
  { "seed": 15, "region": "East", "name": "Team E15", "shortName": "E15", "conference": "" },
  { "seed": 16, "region": "East", "name": "Team E16a", "shortName": "E16a", "conference": "", "isFirstFour": true },
  { "seed": 16, "region": "East", "name": "Team E16b", "shortName": "E16b", "conference": "", "isFirstFour": true },
  { "seed": 1, "region": "West", "name": "Auburn Tigers", "shortName": "Auburn", "conference": "SEC" },
  { "seed": 2, "region": "West", "name": "Michigan State Spartans", "shortName": "Michigan St", "conference": "Big Ten" },
  { "seed": 3, "region": "West", "name": "Team W3", "shortName": "W3", "conference": "" },
  { "seed": 4, "region": "West", "name": "Team W4", "shortName": "W4", "conference": "" },
  { "seed": 5, "region": "West", "name": "Team W5", "shortName": "W5", "conference": "" },
  { "seed": 6, "region": "West", "name": "Team W6", "shortName": "W6", "conference": "" },
  { "seed": 7, "region": "West", "name": "Team W7", "shortName": "W7", "conference": "" },
  { "seed": 8, "region": "West", "name": "Team W8", "shortName": "W8", "conference": "" },
  { "seed": 9, "region": "West", "name": "Team W9", "shortName": "W9", "conference": "" },
  { "seed": 10, "region": "West", "name": "Team W10", "shortName": "W10", "conference": "" },
  { "seed": 11, "region": "West", "name": "Team W11a", "shortName": "W11a", "conference": "", "isFirstFour": true },
  { "seed": 11, "region": "West", "name": "Team W11b", "shortName": "W11b", "conference": "", "isFirstFour": true },
  { "seed": 12, "region": "West", "name": "Team W12", "shortName": "W12", "conference": "" },
  { "seed": 13, "region": "West", "name": "Team W13", "shortName": "W13", "conference": "" },
  { "seed": 14, "region": "West", "name": "Team W14", "shortName": "W14", "conference": "" },
  { "seed": 15, "region": "West", "name": "Team W15", "shortName": "W15", "conference": "" },
  { "seed": 16, "region": "West", "name": "Team W16", "shortName": "W16", "conference": "" },
  { "seed": 1, "region": "South", "name": "Houston Cougars", "shortName": "Houston", "conference": "Big 12" },
  { "seed": 2, "region": "South", "name": "Tennessee Volunteers", "shortName": "Tennessee", "conference": "SEC" },
  { "seed": 3, "region": "South", "name": "Team S3", "shortName": "S3", "conference": "" },
  { "seed": 4, "region": "South", "name": "Team S4", "shortName": "S4", "conference": "" },
  { "seed": 5, "region": "South", "name": "Team S5", "shortName": "S5", "conference": "" },
  { "seed": 6, "region": "South", "name": "Team S6", "shortName": "S6", "conference": "" },
  { "seed": 7, "region": "South", "name": "Team S7", "shortName": "S7", "conference": "" },
  { "seed": 8, "region": "South", "name": "Team S8", "shortName": "S8", "conference": "" },
  { "seed": 9, "region": "South", "name": "Team S9", "shortName": "S9", "conference": "" },
  { "seed": 10, "region": "South", "name": "Team S10", "shortName": "S10", "conference": "" },
  { "seed": 11, "region": "South", "name": "Team S11", "shortName": "S11", "conference": "" },
  { "seed": 12, "region": "South", "name": "Team S12", "shortName": "S12", "conference": "" },
  { "seed": 13, "region": "South", "name": "Team S13", "shortName": "S13", "conference": "" },
  { "seed": 14, "region": "South", "name": "Team S14", "shortName": "S14", "conference": "" },
  { "seed": 15, "region": "South", "name": "Team S15", "shortName": "S15", "conference": "" },
  { "seed": 16, "region": "South", "name": "Team S16a", "shortName": "S16a", "conference": "", "isFirstFour": true },
  { "seed": 16, "region": "South", "name": "Team S16b", "shortName": "S16b", "conference": "", "isFirstFour": true },
  { "seed": 1, "region": "Midwest", "name": "Florida Gators", "shortName": "Florida", "conference": "SEC" },
  { "seed": 2, "region": "Midwest", "name": "St. John's Red Storm", "shortName": "St. John's", "conference": "Big East" },
  { "seed": 3, "region": "Midwest", "name": "Team M3", "shortName": "M3", "conference": "" },
  { "seed": 4, "region": "Midwest", "name": "Team M4", "shortName": "M4", "conference": "" },
  { "seed": 5, "region": "Midwest", "name": "Team M5", "shortName": "M5", "conference": "" },
  { "seed": 6, "region": "Midwest", "name": "Team M6", "shortName": "M6", "conference": "" },
  { "seed": 7, "region": "Midwest", "name": "Team M7", "shortName": "M7", "conference": "" },
  { "seed": 8, "region": "Midwest", "name": "Team M8", "shortName": "M8", "conference": "" },
  { "seed": 9, "region": "Midwest", "name": "Team M9", "shortName": "M9", "conference": "" },
  { "seed": 10, "region": "Midwest", "name": "Team M10", "shortName": "M10", "conference": "" },
  { "seed": 11, "region": "Midwest", "name": "Team M11a", "shortName": "M11a", "conference": "", "isFirstFour": true },
  { "seed": 11, "region": "Midwest", "name": "Team M11b", "shortName": "M11b", "conference": "", "isFirstFour": true },
  { "seed": 12, "region": "Midwest", "name": "Team M12", "shortName": "M12", "conference": "" },
  { "seed": 13, "region": "Midwest", "name": "Team M13", "shortName": "M13", "conference": "" },
  { "seed": 14, "region": "Midwest", "name": "Team M14", "shortName": "M14", "conference": "" },
  { "seed": 15, "region": "Midwest", "name": "Team M15", "shortName": "M15", "conference": "" },
  { "seed": 16, "region": "Midwest", "name": "Team M16", "shortName": "M16", "conference": "" }
]`;

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [showUpdateTeams, setShowUpdateTeams] = useState(false);
  const [teamsJson, setTeamsJson] = useState(TEAM_TEMPLATE);
  const [clearPicks, setClearPicks] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  const updateTeamsMutation = trpc.tournament.updateTeams.useMutation({
    onSuccess: (result) => {
      toast.success(`✅ Teams updated! ${result.updated} updated, ${result.inserted} inserted${result.picksCleared > 0 ? `, ${result.picksCleared} picks cleared` : ""}`);
      setShowUpdateTeams(false);
    },
    onError: (err) => toast.error(`Failed to update teams: ${err.message}`),
  });

  function handleUpdateTeams() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(teamsJson);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      if (clearPicks) {
        const confirmed = window.confirm(
          "\u26a0\ufe0f WARNING: This will permanently delete ALL user picks for every bracket. This cannot be undone.\n\nAre you absolutely sure you want to clear all picks?"
        );
        if (!confirmed) return;
      }
      updateTeamsMutation.mutate({ teams: parsed, clearPicks });
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  const sendLockRemindersMutation = trpc.email.sendLockReminders.useMutation({
    onSuccess: (result) => toast.success(`📧 Sent ${result.sent} reminder emails! (${result.failed} failed)`),
    onError: (err) => toast.error(`Email failed: ${err.message}`),
  });

  const sendTestWelcomeMutation = trpc.email.sendTestWelcome.useMutation({
    onSuccess: (result) => toast.success(`✅ Test welcome email sent to ${result.sentTo}`),
    onError: (err) => toast.error(`Test email failed: ${err.message}`),
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

            {/* Send Lock Reminder */}
            <Button
              onClick={() => sendLockRemindersMutation.mutate()}
              disabled={sendLockRemindersMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
            >
              {sendLockRemindersMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <span className="mr-2">📧</span>
              )}
              {sendLockRemindersMutation.isPending ? "Sending..." : "Send Lock Reminder"}
            </Button>

            {/* Test Welcome Email */}
            <Button
              onClick={() => sendTestWelcomeMutation.mutate()}
              disabled={sendTestWelcomeMutation.isPending}
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white font-bold"
            >
              {sendTestWelcomeMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <span className="mr-2">✉️</span>
              )}
              Test Welcome Email
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

        {/* ── Update Teams (Selection Sunday Tool) ── */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5">
          <button
            onClick={() => setShowUpdateTeams(!showUpdateTeams)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <Users size={20} className="text-orange-400" />
              <div>
                <h2 className="font-bold text-white text-lg">Update Teams — Selection Sunday</h2>
                <p className="text-white/40 text-xs mt-0.5">Paste the real 2026 bracket JSON after the bracket is revealed at 7pm EST</p>
              </div>
            </div>
            {showUpdateTeams ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
          </button>

          {showUpdateTeams && (
            <div className="px-5 pb-5 space-y-4 border-t border-orange-500/20 pt-4">
              {/* Field guide */}
              <div className="p-3 rounded-lg bg-black/30 border border-orange-500/20 text-xs space-y-2">
                <div className="font-semibold text-orange-300 text-sm">📋 Field Guide</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/60">
                  <div><code className="text-orange-300">seed</code> — 1–16 (required)</div>
                  <div><code className="text-orange-300">region</code> — East / West / South / Midwest (required)</div>
                  <div><code className="text-orange-300">name</code> — Full team name (required)</div>
                  <div><code className="text-orange-300">shortName</code> — Abbreviated name shown in bracket (required)</div>
                  <div><code className="text-orange-300">conference</code> — Conference name (optional)</div>
                  <div><code className="text-orange-300">isFirstFour</code> — <span className="text-yellow-300">true</span> for play-in teams only</div>
                </div>
                <div className="pt-1 border-t border-white/10 text-yellow-300/80">
                  ⚠️ <strong>First Four teams:</strong> Add two teams with the same seed in the same region, both with <code className="text-yellow-300">"isFirstFour": true</code>. The 4 play-in games are: two seed-11 matchups and two seed-16 matchups (one per region for each). Teams are matched by seed+region — existing user picks are <strong>preserved</strong> unless you check "Clear all picks" below.
                </div>
              </div>

              <textarea
                value={teamsJson}
                onChange={(e) => { setTeamsJson(e.target.value); setJsonError(null); }}
                rows={14}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs font-mono text-white/80 resize-y focus:outline-none focus:border-orange-500/50"
                placeholder="Paste JSON array here..."
              />

              {jsonError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <XCircle size={14} />
                  {jsonError}
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearPicks}
                  onChange={(e) => setClearPicks(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 accent-orange-500"
                />
                <div>
                  <span className="text-white text-sm font-semibold">Clear all user picks after update</span>
                  <p className="text-white/40 text-xs">Check this if teams changed significantly — users will need to re-pick their brackets</p>
                </div>
              </label>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleUpdateTeams}
                  disabled={updateTeamsMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  {updateTeamsMutation.isPending ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Updating...</>
                  ) : (
                    <><Users size={16} className="mr-2" /> Update {(() => { try { return JSON.parse(teamsJson).length; } catch { return "??"; } })()} Teams</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateTeams(false)}
                  className="text-white/60 border-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!liveScores?.length && (
          <div className="p-8 rounded-xl border border-dashed border-white/10 text-center">
            <Activity size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No game data yet. Click "Sync ESPN Now" to fetch tournament scores.</p>
            <p className="text-white/20 text-xs mt-1">The ESPN API will have data once the tournament begins (First Four: March 18–19, Round of 64: March 20–21).</p>
          </div>
        )}
      </div>
    </div>
  );
}
