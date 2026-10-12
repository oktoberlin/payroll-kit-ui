"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-pk-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-pk-theme", next);
    try {
      localStorage.setItem("pk-theme", next);
    } catch {
      /* storage unavailable: the choice just lasts for this visit */
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-8 cursor-pointer place-items-center whitespace-nowrap rounded border border-line bg-surface text-ink-2 hover:bg-hover hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
    </button>
  );
}
