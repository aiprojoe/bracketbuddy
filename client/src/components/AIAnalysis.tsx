import { useState } from "react";
import { X, Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface AIAnalysisProps {
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "Give me your top 3 upset picks 💥",
  "Who are the Cinderella teams this year? 🪄",
  "Which 1-seeds are most vulnerable? 😬",
  "Best Final Four predictions 🏆",
  "Which conference is the strongest? 💪",
  "Who should I pick to win it all? 👑",
];

export default function AIAnalysis({ onClose }: AIAnalysisProps) {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  const analyzeMutation = trpc.ai.analyzeBracket.useMutation({
    onSuccess: (data) => {
      const text = typeof data.analysis === 'string' ? data.analysis : String(data.analysis);
      if (question) {
        setHistory((prev) => [...prev, { q: question, a: text }]);
        setQuestion("");
      }
      setAnalysis(text);
    },
  });

  const handleAsk = (q?: string) => {
    const finalQ = q ?? question;
    if (!finalQ.trim() && !q) return;
    analyzeMutation.mutate({ question: finalQ || undefined });
    if (q) setHistory((prev) => [...prev, { q: finalQ, a: "" }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[oklch(0.14_0.015_260)] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[oklch(0.55_0.2_250/0.1)] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.55_0.2_250/0.2)] flex items-center justify-center">
              <Sparkles size={18} className="text-[oklch(0.55_0.2_250)]" />
            </div>
            <div>
              <h3 className="font-bold text-white">AI Bracket Analysis</h3>
              <p className="text-xs text-white/40">Powered by Bracket Buddy AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Quick Questions */}
          {history.length === 0 && !analysis && (
            <div>
              <p className="text-sm text-white/50 mb-3">Ask me anything about the 2026 tournament:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    disabled={analyzeMutation.isPending}
                    className="text-left px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:border-[oklch(0.55_0.2_250/0.4)] hover:bg-[oklch(0.55_0.2_250/0.08)] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          {history.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className="bg-[oklch(0.55_0.2_250/0.2)] border border-[oklch(0.55_0.2_250/0.3)] rounded-xl px-3 py-2 text-sm text-white max-w-xs">
                  {item.q}
                </div>
              </div>
              {item.a && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">🏀</span>
                  </div>
                  <div className="bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.2)] rounded-xl px-3 py-2 text-sm text-white/90 leading-relaxed flex-1">
                    {item.a}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {analyzeMutation.isPending && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🏀</span>
              </div>
              <div className="bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.2)] rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[oklch(0.65_0.22_35)]" />
                <span className="text-sm text-white/60">Analyzing the tournament...</span>
              </div>
            </div>
          )}

          {/* Initial Analysis */}
          {analysis && history.length === 0 && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">🏀</span>
              </div>
              <div className="bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.2)] rounded-xl px-3 py-2 text-sm text-white/90 leading-relaxed flex-1">
                {analysis}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask about any team, matchup, or prediction..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[oklch(0.55_0.2_250/0.5)] transition-colors"
            />
            <Button
              onClick={() => handleAsk()}
              disabled={!question.trim() || analyzeMutation.isPending}
              className="bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] text-white px-4"
            >
              {analyzeMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                setHistory([]);
                setAnalysis(null);
              }}
              className="text-xs text-white/30 hover:text-white/60 mt-2 transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
