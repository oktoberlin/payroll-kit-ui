"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Icon } from "./Icon";

type ToastKind = "success" | "info" | "error";
type ToastItem = { id: number; kind: ToastKind; text: string; sub?: string };
type Notify = (kind: ToastKind, text: string, sub?: string) => void;

const ToastContext = createContext<Notify>(() => undefined);

const ICON = {
  success: { name: "circle-check", color: "var(--pk-emerald)" },
  info: { name: "info", color: "var(--pk-primary-fg)" },
  error: { name: "circle-alert", color: "var(--pk-rose)" },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), []);
  const notify = useCallback<Notify>(
    (kind, text, sub) => {
      const id = ++next.current;
      setItems((list) => [...list.slice(-2), { id, kind, text, sub }]);
      setTimeout(() => dismiss(id), 4600);
    },
    [dismiss],
  );
  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-11 right-4 z-[80] flex max-w-[calc(100%-32px)] flex-col items-end gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex min-w-[280px] max-w-[400px] animate-in items-start gap-2.5 rounded-lg bg-inverse py-2.5 pl-3 pr-2.5 text-inverse-fg shadow-3"
          >
            <Icon name={ICON[item.kind].name} size={16} style={{ color: ICON[item.kind].color, marginTop: 1 }} />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-medium">{item.text}</span>
              {item.sub && <span className="font-mono text-xs opacity-70">{item.sub}</span>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(item.id)}
              className="cursor-pointer border-0 bg-transparent p-0.5 text-inherit opacity-70"
            >
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
