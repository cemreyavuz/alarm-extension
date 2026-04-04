#!/usr/bin/env bun
import { mkdirSync, existsSync, copyFileSync, readdirSync, watch } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const htmxSrc = join(root, "public/vendor/htmx.min.js");
const htmxUrl = "https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js";

async function ensureHtmx(): Promise<void> {
  mkdirSync(join(root, "public/vendor"), { recursive: true });
  if (existsSync(htmxSrc)) return;
  console.warn("Fetching htmx.min.js …");
  const r = await fetch(htmxUrl);
  if (!r.ok) throw new Error(`htmx fetch failed: ${r.status}`);
  await Bun.write(htmxSrc, await r.arrayBuffer());
}

async function buildOnce(): Promise<void> {
  await ensureHtmx();

  mkdirSync(dist, { recursive: true });
  mkdirSync(join(dist, "vendor"), { recursive: true });
  mkdirSync(join(dist, "icons"), { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(root, "src/background.ts"), join(root, "src/popup.ts")],
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
  copyFileSync(htmxSrc, join(dist, "vendor/htmx.min.js"));

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
