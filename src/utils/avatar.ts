export function initialsFromName(name?: string | null, email?: string | null) {
  const safeName = name?.trim() ?? "";
  if (safeName.length > 0) {
    const parts = safeName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? "";
    const second =
      parts.length > 1
        ? (parts[1]?.charAt(0) ?? "")
        : (parts[0]?.charAt(parts[0].length - 1) ?? "");
    const value = `${first}${second}`.trim().toUpperCase();
    if (value) return value;
  }

  if (email) {
    const cleaned = email.split("@")[0] ?? "";
    if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
    if (cleaned.length === 1) return `${cleaned[0]}${cleaned[0]}`.toUpperCase();
  }
  return "US";
}
