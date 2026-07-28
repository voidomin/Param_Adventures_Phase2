import { describe, it, expect } from "vitest";
import { isIpAllowed } from "@/lib/ip-allowlist";

describe("isIpAllowed", () => {
  it("allows everyone when the allowlist is empty", () => {
    expect(isIpAllowed("203.0.113.4", [])).toBe(false);
  });

  it("matches an exact IPv4 address", () => {
    expect(isIpAllowed("203.0.113.4", ["203.0.113.4"])).toBe(true);
    expect(isIpAllowed("203.0.113.5", ["203.0.113.4"])).toBe(false);
  });

  it("matches a CIDR range", () => {
    expect(isIpAllowed("198.51.100.42", ["198.51.100.0/24"])).toBe(true);
    expect(isIpAllowed("198.51.101.1", ["198.51.100.0/24"])).toBe(false);
  });

  it("matches a /32 CIDR identically to an exact address", () => {
    expect(isIpAllowed("203.0.113.4", ["203.0.113.4/32"])).toBe(true);
    expect(isIpAllowed("203.0.113.5", ["203.0.113.4/32"])).toBe(false);
  });

  it("matches against any entry in a multi-entry allowlist", () => {
    const allowlist = ["203.0.113.4", "198.51.100.0/24"];
    expect(isIpAllowed("198.51.100.9", allowlist)).toBe(true);
    expect(isIpAllowed("10.0.0.1", allowlist)).toBe(false);
  });

  it("rejects a malformed IP", () => {
    expect(isIpAllowed("not-an-ip", ["203.0.113.4"])).toBe(false);
  });

  it("rejects a malformed CIDR entry rather than throwing", () => {
    expect(isIpAllowed("203.0.113.4", ["203.0.113.0/abc"])).toBe(false);
  });

  it("ignores blank entries", () => {
    expect(isIpAllowed("203.0.113.4", ["", " ", "203.0.113.4"])).toBe(true);
  });
});
