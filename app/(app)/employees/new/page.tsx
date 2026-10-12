"use client";

import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTaxTables } from "@/lib/queries";

export default function NewEmployeePage() {
  usePageTitle("New employee");
  const taxTables = useTaxTables();
  if (taxTables.isLoading) return <div aria-busy="true" className="text-ink-3">Loading…</div>;
  return <EmployeeForm />;
}
