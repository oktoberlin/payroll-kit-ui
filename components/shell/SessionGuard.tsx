"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { login, logout, SESSION_EXPIRED_EVENT } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import type { Me } from "@/lib/types";

/** Listens for a 401 from the proxy (tokens gone or refresh failed) and offers to sign back in. */
export function SessionGuard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const client = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, show);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, show);
  }, []);

  const me = client.getQueryData<Me>(["me"]);
  const isDemo = !!me && DEMO_ACCOUNTS.some((account) => account.user === me.username);

  async function resume() {
    if (!me || !isDemo) return other();
    setBusy(true);
    try {
      await login(me.username, DEMO_PASSWORD);
      await client.invalidateQueries();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function other() {
    await logout();
    client.clear();
    setOpen(false);
    router.replace("/login");
  }

  return (
    <Modal open={open} onClose={() => undefined} labelledBy={titleId} role="alertdialog" width={400}>
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <span className="mb-1 grid size-11 place-items-center rounded-lg bg-amber-soft text-amber-fg">
          <Icon name="timer-off" size={20} />
        </span>
        <h2 id={titleId} className="m-0 text-[17px] font-semibold">
          Your session has expired
        </h2>
        <p className="m-0 mb-2 text-ink-2 [text-wrap:pretty]">
          For security you were signed out. Sign in again to continue where you left off.
        </p>
        <button
          type="button"
          onClick={resume}
          disabled={busy}
          className="h-9 w-full cursor-pointer whitespace-nowrap rounded border-0 bg-primary font-medium text-white hover:bg-primary-hover"
        >
          {me && isDemo ? (
            <>
              Sign in again as <span className="font-mono">{me.username}</span>
            </>
          ) : (
            "Sign in again"
          )}
        </button>
        <button
          type="button"
          onClick={other}
          className="h-9 w-full cursor-pointer whitespace-nowrap rounded border border-line-strong bg-surface font-medium hover:bg-hover"
        >
          Use a different account
        </button>
      </div>
    </Modal>
  );
}
