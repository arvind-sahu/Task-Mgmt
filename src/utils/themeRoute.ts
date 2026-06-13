/** Homepage — time-of-day theme drives visuals, not the user's app theme. */
export function isHomeTimeThemeRoute(pathname: string): boolean {
  return pathname === "/";
}

/** App shell routes where the user's saved theme (light/dark/etc.) applies. */
export function isUserAppThemeRoute(pathname: string): boolean {
  if (isHomeTimeThemeRoute(pathname)) return false;

  const marketingPaths = [
    "/pricing",
    "/about",
    "/team",
    "/features",
    "/blog",
    "/vs-jira",
    "/contact",
  ];
  if (marketingPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }

  if (pathname.startsWith("/auth")) return false;

  return true;
}
