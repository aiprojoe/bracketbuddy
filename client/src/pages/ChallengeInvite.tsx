import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { Swords, Trophy, CheckCircle2, Loader2, AlertCircle, UserCheck } from "lucide-react";

export default function ChallengeInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.challenge.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.challenge.accept.useMutation({
    onSuccess: (result) => {
      toast.success("⚔️ Challenge accepted! May the best bracket win!");
      navigate(`/challenge/${result.challengeId}/h2h`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

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
          <h1 className="font-display text-4xl text-white">Challenge Not Found</h1>
          <p className="text-white/50">This challenge link is invalid or has expired.</p>
          <Button onClick={() => navigate("/")} className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const { challenge, participants, challengerName } = data;
  const isChallenger = user?.id === challenge.challengerId;
  const alreadyParticipating = participants.some((p) => p.userId === user?.id);
  const isActive = challenge.status === "active";

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-[oklch(0.65_0.22_35/0.15)] border-2 border-[oklch(0.65_0.22_35/0.4)] flex items-center justify-center mx-auto mb-6">
            <Swords size={36} className="text-[oklch(0.65_0.22_35)]" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.65_0.22_35/0.15)] border border-[oklch(0.65_0.22_35/0.3)] text-[oklch(0.65_0.22_35)] text-sm font-semibold mb-4">
            ⚔️ Bracket Challenge
          </div>
          <h1 className="font-display text-5xl text-white mb-2">
            {challenge.title ?? "Bracket Challenge"}
          </h1>
          <p className="text-white/60 text-lg">
            <span className="text-[oklch(0.65_0.22_35)] font-bold">{challengerName}</span> is challenging you to a head-to-head bracket duel!
          </p>
        </div>

        {/* Challenge Card */}
        <div className="rounded-2xl border border-white/10 bg-[oklch(0.14_0.015_260)] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-white/40 uppercase tracking-wider font-semibold">Status</div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isActive
                ? "bg-[oklch(0.58_0.18_145/0.15)] text-[oklch(0.58_0.18_145)] border border-[oklch(0.58_0.18_145/0.3)]"
                : "bg-[oklch(0.78_0.18_80/0.15)] text-[oklch(0.78_0.18_80)] border border-[oklch(0.78_0.18_80/0.3)]"
            }`}>
              {isActive ? "⚡ Active" : "⏳ Waiting for opponent"}
            </span>
          </div>

          {/* Participants */}
          <div className="space-y-3 mb-6">
            <div className="text-sm text-white/40 uppercase tracking-wider font-semibold mb-3">Participants</div>
            {participants.map((p, i) => (
              <div key={p.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                <div className="w-9 h-9 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center text-sm font-bold text-[oklch(0.65_0.22_35)]">
                  {p.userName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{p.userName ?? "Anonymous"}</div>
                  <div className="text-xs text-white/40">{p.bracketName ?? "Bracket linked"}</div>
                </div>
                {i === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.65_0.22_35/0.15)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.3)]">
                    Challenger
                  </span>
                )}
                {i === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.55_0.2_250/0.15)] text-[oklch(0.55_0.2_250)] border border-[oklch(0.55_0.2_250/0.3)]">
                    Opponent
                  </span>
                )}
              </div>
            ))}
            {!isActive && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-dashed border-white/10">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                  ?
                </div>
                <div className="text-white/30 text-sm italic">Waiting for opponent...</div>
              </div>
            )}
          </div>

          {/* Points info */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
            {[
              { label: "Correct Pick", pts: "10–320 pts" },
              { label: "Upset Bonus", pts: "+50% pts" },
              { label: "Champion Pick", pts: "+320 pts" },
            ].map(({ label, pts }) => (
              <div key={label} className="text-center">
                <div className="text-[oklch(0.65_0.22_35)] font-bold text-sm">{pts}</div>
                <div className="text-white/40 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Area */}
        {isChallenger ? (
          <div className="text-center space-y-3">
            <div className="flex items-center gap-2 justify-center text-[oklch(0.58_0.18_145)] text-sm font-semibold">
              <CheckCircle2 size={16} />
              You created this challenge
            </div>
            <p className="text-white/40 text-sm">Share this link with a friend to start the duel!</p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Challenge link copied! 📋");
              }}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold w-full"
            >
              📋 Copy Challenge Link
            </Button>
            {isActive && (
              <Button
                onClick={() => navigate(`/challenge/${challenge.id}/h2h`)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 w-full bg-transparent"
              >
                <Trophy size={16} className="mr-2 text-[oklch(0.78_0.18_80)]" />
                View Head-to-Head
              </Button>
            )}
          </div>
        ) : alreadyParticipating ? (
          <div className="text-center space-y-3">
            <div className="flex items-center gap-2 justify-center text-[oklch(0.58_0.18_145)] text-sm font-semibold">
              <UserCheck size={16} />
              You've already joined this challenge!
            </div>
            <Button
              onClick={() => navigate(`/challenge/${challenge.id}/h2h`)}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold w-full"
            >
              <Trophy size={16} className="mr-2" />
              View Head-to-Head
            </Button>
          </div>
        ) : isActive && challenge.challengedId !== null ? (
          <div className="text-center space-y-3">
            <p className="text-white/50 text-sm">This challenge is already in progress between two players.</p>
            <Button
              onClick={() => navigate(`/challenge/${challenge.id}/h2h`)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 w-full bg-transparent"
            >
              Watch the Duel
            </Button>
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-3">
            <Button
              onClick={() => acceptMutation.mutate({ token: token ?? "" })}
              disabled={acceptMutation.isPending}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-lg py-6 w-full glow-orange"
            >
              {acceptMutation.isPending ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <Swords size={18} className="mr-2" />
              )}
              Accept the Challenge! ⚔️
            </Button>
            <p className="text-white/30 text-xs text-center">
              Your current bracket will be linked to this challenge.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-white/60 text-center mb-2">Sign in to accept this challenge!</p>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-lg py-6 w-full glow-orange"
            >
              Sign In & Accept Challenge ⚔️
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
