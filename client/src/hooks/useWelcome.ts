import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * Fires a welcome toast on first sign-in and redirects new users to the bracket page.
 * Uses localStorage to track if the welcome has already been shown for this user.
 */
export function useWelcome(user: { id: number; name?: string | null; bracketCount: number } | null) {
  const [, navigate] = useLocation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    const storageKey = `bb_welcomed_${user.id}`;
    const alreadyWelcomed = localStorage.getItem(storageKey);

    if (!alreadyWelcomed) {
      localStorage.setItem(storageKey, "1");
      const firstName = user.name?.split(" ")[0] ?? "Champion";

      // Show welcome toast
      toast.success(`Welcome to BracketBuddy, ${firstName}! 🏀`, {
        description: "Your bracket is ready — let's fill it out!",
        duration: 4000,
        action: {
          label: "Build My Bracket →",
          onClick: () => navigate("/bracket"),
        },
      });

      // Auto-redirect new users (0 brackets) to the bracket page after a short delay
      if (user.bracketCount === 0) {
        setTimeout(() => {
          navigate("/bracket");
        }, 1500);
      }
    }
  }, [user, navigate]);
}
