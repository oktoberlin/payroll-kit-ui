"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "border-transparent bg-primary text-white hover:bg-primary-hover",
  secondary: "border-line-strong bg-surface text-ink hover:bg-hover",
  ghost: "border-transparent bg-transparent text-ink-2 hover:bg-hover hover:text-ink",
  danger: "border-transparent bg-transparent text-rose-fg hover:bg-rose-soft",
};

const SIZES: Record<Size, string> = {
  sm: "h-[28px] px-2.5 text-[12px]",
  md: "h-control px-3",
  lg: "h-10 px-3.5",
};

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  /** Disabled actions stay focusable (aria-disabled) so `disabledReason` can explain why. */
  disabled?: boolean;
  disabledReason?: string;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    trailingIcon,
    disabled,
    disabledReason,
    className,
    onClick,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded border font-medium",
        "cursor-pointer",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={disabled ? 11 : 14} />}
    </button>
  );
  return disabled && disabledReason ? <Tooltip text={disabledReason}>{button}</Tooltip> : button;
});

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: Omit<ButtonProps, "children" | "icon"> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid h-control w-8 place-items-center rounded border border-line bg-surface text-ink-2 hover:bg-hover hover:text-ink",
        "cursor-pointer",
        className,
      )}
      {...(rest as object)}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
