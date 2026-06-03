import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  HOME_TIME_OVERRIDE_KEY,
  homeTimeThemeIcon,
  HOME_TIME_THEME_LABELS,
  msUntilNextHourBoundary,
  readHomeTimeThemeOverride,
  resolveHomeTimeTheme,
  type HomeTimeThemeOverride,
  type HomeTimeThemeSlot,
} from "~/utils/homeTimeTheme";

type HomeTimeThemeContextValue = {
  theme: HomeTimeThemeSlot;
  label: string;
  icon: string;
  override: HomeTimeThemeOverride;
  setOverride: (value: HomeTimeThemeOverride) => void;
};

const HomeTimeThemeContext = createContext<HomeTimeThemeContextValue | null>(
  null,
);

export function HomeTimeThemeProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<HomeTimeThemeOverride>("auto");
  const [theme, setTheme] = useState<HomeTimeThemeSlot>(() =>
    resolveHomeTimeTheme(new Date(), "auto"),
  );

  const applyTheme = useCallback((nextOverride: HomeTimeThemeOverride) => {
    setTheme(resolveHomeTimeTheme(new Date(), nextOverride));
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("home-time-active");
    return () => document.documentElement.classList.remove("home-time-active");
  }, []);

  useEffect(() => {
    const stored = readHomeTimeThemeOverride();
    setOverrideState(stored);
    applyTheme(stored);
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(override);
  }, [applyTheme, override]);

  useEffect(() => {
    if (override !== "auto") return;

    let timeoutId = 0;

    const schedule = () => {
      applyTheme("auto");
      timeoutId = window.setTimeout(schedule, msUntilNextHourBoundary());
    };

    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [applyTheme, override]);

  const setOverride = useCallback(
    (value: HomeTimeThemeOverride) => {
      setOverrideState(value);
      try {
        if (value === "auto") {
          window.localStorage.removeItem(HOME_TIME_OVERRIDE_KEY);
        } else {
          window.localStorage.setItem(HOME_TIME_OVERRIDE_KEY, value);
        }
      } catch {
        // ignore storage failures
      }
      applyTheme(value);
    },
    [applyTheme],
  );

  const value = useMemo(
    () => ({
      theme,
      label: HOME_TIME_THEME_LABELS[theme],
      icon: homeTimeThemeIcon(theme),
      override,
      setOverride,
    }),
    [theme, override, setOverride],
  );

  return (
    <HomeTimeThemeContext.Provider value={value}>
      {children}
    </HomeTimeThemeContext.Provider>
  );
}

export function useHomeTimeTheme() {
  const ctx = useContext(HomeTimeThemeContext);
  if (!ctx) {
    throw new Error("useHomeTimeTheme must be used within HomeTimeThemeProvider");
  }
  return ctx;
}
