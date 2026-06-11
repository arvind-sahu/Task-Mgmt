import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import {
  markWelcomeTourDone,
  welcomeTourSteps,
  type WelcomeTourStep,
} from "~/config/welcomeTour";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type WelcomeTourProps = {
  open: boolean;
  onClose: () => void;
};

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  const pad = 6;
  return {
    top: Math.max(8, box.top - pad),
    left: Math.max(8, box.left - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
}

function tooltipPosition(
  rect: Rect,
  placement: WelcomeTourStep["placement"],
  tooltipSize: { width: number; height: number },
) {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = rect.top + rect.height + gap;
  let left = rect.left;

  if (placement === "right") {
    top = rect.top;
    left = rect.left + rect.width + gap;
  } else if (placement === "left") {
    top = rect.top;
    left = rect.left - tooltipSize.width - gap;
  } else if (placement === "top") {
    top = rect.top - tooltipSize.height - gap;
    left = rect.left;
  }

  left = Math.min(Math.max(12, left), vw - tooltipSize.width - 12);
  top = Math.min(Math.max(12, top), vh - tooltipSize.height - 12);
  return { top, left };
}

export function WelcomeTour({ open, onClose }: WelcomeTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = welcomeTourSteps[stepIndex];
  const isLast = stepIndex >= welcomeTourSteps.length - 1;

  const refreshRect = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    requestAnimationFrame(() => {
      setTargetRect(measureTarget(step.target));
    });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    refreshRect();
  }, [open, step, stepIndex, refreshRect]);

  useEffect(() => {
    if (!open) return;

    function onResize() {
      refreshRect();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, refreshRect]);

  function finish() {
    markWelcomeTourDone();
    onClose();
  }

  function skip() {
    finish();
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!open || !step) return null;

  const tooltipWidth = 300;
  const tooltipHeight = 160;
  const tooltipPos = targetRect
    ? tooltipPosition(targetRect, step.placement, {
        width: tooltipWidth,
        height: tooltipHeight,
      })
    : { top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 150 };

  return (
    <div className="welcome-tour-root" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <button
        type="button"
        className="welcome-tour-backdrop"
        aria-label="Skip tour"
        onClick={skip}
      />

      {targetRect && (
        <div
          className="welcome-tour-spotlight pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <div
        className="welcome-tour-card"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: tooltipWidth,
        }}
      >
        <p className="welcome-tour-step-label">
          Step {stepIndex + 1} of {welcomeTourSteps.length}
        </p>
        <h3 className="welcome-tour-title">{step.title}</h3>
        <p className="welcome-tour-body">{step.body}</p>
        {!targetRect && (
          <p className="welcome-tour-missing text-xs text-amber-700">
            Tip: widen the window or open the sidebar to see this highlight.
          </p>
        )}
        <div className="welcome-tour-actions">
          <button type="button" className="btn-ghost text-sm" onClick={skip}>
            Skip tour
          </button>
          <button type="button" className="btn-primary text-sm" onClick={next}>
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
