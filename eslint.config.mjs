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
    files: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

export default eslintConfig;
