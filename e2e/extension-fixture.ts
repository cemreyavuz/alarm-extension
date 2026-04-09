import { test as base, chromium, expect, type BrowserContext, type Worker } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "..", "dist");

export { expect };

export const test = base.extend<{
  extensionContext: BrowserContext;
  extensionServiceWorker: Worker;
  extensionId: string;
  popupPage: import("@playwright/test").Page;
}>({
  extensionContext: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      // Extensions are not supported in headless Chromium; CI uses xvfb-run.
      headless: false,
      args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`],
    });
    await use(context);
    await context.close();
  },

  extensionServiceWorker: async ({ extensionContext }, use) => {
    const [existing] = extensionContext.serviceWorkers();
    const worker = existing ?? (await extensionContext.waitForEvent("serviceworker"));
    await use(worker);
  },

  extensionId: async ({ extensionServiceWorker }, use) => {
    const id = extensionServiceWorker.url().split("/")[2];
    if (!id) throw new Error("Could not parse extension id from service worker URL");
    await use(id);
  },

  popupPage: async ({ extensionContext, extensionId }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
    await page.close();
  },
});
