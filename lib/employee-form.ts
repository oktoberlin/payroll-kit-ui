import { compareMoney, isPositive, parseAmountInput } from "./money";
import type { Employee } from "./types";

export type EmployeeValues = {
  number: string;
  first: string;
  last: string;
  email: string;
  pay: "salary" | "hourly";
  salary: string;
  rate: string;
  ot: string;
  taxTable: string; // "" = none
  hire: string;
  term: string;
  active: boolean;
};

export type EmployeeErrors = Partial<Record<keyof EmployeeValues | "amount", string>>;

export function emptyEmployee(defaultTaxTable = ""): EmployeeValues {
  return {
    number: "",
    first: "",
    last: "",
    email: "",
    pay: "salary",
    salary: "",
    rate: "",
    ot: "1.50",
    taxTable: defaultTaxTable,
    hire: "",
    term: "",
    active: true,
  };
}

export function fromEmployee(e: Employee): EmployeeValues {
  return {
    number: e.employee_number,
    first: e.first_name,
    last: e.last_name,
    email: e.email,
    pay: e.pay_type,
    salary: e.annual_salary ?? "",
    rate: e.hourly_rate ?? "",
    ot: e.overtime_multiplier ?? "1.50",
    taxTable: e.tax_table ? String(e.tax_table) : "",
    hire: e.hire_date ?? "",
    term: e.termination_date ?? "",
    active: e.is_active ?? true,
  };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Client-side checks that mirror the API, so errors show before a round trip. */
export function validateEmployee(
  v: EmployeeValues,
  others: Array<{ number: string; name: string }> = [],
): EmployeeErrors {
  const errors: EmployeeErrors = {};
  const number = v.number.trim();
  if (!number) errors.number = "Employee number is required";
  else {
    const clash = others.find((o) => o.number === number);
    if (clash) errors.number = `${number} is already used by ${clash.name}`;
  }
  if (!v.first.trim()) errors.first = "First name is required";
  if (!v.last.trim()) errors.last = "Last name is required";
  if (!EMAIL.test(v.email.trim())) errors.email = "Enter a valid email address, e.g. ava@example.com";

  const amount = v.pay === "salary" ? v.salary : v.rate;
  const parsed = parseAmountInput(amount);
  if (parsed === null) errors.amount = "Use a decimal amount with up to 2 places";
  else if (!isPositive(parsed)) {
    errors.amount = v.pay === "salary" ? "annual_salary must be > 0 for salary employees" : "hourly_rate must be > 0 for hourly employees";
  }

  const ot = parseAmountInput(v.ot);
  if (ot === null) errors.ot = "Use a multiplier such as 1.50";
  else if (compareMoney(ot, "1") < 0) errors.ot = "Overtime multiplier must be at least 1";

  if (v.hire && v.term && v.term < v.hire) errors.term = `Must be on or after the hire date (${v.hire})`;
  return errors;
}

/** Request body for POST/PATCH /employees/. Amounts stay strings. */
export function toPayload(v: EmployeeValues) {
  return {
    employee_number: v.number.trim(),
    first_name: v.first.trim(),
    last_name: v.last.trim(),
    email: v.email.trim(),
    pay_type: v.pay,
    annual_salary: parseAmountInput(v.salary) ?? "0",
    hourly_rate: parseAmountInput(v.rate) ?? "0",
    overtime_multiplier: v.ot.trim(),
    tax_table: v.taxTable ? Number(v.taxTable) : null,
    is_active: v.active,
    hire_date: v.hire || null,
    termination_date: v.term || null,
  };
}

/** API field names -> form field names, so server errors land on the right input. */
export const API_FIELD: Record<string, keyof EmployeeErrors> = {
  employee_number: "number",
  first_name: "first",
  last_name: "last",
  email: "email",
  annual_salary: "amount",
  hourly_rate: "amount",
  overtime_multiplier: "ot",
  termination_date: "term",
  hire_date: "hire",
  tax_table: "taxTable",
};
