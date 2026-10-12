"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, RadioCard, Select, Switch } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, json } from "@/lib/api";
import {
  API_FIELD,
  emptyEmployee,
  fromEmployee,
  toPayload,
  validateEmployee,
  type EmployeeErrors,
  type EmployeeValues,
} from "@/lib/employee-form";
import { initials } from "@/lib/format";
import { formatMoney, fractionToPercent } from "@/lib/money";
import { invalidateRunInputs, useDeductionTypes, useEmployees, useTaxTables } from "@/lib/queries";
import type { Employee } from "@/lib/types";

const CARD = "flex flex-col gap-3.5 rounded-lg border border-line bg-surface p-4 shadow-1";

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const taxTables = useTaxTables();
  const types = useDeductionTypes();
  const employees = useEmployees();

  const [values, setValues] = useState<EmployeeValues>(() => (employee ? fromEmployee(employee) : emptyEmployee()));
  const [errors, setErrors] = useState<EmployeeErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof EmployeeValues>(key: K, value: EmployeeValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const others = useMemo(
    () =>
      (employees.data ?? [])
        .filter((e) => e.id !== employee?.id)
        .map((e) => ({ number: e.employee_number, name: `${e.first_name} ${e.last_name}` })),
    [employees.data, employee?.id],
  );

  const save = useMutation({
    mutationFn: () =>
      api<Employee>(employee ? `/employees/${employee.id}/` : "/employees/", json(employee ? "PATCH" : "POST", toPayload(values))),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: ["employees"] });
      client.invalidateQueries({ queryKey: ["employee"] });
      invalidateRunInputs(client);
      toast("success", `Saved ${saved.employee_number} ${saved.first_name} ${saved.last_name}`, `${employee ? "PATCH" : "POST"} /api/employees/${employee ? `${saved.id}/` : ""} · ${employee ? 200 : 201}`);
      if (!employee) router.push("/employees");
    },
    onError: (e) => {
      if (!(e instanceof ApiError)) return setFormErrors(["Something went wrong. Nothing was saved."]);
      const mapped: EmployeeErrors = {};
      for (const [field, messages] of Object.entries(e.errors.fields)) {
        const key = API_FIELD[field];
        if (key && messages[0]) mapped[key] = messages[0];
      }
      setErrors(mapped);
      setFormErrors(Object.keys(mapped).length ? [] : e.errors.form.length ? e.errors.form : [e.message]);
    },
  });

  const remove = useMutation({
    mutationFn: () => api<void>(`/employees/${employee!.id}/`, json("DELETE")),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["employees"] });
      invalidateRunInputs(client);
      toast("success", "Employee deleted");
      router.push("/employees");
    },
    onError: (e) => {
      setConfirmDelete(false);
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      else toast("error", e instanceof ApiError ? e.message : "Could not delete the employee");
    },
  });

  const deactivate = useMutation({
    mutationFn: () => api<Employee>(`/employees/${employee!.id}/`, json("PATCH", { is_active: false })),
    onSuccess: () => {
      set("active", false);
      setConflict(false);
      client.invalidateQueries({ queryKey: ["employees"] });
      client.invalidateQueries({ queryKey: ["employee"] });
      invalidateRunInputs(client);
      toast("info", "Marked inactive", "They are skipped when a run is calculated");
    },
  });

  function submit() {
    const found = validateEmployee(values, others);
    setErrors(found);
    setFormErrors([]);
    if (Object.keys(found).length === 0) save.mutate();
  }

  const errorCount = Object.keys(errors).length;
  const taxList = taxTables.data ?? [];
  const typeById = new Map((types.data ?? []).map((t) => [t.id, t]));
  const assigned = employee?.deductions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {employee && (
            <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-[15px] font-semibold text-primary-soft-fg">
              {initials(`${employee.first_name} ${employee.last_name}`)}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-2xl font-semibold">{employee ? `${employee.first_name} ${employee.last_name}` : "Add employee"}</h1>
              {employee && <span className="font-mono text-ink-3">{employee.employee_number}</span>}
            </div>
            <p className="m-0 text-ink-2">
              {employee ? `${employee.pay_type === "salary" ? "Salary" : "Hourly"} · created ${employee.created_at.slice(0, 10)}` : "New employees are active and get a payslip in the next run."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {employee && (
            <Button variant="danger" icon="trash-2" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button onClick={() => router.push("/employees")}>Cancel</Button>
          <Button variant="primary" icon="check" disabled={save.isPending} onClick={submit}>
            {employee ? "Save changes" : "Create employee"}
          </Button>
        </div>
      </div>

      {conflict && employee && (
        <Banner
          tone="error"
          actions={
            <>
              <Button size="sm" className="!border-current !bg-transparent !text-inherit font-semibold" onClick={() => deactivate.mutate()}>
                Mark inactive
              </Button>
              <button type="button" aria-label="Dismiss" onClick={() => setConflict(false)} className="cursor-pointer border-0 bg-transparent p-1 text-inherit">
                <Icon name="x" />
              </button>
            </>
          }
        >
          <strong className="font-semibold">Cannot delete, it is still in use.</strong> {employee.employee_number} has payslips in payroll runs. Mark the employee inactive instead to leave them out of future runs.{" "}
          <span className="font-mono text-[11.5px] opacity-85">409 Conflict</span>
        </Banner>
      )}
      {(errorCount > 0 || formErrors.length > 0) && (
        <Banner tone="error" icon="circle-alert">
          {formErrors.length > 0 ? (
            <>
              <strong className="font-semibold">{formErrors[0]}</strong> Nothing was saved.
            </>
          ) : (
            <>
              <strong className="font-semibold">{errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}</strong> Nothing was saved.
            </>
          )}
        </Banner>
      )}

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
        <section className={CARD}>
          <h2 className="m-0 text-lg font-semibold">Identity</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee number" error={errors.number}>
              {({ id, invalid }) => <Input id={id} mono={false} className="font-mono" invalid={invalid} value={values.number} onChange={(e) => set("number", e.target.value)} />}
            </Field>
            <Field label="Email" error={errors.email}>
              {({ id, invalid }) => <Input id={id} invalid={invalid} value={values.email} onChange={(e) => set("email", e.target.value)} />}
            </Field>
            <Field label="First name" error={errors.first}>
              {({ id, invalid }) => <Input id={id} invalid={invalid} value={values.first} onChange={(e) => set("first", e.target.value)} />}
            </Field>
            <Field label="Last name" error={errors.last}>
              {({ id, invalid }) => <Input id={id} invalid={invalid} value={values.last} onChange={(e) => set("last", e.target.value)} />}
            </Field>
          </div>
          <h2 className="m-0 mt-1.5 text-lg font-semibold">Employment</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hire date" hint="Optional · prorates the first period" error={errors.hire}>
              {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} className="font-mono" value={values.hire} onChange={(e) => set("hire", e.target.value)} />}
            </Field>
            <Field label="Termination date" hint="Last day employed · prorates the last period" error={errors.term}>
              {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} className="font-mono" value={values.term} onChange={(e) => set("term", e.target.value)} />}
            </Field>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch checked={values.active} onChange={(v) => set("active", v)} label="Active" />
            <span className="flex flex-col">
              <span className="font-medium">{values.active ? "Active" : "Inactive"}</span>
              <span className="text-[12px] text-ink-3">Inactive employees are skipped when a run is calculated.</span>
            </span>
          </div>
        </section>

        <section className={CARD}>
          <h2 className="m-0 text-lg font-semibold">Pay</h2>
          <div role="radiogroup" aria-label="Pay type" className="grid grid-cols-2 gap-2">
            <RadioCard checked={values.pay === "salary"} onChange={() => set("pay", "salary")} title="Salary" description="Annual amount / periods per year" />
            <RadioCard checked={values.pay === "hourly"} onChange={() => set("pay", "hourly")} title="Hourly" description="Rate × timesheet hours" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={values.pay === "salary" ? "Annual salary" : "Hourly rate"} error={errors.amount}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  mono
                  prefix="$"
                  inputMode="decimal"
                  invalid={invalid}
                  value={values.pay === "salary" ? values.salary : values.rate}
                  onChange={(e) => set(values.pay === "salary" ? "salary" : "rate", e.target.value)}
                />
              )}
            </Field>
            <Field label="Overtime multiplier" error={errors.ot}>
              {({ id, invalid }) => <Input id={id} mono invalid={invalid} value={values.ot} onChange={(e) => set("ot", e.target.value)} />}
            </Field>
          </div>
          <Field label="Tax table">
            {({ id }) => (
              <Select id={id} value={values.taxTable} onChange={(e) => set("taxTable", e.target.value)}>
                {taxList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="">None (no tax withheld)</option>
              </Select>
            )}
          </Field>
          <div className="mt-1.5 flex items-center justify-between">
            <h2 className="m-0 text-lg font-semibold">Deductions &amp; benefits</h2>
            <Link href="/deductions" className="inline-flex items-center gap-1 font-medium no-underline">
              Manage
              <Icon name="arrow-right" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-line">
            {assigned.length === 0 && <div className="px-3 py-2 text-ink-3">{employee ? "Nothing assigned." : "Assign deductions after creating the employee."}</div>}
            {assigned.map((a) => {
              const t = typeById.get(a.deduction_type);
              if (!t) return null;
              const value = a.value ?? t.default_value ?? "0";
              const shown = t.method === "percent" ? `${fractionToPercent(value)} %` : formatMoney(value);
              return (
                <div key={a.id} className="grid min-h-[34px] grid-cols-[64px_1fr_auto] items-center gap-2.5 border-b border-line px-3 last:border-b-0">
                  <span className="font-mono text-[12px] text-ink-3">{t.code}</span>
                  <span>
                    {t.name} <span className="text-[12px] text-ink-3">· {t.kind === "benefit" ? "benefit" : t.pre_tax ? "pre-tax" : "post-tax"}</span>
                  </span>
                  <span className="font-mono">
                    {shown} <span className="font-sans text-[11.5px] text-ink-3">{a.value ? "override" : "default"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={employee ? `Delete ${employee.first_name} ${employee.last_name}?` : ""}
        body="The employee record is removed. Employees that already appear in a payroll run cannot be deleted; mark them inactive instead."
        consequence="This cannot be undone."
        cta="Delete employee"
        icon="trash-2"
        tone="rose"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
