"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NewRunDialog } from "@/components/runs/NewRunDialog";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/Card";
import { RowMenu } from "@/components/ui/RowMenu";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, download, json } from "@/lib/api";
import { dateRange, monthLabel, utcStamp } from "@/lib/format";
import { invalidateRun, usePayPeriods, useRuns } from "@/lib/queries";
import type { PayrollRun } from "@/lib/types";

export default function RunsPage() {
  usePageTitle("Payroll runs");
  const runs = useRuns();
  const periods = usePayPeriods();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [deleting, setDeleting] = useState<PayrollRun | null>(null);

  const remove = useMutation({
    mutationFn: (run: PayrollRun) => api<void>(`/payroll-runs/${run.id}/`, json("DELETE")),
    onSuccess: () => {
      invalidateRun(client);
      setDeleting(null);
      toast("success", "Draft run deleted");
    },
    onError: (e) => {
      setDeleting(null);
      toast("error", e instanceof ApiError ? e.message : "Could not delete the run");
    },
  });

  async function exportCsv(run: PayrollRun) {
    const name = `payroll-register-${run.period.start_date.slice(0, 7)}.csv`;
    try {
      await download(`/payroll-runs/${run.id}/export/`, name);
      toast("success", `Exported ${name}`, `${run.payslip_count} rows · GET /api/payroll-runs/${run.id}/export/`);
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Export failed");
    }
  }

  const list = runs.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Payroll runs"
        subtitle="One run per pay period. Draft → Approved → Paid."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>
            New run
          </Button>
        }
      />
      <TableCard>
        {runs.isLoading && <SkeletonRows rows={5} cols={6} label="Loading payroll runs" />}
        {runs.isError && <ErrorState message="The payroll runs could not be loaded." onRetry={() => runs.refetch()} />}
        {runs.isSuccess && list.length === 0 && (
          <EmptyState
            icon="wallet"
            title="No payroll runs yet"
            actions={
              <Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>
                New run
              </Button>
            }
          >
            Create a run for a pay period, then calculate it to generate a payslip for every active employee.
          </EmptyState>
        )}
        {runs.isSuccess && list.length > 0 && (
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  <Th className="pl-4">Period</Th>
                  <Th>Pay date</Th>
                  <Th>Status</Th>
                  <Th align="right">Payslips</Th>
                  <Th>Calculated at</Th>
                  <Th align="right">Net total ($)</Th>
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {list.map((run) => {
                  const open = () => router.push(`/runs/${run.id}`);
                  return (
                    <Tr
                      key={run.id}
                      clickable
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(event) => event.key === "Enter" && open()}
                    >
                      <Td className="whitespace-nowrap pl-4">
                        <span className="font-medium">{monthLabel(run.period.start_date)}</span>
                        <span className="ml-1.5 font-mono text-[12px] text-ink-3">
                          {dateRange(run.period.start_date, run.period.end_date)}
                        </span>
                      </Td>
                      <Td mono className="whitespace-nowrap">
                        {run.period.pay_date}
                      </Td>
                      <Td>
                        <StatusPill status={run.status} />
                      </Td>
                      <Td money>{run.payslip_count}</Td>
                      <Td mono className="whitespace-nowrap text-[12px] text-ink-2">
                        {run.calculated_at ? `${utcStamp(run.calculated_at)}${run.is_stale ? " · stale" : ""}` : "Not calculated"}
                      </Td>
                      <Td money className="whitespace-nowrap font-medium">
                        {run.payslip_count ? <Money value={run.totals.net} /> : "—"}
                      </Td>
                      <Td className="px-2 text-right">
                        <RowMenu
                          label={`Actions for ${monthLabel(run.period.start_date)}`}
                          items={[
                            { label: "Open run", icon: "eye", onSelect: open },
                            { label: "Export CSV register", icon: "file-spreadsheet", onSelect: () => exportCsv(run) },
                            {
                              label: "Delete draft",
                              icon: "trash-2",
                              danger: true,
                              separatorBefore: true,
                              disabled: run.status !== "draft",
                              title: run.status !== "draft" ? "Only draft runs can be deleted" : "Delete this draft run",
                              onSelect: () => setDeleting(run),
                            },
                          ]}
                        />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </TableCard>

      <NewRunDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        periods={periods.data ?? []}
        runs={list}
      />
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete the ${monthLabel(deleting.period.start_date)} draft?` : ""}
        body="The draft run and any calculated payslips are removed. The pay period itself is kept."
        consequence="Only drafts can be deleted. This cannot be undone."
        cta="Delete draft"
        icon="trash-2"
        tone="rose"
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
