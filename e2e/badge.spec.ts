import type { Worker } from "@playwright/test";
import { expect, test } from "./extension-fixture";

const actionBadgeText = (worker: Worker): Promise<string> =>
  worker.evaluate(() => chrome.action.getBadgeText({}));

test.describe("toolbar badge", () => {
  test("shows 1 for one upcoming alarm and clears after delete", async ({
    popupPage,
    extensionServiceWorker,
  }) => {
    await expect.poll(async () => actionBadgeText(extensionServiceWorker)).toBe("");

    const label = `Badge ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();

    await expect.poll(async () => actionBadgeText(extensionServiceWorker)).toBe("1");

    await popupPage.getByRole("button", { name: "Delete" }).click();

    await expect.poll(async () => actionBadgeText(extensionServiceWorker)).toBe("");
  });

  test("hides count when alarm is disabled", async ({
    popupPage,
    extensionServiceWorker,
  }) => {
    const label = `Badge off ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();

    await expect.poll(async () => actionBadgeText(extensionServiceWorker)).toBe("1");

    await popupPage.getByRole("checkbox", { name: /On/i }).uncheck();

    await expect.poll(async () => actionBadgeText(extensionServiceWorker)).toBe("");
  });
});
