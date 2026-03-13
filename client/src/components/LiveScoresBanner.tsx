/**
 * LiveScoresBanner — scrolling ticker of live/recent game scores
 * Shown at the top of the Bracket page when the tournament is active.
 */

import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

interface Team {
  id: number;
  shortName: string;
  seed: number;
}

function ScoreItem({ game, teams }: { game: any; teams: Team[] }) {
  const t1 = teams.find((t) => t.id === game.team1Id);
  const t2 = teams.find((t) => t.id === game.team2Id);
  const winner = game.winnerId ? teams.find((t) => t.id === game.winnerId) : null;
  const isLive = game.espnStatus === "STATUS_IN_PROGRESS";
  const isFinal = game.isComplete;

  return (
    <span className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
      {isLive && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
      )}
      <span className={`text-xs font-semibold ${isLive ? "text-red-300" : isFinal ? "text-white/50" : "text-white/30"}`}>
        {isLive ? "LIVE" : isFinal ? "FINAL" : "UPCOMING"}
      </span>
      <span className={`text-sm font-bold ${winner?.id === t1?.id ? "text-[oklch(0.75_0.22_35)]" : "text-white/70"}`}>
        #{t1?.seed} {t1?.shortName ?? "TBD"}
      </span>
      <span className="text-white/30 text-xs">
        {game.team1Score !== null && game.team1Score !== undefined ? game.team1Score : "—"}
      </span>
      <span className="text-white/20 text-xs">–</span>
      <span className="text-white/30 text-xs">
        {game.team2Score !== null && game.team2Score !== undefined ? game.team2Score : "—"}
      </span>
      <span className={`text-sm font-bold ${winner?.id === t2?.id ? "text-[oklch(0.75_0.22_35)]" : "text-white/70"}`}>
        #{t2?.seed} {t2?.shortName ?? "TBD"}
      </span>
      <span className="text-white/10 mx-2">|</span>
    </span>
  );
}

export default function LiveScoresBanner() {
  const { data: liveScores, refetch } = trpc.tournament.liveScores.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });
  const { data: allTeams } = trpc.teams.getAll.useQuery();
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Only show if there are games with scores
  const scoredGames = (liveScores ?? []).filter(
    (g) => g.isComplete || g.espnStatus === "STATUS_IN_PROGRESS"
  );

  if (!scoredGames.length || !allTeams?.length) return null;

  const teams: Team[] = allTeams.map((t) => ({ id: t.id, shortName: t.shortName, seed: t.seed }));

  // Duplicate items for seamless loop
  const items = [...scoredGames, ...scoredGames];

  return (
    <div className="w-full bg-[oklch(0.08_0.02_260)] border-b border-white/10 overflow-hidden">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.65_0.22_35)] text-white text-xs font-bold uppercase tracking-wider">
          <Activity size={11} />
          Live
        </div>

        {/* Scrolling ticker */}
        <div
          className="flex-1 overflow-hidden relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            ref={tickerRef}
            className="flex items-center py-2"
            style={{
              animation: isHovered ? "none" : "ticker-scroll 60s linear infinite",
            }}
          >
            {items.map((game, i) => (
              <ScoreItem key={`${game.id}-${i}`} game={game} teams={teams} />
            ))}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          className="flex-shrink-0 p-2 text-white/30 hover:text-white/70 transition-colors"
          title="Refresh scores"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
