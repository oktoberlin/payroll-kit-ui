"use client";

import { createContext, useContext, useEffect } from "react";

/** Detail pages call useCrumbLabel("Sep 2026") to name the last breadcrumb. */
export const CrumbContext = createContext<(label: string | null) => void>(() => undefined);

export function useCrumbLabel(label: string | null | undefined) {
  const set = useContext(CrumbContext);
  useEffect(() => {
    set(label ?? null);
    return () => set(null);
  }, [label, set]);
}
