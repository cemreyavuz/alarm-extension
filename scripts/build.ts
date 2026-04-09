#!/usr/bin/env bun
import {
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  watch,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");

async function buildOnce(): Promise<void> {
  mkdirSync(dist, { recursive: true });
  const vendorDist = join(dist, "vendor");
  if (existsSync(vendorDist)) {
    rmSync(vendorDist, { recursive: true });
  }
  const partialsDist = join(dist, "partials");
  if (existsSync(partialsDist)) {
    rmSync(partialsDist, { recursive: true });
  }
  mkdirSync(join(dist, "icons"), { recursive: true });

  const result = await Bun.build({
    entrypoints: [
      join(root, "src/background.ts"),
      join(root, "src/popup.ts"),
      join(root, "src/options.ts"),
    ],
    outdir: dist,
    target: "browser",
    format: "esm",
    minify: true,
    sourcemap: "none",
  });

  if (!result.success) {
    console.error(result.logs);
    throw new Error("Build failed");
  }

  copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
  copyFileSync(join(root, "public/popup.html"), join(dist, "popup.html"));
  copyFileSync(join(root, "public/popup.css"), join(dist, "popup.css"));
  copyFileSync(join(root, "public/options.html"), join(dist, "options.html"));

  const iconsDir = join(root, "public/icons");
  if (existsSync(iconsDir)) {
    for (const f of readdirSync(iconsDir)) {
      if (f.endsWith(".png")) {
        copyFileSync(join(iconsDir, f), join(dist, "icons", f));
      }
    }
  }

  console.log("Built to", dist);
}

const watchMode = process.argv.includes("--watch");

if (watchMode) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      void buildOnce().catch((e) => console.error(e));
    }, 120);
  };

  await buildOnce();
  watch(join(root, "src"), { recursive: true }, schedule);
  watch(join(root, "public"), { recursive: true }, schedule);
  watch(join(root, "manifest.json"), schedule);

  await new Promise<void>(() => {});
} else {
  await buildOnce();
}
