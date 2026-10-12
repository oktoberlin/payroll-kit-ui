"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { api, ApiError, login } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABEL, homeFor } from "@/lib/demo";
import type { Me } from "@/lib/types";
import { useCompact } from "@/hooks/useCompact";

function Brand({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-[30px] place-items-center rounded-[7px] bg-[#4338ca] text-[13px] font-bold tracking-[.02em] text-white">PK</span>
      <span className={`text-xl font-semibold ${light ? "text-white" : ""}`}>PayrollKit</span>
    </div>
  );
}

export function LoginView() {
  const compact = useCompact();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(user: string, pass: string) {
    setBusy(true);
    setError("");
    try {
      await login(user, pass);
      client.clear();
      const me = await api<Me>("/auth/me/");
      client.setQueryData(["me"], me);
      const next = params.get("next");
      router.replace(me.role !== "employee" && next && next.startsWith("/") ? next : homeFor(me.role));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    void signIn(username.trim(), password);
  }

  return (
    <div className="grid min-h-dvh overflow-auto" style={{ gridTemplateColumns: compact ? "1fr" : "minmax(0,1fr) minmax(0,1.1fr)" }}>
      {!compact && (
        <aside className="flex flex-col justify-between bg-side-bg px-12 py-10 text-side-text">
          <Brand light />
          <div className="max-w-[420px]">
            <p className="m-0 mb-3 text-[28px] font-semibold leading-9 tracking-[-0.01em] text-white [text-wrap:pretty]">
              Payroll runs, payslips and approvals, accurate to the cent.
            </p>
            <p className="m-0 text-[14px] text-side-muted [text-wrap:pretty]">
              Every run is calculated from hashed inputs, approved by an admin, and locked once paid. Every change lands in the audit log.
            </p>
          </div>
          <div className="flex gap-4 text-[12px] text-side-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="building-2" />
              Northwind Demo Co
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="rotate-ccw" />
              Demo resets nightly at 03:00 UTC
            </span>
          </div>
        </aside>
      )}
      <main className="flex items-center justify-center" style={{ padding: compact ? "24px 20px" : 40 }}>
        <div className="flex w-full max-w-[420px] flex-col gap-5">
          {compact && <Brand />}
          <div>
            <h1 className="m-0 text-2xl font-semibold">Sign in</h1>
            <p className="m-0 mt-1 text-ink-2">Northwind Demo Co · payroll admin</p>
          </div>
          <div role="note" className="pk-bd-amber flex gap-2.5 rounded-lg border bg-amber-soft px-3 py-2.5 text-amber-fg">
            <Icon name="flask-conical" size={16} className="mt-px" />
            <div>
              <strong className="font-semibold">All data is fake.</strong> This is a demo tenant. Names, salaries and tax tables are made up.
            </div>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <label className="flex flex-col gap-1.5 font-medium">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="demo_admin"
                className="h-9 rounded border border-line-strong bg-surface px-2.5 font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-medium">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                className={`h-9 rounded border bg-surface px-2.5 font-normal ${error ? "border-rose" : "border-line-strong"}`}
              />
              {error && (
                <span role="alert" className="flex items-center gap-1.5 text-[12px] font-normal text-rose-fg">
                  <Icon name="circle-alert" />
                  {error}
                </span>
              )}
            </label>
            <button
              type="submit"
              aria-disabled={busy ? "true" : undefined}
              className="h-9 cursor-pointer whitespace-nowrap rounded border-0 bg-primary font-medium text-white hover:bg-primary-hover"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="flex items-center gap-2.5 text-[12px] text-ink-3">
            <span className="h-px flex-1 bg-line" />
            or use a demo account
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.user}
                type="button"
                onClick={() => void signIn(account.user, DEMO_PASSWORD)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface p-3 text-left shadow-1 hover:border-primary-fg hover:bg-hover"
              >
                <span className="grid size-9 flex-none place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
                  <Icon name={account.icon} size={17} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    Sign in as <span className="font-mono font-medium">{account.user}</span>
                  </span>
                  <span className="text-[12px] text-ink-2">
                    {ROLE_LABEL[account.role]} · {account.desc}
                  </span>
                </span>
                <Icon name="arrow-right" className="text-ink-3" />
              </button>
            ))}
          </div>
          <p className="m-0 text-[12px] text-ink-3">
            Password for all demo accounts: <span className="font-mono text-ink-2">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
