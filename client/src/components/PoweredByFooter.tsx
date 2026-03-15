import { ExternalLink, Zap } from "lucide-react";

export default function PoweredByFooter() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/40 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Powered by badge */}
        <a
          href="https://unrivaledbusinesssolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 text-white/50 hover:text-white/90 transition-colors duration-200"
          aria-label="Powered by Unrivaled Business Solutions"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-orange-500/20 border border-orange-500/30 group-hover:bg-orange-500/30 transition-colors">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
              Powered by
            </span>
            <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
              Unrivaled Business Solutions
            </span>
          </div>
        </a>

        {/* Center: Copyright */}
        <p className="text-xs text-white/25 order-last sm:order-none">
          © {new Date().getFullYear()} BracketBuddy · For entertainment only
        </p>

        {/* Right: CTA */}
        <a
          href="https://unrivaledbusinesssolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 text-xs font-medium text-orange-400/70 hover:text-orange-400 transition-colors duration-200 border border-orange-500/20 hover:border-orange-500/50 rounded-full px-3.5 py-1.5"
        >
          Want an app like this?
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </footer>
  );
}
