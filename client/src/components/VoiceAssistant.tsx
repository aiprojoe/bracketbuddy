/**
 * VoiceAssistant - Cost-Efficient VAPI Integration
 *
 * Architecture to minimize VAPI costs:
 * 1. Push-to-talk only — VAPI session only starts when user holds the mic button
 * 2. Hard 30-second max per session — auto-disconnects after response
 * 3. All AI analysis/chat routes through built-in LLM (free) — VAPI handles STT+TTS only
 * 4. Text chat fallback is unlimited and free
 * 5. Session ends immediately after assistant finishes speaking
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, MessageSquare, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const MAX_SESSION_SECONDS = 30;
const VOICE_COOLDOWN_MS = 3000; // 3s between sessions

export default function VoiceAssistant() {
  const [mode, setMode] = useState<"collapsed" | "text" | "voice">("collapsed");
  const [isVapiActive, setIsVapiActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [canStartVoice, setCanStartVoice] = useState(true);

  const vapiRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeMutation = trpc.ai.analyzeBracket.useMutation({
    onSuccess: (data) => {
      const text = typeof data.analysis === "string" ? data.analysis : String(data.analysis);
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, couldn't get AI analysis right now. Try again!" }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVapiSession();
      if (timerRef.current) clearInterval(timerRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const stopVapiSession = useCallback(() => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch {}
      vapiRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsVapiActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setSessionSeconds(0);
    setIsConnecting(false);
    // Cooldown to prevent rapid re-connections
    setCanStartVoice(false);
    cooldownRef.current = setTimeout(() => setCanStartVoice(true), VOICE_COOLDOWN_MS);
  }, []);

  const startVapiSession = useCallback(async () => {
    const vapiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (!vapiKey) {
      toast.error("VAPI key not configured. Use text chat below for free AI analysis!");
      return;
    }
    if (!canStartVoice || isConnecting || isVapiActive) return;

    setIsConnecting(true);
    setMode("voice");

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(vapiKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setIsVapiActive(true);
        setIsListening(true);
        setIsConnecting(false);
        setSessionSeconds(0);
        // Start the 30-second countdown
        timerRef.current = setInterval(() => {
          setSessionSeconds((s) => {
            if (s >= MAX_SESSION_SECONDS - 1) {
              stopVapiSession();
              return 0;
            }
            return s + 1;
          });
        }, 1000);
      });

      vapi.on("call-end", () => stopVapiSession());
      vapi.on("speech-start", () => { setIsSpeaking(true); setIsListening(false); });
      vapi.on("speech-end", () => {
        setIsSpeaking(false);
        // Auto-disconnect after assistant finishes speaking to save costs
        setTimeout(() => stopVapiSession(), 500);
      });

      vapi.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          if (msg.role === "user") {
            setMessages((prev) => [...prev, { role: "user", text: msg.transcript }]);
          } else if (msg.role === "assistant") {
            setMessages((prev) => [...prev, { role: "assistant", text: msg.transcript }]);
          }
        }
      });

      vapi.on("error", (e: any) => {
        console.error("VAPI error:", e);
        stopVapiSession();
        toast.error("Voice connection failed. Use text chat instead!");
      });

      await vapi.start({
        name: "Bracket Buddy",
        voice: { provider: "11labs", voiceId: "rachel" },
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `You are Bracket Buddy, a fun March Madness AI assistant! Keep responses SHORT (under 20 words) because this is a quick voice interaction. Give one specific, confident pick or tip. Be energetic and fun! Say your answer then say "Good luck!" to end the call.`,
          }],
        },
        firstMessage: "Bracket Buddy here! Quick pick or tip?",
        endCallMessage: "Good luck!",
        maxDurationSeconds: MAX_SESSION_SECONDS,
        silenceTimeoutSeconds: 8,
      } as any);

    } catch (err) {
      console.error("VAPI start failed:", err);
      stopVapiSession();
      toast.error("Couldn't start voice. Use text chat for free AI analysis!");
    }
  }, [canStartVoice, isConnecting, isVapiActive, stopVapiSession]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setTextInput("");
    analyzeMutation.mutate({ question: q });
  };

  const timeRemaining = MAX_SESSION_SECONDS - sessionSeconds;
  const hasVapiKey = !!import.meta.env.VITE_VAPI_PUBLIC_KEY;

  return (
    <div className="rounded-2xl border border-white/10 bg-[oklch(0.12_0.01_260)] overflow-hidden">
      {/* Header Toggle */}
      <button
        onClick={() => setMode(mode === "collapsed" ? "text" : "collapsed")}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.22_35/0.3)] to-[oklch(0.55_0.2_250/0.3)] flex items-center justify-center">
            <span className="text-base">🏀</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-white text-sm">AI Bracket Assistant</div>
            <div className="text-xs text-white/40">
              {hasVapiKey ? "Text chat (free) + Voice (30s max)" : "Text chat · unlimited & free"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasVapiKey && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.65_0.22_35/0.15)] text-[oklch(0.65_0.22_35)] border border-[oklch(0.65_0.22_35/0.3)]">
              VOICE
            </span>
          )}
          {mode === "collapsed" ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
        </div>
      </button>

      {mode !== "collapsed" && (
        <div className="border-t border-white/8">
          {/* Mode Tabs */}
          <div className="flex border-b border-white/8">
            <button
              onClick={() => setMode("text")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                mode === "text"
                  ? "text-[oklch(0.55_0.2_250)] border-b-2 border-[oklch(0.55_0.2_250)]"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <MessageSquare size={12} />
              Text Chat (Free)
            </button>
            {hasVapiKey && (
              <button
                onClick={() => setMode("voice")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "voice"
                    ? "text-[oklch(0.65_0.22_35)] border-b-2 border-[oklch(0.65_0.22_35)]"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <Mic size={12} />
                Voice (30s)
              </button>
            )}
          </div>

          {/* Message History */}
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                      🏀
                    </div>
                  )}
                  <div
                    className={`max-w-xs px-3 py-1.5 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[oklch(0.55_0.2_250/0.15)] text-white border border-[oklch(0.55_0.2_250/0.2)]"
                        : "bg-[oklch(0.65_0.22_35/0.1)] text-white/90 border border-[oklch(0.65_0.22_35/0.15)]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {analyzeMutation.isPending && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-[oklch(0.65_0.22_35/0.2)] flex items-center justify-center flex-shrink-0 text-xs">🏀</div>
                  <div className="px-3 py-1.5 rounded-xl bg-[oklch(0.65_0.22_35/0.1)] border border-[oklch(0.65_0.22_35/0.15)] flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-[oklch(0.65_0.22_35)]" />
                    <span className="text-xs text-white/50">Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* TEXT MODE */}
          {mode === "text" && (
            <div className="p-3 space-y-3">
              {messages.length === 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "Top 3 upset picks 💥",
                    "Cinderella teams? 🪄",
                    "Best Final Four picks 🏆",
                    "Who wins it all? 👑",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setMessages((prev) => [...prev, { role: "user", text: q }]);
                        analyzeMutation.mutate({ question: q });
                      }}
                      disabled={analyzeMutation.isPending}
                      className="text-left px-2.5 py-2 rounded-lg bg-white/4 border border-white/8 text-xs text-white/60 hover:text-white hover:border-white/15 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  placeholder="Ask about any team or matchup..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[oklch(0.55_0.2_250/0.4)] transition-colors"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || analyzeMutation.isPending}
                  className="px-3 py-2 rounded-xl bg-[oklch(0.55_0.2_250)] hover:bg-[oklch(0.62_0.22_250)] disabled:opacity-40 text-white transition-colors"
                >
                  <Zap size={14} />
                </button>
              </div>
            </div>
          )}

          {/* VOICE MODE */}
          {mode === "voice" && hasVapiKey && (
            <div className="p-4 text-center space-y-3">
              {/* Cost Warning */}
              <div className="text-xs text-[oklch(0.78_0.18_80/0.8)] bg-[oklch(0.78_0.18_80/0.08)] border border-[oklch(0.78_0.18_80/0.2)] rounded-lg px-3 py-2">
                ⚡ Voice uses AI credits · Max 30 seconds · Text chat is free & unlimited
              </div>

              {/* Big Mic Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={isVapiActive ? stopVapiSession : startVapiSession}
                  disabled={isConnecting || (!canStartVoice && !isVapiActive)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isVapiActive
                      ? "bg-[oklch(0.65_0.22_35)] voice-active"
                      : isConnecting
                      ? "bg-[oklch(0.65_0.22_35/0.3)]"
                      : canStartVoice
                      ? "bg-[oklch(0.65_0.22_35/0.2)] border-2 border-[oklch(0.65_0.22_35/0.5)] hover:bg-[oklch(0.65_0.22_35/0.35)]"
                      : "bg-white/5 border-2 border-white/10 cursor-not-allowed"
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 size={24} className="text-white animate-spin" />
                  ) : isVapiActive ? (
                    <MicOff size={24} className="text-white" />
                  ) : (
                    <Mic size={24} className={canStartVoice ? "text-[oklch(0.65_0.22_35)]" : "text-white/20"} />
                  )}
                </button>

                <div className="text-sm font-semibold text-white">
                  {isConnecting
                    ? "Connecting..."
                    : isVapiActive
                    ? isSpeaking
                      ? "Buddy is answering..."
                      : isListening
                      ? "Listening... speak now!"
                      : "Connected"
                    : canStartVoice
                    ? "Tap for quick voice pick"
                    : "Cooling down..."}
                </div>

                {/* Timer */}
                {isVapiActive && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[oklch(0.65_0.22_35)] rounded-full transition-all"
                        style={{ width: `${((MAX_SESSION_SECONDS - sessionSeconds) / MAX_SESSION_SECONDS) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50">{timeRemaining}s</span>
                  </div>
                )}

                {/* Speaking animation */}
                {isSpeaking && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 3, 2].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[oklch(0.65_0.22_35)] rounded-full animate-bounce"
                        style={{ height: `${h * 4}px`, animationDelay: `${i * 0.08}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-white/30">
                Say: "Who should I pick?" or "Give me an upset" · Auto-ends after response
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
