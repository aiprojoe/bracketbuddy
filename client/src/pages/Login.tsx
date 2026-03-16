/**
 * Unified Login Page
 * Three sign-in options:
 *  1. Google OAuth (existing)
 *  2. Email Magic Link (passwordless — sends a one-time link)
 *  3. Name + Email quick entry (instant sign-in, no verification)
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Mail, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

// Google "G" SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

type Mode = "choose" | "magic" | "quick";

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");

  // Name+Email quick sign-in state
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");

  // Magic link state
  const [magicName, setMagicName] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  // Error from URL params (magic link errors)
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "expired") setUrlError("That sign-in link has expired. Please request a new one.");
    else if (err === "used") setUrlError("That sign-in link has already been used. Please request a new one.");
    else if (err === "invalid") setUrlError("Invalid sign-in link. Please request a new one.");
    else if (err === "server") setUrlError("Something went wrong. Please try again.");
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("returnTo") ?? "/");
    }
  }, [isAuthenticated, loading, navigate]);

  const returnTo = new URLSearchParams(window.location.search).get("returnTo") ?? "/";

  // Quick sign-in mutation
  const emailSignIn = trpc.auth.emailSignIn.useMutation({
    onSuccess: () => {
      toast.success("Signed in! Welcome to BracketBuddy 🏀");
      window.location.href = returnTo;
    },
    onError: (err) => toast.error(err.message),
  });

  const handleQuickSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) { toast.error("Please enter your name"); return; }
    if (!quickEmail.trim() || !quickEmail.includes("@")) { toast.error("Please enter a valid email"); return; }
    emailSignIn.mutate({ name: quickName.trim(), email: quickEmail.trim() });
  };

  const handleMagicSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicName.trim()) { toast.error("Please enter your name"); return; }
    if (!magicEmail.trim() || !magicEmail.includes("@")) { toast.error("Please enter a valid email"); return; }
    setMagicLoading(true);
    try {
      const res = await fetch("/api/auth/magic-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: magicName.trim(), email: magicEmail.trim(), returnTo }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to send link");
      }
      setMagicSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setMagicLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.1_0.01_260)] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-xs font-bold tracking-[4px] text-[oklch(0.65_0.22_35)] mb-2">POWERED BY UNRIVALED BUSINESS SOLUTIONS</div>
        <div className="font-display text-5xl text-white leading-none">
          BRACKET<span className="text-[oklch(0.65_0.22_35)]">BUDDY</span>
        </div>
        <div className="text-xs tracking-[3px] text-white/40 mt-2">THE AI-POWERED MARCH MADNESS EXPERIENCE</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[oklch(0.14_0.015_260)] border border-white/10 rounded-2xl p-8 space-y-6">
        {urlError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {urlError}
          </div>
        )}

        {mode === "choose" && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Sign In</h1>
              <p className="text-white/50 text-sm mt-1">Choose how you'd like to sign in</p>
            </div>

            <div className="space-y-3">
              {/* Google */}
              <Button
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold flex items-center justify-center gap-3 h-12"
                onClick={() => { window.location.href = `/api/oauth/google?returnTo=${encodeURIComponent(returnTo)}`; }}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              {/* Magic Link */}
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/5 font-semibold flex items-center justify-center gap-3 h-12 bg-transparent"
                onClick={() => setMode("magic")}
              >
                <Mail size={18} />
                Sign in with Email Link
              </Button>

              {/* Quick Name+Email */}
              <Button
                variant="outline"
                className="w-full border-[oklch(0.65_0.22_35)]/40 text-[oklch(0.75_0.18_35)] hover:bg-[oklch(0.65_0.22_35)]/10 font-semibold flex items-center justify-center gap-3 h-12 bg-transparent"
                onClick={() => setMode("quick")}
              >
                <Zap size={18} />
                Quick Sign-In (Name + Email)
              </Button>
            </div>

            <p className="text-center text-white/30 text-xs">
              By signing in, you agree to participate in BracketBuddy 2026.
            </p>
          </>
        )}

        {mode === "magic" && !magicSent && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setMode("choose")} className="text-white/40 hover:text-white text-sm">← Back</button>
              <div>
                <h1 className="text-xl font-bold text-white">Email Sign-In Link</h1>
                <p className="text-white/50 text-xs mt-0.5">We'll email you a one-time sign-in link</p>
              </div>
            </div>
            <form onSubmit={handleMagicSend} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Your Name</Label>
                <Input
                  value={magicName}
                  onChange={(e) => setMagicName(e.target.value)}
                  placeholder="e.g. Joe Smith"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Email Address</Label>
                <Input
                  type="email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={magicLoading}
                className="w-full bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white font-bold h-11"
              >
                {magicLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                {magicLoading ? "Sending..." : "Send Sign-In Link"}
              </Button>
            </form>
          </>
        )}

        {mode === "magic" && magicSent && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 size={48} className="text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Check your inbox!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              We sent a sign-in link to <strong className="text-white">{magicEmail}</strong>.<br />
              Click the link in the email to sign in. It expires in 15 minutes.
            </p>
            <button
              onClick={() => { setMagicSent(false); setMagicEmail(""); setMagicName(""); }}
              className="text-[oklch(0.65_0.22_35)] text-sm hover:underline"
            >
              Send to a different email
            </button>
          </div>
        )}

        {mode === "quick" && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setMode("choose")} className="text-white/40 hover:text-white text-sm">← Back</button>
              <div>
                <h1 className="text-xl font-bold text-white">Quick Sign-In</h1>
                <p className="text-white/50 text-xs mt-0.5">Enter your name and email to get started instantly</p>
              </div>
            </div>
            <form onSubmit={handleQuickSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Your Name</Label>
                <Input
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Joe Smith"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Email Address</Label>
                <Input
                  type="email"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={emailSignIn.isPending}
                className="w-full bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold h-11"
              >
                {emailSignIn.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
                {emailSignIn.isPending ? "Signing in..." : "Sign In & Build My Bracket"}
              </Button>
            </form>
            <p className="text-white/30 text-xs text-center">
              No password needed. We'll remember you on this device.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
