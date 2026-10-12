"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DeductionTypeDialog } from "@/components/deductions/DeductionTypeDialog";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Table, TableCard, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, json } from "@/lib/api";
import { displayValue, overrideText, planAssignments, valueHint, type Desired } from "@/lib/deductions";
import { cn } from "@/lib/cn";
import { invalidateRunInputs, useDeductionTypes, useEmployees } from "@/lib/queries";
import type { DeductionType, Employee } from "@/lib/types";

export default function DeductionsPage() {
  usePageTitle("Deductions & benefits");
  const types = useDeductionTypes();
  const employees = useEmployees();
  const toast = useToast();
  const client = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; type: DeductionType | null }>({ open: false, type: null });
  const [deleting, setDeleting] = useState<DeductionType | null>(null);
  const [conflict, setConflict] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, Desired>>({});
  const [draftError, setDraftError] = useState("");

  const list = types.data ?? [];
  const staff = useMemo(() => employees.data ?? [], [employees.data]);
  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of staff) for (const d of e.deductions) map.set(d.deduction_type, (map.get(d.deduction_type) ?? 0) + 1);
    return map;
  }, [staff]);

  const togglePre = useMutation({
    mutationFn: (t: DeductionType) => api<DeductionType>(`/deduction-types/${t.id}/`, json("PATCH", { pre_tax: !t.pre_tax })),
    onSuccess: (t) => {
      client.invalidateQueries({ queryKey: ["deduction-types"] });
      invalidateRunInputs(client);
      toast("info", `${t.code} is now ${t.pre_tax ? "pre-tax" : "post-tax"}`, "Draft runs need recalculation");
    },
    onError: (e) => toast("error", e instanceof ApiError ? e.message : "Could not change the type"),
  });

  const remove = useMutation({
    mutationFn: (t: DeductionType) => api<void>(`/deduction-types/${t.id}/`, json("DELETE")),
    onSuccess: (_, t) => {
      client.invalidateQueries({ queryKey: ["deduction-types"] });
      setDeleting(null);
      toast("success", `Deleted ${t.code}`);
    },
    onError: (e, t) => {
      setDeleting(null);
      if (e instanceof ApiError && e.status === 409) {
        const n = counts.get(t.id) ?? 0;
        setConflict(`${t.code} is assigned to ${n} employee${n === 1 ? "" : "s"}. Remove those assignments first, or keep the type and stop assigning it.`);
      } else toast("error", e instanceof ApiError ? e.message : "Could not delete the type");
    },
  });

  const saveAssignments = useMutation({
    mutationFn: async (employee: Employee) => {
      const plan = planAssignments(employee.deductions, Object.values(draft), list);
      if (plan.invalid.length) throw new Error("invalid");
      for (const id of plan.remove) await api<void>(`/employee-deductions/${id}/`, json("DELETE"));
      for (const u of plan.update) await api(`/employee-deductions/${u.id}/`, json("PATCH", { value: u.value }));
      for (const c of plan.create) await api("/employee-deductions/", json("POST", { employee: employee.id, ...c }));
    },
    onSuccess: (_, employee) => {
      client.invalidateQueries({ queryKey: ["employees"] });
      client.invalidateQueries({ queryKey: ["employee"] });
      invalidateRunInputs(client);
      setEditing(null);
      setDraftError("");
      toast("success", `Assignments saved for ${employee.first_name}`, "Draft runs need recalculation");
    },
    onError: (e) => setDraftError(e instanceof ApiError ? e.message : "Check the override values: whole percents or plain amounts."),
  });

  function startEdit(employee: Employee) {
    const next: Record<number, Desired> = {};
    for (const t of list) {
      const have = employee.deductions.find((d) => d.deduction_type === t.id);
      next[t.id] = { typeId: t.id, on: !!have, override: have ? overrideText(t.method, have.value) : "" };
    }
    setDraft(next);
    setDraftError("");
    setEditing(employee.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {conflict && (
        <Banner
          tone="error"
          actions={
            <button type="button" aria-label="Dismiss" onClick={() => setConflict("")} className="cursor-pointer border-0 bg-transparent p-1 text-inherit">
              <Icon name="x" />
            </button>
          }
        >
          <strong className="font-semibold">Cannot delete, it is still in use.</strong> {conflict} <span className="font-mono text-[11.5px] opacity-85">409 Conflict</span>
        </Banner>
      )}
      <PageHeader
        title="Deductions & benefits"
        subtitle="Deductions come out of employee pay. Benefits are paid by the employer and recorded, not deducted."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setDialog({ open: true, type: null })}>
            New type
          </Button>
        }
      />

      <TableCard>
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="m-0 text-lg font-semibold">Types</h2>
        </div>
        {types.isLoading && <SkeletonRows rows={4} cols={3} label="Loading deduction types" />}
        {types.isError && <ErrorState message="The deduction types could not be loaded." onRetry={() => types.refetch()} />}
        {types.isSuccess && list.length === 0 && (
          <EmptyState icon="percent" title="No deduction types" actions={<Button variant="primary" icon="plus" onClick={() => setDialog({ open: true, type: null })}>New type</Button>}>
            Add retirement, health plans or salary advances, then assign them to employees.
          </EmptyState>
        )}
        {list.length > 0 && (
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  {["Code", "Name", "Kind", "Method"].map((h) => (
                    <Th key={h} sticky={false}>{h}</Th>
                  ))}
                  <Th sticky={false} align="right">Default</Th>
                  <Th sticky={false}>Pre-tax</Th>
                  <Th sticky={false} align="right">Assigned</Th>
                  <Th sticky={false}><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => {
                  const benefit = t.kind === "benefit";
                  return (
                    <tr key={t.id} className="hover:bg-hover">
                      <Td mono className="whitespace-nowrap font-medium">{t.code}</Td>
                      <Td className="whitespace-nowrap">{t.name}</Td>
                      <Td>
                        <span className={cn("inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full border border-line-strong px-2 text-[12px] text-ink-2", benefit && "border-dashed")}>
                          <Icon name={benefit ? "gift" : "minus"} size={11} />
                          {benefit ? "Employer benefit" : "Deduction"}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-2">{t.method === "percent" ? "Percent of gross" : "Fixed amount"}</Td>
                      <Td money className="whitespace-nowrap">{displayValue(t.method, t.default_value)}</Td>
                      <Td>
                        {benefit ? (
                          <span className="text-[12px] text-ink-3">n/a · not deducted</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Switch small checked={!!t.pre_tax} label={`${t.code} pre-tax`} onChange={() => togglePre.mutate(t)} />
                            <span className="text-[12px] text-ink-2">{t.pre_tax ? "Pre-tax" : "Post-tax"}</span>
                          </span>
                        )}
                      </Td>
                      <Td money>{counts.get(t.id) ?? 0}</Td>
                      <Td className="whitespace-nowrap text-right">
                        <button type="button" title="Edit" aria-label={`Edit ${t.code}`} onClick={() => setDialog({ open: true, type: t })} className="size-7 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-ink-2 hover:border-line hover:bg-surface-2">
                          <Icon name="pencil" />
                        </button>
                        <button type="button" title="Delete" aria-label={`Delete ${t.code}`} onClick={() => setDeleting(t)} className="size-7 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-rose-fg hover:bg-rose-soft">
                          <Icon name="trash-2" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </TableCard>

      {list.length > 0 && staff.length > 0 && (
        <TableCard>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            <h2 className="m-0 text-lg font-semibold">Assignments</h2>
            <span className="text-[12px] text-ink-3">Leave the override empty to use the type default.</span>
          </div>
          {draftError && (
            <div className="px-4 pt-3">
              <Banner tone="error" icon="circle-alert">{draftError}</Banner>
            </div>
          )}
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  <Th sticky={false} className="pl-4">Employee</Th>
                  {list.map((t) => (
                    <Th key={t.id} sticky={false} className="font-mono normal-case tracking-normal">{t.code}</Th>
                  ))}
                  <Th sticky={false} className="w-[90px]"><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {staff.map((employee) => {
                  const isEditing = editing === employee.id;
                  return (
                    <tr key={employee.id} className={isEditing ? "bg-primary-soft" : undefined}>
                      <Td className="whitespace-nowrap pl-4">
                        <span className="mr-2 font-mono text-[12px] text-ink-3">{employee.employee_number}</span>
                        <span className="font-medium">{employee.first_name} {employee.last_name}</span>
                      </Td>
                      {list.map((t) => {
                        const have = employee.deductions.find((d) => d.deduction_type === t.id);
                        const want = draft[t.id];
                        return (
                          <Td key={t.id} className="whitespace-nowrap py-1">
                            {!isEditing &&
                              (have ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon name="check" className="text-primary-fg" />
                                  <span className={cn("font-mono text-[12.5px]", have.value && "font-semibold")}>{displayValue(t.method, have.value ?? t.default_value)}</span>
                                  <span className="text-[11px] text-ink-3">{have.value ? "override" : "default"}</span>
                                </span>
                              ) : (
                                <span className="text-ink-3">—</span>
                              ))}
                            {isEditing && want && (
                              <span className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={want.on}
                                  aria-label={`${t.code} for ${employee.first_name}`}
                                  onChange={(e) => setDraft((d) => ({ ...d, [t.id]: { ...want, on: e.target.checked } }))}
                                  className="size-[15px] accent-[var(--pk-primary)]"
                                />
                                <input
                                  value={want.override}
                                  placeholder={displayValue(t.method, t.default_value).replace(/ %$/, "")}
                                  disabled={!want.on}
                                  title={valueHint(t.method)}
                                  aria-label={`${t.code} override for ${employee.first_name}`}
                                  onChange={(e) => setDraft((d) => ({ ...d, [t.id]: { ...want, override: e.target.value } }))}
                                  className="pk-money h-7 w-[84px] rounded-[5px] border border-line-strong bg-surface px-1.5 text-[12px] disabled:bg-surface-2"
                                />
                              </span>
                            )}
                          </Td>
                        );
                      })}
                      <Td className="text-right">
                        {isEditing ? (
                          <Button size="sm" variant="primary" disabled={saveAssignments.isPending} onClick={() => saveAssignments.mutate(employee)}>
                            Save
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => startEdit(employee)}>
                            Edit
                          </Button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </TableCard>
      )}

      <DeductionTypeDialog open={dialog.open} type={dialog.type} onClose={() => setDialog({ open: false, type: null })} />
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete ${deleting.code}?` : ""}
        body="The type is removed. Types that are still assigned to employees cannot be deleted."
        consequence="This cannot be undone."
        cta="Delete type"
        icon="trash-2"
        tone="rose"
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
