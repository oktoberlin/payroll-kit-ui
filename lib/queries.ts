"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api, ApiError, fetchAll } from "./api";
import type {
  AuditLog,
  DeductionType,
  Employee,
  Me,
  PayPeriod,
  PayrollRun,
  Payslip,
  PayslipDetail,
  TaxTable,
  TimesheetEntry,
} from "./types";

const noRetryOnClientErrors = (count: number, error: unknown) =>
  !(error instanceof ApiError && error.status < 500) && count < 1;

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me/"), staleTime: 60_000, retry: false });
}

export function useRuns(enabled = true) {
  return useQuery({
    queryKey: ["runs"],
    queryFn: () => fetchAll<PayrollRun>("/payroll-runs/"),
    enabled,
    retry: noRetryOnClientErrors,
  });
}

export function useRun(id: number) {
  return useQuery({ queryKey: ["run", id], queryFn: () => api<PayrollRun>(`/payroll-runs/${id}/`), retry: noRetryOnClientErrors });
}

export function useRunPayslips(runId: number | null) {
  return useQuery({
    queryKey: ["run-payslips", runId],
    queryFn: () => fetchAll<Payslip>(`/payslips/?run=${runId}`),
    enabled: runId !== null,
  });
}

export function usePayslip(id: number | null) {
  return useQuery({
    queryKey: ["payslip", id],
    queryFn: () => api<PayslipDetail>(`/payslips/${id}/`),
    enabled: id !== null,
    retry: noRetryOnClientErrors,
  });
}

export function useMyPayslips(enabled: boolean) {
  return useQuery({ queryKey: ["my-payslips"], queryFn: () => fetchAll<Payslip>("/payslips/"), enabled });
}

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: () => fetchAll<Employee>("/employees/") });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => api<Employee>(`/employees/${id}/`),
    enabled: id !== null,
    retry: noRetryOnClientErrors,
  });
}

export function useDeductionTypes() {
  return useQuery({ queryKey: ["deduction-types"], queryFn: () => fetchAll<DeductionType>("/deduction-types/") });
}

export function useTaxTables() {
  return useQuery({ queryKey: ["tax-tables"], queryFn: () => fetchAll<TaxTable>("/tax-tables/") });
}

export function usePayPeriods() {
  return useQuery({ queryKey: ["periods"], queryFn: () => fetchAll<PayPeriod>("/pay-periods/") });
}

export function useTimesheets(periodId: number | null) {
  return useQuery({
    queryKey: ["timesheets", periodId],
    queryFn: () => fetchAll<TimesheetEntry>(`/timesheets/?pay_period=${periodId}`),
    enabled: periodId !== null,
  });
}

export function useAuditLog(enabled: boolean) {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () => fetchAll<AuditLog>("/audit-logs/"),
    enabled,
    retry: noRetryOnClientErrors,
  });
}

/** After anything that changes a run: refresh the run, its payslips, the lists and the audit trail. */
export function invalidateRun(client: QueryClient, runId?: number) {
  client.invalidateQueries({ queryKey: ["runs"] });
  if (runId !== undefined) {
    client.invalidateQueries({ queryKey: ["run", runId] });
    client.invalidateQueries({ queryKey: ["run-payslips", runId] });
  }
  client.invalidateQueries({ queryKey: ["payslip"] });
  client.invalidateQueries({ queryKey: ["audit"] });
}

/** After timesheets, deductions, tax tables or employees change: draft runs may now be stale. */
export function invalidateRunInputs(client: QueryClient) {
  client.invalidateQueries({ queryKey: ["runs"] });
  client.invalidateQueries({ queryKey: ["run"] });
  client.invalidateQueries({ queryKey: ["audit"] });
}

export function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function useRole() {
  return useMe().data?.role;
}
