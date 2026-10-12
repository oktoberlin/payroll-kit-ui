import { expect, test } from "@playwright/test";

import { as, openRun, toast } from "./helpers";

test.use(as("demo_manager"));

test.describe("payroll manager", () => {
  test("can calculate, but approve, reopen and mark paid are disabled with a reason", async ({ page }) => {
    await openRun(page, "Sep 2026");
    const approve = page.getByRole("button", { name: /Approve/ });
    await expect(approve).toHaveAttribute("aria-disabled", "true");
    await approve.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Admin only");
    await approve.click({ force: true }); // aria-disabled: the click must do nothing
    await expect(page.getByRole("alertdialog")).toHaveCount(0); // nothing opens
    await expect(page.getByText("Approve, Reopen and Mark paid are admin only")).toBeVisible();

    await page.getByRole("button", { name: /Calculate/ }).click();
    await expect(toast(page, "Nothing changed, no recalculation needed")).toBeVisible(); // the run is already calculated
    await expect(toast(page, "X-Recalculated: false")).toBeVisible();
  });

  test("gets a 403 screen for the audit log and no audit item in the menu", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
    await expect(page.getByText("Recent audit events")).toHaveCount(0);
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "You do not have access" })).toBeVisible();
    await expect(page.getByText("403 · Forbidden")).toBeVisible();
  });
});
