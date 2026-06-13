import { useEffect, useRef, useState, type CSSProperties } from "react";

const CONFETTI_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#f97316",
];

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
  drift: number;
  shape: "square" | "circle" | "ribbon";
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createParticles(count: number, seed: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: seed * 1000 + index,
    left: 8 + Math.random() * 84,
    delay: Math.random() * 0.35,
    duration: 1.8 + Math.random() * 1.4,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
    drift: -40 + Math.random() * 80,
    shape: (["square", "circle", "ribbon"] as const)[index % 3]!,
  }));
}

function ConfettiBurst({ burstKey }: { burstKey: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (burstKey === 0 || prefersReducedMotion()) return;
    setParticles(createParticles(48, burstKey));
    const timer = window.setTimeout(() => setParticles([]), 3200);
    return () => window.clearTimeout(timer);
  }, [burstKey]);

  if (particles.length === 0) return null;

  return (
    <div className="pricing-confetti" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`pricing-confetti__piece pricing-confetti__piece--${particle.shape}`}
          style={
            {
              left: `${particle.left}%`,
              width:
                particle.shape === "ribbon"
                  ? `${particle.size * 0.45}px`
                  : `${particle.size}px`,
              height:
                particle.shape === "ribbon"
                  ? `${particle.size * 1.6}px`
                  : `${particle.size}px`,
              backgroundColor: particle.color,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              "--confetti-drift": `${particle.drift}px`,
              "--confetti-rotate": `${particle.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function PricingYearlyCelebration({
  yearly,
  burstKey,
}: {
  yearly: boolean;
  burstKey: number;
}) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!yearly || burstKey === 0) return;
    const node = bannerRef.current;
    if (!node) return;
    node.classList.remove("pricing-celebration-banner--pop");
    void node.offsetWidth;
    node.classList.add("pricing-celebration-banner--pop");
  }, [burstKey, yearly]);

  if (!yearly) return null;

  return (
    <div className="pricing-celebration relative mt-6 flex w-full max-w-xl flex-col items-center">
      <ConfettiBurst burstKey={burstKey} />
      <div
        ref={bannerRef}
        className="pricing-celebration-banner relative w-full overflow-hidden rounded-2xl border px-5 py-3 text-center shadow-lg sm:px-8"
        role="status"
        aria-live="polite"
      >
        <div className="pricing-celebration-banner__shine" aria-hidden="true" />
        <p className="relative z-[1] text-sm font-black sm:text-base">
          <span className="pricing-celebration-banner__emoji mr-1.5" aria-hidden="true">
            🎉
          </span>
          Smart move — you&apos;re saving{" "}
          <span className="pricing-celebration-banner__highlight">17%</span> with annual billing!
          <span className="pricing-celebration-banner__emoji ml-1.5" aria-hidden="true">
            ✨
          </span>
        </p>
        <p className="relative z-[1] mt-1 text-xs font-semibold opacity-90 sm:text-sm">
          Two months free, every year. Your team budget will thank you.
        </p>
      </div>
      <div
        className="pricing-celebration-sparkles mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]"
        aria-hidden="true"
      >
        <span className="pricing-celebration-sparkles__dot" />
        Celebration mode
        <span className="pricing-celebration-sparkles__dot" />
      </div>
    </div>
  );
}
