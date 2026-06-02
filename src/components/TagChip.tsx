type TagChipProps = {
  name: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
};

export function TagChip({
  name,
  color,
  size = "sm",
  className = "",
}: TagChipProps) {
  return (
    <span
      className={`tag-chip inline-flex items-center gap-1 rounded-full font-medium ${
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      } ${className}`}
      style={{ "--tag-color": color } as React.CSSProperties}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
