import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  const [theme, setTheme] = useState<AppTheme>(() => readStoredTheme());
  const skipPersistRef = useRef(true);

  useEffect(() => {
    const saved = readStoredTheme();
    if (saved !== theme) {
      skipPersistRef.current = true;
      setTheme(saved);
    }
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

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
