import {
  APP_THEMES,
  THEME_LABELS,
  type AppTheme,
  useTheme,
} from "~/contexts/theme";

const PREVIEW_STYLES: Record<
  AppTheme,
  { bg: string; surface: string; accent: string; text: string; muted: string }
> = {
  light: {
    bg: "#f8fafc",
    surface: "#ffffff",
    accent: "#4f46e5",
    text: "#0f172a",
    muted: "#94a3b8",
  },
  dark: {
    bg: "#0b1220",
    surface: "#111827",
    accent: "#6366f1",
    text: "#e2e8f0",
    muted: "#64748b",
  },
  greydark: {
    bg: "#171717",
    surface: "#262626",
    accent: "#737373",
    text: "#e5e5e5",
    muted: "#525252",
  },
  sunset: {
    bg: "#fff7ed",
    surface: "#fffaf5",
    accent: "#f97316",
    text: "#431407",
    muted: "#fdba74",
  },
};

function ThemePreview({ themeId }: { themeId: AppTheme }) {
  const colors = PREVIEW_STYLES[themeId];
  return (
    <div
      className="pointer-events-none overflow-hidden rounded-md border shadow-sm"
      style={{
        borderColor: colors.muted,
        backgroundColor: colors.bg,
      }}
      aria-hidden="true"
    >
      <div
        className="flex items-center gap-1 border-b px-1.5 py-1"
        style={{
          borderColor: colors.muted,
          backgroundColor: colors.surface,
        }}
      >
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: colors.accent }}
        />
        <span
          className="h-1.5 flex-1 rounded-full"
          style={{ backgroundColor: colors.muted, opacity: 0.45 }}
        />
      </div>
      <div className="space-y-1 p-1.5">
        <div
          className="h-1.5 w-3/4 rounded-full"
          style={{ backgroundColor: colors.text, opacity: 0.85 }}
        />
        <div
          className="h-1.5 w-1/2 rounded-full"
          style={{ backgroundColor: colors.muted, opacity: 0.55 }}
        />
        <div className="mt-1 flex gap-1">
          <span
            className="h-4 flex-1 rounded-sm"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.muted}` }}
          />
          <span
            className="h-4 w-5 rounded-sm"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>
    </div>
  );
}

interface ThemePickerProps {
  compact?: boolean;
}

export default function ThemePicker({ compact = false }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <p className="text-sm font-semibold text-heading">Choose a theme</p>
        {!compact && (
          <p className="mt-0.5 text-xs text-muted">
            Pick a look for Tasker. Your choice is saved on this device.
          </p>
        )}
      </div>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        role="radiogroup"
        aria-label="App theme"
      >
        {APP_THEMES.map((themeId) => {
          const selected = theme === themeId;
          return (
            <button
              key={themeId}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(themeId)}
              className={`group rounded-xl border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-muted-bg)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent-ring)]"
              }`}
            >
              <ThemePreview themeId={themeId} />
              <p
                className={`mt-2 text-center text-xs font-semibold ${
                  selected ? "text-[var(--accent-muted-text)]" : "text-heading"
                }`}
              >
                {THEME_LABELS[themeId]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { AppTheme };
