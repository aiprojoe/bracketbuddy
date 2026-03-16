import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Crown, Medal, Send, MessageCircle, Star, Zap } from "lucide-react";
import { Link } from "wouter";

const RANK_STYLES = [
  { bg: "bg-[oklch(0.78_0.18_80/0.15)]", border: "border-[oklch(0.78_0.18_80/0.4)]", text: "text-[oklch(0.78_0.18_80)]" },
  { bg: "bg-[oklch(0.75_0.01_260/0.1)]", border: "border-[oklch(0.75_0.01_260/0.3)]", text: "text-[oklch(0.75_0.01_260)]" },
  { bg: "bg-[oklch(0.65_0.15_50/0.1)]", border: "border-[oklch(0.65_0.15_50/0.3)]", text: "text-[oklch(0.65_0.15_50)]" },
];

const RANK_ICONS = [Crown, Medal, Medal];

const TRASH_TALK_STARTERS = [
  "My bracket is going to destroy yours 🔥",
  "Already called 3 upsets. You? 😏",
  "Duke is going all the way, fight me 🏀",
  "Anyone else picking a 12-seed to the Sweet 16? 💥",
  "My AI picks are unbeatable this year 🤖",
  "Just submitted the perfect bracket. You're welcome 👑",
];

export default function Leaderboard() {
  const { user, isAuthenticated } = useAuth();
  const [comment, setComment] = useState("");
  const [showTrashTalk, setShowTrashTalk] = useState(false);

  const { data: leaderboard = [], isLoading: loadingLB } = trpc.leaderboard.get.useQuery();
  const { data: comments = [], refetch: refetchComments } = trpc.leaderboard.getComments.useQuery();
  const { data: myAchievements = [] } = trpc.achievements.getMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const addComment = trpc.leaderboard.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      refetchComments();
      toast.success("Trash talk posted! 🔥");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const handleComment = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to trash talk!", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (!comment.trim()) return;
    addComment.mutate({ content: comment });
  };

  const myRank = leaderboard.findIndex((u) => u.id === user?.id) + 1;

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[oklch(0.78_0.18_80/0.1)] to-transparent border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-2">
            <Trophy size={32} className="text-[oklch(0.78_0.18_80)]" />
            <h1 className="font-display text-5xl text-white">LEADERBOARD</h1>
          </div>
          <p className="text-white/50 text-lg">Who's the real March Madness oracle? 🔮</p>

          {isAuthenticated && myRank > 0 && (
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_35/0.15)] border border-[oklch(0.65_0.22_35/0.3)]">
              <span className="text-[oklch(0.65_0.22_35)] font-bold">Your Rank: #{myRank}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/70">{user?.totalPoints ?? 0} pts</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Rankings */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-white">TOP BRACKETS</h2>
            <span className="text-xs text-white/40 font-condensed uppercase tracking-wider">
              {leaderboard.length} competitors
            </span>
          </div>

          {loadingLB ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Trophy size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-condensed uppercase">No competitors yet!</p>
              <p className="text-sm mt-2">Be the first to submit a bracket</p>
              <Link href="/bracket">
                <Button className="mt-4 bg-[oklch(0.65_0.22_35)] text-white font-bold">
                  Build My Bracket
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => {
                const rank = i + 1;
                const style = RANK_STYLES[i] ?? {
                  bg: "bg-white/3",
                  border: "border-white/8",
                  text: "text-white/50",
                };
                const RankIconComp = i < 3 ? RANK_ICONS[i] : null;
                const isMe = entry.id === user?.id;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${style.bg} ${style.border} ${isMe ? "ring-1 ring-[oklch(0.65_0.22_35/0.5)]" : ""}`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-display text-xl ${style.text}`}>
                      {RankIconComp ? <RankIconComp size={20} className="mx-auto" /> : `#${rank}`}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.65_0.22_35/0.5)] to-[oklch(0.55_0.2_250/0.5)] flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                      {(entry.name ?? "?")[0]?.toUpperCase()}
                    </div>

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">
                          {entry.name ?? "Anonymous"}
                        </span>
                        {isMe && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)] font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">
                        {(entry.correctPicks ?? 0) > 0
                          ? `${entry.correctPicks} correct pick${(entry.correctPicks ?? 0) !== 1 ? "s" : ""}`
                          : `${entry.bracketCount ?? 0} bracket${(entry.bracketCount ?? 0) !== 1 ? "s" : ""}`}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className={`font-display text-2xl ${style.text}`}>
                        {(entry.totalPoints ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-white/40">points</div>
                      {(entry.maxPossiblePoints ?? 0) > 0 && (
                        <div className="text-xs text-white/25 mt-0.5" title="Max points still possible if all remaining picks are correct">
                          ↑{(entry.maxPossiblePoints ?? 0).toLocaleString()} max
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {leaderboard.length > 0 && leaderboard.every((u) => (u.totalPoints ?? 0) === 0) && (
            <p className="text-center text-white/30 text-sm mt-4">
              🕐 First Four starts March 17 — scores update live as games are scored
            </p>
          )}

          {!isAuthenticated && (
            <div className="mt-6 p-4 rounded-xl bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.3)] text-center">
              <p className="text-white/70 mb-3">Sign in to appear on the leaderboard!</p>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-[oklch(0.65_0.22_35)] text-white font-bold"
              >
                Sign In & Compete
              </Button>
            </div>
          )}
        </div>

        {/* Trash Talk & Achievements */}
        <div className="space-y-6">
          {/* My Achievements */}
          {isAuthenticated && myAchievements.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-white mb-3 flex items-center gap-2">
                <Star size={16} className="text-[oklch(0.78_0.18_80)]" />
                MY BADGES
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {myAchievements.slice(0, 6).map((ach) => (
                  <div
                    key={ach.key}
                    className={`p-2 rounded-xl border text-center ${ach.rarity ?? "common"}-bg`}
                    title={ach.description ?? ""}
                  >
                    <div className="text-2xl mb-1">{ach.icon}</div>
                    <div className={`text-[10px] font-bold rarity-${ach.rarity ?? "common"} leading-tight`}>
                      {ach.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trash Talk */}
          <div>
            <h3 className="font-display text-xl text-white mb-3 flex items-center gap-2">
              <MessageCircle size={16} className="text-[oklch(0.65_0.22_35)]" />
              TRASH TALK
            </h3>

            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Talk your bracket trash..."
                maxLength={280}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[oklch(0.65_0.22_35/0.5)] transition-colors"
              />
              <Button
                onClick={handleComment}
                disabled={!comment.trim() || addComment.isPending}
                className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white px-3"
              >
                <Send size={14} />
              </Button>
            </div>

            {/* Quick Starters */}
            <button
              onClick={() => setShowTrashTalk(!showTrashTalk)}
              className="text-xs text-white/40 hover:text-white/60 mb-3 transition-colors"
            >
              {showTrashTalk ? "Hide" : "Show"} quick starters ⚡
            </button>
            {showTrashTalk && (
              <div className="space-y-1 mb-4">
                {TRASH_TALK_STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setComment(s)}
                    className="w-full text-left text-xs px-3 py-1.5 rounded-lg bg-white/3 border border-white/5 text-white/50 hover:text-white hover:border-white/15 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-white/20">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No trash talk yet. Be the first! 🔥</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[oklch(0.65_0.22_35/0.5)] to-[oklch(0.55_0.2_250/0.5)] flex items-center justify-center text-xs font-bold text-white">
                        {(c.userName ?? "?")[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white/70">{c.userName ?? "Anonymous"}</span>
                      <span className="text-xs text-white/30 ml-auto">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/80">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Points Guide */}
          <div className="p-4 rounded-xl bg-[oklch(0.14_0.015_260)] border border-white/10">
            <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Zap size={14} className="text-[oklch(0.78_0.18_80)]" />
              Points System
            </h4>
            <div className="space-y-1.5 text-xs">
              {[
                ["Round of 64", "10 pts"],
                ["Round of 32", "20 pts"],
                ["Sweet 16", "40 pts"],
                ["Elite Eight", "80 pts"],
                ["Final Four", "160 pts"],
                ["Championship", "320 pts"],
                ["Upset Bonus", "1.5x multiplier 🔥"],
              ].map(([round, pts]) => (
                <div key={round} className="flex justify-between">
                  <span className="text-white/50">{round}</span>
                  <span className="text-[oklch(0.65_0.22_35)] font-bold">{pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
