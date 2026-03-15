import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Share2, Trophy, Star, Zap, Copy, Twitter, Download, Lock } from "lucide-react";
import { Link } from "wouter";

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const { data: bracketData } = trpc.bracket.getMine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myAchievements = [] } = trpc.achievements.getMine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: allAchievements = [] } = trpc.achievements.getAll.useQuery();
  const { data: leaderboard = [] } = trpc.leaderboard.get.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[oklch(0.65_0.22_35)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Lock size={48} className="text-white/20 mx-auto mb-4" />
          <h2 className="font-display text-4xl text-white mb-3">SIGN IN TO VIEW PROFILE</h2>
          <p className="text-white/50 mb-6">Track your achievements, stats, and share your bracket</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-[oklch(0.65_0.22_35)] text-white font-bold text-lg px-8 py-6"
          >
            Sign In to Play
          </Button>
        </div>
      </div>
    );
  }

  const myRank = leaderboard.findIndex((u) => u.id === user?.id) + 1;
  const totalPicks = bracketData?.picks.length ?? 0;
  const upsetPicks = bracketData?.picks.filter((p) => p.isUpset).length ?? 0;
  const shareToken = bracketData?.bracket.shareToken;

  const sortedAchievements = [...myAchievements].sort(
    (a, b) => (RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] ?? 3) - (RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER] ?? 3)
  );

  const lockedAchievements = allAchievements.filter(
    (a) => !myAchievements.find((m) => m.key === a.key)
  );

  const copyShareLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied! 🔗");
  };

  const shareOnTwitter = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    const text = `Check out my 2026 March Madness bracket! I've made ${totalPicks} picks and called ${upsetPicks} upsets 🏀🔥 #MarchMadness #BracketBuddy`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[oklch(0.65_0.22_35/0.1)] to-[oklch(0.55_0.2_250/0.05)] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] flex items-center justify-center text-3xl font-bold text-white shadow-lg glow-orange">
              {(user?.name ?? "?")[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-4xl text-white">{user?.name ?? "Anonymous"}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {myRank > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-[oklch(0.78_0.18_80)]">
                    <Trophy size={14} />
                    Rank #{myRank}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-[oklch(0.65_0.22_35)]">
                  <Zap size={14} />
                  {(user?.totalPoints ?? 0).toLocaleString()} points
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[oklch(0.55_0.2_250)]">
                  <Star size={14} />
                  {myAchievements.length} badges earned
                </span>
              </div>
            </div>

            {/* Share Button */}
            {shareToken && (
              <Button
                onClick={() => setShowShareCard(true)}
                className="bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white font-bold"
              >
                <Share2 size={16} className="mr-2" />
                Share Bracket
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="font-display text-2xl text-white mb-4">MY STATS</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Picks", value: totalPicks, max: 63, color: "text-[oklch(0.65_0.22_35)]" },
                { label: "Upset Picks", value: upsetPicks, max: null, color: "text-[oklch(0.55_0.2_250)]" },
                { label: "Total Points", value: (user?.totalPoints ?? 0).toLocaleString(), max: null, color: "text-[oklch(0.78_0.18_80)]" },
                { label: "Badges", value: myAchievements.length, max: allAchievements.length, color: "text-[oklch(0.5_0.2_290)]" },
              ].map(({ label, value, max, color }) => (
                <div key={label} className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10">
                  <div className={`font-display text-3xl ${color}`}>{value}</div>
                  {max && <div className="text-xs text-white/30">of {max}</div>}
                  <div className="text-xs text-white/50 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bracket Progress */}
          {bracketData && (
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10">
              <h3 className="font-bold text-white text-sm mb-3">Bracket Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Picks made</span>
                  <span className="text-[oklch(0.65_0.22_35)] font-bold">{totalPicks}/63</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] rounded-full transition-all"
                    style={{ width: `${Math.round((totalPicks / 63) * 100)}%` }}
                  />
                </div>
                {bracketData.bracket.isComplete && (
                  <div className="flex items-center gap-1.5 text-xs text-[oklch(0.58_0.18_145)] mt-2">
                    <span>✅</span> Bracket complete!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Share Card */}
          {shareToken && (
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <Share2 size={14} className="text-[oklch(0.55_0.2_250)]" />
                Share Your Bracket
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={copyShareLink}
                  variant="outline"
                  size="sm"
                  className="w-full border-white/15 text-white/70 hover:text-white bg-transparent text-xs"
                >
                  <Copy size={12} className="mr-2" />
                  Copy Share Link
                </Button>
                <Button
                  onClick={shareOnTwitter}
                  size="sm"
                  className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-xs font-bold"
                >
                  <Twitter size={12} className="mr-2" />
                  Share on Twitter/X
                </Button>
              </div>
            </div>
          )}

          {!bracketData && (
            <div className="p-4 rounded-xl bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.3)] text-center">
              <p className="text-white/70 text-sm mb-3">You haven't built your bracket yet!</p>
              <Link href="/bracket">
                <Button className="bg-[oklch(0.65_0.22_35)] text-white font-bold text-sm">
                  Build My Bracket 🏀
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl text-white mb-4">ACHIEVEMENTS</h2>

          {/* Earned */}
          {sortedAchievements.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {sortedAchievements.map((ach) => (
                <div
                  key={ach.key}
                  className={`p-4 rounded-2xl rarity-${ach.rarity ?? "common"}-bg animate-bounce-in`}
                >
                  <div className="text-3xl mb-2">{ach.icon}</div>
                  <div className={`font-bold text-sm rarity-${ach.rarity ?? "common"} mb-1`}>{ach.name}</div>
                  <div className="text-white/40 text-xs leading-tight">{ach.description}</div>
                  <div className={`text-xs font-condensed uppercase tracking-wider mt-2 rarity-${ach.rarity ?? "common"} opacity-70`}>
                    {ach.rarity}
                  </div>
                  <div className="text-xs text-white/30 mt-1">+{ach.points} pts</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white/3 border border-white/8 text-center mb-6">
              <div className="text-4xl mb-3">🏀</div>
              <p className="text-white/50 text-sm">No badges yet! Start making picks to earn achievements.</p>
            </div>
          )}

          {/* Locked */}
          {lockedAchievements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
                Locked Achievements ({lockedAchievements.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lockedAchievements.map((ach) => (
                  <div
                    key={ach.key}
                    className="p-4 rounded-2xl border border-white/5 bg-white/3 opacity-50"
                  >
                    <div className="text-3xl mb-2 grayscale">{ach.icon}</div>
                    <div className="font-bold text-sm text-white/40 mb-1">{ach.name}</div>
                    <div className="text-white/25 text-xs leading-tight">{ach.description}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Lock size={10} className="text-white/20" />
                      <span className="text-xs text-white/20">Locked</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Card Modal */}
      {showShareCard && shareToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            {/* The shareable card */}
            <div
              ref={shareCardRef}
              className="rounded-2xl overflow-hidden border-2 border-[oklch(0.65_0.22_35/0.5)] shadow-2xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.015 260), oklch(0.1 0.01 260))",
              }}
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] p-4 text-center">
                <div className="font-display text-3xl text-white tracking-wider">🏀 BRACKET BUDDY</div>
                <div className="text-white/80 text-sm">2026 March Madness</div>
              </div>

              {/* Card Content */}
              <div className="p-5 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.22_35)] to-[oklch(0.55_0.2_250)] flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
                  {(user?.name ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="font-display text-2xl text-white mb-1">{user?.name}</div>
                <div className="text-white/50 text-sm mb-4">March Madness Bracket</div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Picks", value: totalPicks },
                    { label: "Upsets", value: upsetPicks },
                    { label: "Badges", value: myAchievements.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-2">
                      <div className="font-display text-2xl text-[oklch(0.65_0.22_35)]">{value}</div>
                      <div className="text-xs text-white/40">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Top badges */}
                {sortedAchievements.length > 0 && (
                  <div className="flex justify-center gap-2 mb-4">
                    {sortedAchievements.slice(0, 4).map((ach) => (
                      <div key={ach.key} className="text-2xl" title={ach.name ?? ""}>
                        {ach.icon}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-white/30">bracketbuddy.com</div>
              </div>
            </div>

            {/* Share Actions */}
            <div className="mt-4 space-y-2">
              <Button
                onClick={shareOnTwitter}
                className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold"
              >
                <Twitter size={16} className="mr-2" />
                Share on Twitter/X
              </Button>
              <Button
                onClick={copyShareLink}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/5 bg-transparent"
              >
                <Copy size={16} className="mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={() => setShowShareCard(false)}
                variant="outline"
                className="w-full border-white/10 text-white/50 hover:text-white bg-transparent"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
