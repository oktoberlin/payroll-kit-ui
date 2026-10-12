import type { IconName } from "@/components/ui/Icon";

import type { Role } from "./types";

/** The three public demo logins (the password is published in the README and on the sign-in screen). */
export const DEMO_PASSWORD = "demo-pass-123";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  payroll_manager: "Payroll manager",
  employee: "Employee",
};

export const DEMO_ACCOUNTS: Array<{ user: string; role: Role; desc: string; icon: IconName }> = [
  { user: "demo_admin", role: "admin", desc: "approve, reopen, mark paid, audit log", icon: "shield-check" },
  { user: "demo_manager", role: "payroll_manager", desc: "employees, periods, timesheets, calculate", icon: "briefcase" },
  { user: "demo_employee", role: "employee", desc: "own payslips and PDFs (Dev Patel)", icon: "user" },
];

export function homeFor(role: Role): string {
  return role === "employee" ? "/my-payslips" : "/dashboard";
}
