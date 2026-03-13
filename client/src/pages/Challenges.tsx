import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Swords, Plus, Trophy, Copy, Loader2, ChevronRight } from "lucide-react";

export default function Challenges() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: challenges, isLoading, refetch } = trpc.challenge.getMyChallenges.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.challenge.create.useMutation({
    onSuccess: (data) => {
      const inviteUrl = `${window.location.origin}/challenge/invite/${data.inviteToken}`;
      navigator.clipboard.writeText(inviteUrl);
      toast.success("🎉 Challenge created! Invite link copied to clipboard!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[oklch(0.65_0.22_35)]" size={40} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <Swords size={48} className="text-[oklch(0.65_0.22_35)]" />
          <h1 className="font-display text-4xl">Bracket Challenges</h1>
          <p className="text-white/50">Sign in to challenge your friends to head-to-head bracket duels!</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold"
          >
            Sign In to Challenge Friends
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-white">My Challenges</h1>
            <p className="text-white/50 mt-1">Head-to-head bracket duels</p>
          </div>
          <Button
            onClick={() => createMutation.mutate({})}
            disabled={createMutation.isPending}
            className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            New Challenge
          </Button>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-[oklch(0.55_0.2_250/0.2)] bg-[oklch(0.55_0.2_250/0.05)] p-5 mb-8">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Swords size={16} className="text-[oklch(0.55_0.2_250)]" />
            How Bracket Challenges Work
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { step: "1", title: "Create a Challenge", desc: "Click 'New Challenge' to generate a unique invite link" },
              { step: "2", title: "Share the Link", desc: "Send the link to a friend via text, Twitter, or Discord" },
              { step: "3", title: "Compare Picks", desc: "See every pick side-by-side and track who's winning!" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[oklch(0.55_0.2_250/0.2)] border border-[oklch(0.55_0.2_250/0.3)] flex items-center justify-center text-[oklch(0.55_0.2_250)] font-bold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-white/40 text-xs mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Challenges List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[oklch(0.65_0.22_35)]" size={32} />
          </div>
        ) : challenges && challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.map((c) => {
              const isChallenger = c.challengerId === user?.id;
              const opponent = c.participants.find((p) => p.userId !== user?.id);
              const myParticipant = c.participants.find((p) => p.userId === user?.id);
              const inviteUrl = `${window.location.origin}/challenge/invite/${c.inviteToken}`;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-[oklch(0.14_0.015_260)] p-5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        c.status === "active"
                          ? "bg-[oklch(0.58_0.18_145/0.15)] border border-[oklch(0.58_0.18_145/0.3)]"
                          : "bg-[oklch(0.78_0.18_80/0.15)] border border-[oklch(0.78_0.18_80/0.3)]"
                      }`}>
                        <Swords size={18} className={c.status === "active" ? "text-[oklch(0.58_0.18_145)]" : "text-[oklch(0.78_0.18_80)]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{c.title ?? "Bracket Challenge"}</div>
                        <div className="text-sm text-white/50 mt-0.5">
                          {c.status === "active" && opponent
                            ? `vs ${opponent.userName ?? "Opponent"}`
                            : isChallenger
                            ? "Waiting for opponent to accept"
                            : "You accepted this challenge"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        c.status === "active"
                          ? "bg-[oklch(0.58_0.18_145/0.15)] text-[oklch(0.58_0.18_145)] border border-[oklch(0.58_0.18_145/0.3)]"
                          : "bg-[oklch(0.78_0.18_80/0.15)] text-[oklch(0.78_0.18_80)] border border-[oklch(0.78_0.18_80/0.3)]"
                      }`}>
                        {c.status === "active" ? "Active" : "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Score preview if active */}
                  {c.status === "active" && c.participants.length >= 2 && (
                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
                      {c.participants.slice(0, 2).map((p, i) => (
                        <div key={p.userId} className={`text-center ${i === 1 ? "col-start-3" : ""}`}>
                          <div className="text-xs text-white/40 truncate">{p.userName ?? "Player"}</div>
                          <div className={`font-display text-2xl font-bold ${i === 0 ? "text-[oklch(0.65_0.22_35)]" : "text-[oklch(0.55_0.2_250)]"}`}>
                            {p.score ?? 0}
                          </div>
                          <div className="text-xs text-white/30">pts</div>
                        </div>
                      ))}
                      <div className="text-center flex items-center justify-center">
                        <span className="text-white/20 font-display text-sm">VS</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    {c.status === "active" ? (
                      <Button
                        onClick={() => navigate(`/challenge/${c.id}/h2h`)}
                        size="sm"
                        className="flex-1 bg-[oklch(0.65_0.22_35/0.15)] hover:bg-[oklch(0.65_0.22_35/0.25)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.3)] text-xs"
                      >
                        <Trophy size={12} className="mr-1.5" />
                        View H2H
                        <ChevronRight size={12} className="ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteUrl);
                          toast.success("Invite link copied! 📋");
                        }}
                        size="sm"
                        className="flex-1 bg-[oklch(0.78_0.18_80/0.1)] hover:bg-[oklch(0.78_0.18_80/0.2)] text-[oklch(0.78_0.18_80)] border border-[oklch(0.78_0.18_80/0.3)] text-xs"
                      >
                        <Copy size={12} className="mr-1.5" />
                        Copy Invite Link
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        toast.success("Invite link copied! 📋");
                      }}
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/50 hover:text-white hover:border-white/20 bg-transparent text-xs"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
            <Swords size={48} className="mx-auto mb-4 text-white/15" />
            <h3 className="font-display text-2xl text-white/40 mb-2">No Challenges Yet</h3>
            <p className="text-white/30 text-sm mb-6 max-w-xs mx-auto">
              Create your first challenge and send the link to a friend. May the best bracket win!
            </p>
            <Button
              onClick={() => createMutation.mutate({})}
              disabled={createMutation.isPending}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold"
            >
              {createMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Create My First Challenge
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
