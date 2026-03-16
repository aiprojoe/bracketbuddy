import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Shuffle, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AutoFillModalProps {
  open: boolean;
  onClose: () => void;
  onFilled: () => void;
}

const MODES = [
  {
    key: "chalk" as const,
    icon: Trophy,
    label: "Chalk",
    subtitle: "Best seeds always win",
    description: "Safe, boring, but statistically the highest expected score. All 1-4 seeds advance. Perfect for first-timers.",
    color: "oklch(0.78 0.18 80)",
    bgColor: "oklch(0.78 0.18 80 / 0.1)",
    borderColor: "oklch(0.78 0.18 80 / 0.4)",
  },
  {
    key: "random" as const,
    icon: Shuffle,
    label: "Chaos Mode",
    subtitle: "Historically-weighted random",
    description: "Uses real historical upset rates. 12 seeds beat 5 seeds 35% of the time. Expect some surprises!",
    color: "oklch(0.55 0.2 250)",
    bgColor: "oklch(0.55 0.2 250 / 0.1)",
    borderColor: "oklch(0.55 0.2 250 / 0.4)",
  },
  {
    key: "upset" as const,
    icon: Zap,
    label: "Upset Special",
    subtitle: "Chaos-heavy bracket",
    description: "Double the upset probability on every matchup. High risk, high reward. The bracket everyone talks about.",
    color: "oklch(0.65 0.22 35)",
    bgColor: "oklch(0.65 0.22 35 / 0.1)",
    borderColor: "oklch(0.65 0.22 35 / 0.4)",
  },
];

export default function AutoFillModal({ open, onClose, onFilled }: AutoFillModalProps) {
  const [selected, setSelected] = useState<"chalk" | "random" | "upset" | null>(null);
  const autoFill = trpc.bracket.autoFill.useMutation();

  const handleFill = async () => {
    if (!selected) return;
    try {
      const result = await autoFill.mutateAsync({ mode: selected });
      toast.success(`🎉 Bracket auto-filled! ${result.picksCount} picks made.`, { duration: 3000 });
      onFilled();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to auto-fill bracket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[oklch(0.12_0.01_260)] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-white">Auto-Fill Bracket</DialogTitle>
          <DialogDescription className="text-white/50">
            Choose a strategy to instantly fill all 63 picks. You can still edit any pick after.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selected === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setSelected(mode.key)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isSelected ? "ring-2" : "hover:bg-white/5"
                }`}
                style={{
                  backgroundColor: isSelected ? mode.bgColor : undefined,
                  borderColor: isSelected ? mode.color : "rgba(255,255,255,0.1)",
                  ...(isSelected ? { boxShadow: `0 0 0 2px ${mode.color}` } : {}),
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: mode.bgColor, border: `1px solid ${mode.borderColor}` }}
                  >
                    <Icon size={16} style={{ color: mode.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{mode.label}</span>
                      <span className="text-[10px] text-white/40 font-medium">{mode.subtitle}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{mode.description}</p>
                  </div>
                  {isSelected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: mode.color }}
                    >
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 border-white/10 text-white/60 hover:text-white bg-transparent" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-bold"
            disabled={!selected || autoFill.isPending}
            onClick={handleFill}
            style={{
              backgroundColor: selected ? MODES.find((m) => m.key === selected)?.color : undefined,
              color: "white",
            }}
          >
            {autoFill.isPending ? (
              "Filling..."
            ) : (
              <>
                Fill Bracket <ChevronRight size={14} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
