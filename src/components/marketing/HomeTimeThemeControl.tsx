import { useHomeTimeTheme } from "~/contexts/homeTimeTheme";
import {
  HOME_TIME_THEME_LABELS,
  HOME_TIME_THEME_SLOTS,
  type HomeTimeThemeOverride,
} from "~/utils/homeTimeTheme";

export function HomeTimeThemeControl() {
  const { theme, label, icon, override, setOverride } = useHomeTimeTheme();

  const selectValue: HomeTimeThemeOverride = override;

  return (
    <div
      className="home-time-control fixed bottom-5 right-5 z-[80] flex max-w-[14rem] flex-col items-end gap-2"
      aria-live="polite"
    >
      <div className="home-time-control__badge flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md">
        <span className="home-time-control__icon text-base" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <label className="home-time-control__select-wrap sr-only" htmlFor="home-theme-override">
        Theme preview
      </label>
      <select
        id="home-theme-override"
        value={selectValue}
        onChange={(event) =>
          setOverride(event.target.value as HomeTimeThemeOverride)
        }
        className="home-time-control__select max-w-full rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md"
      >
        <option value="auto">Auto (device time)</option>
        <optgroup label="Preview all themes">
          {HOME_TIME_THEME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {HOME_TIME_THEME_LABELS[slot]}
            </option>
          ))}
        </optgroup>
      </select>
      {override !== "auto" && override !== theme && (
        <span className="sr-only">Preview theme: {theme}</span>
      )}
    </div>
  );
}
