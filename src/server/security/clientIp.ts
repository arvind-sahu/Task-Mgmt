import { type NextApiRequest } from "next";

/** Best-effort client IP for rate limiting behind CloudFront / proxies. */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  if (Array.isArray(forwarded)) {
    const ip = forwarded[0]?.trim();
    if (ip) return ip;
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();

  return req.socket.remoteAddress ?? "unknown";
}
