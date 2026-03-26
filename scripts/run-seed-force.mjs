import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  FORCE_SEED: "true",
  NODE_ENV: "production",
};

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCmd, ["prisma", "db", "seed"], {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error("Failed to execute seed command:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
