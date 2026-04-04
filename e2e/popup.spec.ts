import { test, expect } from "./extension-fixture";

test.describe("popup", () => {
  test("shows title and empty state", async ({ popupPage }) => {
    await expect(popupPage.getByRole("heading", { name: "Alarms" })).toBeVisible();
    await expect(popupPage.getByText("No alarms yet.")).toBeVisible();
  });

  test("adds an alarm and lists it", async ({ popupPage }) => {
    const label = `E2E ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();

    const row = popupPage.locator(".row").filter({ hasText: label });
    await expect(row).toBeVisible();
    await expect(row.locator(".when")).not.toBeEmpty();
  });

  test("deletes an alarm", async ({ popupPage }) => {
    const label = `Delete me ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();
    await expect(popupPage.locator(".row").filter({ hasText: label })).toBeVisible();

    await popupPage.getByRole("button", { name: "Delete" }).click();
    await expect(popupPage.getByText("No alarms yet.")).toBeVisible();
  });

  test("preset +5 min sets the when field", async ({ popupPage }) => {
    const when = popupPage.getByLabel("When");
    const before = await when.inputValue();
    await popupPage.getByRole("button", { name: "+5 min" }).click();
    const after = await when.inputValue();
    expect(after).not.toBe(before);
    expect(after.length).toBeGreaterThan(0);
  });

  test("toggle disables and re-enables alarm", async ({ popupPage }) => {
    const label = `Toggle ${Date.now()}`;
    await popupPage.getByLabel("Label").fill(label);
    await popupPage.getByRole("button", { name: "Add alarm" }).click();

    const toggle = popupPage.getByRole("checkbox", { name: /On/i });
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(toggle).toBeChecked();
  });
});
