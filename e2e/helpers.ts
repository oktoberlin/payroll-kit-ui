import { expect, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

export const as = (user: "demo_admin" | "demo_manager" | "demo_employee") => ({ storageState: authFile(user) });

/** Open the Sep 2026 run (the seeded draft) from the runs list. */
export async function openRun(page: Page, label: string) {
  await page.goto("/runs");
  await page.getByRole("row", { name: new RegExp(label) }).first().click();
  await expect(page.getByRole("heading", { name: `${label} payroll` })).toBeVisible();
}

export const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text });
