"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/States";
import { useCompact } from "@/hooks/useCompact";
import { useStoredState } from "@/hooks/useStoredState";
import { cn } from "@/lib/cn";
import { homeFor } from "@/lib/demo";
import { useMe, useRuns } from "@/lib/queries";

import { CrumbContext } from "./crumbs";
import { crumbsFor, isActive, navFor, showsTaxNote, type NavGroup } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-[7px] bg-[#4338ca] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.43 }}
    >
      PK
    </span>
  );
}

function NavList({
  groups,
  pathname,
  expanded,
  large,
  draftCount,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  expanded: boolean;
  large?: boolean;
  draftCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {expanded && (
            <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-side-muted">{group.label}</div>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded font-medium no-underline hover:bg-side-hover hover:!text-white",
                  large ? "h-11 px-3 text-[14px]" : "h-[34px] px-2.5",
                  expanded ? "justify-start" : "justify-center",
                  active ? "bg-side-active !text-white" : "!text-side-text",
                )}
              >
                <Icon name={item.icon} size={large ? 17 : 16} className={active ? "text-side-accent" : "text-side-muted"} />
                {expanded && <span className="flex-1">{item.label}</span>}
                {expanded && item.href === "/runs" && draftCount > 0 && (
                  <span className="rounded-full bg-[#3a2a0b] px-1.5 py-px font-mono text-[11px] text-[#f8c46a]">
                    {draftCount} draft
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const compact = useCompact();
  const me = useMe();
  const isStaff = !!me.data && me.data.role !== "employee";
  const runs = useRuns(isStaff);
  const [collapsed, setCollapsed] = useStoredState<boolean>("pk-sidebar", false);
  const [navOpen, setNavOpen] = useState(false);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const main = useRef<HTMLElement>(null);

  // Employees live under /my-payslips; staff have no "my payslips".
  useEffect(() => {
    if (!me.data) return;
    const onMine = pathname.startsWith("/my-payslips");
    if (me.data.role === "employee" && !onMine) router.replace(homeFor("employee"));
    if (me.data.role !== "employee" && onMine) router.replace(homeFor(me.data.role));
  }, [me.data, pathname, router]);

  useEffect(() => {
    setNavOpen(false);
    main.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (event.key === "[" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) setCollapsed((v) => !v);
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCollapsed]);

  if (me.isError && !(me.error as { status?: number }).status) {
    return <ErrorState message="Could not load your account." onRetry={() => me.refetch()} />;
  }
  if (!me.data) {
    return (
      <div aria-busy="true" className="grid h-dvh place-items-center text-ink-3">
        Loading…
      </div>
    );
  }

  const user = me.data;
  const groups = navFor(user.role);
  const draftCount = (runs.data ?? []).filter((run) => run.status === "draft").length;
  const expanded = !collapsed;
  const crumbs = crumbsFor(pathname, lastLabel);

  return (
    <CrumbContext.Provider value={setLastLabel}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex h-dvh overflow-hidden">
        {!compact && (
          <nav
            aria-label="Main"
            className="flex flex-none flex-col border-r border-side-line bg-side-bg text-side-text transition-[width] duration-200"
            style={{ width: expanded ? 232 : 60 }}
          >
            <div className="flex h-[52px] items-center gap-2.5 border-b border-side-line px-[15px]">
              <Logo />
              {expanded && <span className="text-[15px] font-semibold text-white">PayrollKit</span>}
            </div>
            <div className="flex-1 overflow-auto px-2.5 py-3">
              <NavList groups={groups} pathname={pathname} expanded={expanded} draftCount={draftCount} />
            </div>
            <div className="border-t border-side-line p-2.5">
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                className={cn(
                  "flex h-8 w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded border-0 bg-transparent px-2.5 text-side-muted hover:bg-side-hover hover:text-white",
                  expanded ? "justify-start" : "justify-center",
                )}
              >
                <Icon name={expanded ? "panel-left-close" : "panel-left-open"} size={16} />
                {expanded && (
                  <>
                    <span>Collapse</span>
                    <span className="ml-auto font-mono text-[11px] opacity-80">[</span>
                  </>
                )}
              </button>
            </div>
          </nav>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] flex-none items-center gap-3 border-b border-line bg-surface" style={{ padding: compact ? "0 12px" : "0 20px" }}>
            {compact && (
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setNavOpen(true)}
                className="grid size-9 cursor-pointer place-items-center rounded border border-line bg-surface"
              >
                <Icon name="menu" size={17} />
              </button>
            )}
            <button
              type="button"
              title="Single-tenant demo: there is only one company"
              className="flex h-8 min-w-0 cursor-default items-center gap-2 whitespace-nowrap rounded border border-line bg-surface-2 pl-2 pr-2.5"
            >
              <span className="grid size-5 flex-none place-items-center rounded-[5px] bg-primary-soft text-[10px] font-bold text-primary-soft-fg">
                {user.company.name[0]}
              </span>
              <span className="truncate font-semibold">{compact ? user.company.name.split(" ")[0] : user.company.name}</span>
              <span className="font-mono text-[11px] text-ink-3">{user.company.currency}</span>
              <Icon name="chevrons-up-down" className="text-ink-3" />
            </button>
            {!compact && (
              <ol aria-label="Breadcrumb" className="m-0 flex min-w-0 flex-1 list-none items-center gap-1.5 overflow-hidden p-0 pl-1 text-ink-2">
                {crumbs.map((crumb) => (
                  <li key={crumb.label} className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    <Icon name="chevron-right" size={13} className="text-ink-3" />
                    {crumb.href ? (
                      <Link href={crumb.href} className="rounded px-1 py-0.5 !text-ink-2 no-underline hover:bg-hover hover:!text-ink">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="truncate px-1 py-0.5 font-medium text-ink">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <div className="ml-auto flex flex-none items-center gap-2">
              {!compact && (
                <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-line-strong px-2 text-[12px] text-ink-2">
                  <Icon name="flask-conical" />
                  Fake data
                </span>
              )}
              <ThemeToggle />
              <UserMenu me={user} compact={compact} />
            </div>
          </header>

          <main ref={main} id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-auto outline-none">
            <div className="mx-auto max-w-[1320px]" style={{ padding: compact ? "16px 12px 32px" : "24px 24px 40px" }}>
              {children}
            </div>
          </main>

          {showsTaxNote(pathname) && (
            <footer
              className="flex h-[30px] flex-none items-center gap-1.5 border-t border-line bg-surface text-[12px] text-ink-3"
              style={{ padding: compact ? "0 12px" : "0 20px" }}
            >
              <Icon name="info" />
              Illustrative tax table. Not tax advice.
            </footer>
          )}
        </div>
      </div>

      {compact && navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-[var(--pk-overlay)]" onClick={() => setNavOpen(false)} />
          <nav aria-label="Main" className="fixed bottom-0 left-0 top-0 z-[41] flex w-[280px] max-w-[86%] animate-in flex-col bg-side-bg text-side-text">
            <div className="flex h-[52px] items-center gap-2.5 border-b border-side-line px-4">
              <Logo />
              <span className="text-[15px] font-semibold text-white">PayrollKit</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setNavOpen(false)}
                className="ml-auto grid size-9 cursor-pointer place-items-center rounded border-0 bg-transparent text-side-text"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="overflow-auto px-2.5 py-3">
              <NavList groups={groups} pathname={pathname} expanded large draftCount={draftCount} onNavigate={() => setNavOpen(false)} />
            </div>
          </nav>
        </>
      )}
    </CrumbContext.Provider>
  );
}
