import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/** A money value exactly as the API sent it, grouped for reading. Monospace, tabular, right aligned. */
export function Money({ value, className }: { value: string | null | undefined; className?: string }) {
  return <span className={cn("pk-money", className)}>{formatMoney(value)}</span>;
}
