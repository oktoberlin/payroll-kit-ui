import { compareMoney, formatMoney, subMoney } from "./money";
import type { Payslip, PayslipDetail } from "./types";

export type SlipGroup = {
  key: "earning" | "pre_tax" | "tax" | "post_tax" | "benefit";
  title: string;
  lines: Array<{ code: string; description: string; amount: string }>;
  totalLabel: string;
  total: string;
  after?: { label: string; amount: string };
  muted?: boolean;
  tag?: string;
};

/** The itemised sections of a payslip, in the order they are applied. Totals come from the API. */
export function payslipGroups(slip: Payslip | PayslipDetail): SlipGroup[] {
  const lines = (kind: string) =>
    slip.lines.filter((line) => line.kind === kind).map(({ code, description, amount }) => ({ code, description, amount }));
  return [
    { key: "earning", title: "Earnings", lines: lines("earning"), totalLabel: "Gross pay", total: slip.gross },
    {
      key: "pre_tax",
      title: "Pre-tax deductions",
      lines: lines("pre_tax"),
      totalLabel: "Total pre-tax",
      total: slip.pre_tax_deductions,
      after: { label: "Taxable pay", amount: slip.taxable },
    },
    { key: "tax", title: "Tax", lines: lines("tax"), totalLabel: "Total tax", total: slip.tax },
    { key: "post_tax", title: "Post-tax deductions", lines: lines("post_tax"), totalLabel: "Total post-tax", total: slip.post_tax_deductions },
    {
      key: "benefit",
      title: "Employer benefits",
      lines: lines("benefit"),
      totalLabel: "Paid by employer",
      total: slip.employer_benefits,
      muted: true,
      tag: "Not deducted",
    },
  ];
}

/** gross - pre-tax - tax - post-tax, summed exactly. It must equal net to the cent. */
export function reconciles(slip: Payslip): boolean {
  return compareMoney(subMoney(slip.gross, slip.pre_tax_deductions, slip.tax, slip.post_tax_deductions), slip.net) === 0;
}

export function equation(slip: Payslip): string {
  const f = formatMoney;
  return `${f(slip.gross)} − ${f(slip.pre_tax_deductions)} − ${f(slip.tax)} − ${f(slip.post_tax_deductions)} = ${f(slip.net)}`;
}

export function rateLabel(slip: Payslip): string {
  return slip.pay_type === "salary"
    ? `Salary · ${formatMoney(slip.annual_salary)} / yr`
    : `Hourly · ${formatMoney(slip.hourly_rate)} / h`;
}
