import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Trophy, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SharedBracket() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const { data, isLoading } = trpc.bracket.getByShareToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[oklch(0.65_0.22_35)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="text-6xl mb-4">😬</div>
          <h2 className="font-display text-4xl text-white mb-3">BRACKET NOT FOUND</h2>
          <p className="text-white/50 mb-6">This bracket link may have expired or doesn't exist.</p>
          <Link href="/">
            <Button className="bg-[oklch(0.65_0.22_35)] text-white font-bold">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { bracket, picks, ownerName } = data;
  const upsetPicks = picks.filter((p) => p.isUpset).length;

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[oklch(0.65_0.22_35/0.1)] to-transparent border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={14} />
            Back to BracketBuddy
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl text-white">{ownerName}'s BRACKET</h1>
              <p className="text-white/50 mt-1">2026 NCAA Tournament · {picks.length} picks made</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={copyLink}
                variant="outline"
                className="border-white/20 text-white/70 hover:text-white bg-transparent"
              >
                <Share2 size={14} className="mr-2" />
                Share
              </Button>
              <Link href="/bracket">
                <Button className="bg-[oklch(0.65_0.22_35)] text-white font-bold">
                  Build My Bracket
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Picks", value: picks.length, color: "text-[oklch(0.65_0.22_35)]" },
            { label: "Upset Picks", value: upsetPicks, color: "text-[oklch(0.55_0.2_250)]" },
            { label: "Completion", value: `${Math.round((picks.length / 63) * 100)}%`, color: "text-[oklch(0.78_0.18_80)]" },
            { label: "Status", value: bracket.isComplete ? "Complete ✅" : "In Progress", color: "text-[oklch(0.58_0.18_145)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10 text-center">
              <div className={`font-display text-2xl ${color}`}>{value}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Picks by Round */}
        <h2 className="font-display text-2xl text-white mb-4">PICKS BREAKDOWN</h2>
        <div className="space-y-3">
          {(["round64", "round32", "sweet16", "elite8", "finalfour", "championship"] as const).map((round) => {
            const roundPicks = picks.filter((p) => p.round === round);
            const roundLabels: Record<string, string> = {
              round64: "Round of 64",
              round32: "Round of 32",
              sweet16: "Sweet 16",
              elite8: "Elite Eight",
              finalfour: "Final Four",
              championship: "Championship",
            };
            if (roundPicks.length === 0) return null;
            return (
              <div key={round} className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-condensed font-semibold text-white uppercase tracking-wide">
                    {roundLabels[round]}
                  </span>
                  <span className="text-xs text-white/40">{roundPicks.length} picks</span>
                </div>
                <div className="text-xs text-white/50">
                  {roundPicks.filter((p) => p.isUpset).length} upset picks in this round
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-[oklch(0.65_0.22_35/0.15)] to-[oklch(0.55_0.2_250/0.1)] border border-white/10 text-center">
          <Trophy size={32} className="text-[oklch(0.78_0.18_80)] mx-auto mb-3" />
          <h3 className="font-display text-3xl text-white mb-2">THINK YOU CAN DO BETTER?</h3>
          <p className="text-white/60 mb-4">Build your own bracket and compete on the leaderboard!</p>
          <Link href="/bracket">
            <Button className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-lg px-8 py-5">
              Build My Bracket 🏀
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
