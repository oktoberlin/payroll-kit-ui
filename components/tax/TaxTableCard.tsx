"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { IllustrativeBadge } from "@/components/ui/StatusPill";
import { Table, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, json } from "@/lib/api";
import { cn } from "@/lib/cn";
import { invalidateRunInputs } from "@/lib/queries";
import { toBrackets, toRows, validateBrackets, type BracketRow } from "@/lib/tax";
import type { TaxTable } from "@/lib/types";

const CELL = "pk-money h-control w-full rounded-[5px] border bg-surface px-2";

/** One tax table with an editable bracket grid. Saved brackets apply the next time a draft run is calculated. */
export function TaxTableCard({ table, employeeCount, onDelete }: { table: TaxTable; employeeCount: number; onDelete: () => void }) {
  const toast = useToast();
  const client = useQueryClient();
  const saved = useMemo(() => toRows(table.brackets), [table.brackets]);
  const [name, setName] = useState(table.name);
  const [rows, setRows] = useState<BracketRow[]>(saved);
  const [serverError, setServerError] = useState("");
  const { errors, list } = validateBrackets(rows);
  const blocked = list.length > 0 || !name.trim();

  const patch = (i: number, change: Partial<BracketRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...change } : row)));

  const save = useMutation({
    mutationFn: () => api<TaxTable>(`/tax-tables/${table.id}/`, json("PATCH", { name: name.trim(), brackets: toBrackets(rows) })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tax-tables"] });
      invalidateRunInputs(client);
      setServerError("");
      toast("success", "Tax brackets saved", "Draft runs need recalculation");
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : "Could not save the brackets."),
  });

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-1">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
        <Icon name="landmark" className="text-ink-3" />
        <Input aria-label="Tax table name" value={name} onChange={(e) => setName(e.target.value)} className="!h-[30px] !w-[260px] !text-lg !font-semibold" />
        <span className="text-[12px] text-ink-3">
          Used by {employeeCount} employee{employeeCount === 1 ? "" : "s"} · not real tax rules
        </span>
        <span className="ml-auto flex items-center gap-2">
          <IllustrativeBadge />
          <button
            type="button"
            title="Delete table"
            aria-label={`Delete ${table.name}`}
            onClick={onDelete}
            className="size-7 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-rose-fg hover:bg-rose-soft"
          >
            <Icon name="trash-2" />
          </button>
        </span>
      </div>
      {list.length > 0 && (
        <div className="px-4 pt-3">
          <Banner tone="error" icon="circle-alert">
            <strong className="font-semibold">
              {list.length} problem{list.length > 1 ? "s" : ""} to fix before saving
            </strong>
            <ul className="m-0 mt-1 pl-4">
              {list.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}
      {serverError && (
        <div className="px-4 pt-3">
          <Banner tone="error">{serverError}</Banner>
        </div>
      )}
      <div className="overflow-auto py-1">
        <Table>
          <thead>
            <tr>
              <Th sticky={false} className="w-12 pl-4">#</Th>
              <Th sticky={false} align="right">Lower ($ / yr)</Th>
              <Th sticky={false} align="right">Upper ($ / yr)</Th>
              <Th sticky={false} align="right" className="w-[140px]">Rate (%)</Th>
              <Th sticky={false} className="w-12"><span className="sr-only">Remove</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-line py-1.5 pl-4 pr-3 align-top font-mono leading-8 text-ink-3">{i + 1}</td>
                <td className="border-b border-line px-3 py-1.5 align-top">
                  <input aria-label={`Bracket ${i + 1} lower`} aria-invalid={!!errors[i].lower || undefined} value={row.lower} onChange={(e) => patch(i, { lower: e.target.value })} className={cn(CELL, errors[i].lower ? "border-rose" : "border-line-strong")} />
                  {errors[i].lower && <div className="mt-1 flex items-center justify-end gap-[5px] text-[12px] text-rose-fg"><Icon name="circle-alert" />{errors[i].lower}</div>}
                </td>
                <td className="border-b border-line px-3 py-1.5 align-top">
                  <span className="flex items-center gap-2.5">
                    {row.noCap ? (
                      <span className="flex h-control flex-1 items-center justify-end gap-1.5 rounded-[5px] border border-dashed border-line-strong px-2 text-ink-2">
                        <Icon name="infinity" />
                        No cap
                      </span>
                    ) : (
                      <input aria-label={`Bracket ${i + 1} upper`} aria-invalid={!!errors[i].upper || undefined} value={row.upper} onChange={(e) => patch(i, { upper: e.target.value })} className={cn(CELL, "min-w-0 flex-1", errors[i].upper ? "border-rose" : "border-line-strong")} />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-2">
                      <input type="checkbox" checked={row.noCap} onChange={() => patch(i, { noCap: !row.noCap })} className="accent-[var(--pk-primary)]" />
                      No cap
                    </label>
                  </span>
                  {errors[i].upper && <div className="mt-1 flex items-center justify-end gap-[5px] text-[12px] text-rose-fg"><Icon name="circle-alert" />{errors[i].upper}</div>}
                </td>
                <td className="border-b border-line px-3 py-1.5 align-top">
                  <Input aria-label={`Bracket ${i + 1} rate`} mono suffix="%" invalid={!!errors[i].rate} value={row.rate} onChange={(e) => patch(i, { rate: e.target.value })} />
                  {errors[i].rate && <div className="mt-1 flex items-center justify-end gap-[5px] text-[12px] text-rose-fg"><Icon name="circle-alert" />{errors[i].rate}</div>}
                </td>
                <td className="border-b border-line py-1.5 pl-0 pr-3 text-right align-top">
                  <button type="button" aria-label="Remove bracket" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="size-8 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-rose-soft hover:text-rose-fg">
                    <Icon name="x" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-4 py-2.5">
        <Button icon="plus" onClick={() => setRows((r) => [...r, { lower: "", upper: "", noCap: true, rate: "" }])}>
          Add bracket
        </Button>
        <span className="text-[12px] text-ink-3">Changes apply to draft runs the next time they are calculated.</span>
        <span className="flex-1" />
        <Button
          onClick={() => {
            setRows(saved);
            setName(table.name);
            setServerError("");
          }}
        >
          Reset
        </Button>
        <Button variant="primary" icon="check" disabled={blocked || save.isPending} onClick={() => save.mutate()}>
          Save brackets
        </Button>
      </div>
    </section>
  );
}
