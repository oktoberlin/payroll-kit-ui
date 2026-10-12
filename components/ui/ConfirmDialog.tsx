"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Modal, ModalFooter } from "./Modal";

const TONES = {
  primary: "bg-primary-soft text-primary-soft-fg",
  emerald: "bg-emerald-soft text-emerald-fg",
  amber: "bg-amber-soft text-amber-fg",
  rose: "bg-rose-soft text-rose-fg",
};

/** Irreversible actions always say what will happen, and (for payment) ask for an explicit tick. */
export function ConfirmDialog({
  open,
  title,
  body,
  consequence,
  cta,
  icon,
  tone = "primary",
  requireCheck,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  consequence: string;
  cta: string;
  icon: IconName;
  tone?: keyof typeof TONES;
  requireCheck?: ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);
  const blocked = (!!requireCheck && !checked) || busy;

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} role="alertdialog">
      <div className="flex gap-3.5 px-5 pb-4 pt-5">
        <span className={`grid size-9 flex-none place-items-center rounded-[9px] ${TONES[tone]}`}>
          <Icon name={icon} size={18} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="m-0 text-xl font-semibold">
            {title}
          </h2>
          <p className="m-0 text-ink-2">{body}</p>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-2 font-medium">
            <Icon name="info" className="text-ink-3" />
            {consequence}
          </div>
          {requireCheck && (
            <label className="mt-1.5 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="size-4 accent-[var(--pk-primary)]"
              />
              {requireCheck}
            </label>
          )}
        </div>
      </div>
      <ModalFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={icon} onClick={onConfirm} disabled={blocked}>
          {cta}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
