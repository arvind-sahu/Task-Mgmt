import { useTheme } from "~/contexts/theme";

interface ThemePickerProps {
  compact?: boolean;
}

export default function ThemePicker({ compact = false }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 shadow-sm ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <span className="font-medium">Theme</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as "indigo" | "sunset")}
        className="bg-transparent outline-none"
        aria-label="Select theme"
      >
        <option value="indigo">Indigo</option>
        <option value="sunset">Sunset</option>
      </select>
    </label>
  );
}
