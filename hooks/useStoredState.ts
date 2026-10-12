"use client";

import { useCallback, useEffect, useState } from "react";

/** useState that remembers its value in localStorage (safely: storage can be blocked or empty). */
export function useStoredState<T extends string | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue((typeof initial === "boolean" ? stored === "true" : stored) as T);
    } catch {
      /* storage unavailable: keep the default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
        try {
          localStorage.setItem(key, String(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
