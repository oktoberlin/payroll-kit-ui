"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Forbidden } from "@/components/ui/Forbidden";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Table, TableCard, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { describeAudit, diffLines } from "@/lib/audit";
import { cn } from "@/lib/cn";
import { utcStamp } from "@/lib/format";
import { useAuditLog, useMe } from "@/lib/queries";

export default function AuditPage() {
  usePageTitle("Audit log");
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const audit = useAuditLog(isAdmin);
  const toast = useToast();
  const [action, setAction] = useState("");
  const [type, setType] = useState("");
  const [actor, setActor] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const all = useMemo(() => audit.data ?? [], [audit.data]);
  const uniq = (pick: (e: (typeof all)[number]) => string) => [...new Set(all.map(pick))].sort();
  const rows = useMemo(
    () => all.filter((e) => (!action || e.action === action) && (!type || e.object_type === type) && (!actor || (e.actor ?? "system") === actor)),
    [all, action, type, actor],
  );
  const filtered = !!(action || type || actor);
  const clear = () => {
    setAction("");
    setType("");
    setActor("");
  };

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("success", "Exported audit-log.json", `${rows.length} events`);
  }

  if (me.data && !isAdmin) return <Forbidden me={me.data} what="The audit log is available to admins only." />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audit log"
        badge={
          <span className="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full border border-line-strong px-2 text-[12px] text-ink-2">
            <Icon name="lock" size={11} />
            Append-only
          </span>
        }
        subtitle="Every create, update, calculation, approval, payment and import. Entries can never be edited."
        actions={
          <Button icon="download" onClick={exportJson} disabled={rows.length === 0}>
            Export JSON
          </Button>
        }
      />
      <TableCard>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3 py-2.5">
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            Action
            <Select value={action} onChange={(e) => { setAction(e.target.value); setOpen(null); }} className="!h-[30px] !w-auto font-mono !text-[12px]">
              <option value="">All actions</option>
              {uniq((e) => e.action).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            Object
            <Select value={type} onChange={(e) => { setType(e.target.value); setOpen(null); }} className="!h-[30px] !w-auto">
              <option value="">All objects</option>
              {uniq((e) => e.object_type).map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            Actor
            <Select value={actor} onChange={(e) => { setActor(e.target.value); setOpen(null); }} className="!h-[30px] !w-auto font-mono !text-[12px]">
              <option value="">Anyone</option>
              {uniq((e) => e.actor ?? "system").map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </label>
          {filtered && (
            <Button variant="ghost" size="sm" icon="x" className="!text-primary-fg" onClick={clear}>
              Clear
            </Button>
          )}
          {audit.isSuccess && <span className="ml-auto text-[12px] text-ink-3">{rows.length} events</span>}
        </div>
        {(audit.isLoading || me.isLoading) && <SkeletonRows rows={6} cols={5} label="Loading audit log" />}
        {audit.isError && <ErrorState message="The audit log could not be loaded." onRetry={() => audit.refetch()} />}
        {audit.isSuccess && all.length === 0 && (
          <EmptyState icon="scroll-text" tone="neutral" title="No audit events yet">
            Events appear here as soon as anyone creates, changes, calculates or approves something.
          </EmptyState>
        )}
        {audit.isSuccess && all.length > 0 && rows.length === 0 && (
          <EmptyState icon="scroll-text" tone="neutral" title="No events match these filters" actions={<Button icon="filter-x" onClick={clear}>Clear filters</Button>}>
            Try another action, object type or actor.
          </EmptyState>
        )}
        {rows.length > 0 && (
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"><span className="sr-only">Expand</span></Th>
                  <Th>Time (UTC)</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Object</Th>
                  <Th className="pr-4">Summary</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const d = describeAudit(entry);
                  const expanded = open === entry.id;
                  const toggle = () => setOpen(expanded ? null : entry.id);
                  const border = expanded ? "border-b-transparent" : "";
                  return (
                    <Fragment key={entry.id}>
                      <tr onClick={toggle} className={cn("cursor-pointer hover:bg-hover", expanded && "bg-surface-2")}>
                        <Td className={cn("pl-3.5 pr-0", border)}>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Show"} changes: ${d.verb} ${d.object}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle();
                            }}
                            className="grid size-6 cursor-pointer place-items-center rounded border-0 bg-transparent text-ink-3 hover:bg-hover"
                          >
                            <Icon name={expanded ? "chevron-down" : "chevron-right"} />
                          </button>
                        </Td>
                        <Td mono className={cn("whitespace-nowrap text-[12.5px]", border)}>{utcStamp(entry.created_at)}</Td>
                        <Td mono className={cn("whitespace-nowrap text-[12.5px]", border)}>{entry.actor ?? "system"}</Td>
                        <Td className={border}>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-line bg-surface-2 px-[7px] py-0.5 font-mono text-[12px]">
                            <Icon name={d.icon} size={12} className="text-ink-3" />
                            {entry.action}
                          </span>
                        </Td>
                        <Td className={cn("whitespace-nowrap", border)}>
                          {entry.object_type} <span className="font-mono text-ink-3">#{entry.object_id}</span>
                        </Td>
                        <Td className={cn("pr-4 text-ink-2", border)}>{d.verb} {d.object}</Td>
                      </tr>
                      {expanded && (
                        <tr className="bg-surface-2">
                          <td className="border-b border-line" />
                          <td colSpan={5} className="border-b border-line pb-3.5 pl-3 pr-4 pt-1">
                            <div className="mb-1.5 flex items-center gap-2 text-[12px] text-ink-3">
                              <span className="font-semibold uppercase tracking-[.05em]">changes</span>
                              <span className="font-mono">GET /api/audit-logs/{entry.id}/</span>
                            </div>
                            <pre className="m-0 overflow-auto rounded-[8px] border border-line bg-surface px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
                              <span className="text-ink-3">{"{"}</span>
                              {diffLines(entry.changes).map((line, i) => (
                                <span
                                  key={i}
                                  className={cn("-mx-1.5 block rounded-[3px] px-1.5", line.sign === "+" ? "bg-primary-soft text-primary-soft-fg" : "bg-rose-soft text-rose-fg")}
                                >
                                  <span aria-label={line.sign === "+" ? "added" : "removed"} className="inline-block w-4 font-semibold">{line.sign}</span>
                                  {`  "${line.key}": ${line.value}`}
                                </span>
                              ))}
                              <span className="text-ink-3">{"}"}</span>
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
