#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const manifestPath = join(dist, "manifest.json");

if (!existsSync(manifestPath)) {
  console.error("dist/manifest.json missing. Run: bun run build");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  version?: string;
  name?: string;
};
const version = manifest.version ?? "0.0.0";
const slug = (manifest.name ?? "extension")
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-]/g, "");
const out = join(root, `${slug}-v${version}.zip`);

const zip = spawnSync("zip", ["-r", "-q", out, "."], {
  cwd: dist,
  encoding: "utf8",
});

if (zip.error) {
  console.error(zip.error.message);
  console.error(
    'Install a "zip" CLI (e.g. apt install zip), or zip dist/ manually with manifest.json at the archive root.',
  );
  process.exit(1);
}

if (zip.status !== 0) {
  console.error(zip.stderr || zip.stdout || "zip failed");
  process.exit(zip.status ?? 1);
}

console.log("Wrote", out);
