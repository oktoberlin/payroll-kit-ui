import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { as } from "./helpers";

async function scan(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => document.documentElement.setAttribute("data-pk-theme", t), theme);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

test.describe("accessibility (WCAG A/AA, serious and critical)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`login, ${theme}`, async ({ page }) => {
      await page.goto("/login");
      await scan(page, theme);
    });

    test.describe("signed in as admin", () => {
      test.use(as("demo_admin"));
      for (const [name, path] of [
        ["dashboard", "/dashboard"],
        ["payroll runs", "/runs"],
        ["employees", "/employees"],
        ["deductions", "/deductions"],
        ["tax tables", "/tax"],
        ["audit log", "/audit"],
      ] as const) {
        test(`${name}, ${theme}`, async ({ page }) => {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.waitForLoadState("networkidle");
          await scan(page, theme);
        });
      }

      test(`run detail with the payslip drawer open, ${theme}`, async ({ page }) => {
        await page.goto("/runs");
        await page.getByRole("row", { name: /Sep 2026/ }).click();
        await page.getByRole("row", { name: /E001/ }).click();
        await expect(page.getByRole("dialog", { name: "Payslip" })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await scan(page, theme);
      });
    });

    test.describe("signed in as employee", () => {
      test.use(as("demo_employee"));
      test(`my payslips, ${theme}`, async ({ page }) => {
        await page.goto("/my-payslips");
        await expect(page.getByRole("heading", { name: "Hi Dev" })).toBeVisible();
        await scan(page, theme);
      });
    });
  }
});
