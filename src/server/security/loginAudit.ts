import { type NextApiRequest } from "next";

import { db } from "~/server/db";
import { getClientIp } from "~/server/security/clientIp";

export type ParsedLoginDevice = {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  deviceOs: string;
  deviceLabel: string;
};

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

export function isPrivateIp(ip: string) {
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) {
    return true;
  }
  return false;
}

/** Best-effort user-agent parsing without extra dependencies. */
export function parseLoginDevice(userAgent: string | undefined): ParsedLoginDevice {
  const ua = userAgent ?? "";
  const isTablet = /iPad|Tablet|Kindle|Silk|PlayBook/i.test(ua);
  const isMobile =
    !isTablet &&
    /Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);

  let deviceType: ParsedLoginDevice["deviceType"] = "desktop";
  if (isTablet) deviceType = "tablet";
  else if (isMobile) deviceType = "mobile";
  else if (!ua.trim()) deviceType = "unknown";

  let deviceOs = "Unknown OS";
  if (/Windows NT/i.test(ua)) deviceOs = "Windows";
  else if (/Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) deviceOs = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) deviceOs = "iOS";
  else if (/Android/i.test(ua)) deviceOs = "Android";
  else if (/CrOS/i.test(ua)) deviceOs = "ChromeOS";
  else if (/Linux/i.test(ua)) deviceOs = "Linux";

  const formFactor =
    deviceType === "mobile"
      ? "Mobile"
      : deviceType === "tablet"
        ? "Tablet"
        : deviceType === "desktop"
          ? "Desktop"
          : "Device";

  return {
    deviceType,
    deviceOs,
    deviceLabel: `${formFactor} · ${deviceOs}`,
  };
}

export async function resolveIpLocation(ip: string): Promise<string | null> {
  if (isPrivateIp(ip)) return "Local network";

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,regionName`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: string;
      city?: string;
      regionName?: string;
      country?: string;
    };

    if (data.status !== "success") return null;

    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

export async function recordLoginAudit(input: {
  userId: string;
  method: string;
  req: NextApiRequest;
}) {
  const ipAddress = getClientIp(input.req);
  const userAgentHeader = input.req.headers["user-agent"];
  const userAgent =
    typeof userAgentHeader === "string"
      ? truncate(userAgentHeader, 512)
      : undefined;
  const device = parseLoginDevice(userAgent);
  const locationLabel = await resolveIpLocation(ipAddress);

  await db.loginAudit.create({
    data: {
      userId: input.userId,
      method: input.method,
      ipAddress: ipAddress === "unknown" ? null : ipAddress,
      userAgent: userAgent ?? null,
      deviceType: device.deviceType,
      deviceOs: device.deviceOs,
      deviceLabel: device.deviceLabel,
      locationLabel,
    },
  });
}
