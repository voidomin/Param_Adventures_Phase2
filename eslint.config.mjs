import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "dist/**",
      "vitest.setup.shared.ts",
      "vitest.setup.ui.ts",
      "*.setup.ts",
      "*.setup.*.ts",
      "lint-results.txt",
      "lint-final.txt",
      "backup_current.sql",
      "generate-tests.mjs",
      "coverage/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    // Warn (not error) so this doesn't fail the existing lint CI gate
    // outright against ~300 pre-existing calls -- the goal is to stop the
    // count from growing via visible feedback in new PRs, not force an
    // unrelated mass cleanup in this change. console.error/warn/info stay
    // allowed: error/warn are how most routes already surface failures
    // (increasingly bridged to Sentry too, see sentry.server.config.ts),
    // and info is used for deliberate startup/diagnostic lines
    // (lib/monitoring.ts). Only bare console.log is flagged.
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    files: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
