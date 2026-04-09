import { defineConfig } from "@playwright/test";

import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: "list",
  retries: process.env.CI ? 1 : 0,
  testDir: path.join(root, "e2e"),
  timeout: 60_000,
  workers: 1,
});
