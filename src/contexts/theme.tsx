import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";

import { isHomeTimeThemeRoute, isUserAppThemeRoute } from "~/utils/themeRoute";

export const APP_THEMES = ["light", "dark", "greydark", "sunset"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export const THEME_LABELS: Record<AppTheme, string> = {
  light: "Light",
  dark: "Dark",
  greydark: "Grey dark",
  sunset: "Sunset",
};

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (value: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const STORAGE_KEY = "tasker.theme";

export function normalizeTheme(value: string | null): AppTheme | null {
  if (value === "indigo") return "light";
  if (value && APP_THEMES.includes(value as AppTheme)) {
    return value as AppTheme;
  }
  return null;
}

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  return normalizeTheme(window.localStorage.getItem(STORAGE_KEY)) ?? "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [theme, setTheme] = useState<AppTheme>(() => readStoredTheme());
  const skipPersistRef = useRef(true);

  const applyDocumentTheme = useCallback(
    (pathname: string, appTheme: AppTheme) => {
      if (isHomeTimeThemeRoute(pathname)) {
        document.documentElement.setAttribute("data-theme", "light");
        return;
      }
      if (isUserAppThemeRoute(pathname)) {
        document.documentElement.setAttribute("data-theme", appTheme);
        return;
      }
      document.documentElement.setAttribute("data-theme", "light");
    },
    [],
  );

  useEffect(() => {
    const saved = readStoredTheme();
    if (saved !== theme) {
      skipPersistRef.current = true;
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    applyDocumentTheme(router.pathname, theme);
  }, [applyDocumentTheme, router.pathname, theme]);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (!isUserAppThemeRoute(router.pathname)) return;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, router.pathname]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
