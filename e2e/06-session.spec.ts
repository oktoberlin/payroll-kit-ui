import { expect, test } from "@playwright/test";

import { as } from "./helpers";

test.use(as("demo_admin"));

test("an expired session offers to sign back in and carries on", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: /demo_admin/ }).click();
  await page.getByRole("menuitem", { name: "Simulate session expiry" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Your session has expired" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /Sign in again as demo_admin/ }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/runs");
  await expect(page.getByRole("heading", { name: "Payroll runs" })).toBeVisible();
});
