"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

const CONTROL =
  "h-control w-full rounded border bg-surface px-2.5 font-normal text-ink disabled:bg-surface-2 disabled:text-ink-3";

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <span role="alert" className="flex items-center gap-[5px] text-[12px] font-normal text-rose-fg">
      <Icon name="circle-alert" />
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-[5px]", className)}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && <span className="-mt-1 text-[12px] font-normal text-ink-3">{hint}</span>}
      {children({ id, invalid: !!error })}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; mono?: boolean; prefix?: string; suffix?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, mono, prefix, suffix, className, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        invalid ? "border-rose" : "border-line-strong",
        mono && "pk-money",
        prefix && "pl-[22px]",
        suffix && "pr-6",
        className,
      )}
      {...rest}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <span className="relative flex items-center">
      {prefix && <span className="absolute left-2.5 font-mono text-ink-3">{prefix}</span>}
      {input}
      {suffix && <span className="absolute right-2 font-mono text-ink-3">{suffix}</span>}
    </span>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(CONTROL, "px-2", invalid ? "border-rose" : "border-line-strong", className)}
        {...rest}
      />
    );
  },
);

export function Switch({
  checked,
  onChange,
  label,
  small,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled ? "true" : undefined}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "flex cursor-pointer rounded-full border-0 p-0.5",
        small ? "h-[18px] w-[30px]" : "h-5 w-[34px]",
        checked ? "justify-end bg-primary" : "justify-start bg-line-strong",
      )}
    >
      <span className={cn("rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]", small ? "size-3.5" : "size-4")} />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[15px] accent-[var(--pk-primary)]"
      />
      {label}
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[7px] border border-line bg-surface-2 p-0.5">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[26px] cursor-pointer whitespace-nowrap rounded-[5px] border-0 px-2.5 text-sm font-medium",
              on ? "bg-surface text-ink shadow-1" : "bg-transparent text-ink-2",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RadioCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left",
        checked ? "border-primary-fg bg-primary-soft" : "border-line-strong bg-surface",
      )}
    >
      <span
        className={cn("grid size-4 place-items-center rounded-full border-[1.5px]", checked ? "border-primary-fg" : "border-line-strong")}
      >
        <span className={cn("size-2 rounded-full", checked ? "bg-primary-fg" : "bg-transparent")} />
      </span>
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-[12px] text-ink-3">{description}</span>
      </span>
    </button>
  );
}
