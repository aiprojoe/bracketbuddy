import confetti from "canvas-confetti";

/**
 * Returns helper functions to fire confetti animations for bracket picks.
 */
export function useConfetti() {
  const firePick = (isUpset = false) => {
    if (isUpset) {
      // Big celebration for upset picks — orange burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 },
        colors: ["#f97316", "#fb923c", "#fbbf24", "#ffffff", "#60a5fa"],
        startVelocity: 45,
        gravity: 0.9,
      });
      // Second burst from left
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#f97316", "#fbbf24", "#ffffff"],
        });
      }, 150);
      // Third burst from right
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#f97316", "#fbbf24", "#ffffff"],
        });
      }, 300);
    } else {
      // Subtle pop for regular picks
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.75 },
        colors: ["#f97316", "#fb923c", "#ffffff", "#60a5fa"],
        startVelocity: 30,
        gravity: 1.1,
        scalar: 0.8,
      });
    }
  };

  const fireChampion = () => {
    // Epic champion pick celebration
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#f97316", "#fbbf24", "#ffffff"],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#f97316", "#fbbf24", "#ffffff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const fireBadge = () => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["#a855f7", "#ec4899", "#f97316", "#fbbf24", "#ffffff"],
      startVelocity: 40,
    });
  };

  return { firePick, fireChampion, fireBadge };
}
