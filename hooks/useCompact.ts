"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 759.98px)";

/** True under 760px: the layouts switch to cards, a slide-in nav and a full-width drawer. */
export function useCompact(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(QUERY);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
