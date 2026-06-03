type ScrollSubscriber = () => void;

const subscribers = new Set<ScrollSubscriber>();
let rafId = 0;
let listenersBound = false;

function flushScrollUpdates() {
  rafId = 0;
  for (const update of subscribers) {
    update();
  }
}

/** Schedule one shared animation frame for all scroll-driven homepage effects. */
export function requestMarketingScrollFrame() {
  if (!rafId) {
    rafId = requestAnimationFrame(flushScrollUpdates);
  }
}

function bindScrollListeners() {
  if (listenersBound) return;
  listenersBound = true;
  window.addEventListener("scroll", requestMarketingScrollFrame, { passive: true });
  window.addEventListener("resize", requestMarketingScrollFrame);
}

export function subscribeMarketingScroll(update: ScrollSubscriber) {
  bindScrollListeners();
  subscribers.add(update);
  update();

  return () => {
    subscribers.delete(update);
  };
}

export function getMarketingScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  return scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
}

export const MOBILE_MQ = "(max-width: 767px)";

export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

export type SunArcPosition = {
  left: number;
  top: number;
  /** 0 = full disc, 1 = mostly below horizon (sunset theme) */
  sink?: number;
};

/** Desktop: bottom-left → top-center → bottom-right. Mobile: upper-sky drift only. */
export function moonArcPosition(scrollProgress: number, mobile: boolean) {
  const t = Math.min(Math.max(scrollProgress, 0), 1);

  if (mobile) {
    return {
      left: 24 + 52 * t,
      top: 15 + 5 * Math.sin(t * Math.PI),
    };
  }

  const xStart = 11;
  const xEnd = 89;
  const yBase = 84;
  const yPeak = 7;
  const apex = yBase - yPeak;

  return {
    left: xStart + (xEnd - xStart) * t,
    top: yBase - 4 * apex * t * (1 - t),
  };
}

/** Sun follows the same scroll arc as the moon (non-sunset themes). */
export function sunArcPosition(scrollProgress: number, mobile: boolean): SunArcPosition {
  return moonArcPosition(scrollProgress, mobile);
}

/** Sunset: left mid-top → bottom-right, sinking toward the horizon as you scroll. */
export function sunsetArcPosition(
  scrollProgress: number,
  mobile: boolean,
): SunArcPosition {
  const t = Math.min(Math.max(scrollProgress, 0), 1);

  if (mobile) {
    return {
      left: 16 + 68 * t,
      top: 24 + 62 * t,
      sink: t * 0.78,
    };
  }

  return {
    left: 12 + 76 * t,
    top: 26 + 60 * t,
    sink: t * 0.82,
  };
}

export function sunArcPositionForTheme(
  theme: string,
  scrollProgress: number,
  mobile: boolean,
): SunArcPosition {
  if (theme === "sunset") {
    return sunsetArcPosition(scrollProgress, mobile);
  }
  return sunArcPosition(scrollProgress, mobile);
}

export function isDawnSunTheme(theme: string): boolean {
  return theme === "sunrise" || theme === "morning" || theme === "late-morning";
}

export function isSunsetSunTheme(theme: string): boolean {
  return theme === "sunset";
}
