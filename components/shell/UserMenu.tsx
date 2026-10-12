"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { expireSession, login, logout } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABEL, homeFor } from "@/lib/demo";
import { initials } from "@/lib/format";
import type { Me } from "@/lib/types";

const ITEM =
  "flex h-8 w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-transparent px-2.5 text-left hover:bg-hover";

export function UserMenu({ me, compact }: { me: Me; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function switchTo(user: string, role: Me["role"]) {
    setOpen(false);
    await login(user, DEMO_PASSWORD);
    client.clear();
    router.replace(homeFor(role));
    router.refresh();
  }

  async function signOut() {
    await logout();
    client.clear();
    router.replace("/login");
  }

  async function simulateExpiry() {
    setOpen(false);
    await expireSession();
    client.invalidateQueries(); // the next request is a 401 -> the session-expired dialog
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded border border-line bg-surface pl-1 pr-2 hover:bg-hover"
      >
        <span className="grid size-6 place-items-center rounded-full bg-inverse text-[10px] font-semibold text-inverse-fg">
          {initials(me.username)}
        </span>
        {!compact && (
          <span className="flex flex-col items-start leading-[1.1]">
            <span className="font-mono text-[12px] font-medium">{me.username}</span>
            <span className="text-[11px] text-ink-3">{ROLE_LABEL[me.role]}</span>
          </span>
        )}
        <Icon name="chevron-down" className="text-ink-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[38px] z-30 w-[248px] animate-in rounded-lg border border-line bg-surface p-1.5 shadow-3"
        >
          <div className="mb-1.5 border-b border-line px-2.5 pb-2.5 pt-2">
            <div className="font-mono font-medium">{me.username}</div>
            <div className="text-[12px] text-ink-3">
              {ROLE_LABEL[me.role]} · {me.company.name}
            </div>
          </div>
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-3">Switch demo account</div>
          {DEMO_ACCOUNTS.map((account) => (
            <button key={account.user} role="menuitem" type="button" className={ITEM} onClick={() => switchTo(account.user, account.role)}>
              <Icon name={account.icon} className="text-ink-3" />
              <span className="font-mono text-[12px]">{account.user}</span>
              <span className="ml-auto text-[11px] text-ink-3">{ROLE_LABEL[account.role]}</span>
            </button>
          ))}
          <div className="my-1.5 h-px bg-line" />
          <button role="menuitem" type="button" className={ITEM} onClick={simulateExpiry}>
            <Icon name="timer-off" className="text-ink-3" />
            Simulate session expiry
          </button>
          <button role="menuitem" type="button" className={ITEM} onClick={signOut}>
            <Icon name="log-out" className="text-ink-3" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
