"use client";

import Link from "next/link";

import { ROLE_LABEL } from "@/lib/demo";
import type { Me } from "@/lib/types";

import { Icon } from "./Icon";

export function Forbidden({ me, what }: { me: Me; what: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex max-w-[440px] flex-col items-center gap-2 text-center">
        <span className="mb-1.5 grid size-[52px] place-items-center rounded-xl bg-rose-soft text-rose-fg">
          <Icon name="shield-x" size={24} />
        </span>
        <span className="font-mono text-[12px] text-ink-3">403 · Forbidden</span>
        <h1 className="m-0 text-2xl font-semibold">You do not have access</h1>
        <p className="m-0 mb-2.5 text-ink-2 [text-wrap:pretty]">
          {what} You are signed in as <span className="font-mono">{me.username}</span> ({ROLE_LABEL[me.role]}).
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-control items-center rounded bg-primary px-3 font-medium !text-white no-underline hover:bg-primary-hover"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
