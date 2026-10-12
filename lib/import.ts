/** A hint for fixing a row error returned by the CSV import. */
export function fixHint(error: string): string {
  const dup = /duplicate employee_number (\S+)/.exec(error);
  if (dup) return `${dup[1]} is already used in this file or by an existing employee. Give each person a unique number.`;
  if (error.includes("hourly_rate must be")) return "Add an hourly_rate, or set pay_type to salary.";
  if (error.includes("annual_salary must be")) return "Add an annual_salary, or set pay_type to hourly.";
  if (error.includes("pay_type must be")) return "Use salary or hourly. Other pay types are not supported.";
  if (error.includes("missing columns")) return "Add the missing columns to the header row.";
  if (error.includes("employee_number is required")) return "Fill in the employee number for every row.";
  if (error.includes("invalid")) return "Use plain decimals such as 54000.00 and no currency symbols.";
  return "Fix the value in this row and upload the file again.";
}

export const IMPORT_COLUMNS = ["employee_number", "first_name", "last_name", "email", "pay_type"];
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export const TEMPLATE_CSV =
  "employee_number,first_name,last_name,email,pay_type,annual_salary,hourly_rate\n" +
  "E101,Alex,Example,alex@example.com,salary,54000.00,\n" +
  "E102,Sam,Sample,sam@example.com,hourly,,22.50\n";

export function countDataRows(text: string): number {
  return Math.max(0, text.split(/\r?\n/).filter((line) => line.trim() !== "").length - 1);
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
