/**
 * High-Security Whitelist for Master Configuration UI.
 * Only these emails can access system-level settings regardless of role.
 *
 * Deliberately hardcoded rather than DB/role-backed: this is the last line of
 * defense for secrets/system config, so it must not be revocable by anyone
 * who merely gains SUPER_ADMIN in the database (e.g. via a compromised admin
 * account or an operator mistake) -- only a code change + deploy can add or
 * remove an entry here.
 */
export const SYSTEM_ADMIN_EMAILS = [
  "paramadventures@zohomail.in",
  "booking@paramadventures.in",
  "dev@paramadventures.in",
  "info@paramadventures.in",
];
