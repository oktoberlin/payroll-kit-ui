import { expect, test } from "@playwright/test";

import { as, openRun, toast } from "./helpers";

test.use(as("demo_admin"));

test.describe("errors are specific and nothing is half-saved", () => {
  test("a duplicate employee number names the person who has it", async ({ page }) => {
    await page.goto("/employees/new");
    await page.getByLabel("Employee number").fill("E002");
    await page.getByLabel("First name").fill("New");
    await page.getByLabel("Last name").fill("Person");
    await page.getByLabel("Email").fill("new@example.com");
    await page.getByLabel("Annual salary").fill("50000");
    await page.getByRole("button", { name: "Create employee" }).click();
    await expect(page.getByText("E002 is already used by Ben Carter")).toBeVisible();
    await expect(page.getByText("Nothing was saved.")).toBeVisible();
  });

  test("an employee with payslips cannot be deleted (409), and the page offers to mark them inactive", async ({ page }) => {
    await page.goto("/employees");
    await page.getByRole("row", { name: /E001/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete employee" }).click();
    await expect(page.getByText("Cannot delete, it is still in use.")).toBeVisible();
    await expect(page.getByText("409 Conflict")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark inactive" })).toBeVisible();
  });

  test("CSV import is all or nothing, with a message per bad row", async ({ page }) => {
    await page.goto("/employees/import");
    const csv =
      "employee_number,first_name,last_name,email,pay_type,annual_salary,hourly_rate\n" +
      "A3,Cy,Three,c@example.com,salary,40000,\n" +
      "E001,Dup,Four,d@example.com,salary,40000,\n" +
      "A4,Ed,Five,e@example.com,weekly,,\n";
    await page.locator('input[type="file"]').setInputFiles({ name: "new-hires.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText("No employees were imported")).toBeVisible();
    await expect(page.getByText("new-hires.csv has 2 rows with errors")).toBeVisible();
    await expect(page.getByText("duplicate employee_number E001")).toBeVisible();
    await expect(page.getByText("pay_type must be salary or hourly")).toBeVisible();
    await page.goto("/employees");
    await expect(page.getByText("6 of 6")).toBeVisible(); // the valid row A3 was not imported either
  });

  test("a deduction type that is assigned cannot be deleted", async ({ page }) => {
    await page.goto("/deductions");
    await page.getByRole("button", { name: "Delete RET" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete type" }).click();
    await expect(page.getByText("Cannot delete, it is still in use.")).toBeVisible();
    await expect(page.getByText(/RET is assigned to 6 employees/)).toBeVisible();
  });

  test("tax brackets must be contiguous and rates between 0 and 100", async ({ page }) => {
    await page.goto("/tax");
    await page.getByLabel("Bracket 3 lower").fill("48,000.00");
    await page.getByLabel("Bracket 4 rate").fill("130");
    await expect(page.getByText("Should be 50,000.00")).toBeVisible();
    await expect(page.getByText("Between 0 and 100", { exact: true })).toBeVisible();
    await expect(page.getByText("2 problems to fix before saving")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save brackets" })).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("problems to fix")).toHaveCount(0);
  });

  test("timesheet hours are validated, and a saved change makes the draft run stale until recalculated", async ({ page }) => {
    await page.goto("/timesheets");
    await page.getByLabel("Pay period").selectOption({ label: "Sep 2026 · draft run" });
    const regular = page.getByLabel("Ella Moore regular hours");
    await regular.fill("12O");
    await expect(page.getByText("Hours ≥ 0, max 2 decimals")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save timesheets" })).toHaveAttribute("aria-disabled", "true");
    await regular.fill("120");
    await page.getByLabel("Finn Lee overtime hours").fill("8");
    await expect(page.getByText("Edited, not saved")).toBeVisible();
    await expect(page.getByText("1 unsaved change")).toBeVisible();
    await page.getByRole("button", { name: "Save timesheets" }).click();
    await expect(toast(page, "Timesheets saved")).toBeVisible();

    await openRun(page, "Sep 2026");
    await expect(page.getByText("Inputs changed since the last calculation.")).toBeVisible();
    const approve = page.getByRole("button", { name: /^Approve/ });
    await expect(approve).toHaveAttribute("aria-disabled", "true");
    await approve.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Recalculate first: inputs changed");
    await page.getByRole("button", { name: "Recalculate" }).click();
    await expect(toast(page, "Recalculated 6 payslips")).toBeVisible();
    await expect(page.getByText("Inputs changed since the last calculation.")).toHaveCount(0);
  });
});
