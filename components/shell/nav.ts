import type { IconName } from "@/components/ui/Icon";
import type { Role } from "@/lib/types";

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { label: string; items: NavItem[] };

export function navFor(role: Role): NavGroup[] {
  if (role === "employee") {
    return [{ label: "Me", items: [{ href: "/my-payslips", label: "My payslips", icon: "file-text" }] }];
  }
  const groups: NavGroup[] = [
    { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }] },
    {
      label: "Payroll",
      items: [
        { href: "/runs", label: "Payroll runs", icon: "wallet" },
        { href: "/periods", label: "Pay periods", icon: "calendar-range" },
        { href: "/timesheets", label: "Timesheets", icon: "clock" },
      ],
    },
    { label: "People", items: [{ href: "/employees", label: "Employees", icon: "users" }] },
    {
      label: "Setup",
      items: [
        { href: "/deductions", label: "Deductions & benefits", icon: "percent" },
        { href: "/tax", label: "Tax tables", icon: "landmark" },
      ],
    },
  ];
  if (role === "admin") {
    groups.push({ label: "Admin", items: [{ href: "/audit", label: "Audit log", icon: "scroll-text" }] });
  }
  return groups;
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type Crumb = { label: string; href?: string };

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  runs: "Payroll runs",
  employees: "Employees",
  periods: "Pay periods",
  timesheets: "Timesheets",
  deductions: "Deductions & benefits",
  tax: "Tax tables",
  audit: "Audit log",
  "my-payslips": "My payslips",
};

/** Breadcrumbs from the URL. A detail page supplies its own last label (a period, a person). */
export function crumbsFor(pathname: string, lastLabel: string | null): Crumb[] {
  const [section, child] = pathname.split("/").filter(Boolean);
  const title = TITLES[section] ?? "";
  if (!child) return [{ label: title }];
  const detail =
    child === "new" ? "New employee" : child === "import" ? "Import CSV" : (lastLabel ?? "…");
  return [{ label: title, href: `/${section}` }, { label: detail }];
}

/** Pages that show the "illustrative tax" footer note. */
export function showsTaxNote(pathname: string): boolean {
  return ["/dashboard", "/runs/", "/tax", "/my-payslips"].some((p) => pathname === p || pathname.startsWith(p));
}
