"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { TaxTableCard } from "@/components/tax/TaxTableCard";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { IllustrativeBadge } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, json } from "@/lib/api";
import { invalidateRunInputs, useEmployees, useTaxTables } from "@/lib/queries";
import { newTable } from "@/lib/tax";
import type { TaxTable } from "@/lib/types";

export default function TaxPage() {
  usePageTitle("Tax tables");
  const tables = useTaxTables();
  const employees = useEmployees();
  const toast = useToast();
  const client = useQueryClient();
  const [deleting, setDeleting] = useState<TaxTable | null>(null);
  const [conflict, setConflict] = useState("");

  const create = useMutation({
    mutationFn: () => api<TaxTable>("/tax-tables/", json("POST", newTable())),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tax-tables"] });
      toast("success", "Tax table created", "Edit its brackets below");
    },
    onError: (e) => toast("error", e instanceof ApiError ? e.message : "Could not create the table"),
  });

  const remove = useMutation({
    mutationFn: (t: TaxTable) => api<void>(`/tax-tables/${t.id}/`, json("DELETE")),
    onSuccess: (_, t) => {
      client.invalidateQueries({ queryKey: ["tax-tables"] });
      invalidateRunInputs(client);
      setDeleting(null);
      toast("success", `Deleted ${t.name}`);
    },
    onError: (e, t) => {
      setDeleting(null);
      if (e instanceof ApiError && e.status === 409) setConflict(`${t.name} is used by employees. Move them to another table first.`);
      else toast("error", e instanceof ApiError ? e.message : "Could not delete the table");
    },
  });

  const list = tables.data ?? [];
  const usage = (id: number) => (employees.data ?? []).filter((e) => e.tax_table === id).length;

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
        title="Tax tables"
        badge={<IllustrativeBadge />}
        subtitle="Annual progressive brackets. Taxable pay is annualised, taxed, then divided by periods per year."
        actions={
          <Button icon="plus" disabled={create.isPending} onClick={() => create.mutate()}>
            New tax table
          </Button>
        }
      />
      {tables.isLoading && <SkeletonRows rows={5} cols={4} label="Loading tax tables" />}
      {tables.isError && <ErrorState message="The tax tables could not be loaded." onRetry={() => tables.refetch()} />}
      {tables.isSuccess && list.length === 0 && (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon="landmark" title="No tax tables" actions={<Button variant="primary" icon="plus" onClick={() => create.mutate()}>New tax table</Button>}>
            Without a tax table, employees are paid without tax withheld.
          </EmptyState>
        </div>
      )}
      {list.map((table) => (
        <TaxTableCard key={`${table.id}-${tables.dataUpdatedAt}`} table={table} employeeCount={usage(table.id)} onDelete={() => setDeleting(table)} />
      ))}
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete ${deleting.name}?` : ""}
        body="The table and its brackets are removed. Tables that employees use cannot be deleted."
        consequence="This cannot be undone."
        cta="Delete table"
        icon="trash-2"
        tone="rose"
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
