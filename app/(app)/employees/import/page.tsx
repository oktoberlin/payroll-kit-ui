"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/ui/Dropzone";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { Table, TableCard, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError, uploadEmployeesCsv } from "@/lib/api";
import { IMPORT_COLUMNS, MAX_IMPORT_BYTES, TEMPLATE_CSV, countDataRows, fixHint, formatBytes } from "@/lib/import";
import { invalidateRunInputs, useMe } from "@/lib/queries";
import type { ImportResult } from "@/lib/types";

type Outcome = { file: string; rows: number; size: number; result: ImportResult } | null;

export default function ImportPage() {
  usePageTitle("Import employees");
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const me = useMe();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [problem, setProblem] = useState("");

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const rows = countDataRows(await file.text());
      const result = await uploadEmployeesCsv(file);
      return { file: file.name, rows, size: file.size, result };
    },
    onSuccess: (done) => {
      setOutcome(done);
      if (done.result.created > 0) {
        client.invalidateQueries({ queryKey: ["employees"] });
        invalidateRunInputs(client);
        toast("success", `${done.result.created} employees imported`, "POST /api/employees/import/ · 201");
      }
    },
    onError: (e) => setProblem(e instanceof ApiError ? e.message : "The file could not be uploaded."),
  });

  function pick(file: File) {
    setProblem("");
    setOutcome(null);
    if (!file.name.toLowerCase().endsWith(".csv")) return setProblem("Choose a .csv file.");
    if (file.size > MAX_IMPORT_BYTES) return setProblem("That file is larger than 2 MB.");
    upload.mutate(file);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees-template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("success", "Downloaded employees-template.csv");
  }

  const errors = outcome?.result.errors ?? [];
  const success = !!outcome && outcome.result.created > 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Import employees" subtitle="Upload a CSV. Every row is validated first, and the import is all-or-nothing." />

      {errors.length > 0 && outcome && (
        <Banner tone="error" icon="octagon-x">
          <div className="text-[14px] font-semibold">No employees were imported</div>
          <div>
            {outcome.file} has {errors.length} {errors.length === 1 ? "row" : "rows"} with errors. Fix them and upload the file again. Rows without errors were not imported either.
          </div>
        </Banner>
      )}
      {success && outcome && (
        <Banner tone="success" icon="circle-check" role="status" actions={<Button size="sm" className="!border-current !bg-transparent !text-inherit font-semibold" onClick={() => router.push("/employees")}>View employees</Button>}>
          <strong className="font-semibold">{outcome.result.created} employees imported</strong> from {outcome.file}. They are active and included in the next calculation.
        </Banner>
      )}
      {problem && (
        <Banner tone="error" icon="circle-alert">
          {problem}
        </Banner>
      )}

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <section className="flex min-w-0 flex-col gap-3" style={{ gridColumn: "span 2" }}>
          {!outcome && <Dropzone onFile={pick} hint=".csv, UTF-8, up to 2 MB" />}
          {outcome && (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-1">
              <span className="grid size-[34px] place-items-center rounded-lg border border-line bg-surface-2 text-ink-2">
                <Icon name="file-spreadsheet" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[12.5px] font-medium">{outcome.file}</div>
                <div className="text-[12px] text-ink-3">
                  {outcome.rows} data rows · {formatBytes(outcome.size)} · uploaded by {me.data?.username}
                </div>
              </div>
              <Button icon="upload" onClick={() => setOutcome(null)}>
                Upload another file
              </Button>
            </div>
          )}
          {upload.isPending && <div aria-busy="true" className="text-ink-3">Validating…</div>}
          {errors.length > 0 && (
            <TableCard>
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <h2 className="m-0 text-lg font-semibold">Row errors</h2>
                <span className="font-mono text-[12px] text-ink-3">{errors.length}</span>
              </div>
              <div className="overflow-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th align="right" sticky={false} className="w-16 pl-4">Row</Th>
                      <Th sticky={false}>Error</Th>
                      <Th sticky={false} className="pr-4">How to fix</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((error) => (
                      <tr key={`${error.row}-${error.error}`}>
                        <Td money className="whitespace-nowrap pl-4">{error.row}</Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-rose-fg">
                            <Icon name="circle-alert" />
                            <span>
                              Row {error.row}: <span className="font-mono text-[12.5px]">{error.error}</span>
                            </span>
                          </span>
                        </Td>
                        <Td className="pr-4 text-ink-2">{fixHint(error.error)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </TableCard>
          )}
        </section>

        <aside className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-1">
          <h2 className="m-0 text-lg font-semibold">File format</h2>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-ink-2">Required columns</span>
            <div className="flex flex-wrap gap-1.5">
              {IMPORT_COLUMNS.map((column) => (
                <span key={column} className="rounded-sm border border-line bg-surface-2 px-[7px] py-0.5 font-mono text-[12px]">
                  {column}
                </span>
              ))}
            </div>
            <span className="mt-1.5 text-[12px] text-ink-2">Optional columns</span>
            <div className="flex flex-wrap gap-1.5">
              {["annual_salary", "hourly_rate"].map((column) => (
                <span key={column} className="rounded-sm border border-dashed border-line-strong px-[7px] py-0.5 font-mono text-[12px] text-ink-2">
                  {column}
                </span>
              ))}
            </div>
          </div>
          <ul className="m-0 flex flex-col gap-1 pl-4 text-ink-2">
            <li>
              <span className="font-mono">pay_type</span> is <span className="font-mono">salary</span> or <span className="font-mono">hourly</span>
            </li>
            <li>Employee numbers must be unique in the file and the company</li>
            <li>
              Amounts as plain decimals, e.g. <span className="font-mono">54000.00</span>
            </li>
          </ul>
          <Button icon="download" className="justify-center" onClick={downloadTemplate}>
            Download template
          </Button>
        </aside>
      </div>
    </div>
  );
}
