import { describe, expect, it } from "vitest";

import { isPrivateIp, parseLoginDevice } from "./loginAudit";

describe("parseLoginDevice", () => {
  it("detects desktop macOS", () => {
    const device = parseLoginDevice(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );
    expect(device.deviceType).toBe("desktop");
    expect(device.deviceOs).toBe("macOS");
    expect(device.deviceLabel).toContain("Desktop");
  });

  it("detects mobile android", () => {
    const device = parseLoginDevice(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36",
    );
    expect(device.deviceType).toBe("mobile");
    expect(device.deviceOs).toBe("Android");
  });

  it("detects linux desktop", () => {
    const device = parseLoginDevice(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );
    expect(device.deviceType).toBe("desktop");
    expect(device.deviceOs).toBe("Linux");
  });
});

describe("isPrivateIp", () => {
  it("flags localhost and RFC1918 addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.4")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
});
