import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { Link } from "wouter";
import { Trophy, Mic, Zap, Share2, Star, BarChart2, ChevronRight, Crown } from "lucide-react";

const features = [
  {
    icon: BarChart2,
    color: "text-[oklch(0.65_0.22_35)]",
    bg: "bg-[oklch(0.65_0.22_35/0.1)]",
    title: "68-Team Bracket Builder",
    desc: "Click to pick winners through every round — First Four to Championship. Track your progress in real-time.",
  },
  {
    icon: Mic,
    color: "text-[oklch(0.55_0.2_250)]",
    bg: "bg-[oklch(0.55_0.2_250/0.1)]",
    title: "Voice AI Assistant",
    desc: "Say 'I pick Duke over Kentucky' and watch your bracket fill itself. Get AI-powered predictions on demand.",
  },
  {
    icon: Zap,
    color: "text-[oklch(0.78_0.18_80)]",
    bg: "bg-[oklch(0.78_0.18_80/0.1)]",
    title: "Gamified Points & Badges",
    desc: "Earn bonus points for upsets, unlock achievements like 'Upset King' and 'March Oracle'. Pure bragging rights.",
  },
  {
    icon: Trophy,
    color: "text-[oklch(0.58_0.18_145)]",
    bg: "bg-[oklch(0.58_0.18_145/0.1)]",
    title: "Live Leaderboard",
    desc: "Compete publicly, trash-talk your rivals, and climb the rankings. Who's the real bracket genius?",
  },
  {
    icon: Share2,
    color: "text-[oklch(0.5_0.2_290)]",
    bg: "bg-[oklch(0.5_0.2_290/0.1)]",
    title: "Shareable Bracket Cards",
    desc: "Generate viral-worthy bracket cards for Twitter, Instagram & TikTok. Show off your picks to the world.",
  },
  {
    icon: Star,
    color: "text-[oklch(0.65_0.22_25)]",
    bg: "bg-[oklch(0.65_0.22_25/0.1)]",
    title: "AI Upset Predictions",
    desc: "Our AI analyzes team stats and tournament history to surface Cinderella picks and bold upset calls.",
  },
];

const achievements = [
  { icon: "👑", name: "Upset King", rarity: "epic", desc: "Call 10 upsets correctly" },
  { icon: "🪄", name: "Cinderella Story", rarity: "legendary", desc: "Low seed to Final Four" },
  { icon: "🌟", name: "Perfect Round", rarity: "epic", desc: "Go perfect in any round" },
  { icon: "🔮", name: "March Oracle", rarity: "legendary", desc: "Top 10 on leaderboard" },
  { icon: "💥", name: "Bracket Buster", rarity: "rare", desc: "Bust 5 other brackets" },
  { icon: "🎤", name: "Voice Commander", rarity: "rare", desc: "10 voice picks made" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_260)] text-white">
      <NavBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.22_35/0.08)] via-transparent to-[oklch(0.55_0.2_250/0.06)]" />
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-[oklch(0.65_0.22_35/0.04)] blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-[oklch(0.55_0.2_250/0.04)] blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.65_0.22_35/0.15)] border border-[oklch(0.65_0.22_35/0.3)] text-[oklch(0.65_0.22_35)] text-sm font-semibold mb-8">
            <span className="animate-pulse">🏀</span>
            2026 March Madness is HERE
          </div>

          {/* Headline */}
          <h1 className="font-display text-7xl md:text-9xl text-white mb-4 leading-none">
            BRACKET
            <span className="text-[oklch(0.65_0.22_35)]"> BUDDY</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 mb-4 font-condensed font-semibold tracking-wide uppercase">
            The AI-Powered March Madness Experience
          </p>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-10">
            Fill your bracket by voice, get AI-powered upset picks, earn badges, and compete for pure bragging rights on the public leaderboard.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link href="/bracket">
                <Button
                  size="lg"
                  className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-lg px-8 py-6 rounded-xl glow-orange"
                >
                  Build My Bracket <ChevronRight className="ml-1" size={20} />
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-lg px-8 py-6 rounded-xl glow-orange"
              >
                Start Your Bracket Free <ChevronRight className="ml-1" size={20} />
              </Button>
            )}
            <Link href="/leaderboard">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 text-lg px-8 py-6 rounded-xl bg-transparent"
              >
                <Trophy size={18} className="mr-2 text-[oklch(0.78_0.18_80)]" />
                View Leaderboard
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-center">
            {[
              { value: "68", label: "Teams" },
              { value: "7", label: "Rounds" },
              { value: "15", label: "Achievements" },
              { value: "∞", label: "Bragging Rights" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="font-display text-4xl text-[oklch(0.65_0.22_35)]">{value}</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-condensed">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-5xl text-white mb-3">WHY BRACKET BUDDY?</h2>
          <p className="text-white/50 text-lg">Everything you need to dominate March Madness</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-white/10 bg-[oklch(0.14_0.015_260)] hover:border-white/20 transition-all hover:bg-[oklch(0.16_0.015_260)] group"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={22} className={color} />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Achievements Preview */}
      <section className="bg-[oklch(0.12_0.01_260)] py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-5xl text-white mb-3">EARN EPIC BADGES</h2>
            <p className="text-white/50 text-lg">Unlock achievements and flex your bracket mastery</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {achievements.map(({ icon, name, rarity, desc }) => (
              <div
                key={name}
                className={`p-4 rounded-2xl border text-center ${rarity}-bg transition-all hover:scale-105`}
              >
                <div className="text-4xl mb-2">{icon}</div>
                <div className={`font-bold text-sm rarity-${rarity} mb-1`}>{name}</div>
                <div className="text-white/40 text-xs">{desc}</div>
                <div className={`text-xs font-condensed uppercase tracking-wider mt-2 rarity-${rarity}`}>
                  {rarity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice AI Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.55_0.2_250/0.15)] border border-[oklch(0.55_0.2_250/0.3)] text-[oklch(0.55_0.2_250)] text-sm font-semibold mb-6">
              <Mic size={14} />
              Powered by VAPI Voice AI
            </div>
            <h2 className="font-display text-5xl text-white mb-4">FILL YOUR BRACKET BY VOICE</h2>
            <p className="text-white/60 text-lg mb-6 leading-relaxed">
              Just talk to Bracket Buddy. Say "I pick Duke over Kentucky" or ask "Who should I pick in the West region?" and our AI voice assistant will fill your bracket and give expert analysis.
            </p>
            <div className="space-y-3">
              {[
                '"I pick Arizona to win the whole thing"',
                '"Give me your best upset picks"',
                '"Who are the Cinderella teams this year?"',
                '"Fill my Final Four with your recommendations"',
              ].map((quote) => (
                <div key={quote} className="flex items-center gap-3 text-white/60 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[oklch(0.55_0.2_250)] flex-shrink-0" />
                  <span className="italic">{quote}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-[oklch(0.65_0.22_35/0.1)] border-2 border-[oklch(0.65_0.22_35/0.3)] flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-2 border-[oklch(0.65_0.22_35/0.2)] animate-ping" />
              <Mic size={64} className="text-[oklch(0.65_0.22_35)]" />
            </div>
            <div className="absolute top-4 right-8 bg-[oklch(0.14_0.015_260)] border border-white/10 rounded-xl p-3 text-sm text-white/70 max-w-40">
              "I pick Duke over Kentucky!" 🏀
            </div>
            <div className="absolute bottom-4 left-4 bg-[oklch(0.14_0.015_260)] border border-[oklch(0.65_0.22_35/0.3)] rounded-xl p-3 text-sm text-[oklch(0.65_0.22_35)] max-w-44">
              ✅ Duke advances to Round 2!
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[oklch(0.65_0.22_35/0.15)] to-[oklch(0.55_0.2_250/0.1)] border-y border-white/10 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Crown size={48} className="text-[oklch(0.78_0.18_80)] mx-auto mb-6" />
          <h2 className="font-display text-6xl text-white mb-4">READY TO DOMINATE?</h2>
          <p className="text-white/60 text-xl mb-8">
            Selection Sunday is March 15. Get your bracket ready and show the world who the real March Madness oracle is.
          </p>
          {isAuthenticated ? (
            <Link href="/bracket">
              <Button
                size="lg"
                className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-xl px-10 py-7 rounded-xl glow-orange"
              >
                Build My Bracket Now 🏀
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold text-xl px-10 py-7 rounded-xl glow-orange"
            >
              Sign In & Build My Bracket 🏀
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">🏀</span>
          <span className="font-display text-lg text-white/50">BRACKETBUDDY</span>
        </div>
        <p>2026 March Madness · No money involved · Pure bragging rights</p>
      </footer>
    </div>
  );
}
