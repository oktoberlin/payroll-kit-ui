import { expect, test } from "@playwright/test";

import { as } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test("sign-in works on a phone", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test.describe("admin on a phone", () => {
  test.use(as("demo_admin"));

  test("the menu slides in, and the run shows cards with a full-width payslip drawer", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Payroll runs" }).click();
    await expect(page).toHaveURL(/\/runs$/);
    await page.getByRole("row", { name: /Sep 2026/ }).click();
    await expect(page.getByRole("heading", { name: /payroll$/ })).toBeVisible();

    await expect(page.getByRole("table")).toHaveCount(0); // cards instead of a wide table
    await page.getByRole("button", { name: /E001/ }).click();
    const drawer = page.getByRole("dialog", { name: "Payslip" });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(Math.round(box!.width)).toBe(390);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("employee on a phone", () => {
  test.use(as("demo_employee"));

  test("My payslips fits and has 44px download targets", async ({ page }) => {
    await page.goto("/my-payslips");
    await expect(page.getByRole("heading", { name: "Hi Dev" })).toBeVisible();
    const button = page.getByRole("button", { name: /Download Aug 2026 payslip PDF/ });
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});
