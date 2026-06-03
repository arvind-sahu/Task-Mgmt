import Image from "next/image";
import { useEffect, useRef } from "react";

import {
  getMarketingScrollProgress,
  isDawnSunTheme,
  isMobileViewport,
  isSunsetSunTheme,
  moonArcPosition,
  requestMarketingScrollFrame,
  subscribeMarketingScroll,
  sunArcPositionForTheme,
} from "~/utils/marketingScroll";
import type { HomeTimeThemeSlot } from "~/utils/homeTimeTheme";

const SUN_THEMES: HomeTimeThemeSlot[] = [
  "sunrise",
  "morning",
  "late-morning",
  "noon",
  "afternoon",
  "sunset",
];

const MOON_THEMES = ["night", "late-night", "pre-dawn"] as const satisfies readonly HomeTimeThemeSlot[];

type MoonTheme = (typeof MOON_THEMES)[number];

function isMoonTheme(theme: HomeTimeThemeSlot): theme is MoonTheme {
  return (MOON_THEMES as readonly HomeTimeThemeSlot[]).includes(theme);
}

const MOON_ASSETS: Record<
  MoonTheme,
  { src: string; variant: "full" | "crescent" }
> = {
  night: { src: "/images/sky/moon-full.png", variant: "full" },
  "late-night": { src: "/images/sky/moon-full.png", variant: "full" },
  "pre-dawn": { src: "/images/sky/moon-phases.png", variant: "crescent" },
};

interface HomeSkyBackdropProps {
  theme: HomeTimeThemeSlot;
}

export function HomeSkyBackdrop({ theme }: HomeSkyBackdropProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef(isMobileViewport());

  const showSun = SUN_THEMES.includes(theme);
  const showMoon = isMoonTheme(theme);
  const dawnSun = showSun && isDawnSunTheme(theme);
  const sunsetSun = showSun && isSunsetSunTheme(theme);
  const moon = showMoon ? MOON_ASSETS[theme] : null;

  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;

    const syncSun = () => {
      if (!showSun) return;
      const pos = sunArcPositionForTheme(
        theme,
        getMarketingScrollProgress(),
        mobileRef.current,
      );
      backdrop.style.setProperty("--sky-sun-left", `${pos.left}%`);
      backdrop.style.setProperty("--sky-sun-top", `${pos.top}%`);
      if (pos.sink !== undefined) {
        backdrop.style.setProperty("--sky-sun-sink", String(pos.sink));
      } else {
        backdrop.style.removeProperty("--sky-sun-sink");
      }
    };

    const syncMoon = () => {
      if (!moon) return;
      const pos = moonArcPosition(
        getMarketingScrollProgress(),
        mobileRef.current,
      );
      backdrop.style.setProperty("--sky-moon-left", `${pos.left}%`);
      backdrop.style.setProperty("--sky-moon-top", `${pos.top}%`);
    };

    const syncStars = () => {
      if (!starsRef.current) return;
      const parallax = window.scrollY * 0.04;
      starsRef.current.style.transform = `translate3d(0, ${parallax}px, 0)`;
    };

    const update = () => {
      syncSun();
      syncMoon();
      syncStars();
    };

    return subscribeMarketingScroll(update);
  }, [showSun, moon, theme]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      mobileRef.current = mq.matches;
      requestMarketingScrollFrame();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const sunSceneClass = [
    "home-sky-sun-scene",
    dawnSun ? "home-sky-sun-scene--dawn" : "",
    sunsetSun ? "home-sky-sun-scene--sunset" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={backdropRef}
      className="home-sky-backdrop"
      aria-hidden
      data-sky-theme={theme}
    >
      {sunsetSun ? (
        <>
          <div className="home-sky-sunset-sky-wash" />
          <div className="home-sky-sunset-cloud home-sky-sunset-cloud--upper" />
          <div className="home-sky-sunset-cloud home-sky-sunset-cloud--mid" />
          <div className="home-sky-sunset-cloud home-sky-sunset-cloud--streak" />
          <div className="home-sky-sunset-horizon-glow" />
        </>
      ) : null}

      <div className="home-sky-horizon" />

      {showSun ? (
        <div className={sunSceneClass}>
          {dawnSun ? (
            <>
              <div className="home-sky-sun-atmosphere" />
              <div className="home-sky-sun-cloud-band" />
              <div className="home-sky-sun-god-rays" />
            </>
          ) : null}
          {sunsetSun ? (
            <>
              <div className="home-sky-sun-sunset-bloom" />
              <div className="home-sky-sun-sunset-rays" />
            </>
          ) : null}
          <div className="home-sky-sun-wrap">
            {!sunsetSun ? <div className="home-sky-sun-rays" /> : null}
            <div className="home-sky-sun-glow" />
            <div className="home-sky-sun-core" />
          </div>
          {dawnSun ? <div className="home-sky-sun-haze" /> : null}
          {sunsetSun ? <div className="home-sky-sun-sunset-haze" /> : null}
        </div>
      ) : null}

      {sunsetSun ? <div className="home-sky-sunset-foreground" /> : null}

      {moon ? (
        <div
          className={`home-sky-moon-scene home-sky-moon-scene--${moon.variant}`}
        >
          <div className="home-sky-moon-outer-glow" />
          <div className="home-sky-moon-inner-glow" />
          <div className="home-sky-moon-frame">
            <Image
              src={moon.src}
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 72vw, (max-width: 1024px) 42vw, 420px"
              className={`home-sky-moon-photo home-sky-moon-photo--${moon.variant}`}
            />
          </div>
          <div className="home-sky-moon-mist" />
        </div>
      ) : null}

      {showMoon ? (
        <div ref={starsRef} className="home-sky-stars" />
      ) : null}
    </div>
  );
}
