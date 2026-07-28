/**
 * Minimal IPv4 allowlist matcher: supports exact addresses ("1.2.3.4") and
 * CIDR ranges ("1.2.3.0/24"). No external dependency -- this only needs to
 * cover the common case of a handful of office/VPN ranges for admin access.
 * IPv6 entries are matched by exact string equality only (no CIDR).
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

function matchesEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;

  if (!trimmed.includes("/")) {
    return ip === trimmed;
  }

  const [rangeIp, prefixStr] = trimmed.split("/");
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(rangeIp);
  if (ipInt === null || rangeInt === null) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Returns true if `ip` matches any entry in `allowlist`. An empty allowlist
 * means "no restriction configured" -- callers should treat that as "allow
 * everyone," not "allow no one."
 */
export function isIpAllowed(ip: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => matchesEntry(ip, entry));
}
