"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, json } from "@/lib/api";
import { parseDeductionValue, valueHint } from "@/lib/deductions";
import { fractionToPercent } from "@/lib/money";
import { invalidateRunInputs } from "@/lib/queries";
import type { DeductionType } from "@/lib/types";

type Values = { code: string; name: string; kind: "deduction" | "benefit"; method: "fixed" | "percent"; value: string; pre: boolean };
type Errors = Partial<Record<"code" | "name" | "value", string>>;

const blank: Values = { code: "", name: "", kind: "deduction", method: "fixed", value: "", pre: false };

function fromType(t: DeductionType): Values {
  const percent = t.method === "percent";
  return {
    code: t.code,
    name: t.name,
    kind: t.kind ?? "deduction",
    method: t.method ?? "fixed",
    value: percent ? fractionToPercent(t.default_value ?? "0").replace(/\.00$/, "") : (t.default_value ?? ""),
    pre: t.pre_tax ?? false,
  };
}

/** Create or edit a deduction / benefit type. (Not in the mockups: built from the same form parts.) */
export function DeductionTypeDialog({ open, type, onClose }: { open: boolean; type: DeductionType | null; onClose: () => void }) {
  const titleId = useId();
  const toast = useToast();
  const client = useQueryClient();
  const [values, setValues] = useState<Values>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    if (open) {
      setValues(type ? fromType(type) : blank);
      setErrors({});
    }
  }, [open, type]);

  const save = useMutation({
    mutationFn: (body: object) => api<DeductionType>(type ? `/deduction-types/${type.id}/` : "/deduction-types/", json(type ? "PATCH" : "POST", body)),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: ["deduction-types"] });
      invalidateRunInputs(client);
      toast("success", `${type ? "Saved" : "Created"} ${saved.code}`, "Draft runs need recalculation");
      onClose();
    },
    onError: (e) => {
      if (!(e instanceof ApiError)) return;
      setErrors({ code: e.errors.fields.code?.[0], name: e.errors.fields.name?.[0], value: e.errors.fields.default_value?.[0] ?? e.errors.form[0] });
    },
  });

  function submit() {
    const found: Errors = {};
    const code = values.code.trim().toUpperCase();
    if (!code) found.code = "Code is required";
    else if (code.length > 20) found.code = "Up to 20 characters";
    if (!values.name.trim()) found.name = "Name is required";
    const stored = parseDeductionValue(values.method, values.value);
    if (stored === null) found.value = values.method === "percent" ? "Use a whole percent, e.g. 5" : "Use a decimal amount with up to 2 places";
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate({
      code,
      name: values.name.trim(),
      kind: values.kind,
      method: values.method,
      default_value: stored,
      pre_tax: values.kind === "benefit" ? false : values.pre,
    });
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} width={480}>
      <div className="px-5 pb-1 pt-[18px]">
        <h2 id={titleId} className="m-0 text-xl font-semibold">
          {type ? `Edit ${type.code}` : "New deduction or benefit"}
        </h2>
        <p className="m-0 mt-1 text-ink-2">Deductions come out of employee pay. Benefits are paid by the employer and recorded, not deducted.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pb-[18px] pt-3">
        <Field label="Code" error={errors.code}>
          {({ id, invalid }) => <Input id={id} invalid={invalid} className="font-mono uppercase" value={values.code} onChange={(e) => set("code", e.target.value)} />}
        </Field>
        <Field label="Name" error={errors.name}>
          {({ id, invalid }) => <Input id={id} invalid={invalid} value={values.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>
        <Field label="Kind">
          {({ id }) => (
            <Select id={id} value={values.kind} onChange={(e) => set("kind", e.target.value as Values["kind"])}>
              <option value="deduction">Employee deduction</option>
              <option value="benefit">Employer benefit</option>
            </Select>
          )}
        </Field>
        <Field label="Method">
          {({ id }) => (
            <Select id={id} value={values.method} onChange={(e) => set("method", e.target.value as Values["method"])}>
              <option value="fixed">Fixed amount</option>
              <option value="percent">Percent of gross</option>
            </Select>
          )}
        </Field>
        <Field label="Default value" hint={valueHint(values.method)} error={errors.value} className="col-span-2">
          {({ id, invalid }) => (
            <Input
              id={id}
              mono
              invalid={invalid}
              inputMode="decimal"
              prefix={values.method === "fixed" ? "$" : undefined}
              suffix={values.method === "percent" ? "%" : undefined}
              value={values.value}
              onChange={(e) => set("value", e.target.value)}
            />
          )}
        </Field>
        {values.kind === "deduction" && (
          <div className="col-span-2 flex items-center gap-2.5">
            <Switch checked={values.pre} onChange={(v) => set("pre", v)} label="Pre-tax" />
            <span className="flex flex-col">
              <span className="font-medium">{values.pre ? "Pre-tax" : "Post-tax"}</span>
              <span className="text-[12px] text-ink-3">Pre-tax deductions reduce taxable pay.</span>
            </span>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={save.isPending} onClick={submit}>
          {type ? "Save changes" : "Create"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
