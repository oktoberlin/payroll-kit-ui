import { expect, test } from "@playwright/test";

test.describe("signing in", () => {
  test("a signed-out visitor is sent to the sign-in screen", async ({ page }) => {
    await page.goto("/runs");
    await expect(page).toHaveURL(/\/login\?next=%2Fruns/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("All data is fake.")).toBeVisible();
  });

  test("a wrong password shows an error and stays on the page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("demo_admin");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect username or password" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the manager demo account lands on the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Sign in as demo_manager/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: /demo_manager/ })).toBeVisible();
  });

  test("the employee demo account lands on My payslips and can switch account and sign out", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Sign in as demo_employee/ }).click();
    await expect(page).toHaveURL(/\/my-payslips/);
    await expect(page.getByRole("heading", { name: "Hi Dev" })).toBeVisible();

    await page.getByRole("button", { name: /demo_employee/ }).click();
    await page.getByRole("menuitem", { name: /demo_admin/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: /demo_admin/ })).toBeVisible();

    await page.getByRole("button", { name: /demo_admin/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
