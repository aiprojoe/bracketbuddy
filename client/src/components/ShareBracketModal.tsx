import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Share2,
  Twitter,
  Facebook,
  Link2,
  Check,
  Trophy,
  Flame,
  Smartphone,
} from "lucide-react";

interface ShareBracketModalProps {
  open: boolean;
  onClose: () => void;
  bracketId?: number;
  shareToken?: string;
  userName?: string;
  championPick?: string;
  totalPoints?: number;
  completionPct?: number;
}

export default function ShareBracketModal({
  open,
  onClose,
  bracketId,
  shareToken,
  userName = "A BracketBuddy player",
  championPick,
  totalPoints = 0,
  completionPct = 0,
}: ShareBracketModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : window.location.href;

  const shareText = championPick
    ? `🏀 I'm picking ${championPick} to win it all in #MarchMadness! I've got ${totalPoints} pts on @BracketBuddy — can you beat me? Fill your bracket FREE with AI picks 👇`
    : `🏀 I just filled out my #MarchMadness bracket on BracketBuddy — AI-powered picks, voice bracket filling, and bragging rights! Can you beat me? 👇`;

  const fullShareText = `${shareText}\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied! 🔗 Share it everywhere!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy — try manually selecting the URL");
    }
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    toast.success("Opening Twitter/X... 🐦");
  };

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    toast.success("Opening Facebook... 👍");
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "My BracketBuddy Bracket 🏀",
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // User cancelled — no error needed
    }
  };

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Share2 className="w-5 h-5 text-orange-400" />
            Share Your Bracket
          </DialogTitle>
        </DialogHeader>

        {/* Bracket preview card */}
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-900/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-white/50">2026 March Madness Bracket</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-orange-400">{totalPoints} pts</p>
              <p className="text-xs text-white/40">{completionPct}% complete</p>
            </div>
          </div>

          {championPick && (
            <div className="flex items-center gap-2 bg-orange-500/10 rounded-lg px-3 py-2 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-sm text-white/80">
                Champion pick: <span className="font-bold text-orange-300">{championPick}</span>
              </p>
            </div>
          )}

          <p className="text-xs text-white/40 italic leading-relaxed">
            "{shareText.replace(`\n${shareUrl}`, "")}"
          </p>
        </div>

        {/* Share buttons */}
        <div className="space-y-3">
          {/* Twitter/X */}
          <Button
            onClick={handleTwitter}
            className="w-full bg-black hover:bg-zinc-800 border border-white/20 text-white font-semibold gap-2 h-11"
          >
            <Twitter className="w-4 h-4" />
            Share on Twitter / X
          </Button>

          {/* Facebook */}
          <Button
            onClick={handleFacebook}
            className="w-full bg-[#1877F2] hover:bg-[#1565C0] text-white font-semibold gap-2 h-11"
          >
            <Facebook className="w-4 h-4" />
            Share on Facebook
          </Button>

          {/* Native share (mobile) */}
          {supportsNativeShare && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 font-semibold gap-2 h-11 bg-transparent"
            >
              <Smartphone className="w-4 h-4" />
              Share via Phone / More Apps
            </Button>
          )}

          {/* Copy link */}
          <Button
            onClick={handleCopy}
            variant="outline"
            className="w-full border-orange-500/40 text-orange-300 hover:bg-orange-500/10 font-semibold gap-2 h-11 bg-transparent"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Copy Bracket Link
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-white/25">
          Anyone with the link can view your bracket
        </p>
      </DialogContent>
    </Dialog>
  );
}
