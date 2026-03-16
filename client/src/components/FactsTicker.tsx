import { useState, useEffect } from "react";
import { MARCH_MADNESS_FACTS } from "../../../shared/bracketData";
import { Lightbulb } from "lucide-react";

export default function FactsTicker() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MARCH_MADNESS_FACTS.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MARCH_MADNESS_FACTS.length);
        setFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-2 bg-[oklch(0.55_0.2_250/0.08)] border border-[oklch(0.55_0.2_250/0.2)] rounded-xl px-4 py-3 mb-4">
      <Lightbulb size={14} className="text-[oklch(0.78_0.18_80)] flex-shrink-0 mt-0.5" />
      <p
        className="text-xs text-white/60 leading-relaxed transition-opacity duration-400"
        style={{ opacity: fade ? 1 : 0 }}
      >
        <span className="text-[oklch(0.78_0.18_80)] font-semibold">Did you know? </span>
        {MARCH_MADNESS_FACTS[index]}
      </p>
    </div>
  );
}
