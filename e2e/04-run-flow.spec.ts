import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { as, openRun, toast } from "./helpers";

test.use(as("demo_admin"));

test("a payroll run goes from new draft to paid and locked", async ({ page }) => {
  // 1. create a run for the open October period
  await page.goto("/runs");
  await page.getByRole("button", { name: "New run" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New payroll run" });
  await expect(dialog.getByRole("radio", { name: /Sep 2026/ })).toBeDisabled(); // already has a run
  await dialog.getByRole("button", { name: "Create draft run" }).click();
  await expect(toast(page, "Draft run created for Oct 2026")).toBeVisible();

  // 2. nothing to approve until it has been calculated
  await openRun(page, "Oct 2026");
  const approve = page.getByRole("button", { name: /^Approve/ });
  await expect(approve).toHaveAttribute("aria-disabled", "true");
  await approve.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Calculate the run first");

  // 3. hourly employees have no hours yet: the error names who, and where to fix it
  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(toast(page, /E004 Dev Patel: pre-tax deductions exceed gross pay/)).toBeVisible();
  await page.goto("/timesheets");
  await page.getByLabel("Pay period").selectOption({ label: "Oct 2026 · draft run" });
  await page.getByLabel("Dev Patel regular hours").fill("160");
  await page.getByLabel("Ella Moore regular hours").fill("120");
  await page.getByLabel("Finn Lee regular hours").fill("168");
  await page.getByRole("button", { name: "Save timesheets" }).click();
  await expect(toast(page, "Timesheets saved")).toBeVisible();
  await openRun(page, "Oct 2026");

  // 4. calculate; a second calculate changes nothing (idempotent), shown from the response header
  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(toast(page, "Recalculated 6 payslips")).toBeVisible();
  await expect(toast(page, "X-Recalculated: true")).toBeVisible();
  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(toast(page, "Nothing changed, no recalculation needed")).toBeVisible();
  await expect(toast(page, "X-Recalculated: false")).toBeVisible();

  // 5. open a payslip: itemised, reconciles, keyboard navigation, Esc closes
  await page.getByRole("row", { name: /E001 Ava Stone/ }).click();
  const drawer = page.getByRole("dialog", { name: "Payslip" });
  await expect(drawer.getByRole("heading", { name: "Ava Stone" })).toBeVisible();
  await expect(drawer.getByText("Adds up to the cent")).toBeVisible();
  await expect(drawer.getByText("6,000.00 − 420.00 − 690.93 − 0.00 = 4,889.07")).toBeVisible(); // seeded worked example
  await page.keyboard.press("ArrowDown");
  await expect(drawer.getByRole("heading", { name: "Ben Carter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);

  // 6. approve (admin), with a confirmation that states the consequence
  await approve.click();
  const confirm = page.getByRole("alertdialog", { name: "Approve Oct 2026 payroll?" });
  await expect(confirm.getByText("Approved runs are read-only until reopened.")).toBeVisible();
  await confirm.getByRole("button", { name: "Approve run" }).click();
  await expect(toast(page, "Run approved")).toBeVisible();
  await expect(page.getByLabel("Run status").getByText("Approved by demo_admin")).toBeVisible();

  // 7. reopen and approve again
  await page.getByRole("button", { name: /^Reopen/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Reopen run" }).click();
  await expect(toast(page, "Run reopened as draft")).toBeVisible();
  await approve.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve run" }).click();
  await expect(page.getByRole("button", { name: /^Mark paid/ })).not.toHaveAttribute("aria-disabled", "true");

  // 8. mark paid needs an explicit tick, then the run is locked
  await page.getByRole("button", { name: /^Mark paid/ }).click();
  const paid = page.getByRole("alertdialog", { name: "Mark Oct 2026 as paid?" });
  await expect(paid.getByText("Paid runs cannot be changed. Not even by an admin.")).toBeVisible();
  const cta = paid.getByRole("button", { name: "Mark paid" });
  await expect(cta).toHaveAttribute("aria-disabled", "true");
  await paid.getByRole("checkbox").check();
  await cta.click();
  await expect(page.getByText("This run is paid and locked")).toBeVisible();
  await expect(page.getByText("Read-only", { exact: true })).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Run actions" })).toHaveCount(0);

  // 9. export the register: formula-safe CSV
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV register" }).click()]);
  expect(file.suggestedFilename()).toBe("payroll-register-2026-10.csv");
  const csv = fs.readFileSync((await file.path())!, "utf8");
  expect(csv.split("\n")[0]).toBe("employee_number,employee_name,gross,pre_tax_deductions,taxable,tax,post_tax_deductions,employer_benefits,net");
  expect(csv).toContain("E001,Ava Stone,6000.00,420.00,5580.00,690.93,0.00,180.00,4889.07");

  // 10. the audit log recorded it, by user
  await page.goto("/audit");
  const row = page.getByRole("row", { name: /payroll_run\.paid.*marked paid Oct 2026 run/ });
  await expect(row.first()).toContainText("demo_admin");
  await row.first().click();
  await expect(page.getByText('"status": "approved"')).toBeVisible(); // the removed line
  await expect(page.getByText('"status": "paid"')).toBeVisible(); // the added line
  await expect(page.getByText('"paid_by": "demo_admin"')).toBeVisible();
});
