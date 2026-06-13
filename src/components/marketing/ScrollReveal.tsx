import {
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { useScrollReveal } from "~/hooks/useScrollReveal";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  /** Dark / glass sections use a softer shimmer. */
  tone?: "light" | "dark" | "glass";
  /** Card shows skeleton shimmer; fade is text-only motion. */
  variant?: "card" | "fade";
} & HTMLAttributes<HTMLElement>;

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  tone = "light",
  variant = "card",
  ...rest
}: ScrollRevealProps) {
  const { ref, className: revealClass } = useScrollReveal({
    loadDelay: delay,
  });

  const toneClass =
    tone === "dark"
      ? "scroll-reveal--dark"
      : tone === "glass"
        ? "scroll-reveal--glass"
        : "";

  const variantClass = variant === "fade" ? "scroll-reveal--fade" : "";

  return (
    <Tag
      ref={ref}
      className={`${revealClass} ${toneClass} ${variantClass} ${className}`.trim()}
      style={
        {
          "--sr-delay": `${delay}ms`,
        } as CSSProperties
      }
      {...rest}
    >
      {variant === "card" && <div className="scroll-reveal__shimmer" aria-hidden />}
      <div className="scroll-reveal__body">{children}</div>
    </Tag>
  );
}

/** Stagger delay helper for grids: `delay={stagger(index)}` */
export function scrollRevealStagger(index: number, stepMs = 85) {
  return index * stepMs;
}
