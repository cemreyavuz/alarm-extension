import { expect, test } from "./extension-fixture";

test.describe("popup", () => {
  test("shows title and empty state", async ({ popupPage }) => {
    await expect(
      popupPage.getByRole("heading", { name: "nudgememaybe" }),
    ).toBeVisible();
    await expect(popupPage.getByText("No alarms yet.")).toBeVisible();
  });

  test("adds an alarm and lists it", async ({ popupPage }) => {
    const label = `E2E ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();

    const list = popupPage.locator("#alarm-list");
    const row = list.locator(".justify-between").filter({ hasText: label });
    await expect(row).toBeVisible();
    await expect(row.locator(".flex-col strong").nth(1)).not.toHaveText("");
  });

  test("deletes an alarm", async ({ popupPage }) => {
    const label = `Delete me ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();
    await expect(
      popupPage
        .locator("#alarm-list .justify-between")
        .filter({ hasText: label }),
    ).toBeVisible();

    await popupPage.getByRole("button", { name: "Delete" }).click();
    await expect(popupPage.getByText("No alarms yet.")).toBeVisible();
  });

  test("preset +1m sets the when field", async ({ popupPage }) => {
    const when = popupPage.getByLabel("When");
    const before = await when.inputValue();
    await popupPage.getByRole("button", { name: "+1m" }).click();
    const after = await when.inputValue();
    expect(after).not.toBe(before);
    expect(after.length).toBeGreaterThan(0);
  });
});
