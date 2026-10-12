"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Card, PageHeader, StatCard } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { usePageTitle } from "@/hooks/usePageTitle";
import { describeAudit } from "@/lib/audit";
import { FREQUENCIES, dateRange, monthLabel, shortStamp, weekday } from "@/lib/format";
import { addMoney, compareMoney, ratio } from "@/lib/money";
import { useAuditLog, useEmployees, useRole, useRunPayslips, useRuns } from "@/lib/queries";
import { statusLine } from "@/lib/run";

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const role = useRole();
  const isAdmin = role === "admin";
  const runs = useRuns();
  const employees = useEmployees();
  const audit = useAuditLog(isAdmin);
  const latest = runs.data?.[0] ?? null;
  const slips = useRunPayslips(latest?.id ?? null);

  const costs = useMemo(() => {
    const rows = (slips.data ?? []).map((slip) => ({
      id: slip.id,
      name: slip.employee_name,
      cost: addMoney(slip.gross, slip.employer_benefits),
      gross: slip.gross,
      benefits: slip.employer_benefits,
    }));
    const top = rows.reduce((max, row) => (compareMoney(row.cost, max) > 0 ? row.cost : max), rows[0]?.cost ?? "1");
    return rows
      .sort((a, b) => compareMoney(b.cost, a.cost))
      .map((row) => ({ ...row, g: ratio(row.gross, top) * 100, b: ratio(row.benefits, top) * 100 }));
  }, [slips.data]);

  if (runs.isError) return <ErrorState message="The dashboard could not be loaded." onRetry={() => runs.refetch()} />;
  if (runs.isLoading || employees.isLoading) return <SkeletonRows rows={6} cols={4} label="Loading dashboard" />;

  const staff = employees.data ?? [];
  const active = staff.filter((e) => e.is_active);
  const salaried = active.filter((e) => e.pay_type === "salary").length;
  const hourly = active.length - salaried;
  const inactive = staff.length - active.length;

  if (!latest) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Dashboard" subtitle="Northwind Demo Co" />
        <Card className="p-8 text-center text-ink-2">No payroll runs yet. Create one under Payroll runs.</Card>
      </div>
    );
  }

  const label = monthLabel(latest.period.start_date);
  const totals = latest.totals;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        subtitle={`Northwind Demo Co · ${FREQUENCIES[latest.period.periods_per_year ?? 12].toLowerCase()} payroll · USD`}
        actions={
          <Link
            href={`/runs/${latest.id}`}
            className="inline-flex h-control items-center gap-1.5 whitespace-nowrap rounded bg-primary px-3 font-medium !text-white no-underline hover:bg-primary-hover"
          >
            Open {label} run
            <Icon name="arrow-right" />
          </Link>
        }
      />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <StatCard icon="calendar-range" label="Current pay period" hint={<span className="font-mono">{dateRange(latest.period.start_date, latest.period.end_date)}</span>}>
          <div className="text-2xl font-semibold">{label}</div>
        </StatCard>
        <StatCard
          icon="calendar-check"
          label="Next pay date"
          hint={`${weekday(latest.period.pay_date)} · ${FREQUENCIES[latest.period.periods_per_year ?? 12].toLowerCase()}, ${latest.period.periods_per_year} periods / year`}
        >
          <div className="pk-money text-left text-2xl font-semibold">{latest.period.pay_date}</div>
        </StatCard>
        <StatCard
          icon="users"
          label="Headcount"
          hint={`${salaried} salaried · ${hourly} hourly · ${inactive ? `${inactive} inactive` : "all active"}`}
        >
          <div className="font-mono text-2xl font-semibold">{active.length}</div>
        </StatCard>
        <StatCard icon="wallet" label="Latest run status" hint={statusLine(latest)}>
          <div className="mt-2.5 flex items-center gap-2">
            <StatusPill status={latest.status} />
            {latest.is_stale && (
              <span className="inline-flex items-center gap-1 text-[12px] text-amber-fg">
                <Icon name="triangle-alert" />
                Needs recalculation
              </span>
            )}
          </div>
        </StatCard>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <Card className="flex flex-col">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <h2 className="m-0 text-lg font-semibold">Latest run totals</h2>
            <span className="text-[12px] text-ink-3">
              {label} · {latest.payslip_count} payslips
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
            <div>
              <div className="text-[12px] text-ink-2">Total gross ($)</div>
              <Money value={totals.gross} className="mt-1 block text-left text-3xl font-medium tracking-[-0.02em]" />
            </div>
            <div>
              <div className="text-[12px] text-ink-2">Total net ($)</div>
              <Money value={totals.net} className="mt-1 block text-left text-3xl font-medium tracking-[-0.02em] text-primary-fg" />
            </div>
          </div>
          <dl className="m-0 grid grid-cols-[1fr_auto] px-4 pb-3.5 pt-1 text-base">
            {(
              [
                ["Pre-tax deductions", totals.pre_tax_deductions, ""],
                ["Tax (illustrative)", totals.tax, ""],
                ["Post-tax deductions", totals.post_tax_deductions, ""],
                ["Employer benefits · not deducted", totals.employer_benefits, "text-ink-3"],
              ] as const
            ).map(([name, value, tone]) => (
              <div key={name} className="contents">
                <dt className={`border-t border-line py-[7px] ${tone || "text-ink-2"}`}>{name}</dt>
                <dd className={`m-0 border-t border-line py-[7px] text-right ${tone}`}>
                  <Money value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="px-4 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-semibold">Payroll cost by employee</h2>
              <p className="m-0 mt-0.5 text-[12px] text-ink-3">Gross pay + employer benefits, {label} ($)</p>
            </div>
            <div className="flex gap-3 text-[12px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" />
                Gross
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-chart2" />
                Employer benefits
              </span>
            </div>
          </div>
          <div role="list" className="mt-3.5 flex flex-col gap-[9px]">
            {slips.isLoading && <SkeletonRows rows={4} cols={2} label="Loading costs" />}
            {costs.map((row) => (
              <div
                key={row.id}
                role="listitem"
                title={`${row.name}: gross ${row.gross} + benefits ${row.benefits} = ${row.cost}`}
                className="grid grid-cols-[96px_1fr_76px] items-center gap-2.5"
              >
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-ink-2">{row.name}</span>
                <span className="flex h-3.5 overflow-hidden rounded-[3px] bg-surface-2">
                  <span className="bg-primary" style={{ width: `${row.g}%` }} />
                  <span className="bg-chart2" style={{ width: `${row.b}%` }} />
                </span>
                <Money value={row.cost} className="text-[12px]" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="m-0 text-lg font-semibold">Recent audit events</h2>
            <Link href="/audit" className="inline-flex items-center gap-1 font-medium no-underline">
              View audit log
              <Icon name="arrow-right" />
            </Link>
          </div>
          <ul className="m-0 list-none p-0">
            {(audit.data ?? []).slice(0, 5).map((entry) => {
              const d = describeAudit(entry);
              return (
                <li key={entry.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line px-4 py-[9px] last:border-b-0">
                  <span className="grid size-6 place-items-center rounded-md border border-line bg-surface-2 text-ink-2">
                    <Icon name={d.icon} size={13} />
                  </span>
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="font-mono text-[12px]">{entry.actor ?? "system"}</span> <span className="text-ink-2">{d.verb}</span>{" "}
                    <span className="font-medium">{d.object}</span>
                  </span>
                  <span className="font-mono text-[12px] text-ink-3">{shortStamp(entry.created_at)}</span>
                </li>
              );
            })}
            {audit.isLoading && <SkeletonRows rows={3} cols={3} label="Loading audit events" />}
          </ul>
        </Card>
      )}
    </div>
  );
}
