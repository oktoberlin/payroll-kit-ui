import type { components } from "./api-types";

type S = components["schemas"];

export type Me = S["Me"];
export type Role = Me["role"];
export type PayrollRun = S["PayrollRun"];
export type RunStatus = PayrollRun["status"];
export type Payslip = S["Payslip"];
export type PayslipDetail = S["PayslipDetail"];
export type PayslipLine = S["PayslipLine"];
export type Employee = S["Employee"];
export type EmployeeDeduction = S["EmployeeDeduction"];
export type AssignDeduction = S["AssignDeduction"];
export type DeductionType = S["DeductionType"];
export type PayPeriod = S["PayPeriod"];
export type TimesheetEntry = S["TimesheetEntry"];
export type TaxTable = S["TaxTable"];
export type TaxBracket = S["TaxBracket"];
export type AuditLog = S["AuditLog"];

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Result of POST /employees/import/ */
export type ImportResult = {
  created: number;
  errors: Array<{ row: number; error: string }>;
};
