import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Trophy, BarChart2, User, Home, Menu, X } from "lucide-react";
import { useState } from "react";

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/bracket", label: "My Bracket", icon: BarChart2 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[oklch(0.1_0.01_260/0.95)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl">🏀</span>
          <div>
            <span className="font-display text-2xl text-white tracking-wider">BRACKET</span>
            <span className="font-display text-2xl text-[oklch(0.65_0.22_35)] tracking-wider">BUDDY</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location === href
                  ? "bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.3)]"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{user?.name}</div>
                <div className="text-xs text-white/50">{user?.totalPoints ?? 0} pts</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40 bg-transparent"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold"
            >
              Sign In to Play
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white/70 hover:text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[oklch(0.12_0.01_260)] px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                location === href
                  ? "bg-[oklch(0.65_0.22_35/0.2)] text-[oklch(0.65_0.22_35)]"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10">
            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full border-white/20 text-white/70 bg-transparent"
              >
                Logout
              </Button>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="w-full bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white font-bold"
              >
                Sign In to Play
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
