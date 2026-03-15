/**
 * VoiceAssistant - 100% Free Voice AI using Web Speech API
 *
 * Architecture:
 * 1. Browser's built-in SpeechRecognition API handles voice-to-text (zero cost)
 * 2. Transcript sent to ai.parseVoicePick — LLM detects if it's a bracket pick
 * 3. If pick detected: calls onPickByVoice(teamId) to update bracket + shows confirmation
 * 4. If not a pick: falls back to ai.chat for general AI advice
 * 5. Text chat fallback for unsupported browsers
 * 6. Zero external API dependencies, zero per-minute costs
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Mic, MicOff, X, Loader2, AlertCircle, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Web Speech API types (not in all TS lib versions)
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultList {
  [index: number]: { [index: number]: SpeechRecognitionResultItem; isFinal: boolean; length: number };
  length: number;
}
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface Message {
  role: "user" | "assistant";
  text: string;
  isPick?: boolean;
}

type AssistantState = "idle" | "listening" | "processing";

const EXAMPLE_VOICE_PROMPTS = [
  "I pick Duke over Kentucky",
  "Take Arizona to win it all",
  "Give me your best upset pick",
  "Who are the Cinderella teams?",
];

const EXAMPLE_TEXT_PROMPTS = [
  "Top 3 upset picks 💥",
  "Cinderella teams? 🪄",
  "Best Final Four picks 🏆",
  "Who wins it all? 👑",
];

interface VoiceAssistantProps {
  /** Called when the AI detects a bracket pick in the user's speech. Pass the teamId to update the bracket. */
  onPickByVoice?: (teamId: number, teamName: string) => void;
  /** When true, programmatically open the panel (e.g. from header button). */
  forceOpen?: boolean;
  /** Called after forceOpen is handled so parent can reset the flag. */
  onForceOpenHandled?: () => void;
}

export default function VoiceAssistant({ onPickByVoice, forceOpen, onForceOpenHandled }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [state, setState] = useState<AssistantState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutation: parse voice for pick intent first
  const parsePickMutation = trpc.ai.parseVoicePick.useMutation({
    onSuccess: (data) => {
      if (data.isPick) {
        // It's a bracket pick — update the bracket!
        const confirmMsg = data.confirmMessage;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: confirmMsg, isPick: true },
        ]);
        setState("idle");
        setLiveTranscript("");
        // Fire the callback to update the bracket
        if (onPickByVoice) {
          onPickByVoice(data.teamId, data.teamName);
        }
        toast.success(`🏀 ${data.teamName} picked by voice!`, {
          description: confirmMsg,
          duration: 4000,
        });
      } else {
        // Not a pick — show AI advice
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.response },
        ]);
        setState("idle");
        setLiveTranscript("");
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, couldn't process that. Try again or use text chat!" },
      ]);
      setState("idle");
    },
  });

  // Mutation: text chat (general AI advice, no pick detection)
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const text = typeof data.response === "string" ? data.response : String(data.response);
      setMessages((prev) => [...prev, { role: "assistant", text }]);
      setState("idle");
      setLiveTranscript("");
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, couldn't get AI analysis right now. Try again!" },
      ]);
      setState("idle");
    },
  });

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setMode("text");
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  // Handle programmatic open from parent (e.g. header button)
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen, onForceOpenHandled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice input → parse for pick intent first
  const sendVoiceToAI = useCallback((text: string) => {
    if (!text.trim()) { setState("idle"); return; }
    setMessages((prev) => [...prev, { role: "user", text }]);
    setState("processing");
    parsePickMutation.mutate({ speech: text });
  }, [parsePickMutation]);

  // Text input → general chat (no pick detection for text, keep it conversational)
  const sendTextToAI = useCallback((text: string) => {
    if (!text.trim()) { setState("idle"); return; }
    setMessages((prev) => [...prev, { role: "user", text }]);
    setState("processing");
    chatMutation.mutate({ message: text });
  }, [chatMutation]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    setLiveTranscript("");
    setState("listening");

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const latest = event.results[event.results.length - 1];
      const text = latest[0].transcript;
      setLiveTranscript(text);
      if (latest.isFinal) {
        recognition.stop();
        sendVoiceToAI(text);
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        setMessages((prev) => [...prev, {
          role: "assistant",
          text: event.error === "not-allowed"
            ? "🎤 Microphone access denied. Please allow mic access in your browser settings, or use text chat below."
            : event.error === "no-speech"
            ? "No speech detected — try again or type your question!"
            : `Voice error: ${event.error}. Try text chat instead.`,
        }]);
      }
      setState("idle");
      setLiveTranscript("");
    };

    recognition.onend = () => {
      if (state === "listening") setState("idle");
    };

    // Auto-stop after 15 seconds
    timeoutRef.current = setTimeout(() => {
      try { recognition.stop(); } catch {}
    }, 15000);

    try {
      recognition.start();
    } catch {
      setState("idle");
    }
  }, [sendVoiceToAI, state]);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    if (state === "listening") {
      if (liveTranscript) sendVoiceToAI(liveTranscript);
      else setState("idle");
    }
  }, [state, liveTranscript, sendVoiceToAI]);

  const handleMicClick = () => {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === "processing") return;
    sendTextToAI(textInput.trim());
    setTextInput("");
  };

  const handleClose = () => {
    stopListening();
    setIsOpen(false);
    setState("idle");
    setLiveTranscript("");
  };

  return (
    <>
      {/* Floating Trigger Button — hidden when panel is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group ${
            state === "listening"
              ? "bg-[oklch(0.58_0.18_145)] animate-pulse"
              : "bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)]"
          }`}
          title="Ask Buddy AI"
          aria-label="Open AI assistant"
        >
          <Mic size={22} className="text-white" />
          {state === "listening" && (
            <span className="absolute inset-0 rounded-full bg-[oklch(0.58_0.18_145/0.4)] animate-ping" />
          )}
          {/* Tooltip label */}
          <span className="absolute left-16 bottom-1/2 translate-y-1/2 bg-black/80 text-white text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ask Buddy AI
          </span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[oklch(0.12_0.015_260)] shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[oklch(0.65_0.22_35/0.2)] border border-[oklch(0.65_0.22_35/0.4)] flex items-center justify-center text-sm">
                  🏀
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Bracket Buddy AI</div>
                  <div className="text-xs text-white/40">Say "I pick Duke" to update your bracket!</div>
                </div>
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-white/8">
              <button
                onClick={() => setMode("voice")}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "voice"
                    ? "text-[oklch(0.65_0.22_35)] border-b-2 border-[oklch(0.65_0.22_35)]"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <Mic size={12} />
                Voice Picks {!isSupported && "(unavailable)"}
              </button>
              <button
                onClick={() => setMode("text")}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === "text"
                    ? "text-[oklch(0.55_0.2_250)] border-b-2 border-[oklch(0.55_0.2_250)]"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <MessageSquare size={12} />
                AI Advice
              </button>
            </div>

            {/* Message History */}
            {messages.length > 0 && (
              <div className="max-h-52 overflow-y-auto p-3 space-y-2 border-b border-white/5">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs ${
                        msg.isPick
                          ? "bg-[oklch(0.58_0.18_145/0.2)]"
                          : "bg-[oklch(0.65_0.22_35/0.2)]"
                      }`}>
                        {msg.isPick ? <CheckCircle2 size={14} className="text-[oklch(0.58_0.18_145)]" /> : "🏀"}
                      </div>
                    )}
                    <div className={`max-w-xs px-3 py-1.5 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[oklch(0.55_0.2_250/0.15)] text-white border border-[oklch(0.55_0.2_250/0.2)]"
                        : msg.isPick
                        ? "bg-[oklch(0.58_0.18_145/0.12)] text-white/90 border border-[oklch(0.58_0.18_145/0.3)]"
                        : "bg-[oklch(0.65_0.22_35/0.1)] text-white/90 border border-[oklch(0.65_0.22_35/0.15)]"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {state === "processing" && (
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

            {/* VOICE MODE */}
            {mode === "voice" && (
              <div className="p-5 space-y-4">
                {!isSupported ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                      <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm mb-1">Voice not available in this browser</div>
                        <div className="text-xs text-yellow-300/70">Voice picks require Chrome, Edge, or Android Chrome. Safari and Firefox don't support this feature yet.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setMode("text")}
                      className="w-full py-3 rounded-xl bg-[oklch(0.55_0.2_250/0.15)] border border-[oklch(0.55_0.2_250/0.3)] text-[oklch(0.55_0.2_250)] text-sm font-semibold hover:bg-[oklch(0.55_0.2_250/0.25)] transition-all"
                    >
                      Switch to AI Advice (works everywhere) →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mic Button */}
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onClick={handleMicClick}
                        disabled={state === "processing"}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                          state === "listening"
                            ? "bg-[oklch(0.58_0.18_145/0.2)] border-2 border-[oklch(0.58_0.18_145)] scale-110"
                            : state === "processing"
                            ? "bg-[oklch(0.55_0.2_250/0.15)] border-2 border-[oklch(0.55_0.2_250/0.4)] cursor-not-allowed opacity-60"
                            : "bg-[oklch(0.65_0.22_35/0.15)] border-2 border-[oklch(0.65_0.22_35/0.5)] hover:bg-[oklch(0.65_0.22_35/0.25)] hover:scale-105 active:scale-95"
                        }`}
                      >
                        {state === "processing" ? (
                          <Loader2 size={28} className="text-[oklch(0.55_0.2_250)] animate-spin" />
                        ) : state === "listening" ? (
                          <MicOff size={28} className="text-[oklch(0.58_0.18_145)]" />
                        ) : (
                          <Mic size={28} className="text-[oklch(0.65_0.22_35)]" />
                        )}
                        {state === "listening" && (
                          <>
                            <span className="absolute inset-0 rounded-full border-2 border-[oklch(0.58_0.18_145/0.5)] animate-ping" />
                            <span className="absolute -inset-3 rounded-full border border-[oklch(0.58_0.18_145/0.2)] animate-ping" style={{ animationDelay: "0.15s" }} />
                          </>
                        )}
                      </button>
                      <div className="text-center">
                        <div className="font-semibold text-white text-sm">
                          {state === "listening" ? "Listening... tap to stop" : state === "processing" ? "Detecting pick..." : "Tap to speak your pick"}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {state === "listening"
                            ? "Say a team name to pick them"
                            : "Say 'I pick Duke' to update your bracket"}
                        </div>
                      </div>
                    </div>

                    {/* Live transcript */}
                    {liveTranscript && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                          <Mic size={10} /> You said:
                        </div>
                        <p className="text-white text-sm italic">"{liveTranscript}"</p>
                      </div>
                    )}

                    {/* Example prompts */}
                    {state === "idle" && messages.length === 0 && (
                      <div>
                        <div className="text-xs text-white/30 mb-2 uppercase tracking-wider font-semibold">Try saying:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {EXAMPLE_VOICE_PROMPTS.map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => sendVoiceToAI(prompt)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TEXT / AI ADVICE MODE */}
            {mode === "text" && (
              <div className="p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXAMPLE_TEXT_PROMPTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendTextToAI(q)}
                        disabled={state === "processing"}
                        className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/8 hover:border-white/20 transition-all text-left disabled:opacity-40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleTextSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ask about picks, upsets, strategy..."
                    disabled={state === "processing"}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[oklch(0.65_0.22_35/0.5)] focus:bg-white/8 disabled:opacity-40 transition-all"
                  />
                  <Button
                    type="submit"
                    disabled={state === "processing" || !textInput.trim()}
                    size="sm"
                    className="bg-[oklch(0.65_0.22_35)] hover:bg-[oklch(0.72_0.24_40)] text-white disabled:opacity-40 px-3"
                  >
                    {state === "processing" ? <Loader2 size={14} className="animate-spin" /> : "Ask"}
                  </Button>
                </form>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/5">
              <span className="text-xs text-white/20">
                🆓 100% free · Voice picks update your bracket instantly
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
