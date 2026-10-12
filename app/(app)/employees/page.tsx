"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEmployees, useTaxTables } from "@/lib/queries";

type Pay = "all" | "salary" | "hourly";
type Active = "active" | "inactive" | "all";

export default function EmployeesPage() {
  usePageTitle("Employees");
  const employees = useEmployees();
  const taxTables = useTaxTables();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pay, setPay] = useState<Pay>("all");
  const [active, setActive] = useState<Active>("active");

  const all = useMemo(() => employees.data ?? [], [employees.data]);
  const tableName = useMemo(() => new Map((taxTables.data ?? []).map((t) => [t.id, t.name])), [taxTables.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (e) =>
        (pay === "all" || e.pay_type === pay) &&
        (active === "all" || (active === "active") === (e.is_active ?? true)) &&
        (!q || `${e.employee_number} ${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(q)),
    );
  }, [all, query, pay, active]);

  const clear = () => {
    setQuery("");
    setPay("all");
    setActive("active");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Employees"
        subtitle="Active employees get a payslip in every run for their pay period."
        actions={
          <>
            <Button icon="upload" onClick={() => router.push("/employees/import")}>
              Import CSV
            </Button>
            <Button variant="primary" icon="plus" onClick={() => router.push("/employees/new")}>
              Add employee
            </Button>
          </>
        }
      />
      <TableCard>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3 py-2.5">
          <label className="relative flex max-w-[300px] flex-[1_1_220px] items-center">
            <Icon name="search" className="absolute left-2.5 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, number or email"
              aria-label="Search employees"
              className="h-control w-full rounded border border-line-strong bg-surface pl-[30px] pr-2.5"
            />
          </label>
          <SegmentedControl
            label="Pay type"
            value={pay}
            onChange={setPay}
            options={[
              { value: "all", label: "All" },
              { value: "salary", label: "Salary" },
              { value: "hourly", label: "Hourly" },
            ]}
          />
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            Status
            <Select value={active} onChange={(e) => setActive(e.target.value as Active)} className="!h-[30px] !w-auto">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </Select>
          </label>
          {employees.isSuccess && (
            <span className="ml-auto text-[12px] text-ink-3">
              {rows.length} of {all.length}
            </span>
          )}
        </div>
        {employees.isLoading && <SkeletonRows rows={6} cols={6} label="Loading employees" />}
        {employees.isError && <ErrorState message="The employees could not be loaded." onRetry={() => employees.refetch()} />}
        {employees.isSuccess && all.length === 0 && (
          <EmptyState
            icon="users"
            title="No employees yet"
            actions={
              <>
                <Button variant="primary" icon="upload" onClick={() => router.push("/employees/import")}>
                  Import CSV
                </Button>
                <Button onClick={() => router.push("/employees/new")}>Add employee</Button>
              </>
            }
          >
            Import your team from a CSV file in one go, or add people one at a time.
          </EmptyState>
        )}
        {employees.isSuccess && all.length > 0 && rows.length === 0 && (
          <EmptyState
            icon="search-x"
            tone="neutral"
            title="No employees match these filters"
            actions={
              <Button icon="filter-x" onClick={clear}>
                Clear filters
              </Button>
            }
          >
            Try a different search, status or pay type.
          </EmptyState>
        )}
        {rows.length > 0 && (
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  <Th className="pl-4">No.</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Pay type</Th>
                  <Th align="right">Rate ($)</Th>
                  <Th>Tax table</Th>
                  <Th className="pr-4">Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const open = () => router.push(`/employees/${e.id}`);
                  const salaried = e.pay_type === "salary";
                  return (
                    <Tr key={e.id} clickable tabIndex={0} onClick={open} onKeyDown={(ev) => ev.key === "Enter" && open()}>
                      <Td mono className="whitespace-nowrap pl-4 text-[12.5px]">
                        {e.employee_number}
                      </Td>
                      <Td className="whitespace-nowrap font-medium">
                        {e.first_name} {e.last_name}
                      </Td>
                      <Td className="text-ink-2">{e.email}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-[5px] text-ink-2">
                          <Icon name={salaried ? "briefcase" : "clock"} className="text-ink-3" />
                          {salaried ? "Salary" : "Hourly"}
                        </span>
                      </Td>
                      <Td money className="whitespace-nowrap">
                        <Money value={salaried ? e.annual_salary : e.hourly_rate} />{" "}
                        <span className="font-sans text-[11.5px] text-ink-3">{salaried ? "/ yr" : "/ h"}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-2">{e.tax_table ? (tableName.get(e.tax_table) ?? "…") : "None"}</Td>
                      <Td className="pr-4">
                        <StatusPill status={e.is_active === false ? "inactive" : "active"} />
                      </Td>
                    </Tr>
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
