"use client";

import { useParams } from "next/navigation";

import { useCrumbLabel } from "@/components/shell/crumbs";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { useEmployee } from "@/lib/queries";

export default function EmployeePage() {
  const id = Number(useParams<{ id: string }>().id);
  const employee = useEmployee(id);
  const name = employee.data ? `${employee.data.employee_number} ${employee.data.first_name} ${employee.data.last_name}` : null;
  useCrumbLabel(name);
  usePageTitle(name);

  if (employee.isError) {
    const missing = employee.error instanceof ApiError && employee.error.status === 404;
    return <ErrorState title={missing ? "Employee not found" : undefined} message={missing ? "This employee does not exist, or belongs to another company." : "The employee could not be loaded."} onRetry={() => employee.refetch()} />;
  }
  if (!employee.data) return <SkeletonRows rows={6} cols={3} label="Loading employee" />;
  // key: a different employee (or a fresh save) resets the form state
  return <EmployeeForm key={`${employee.data.id}-${employee.dataUpdatedAt}`} employee={employee.data} />;
}
