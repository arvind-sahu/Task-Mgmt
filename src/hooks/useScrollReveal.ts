import { useEffect, useRef, useState } from "react";

type UseScrollRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  /** Extra ms before content fades in (after intersect). */
  loadDelay?: number;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.12, rootMargin = "0px 0px -6% 0px", loadDelay = 0 } =
    options;
  const ref = useRef<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "revealed">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      setPhase("revealed");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || triggeredRef.current) return;
        triggeredRef.current = true;

        setPhase("loading");
        window.setTimeout(() => {
          setPhase("revealed");
        }, loadDelay + 140);
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadDelay, rootMargin, threshold]);

  return {
    ref,
    phase,
    isRevealed: phase === "revealed",
    isLoading: phase === "loading",
    className:
      phase === "revealed"
        ? "scroll-reveal scroll-reveal--in"
        : phase === "loading"
          ? "scroll-reveal scroll-reveal--loading"
          : "scroll-reveal",
  };
}
