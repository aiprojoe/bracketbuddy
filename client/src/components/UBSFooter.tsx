export default function UBSFooter() {
  return (
    <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
        <span>
          &copy; {new Date().getFullYear()} BracketBuddy &mdash; 2026 NCAA Tournament
        </span>
        <a
          href="https://www.unrivaledbusinesssolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60 transition-colors duration-200 tracking-wide uppercase font-medium"
        >
          Powered by Unrivaled Business Solutions
        </a>
      </div>
    </footer>
  );
}
