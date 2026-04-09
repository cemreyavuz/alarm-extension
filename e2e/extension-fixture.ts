import type { BrowserContext, Page, Worker } from "@playwright/test";
import { test as base, chromium, expect } from "@playwright/test";

import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "..", "dist");

const test = base.extend<{
  extensionContext: BrowserContext;
  extensionServiceWorker: Worker;
  extensionId: string;
  popupPage: Page;
}>({
  extensionContext: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      // Extensions are not supported in headless Chromium; CI uses xvfb-run.
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
      ],
      headless: false,
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ extensionServiceWorker }, use) => {
    const [_, __, id] = extensionServiceWorker.url().split("/");
    if (!id) {
      throw new Error("Could not parse extension id from service worker URL");
    }
    await use(id);
  },

  extensionServiceWorker: async ({ extensionContext }, use) => {
    const [existing] = extensionContext.serviceWorkers();
    const worker =
      existing ?? (await extensionContext.waitForEvent("serviceworker"));
    await use(worker);
  },

  popupPage: async ({ extensionContext, extensionId }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
    await page.close();
  },
});

export { expect, test };
