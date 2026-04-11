#!/usr/bin/env bun
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  watch,
} from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");

const buildOnce = async (): Promise<void> => {
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
    format: "esm",
    minify: true,
    outdir: dist,
    sourcemap: "none",
    target: "browser",
  });

  if (!result.success) {
    console.error(result.logs);
    throw new Error("Build failed");
  }

  copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
  copyFileSync(join(root, "public/popup.html"), join(dist, "popup.html"));
  copyFileSync(join(root, "public/popup.css"), join(dist, "popup.css"));
  copyFileSync(join(root, "public/options.html"), join(dist, "options.html"));
  copyFileSync(join(root, "public/options.css"), join(dist, "options.css"));
  copyFileSync(
    join(root, "node_modules/@picocss/pico/css/pico.min.css"),
    join(dist, "pico.min.css"),
  );

  const iconsDir = join(root, "public/icons");
  if (existsSync(iconsDir)) {
    for (const filename of readdirSync(iconsDir)) {
      if (filename.endsWith(".png")) {
        copyFileSync(join(iconsDir, filename), join(dist, "icons", filename));
      }
    }
  }

  console.log("Built to", dist);
};

const watchMode = process.argv.includes("--watch");

if (watchMode) {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
  const schedule = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      void buildOnce().catch((error) => console.error(error));
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
