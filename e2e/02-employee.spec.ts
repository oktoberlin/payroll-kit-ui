import { expect, test } from "@playwright/test";

import { as } from "./helpers";

test.use(as("demo_employee"));

test.describe("employee self-service (demo_employee = Dev Patel)", () => {
  test("only sees their own approved and paid payslips", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/my-payslips/); // staff screens redirect an employee home
    await expect(page.getByRole("link", { name: "Payroll runs" })).toHaveCount(0);
    await expect(page.getByText("Latest payslip · Aug 2026")).toBeVisible();
    await expect(page.getByText("Sep 2026")).toHaveCount(0); // the September run is still a draft
    const rows = page.getByRole("list").last().getByRole("listitem");
    await expect(rows).toHaveCount(8);
  });

  test("downloads a payslip PDF", async ({ page }) => {
    await page.goto("/my-payslips");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
    expect(download.suggestedFilename()).toBe("payslip-E004-2026-08.pdf");
    const fs = await import("node:fs");
    expect(fs.readFileSync((await download.path())!).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("opens a payslip that reconciles to the cent and shows year to date", async ({ page }) => {
    await page.goto("/my-payslips");
    await page.getByRole("button", { name: "View details" }).click();
    await expect(page.getByRole("heading", { name: "Aug 2026 payslip" })).toBeVisible();
    await expect(page.getByText("Adds up to the cent")).toBeVisible();
    await expect(page.getByLabel("Reconciliation")).toContainText("3,193.29"); // Aug net, as on the list
    await expect(page.getByLabel("Year to date")).toContainText(/gross\s*30,352\.50/); // seven earlier months + August
    await expect(page.getByText("Employer benefits")).toBeVisible();
    await expect(page.getByText("Not deducted")).toBeVisible();
  });

  test("cannot read other people's payslips through the API", async ({ page }) => {
    const response = await page.request.get("/api/payslips/");
    const body = await response.json();
    expect(body.count).toBe(8);
    expect(body.results.every((p: { employee_number: string }) => p.employee_number === "E004")).toBe(true);
    expect((await page.request.get("/api/audit-logs/")).status()).toBe(403);
  });
});
