"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStats, logout } from "@/lib/api";
import { Icon, type IconName } from "@/components/icons";
import { useTheme, type ThemePref } from "@/components/theme";
import { fmtTime, untilLabel, useNow } from "@/components/ui";

type NavItem = { href: string; label: string; icon: IconName; count?: "ready" | "apply" };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "workspace",
    items: [
      { href: "/", label: "Overview", icon: "overview" },
      { href: "/outbox", label: "Outbox", icon: "send", count: "ready" },
      { href: "/jobs", label: "Jobs", icon: "briefcase", count: "apply" },
      { href: "/leads", label: "Leads & Projects", icon: "target" },
      { href: "/portfolio", label: "Portfolio visitors", icon: "globe" },
    ],
  },
  {
    title: "setup",
    items: [
      { href: "/searches", label: "Searches", icon: "compass" },
      { href: "/runs", label: "Runs", icon: "activity" },
      { href: "/settings", label: "Settings", icon: "sliders" },
    ],
  },
];

const DESKTOP = "(min-width: 64rem)";

/** True at Tailwind's lg breakpoint and up, where the sidebar is pinned (below it, it's a drawer). */
function useDesktop() {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** Hover label for the icon-only rail. */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap border border-line bg-surface px-2 py-1 font-mono text-[11px] font-normal text-fg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 30_000 });
  const now = useNow();
  const next = stats?.next_runs.daily_pipeline;
  const desktop = useDesktop();
  // the icon rail is desktop-only: the mobile drawer always shows labels
  const rail = collapsed && desktop;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-bg py-5 transition-[translate,width] duration-200 lg:translate-x-0 ${
          rail ? "w-16 px-3" : "w-64 px-3.5 lg:w-60 lg:overflow-y-auto lg:overflow-x-hidden"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`mb-7 flex items-center ${rail ? "justify-center" : "justify-between px-1.5"}`}>
          <Brand iconOnly={rail} />
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden" aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className={`flex flex-col ${rail ? "gap-3" : "gap-6"}`}>
          {NAV.map((group) => (
            <div key={group.title}>
              {rail ? (
                <div className="mx-auto mb-3 h-px w-6 bg-line" />
              ) : (
                <div className="mb-2 px-3 font-mono text-[11px] text-faint">// {group.title}</div>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const n = item.count === "ready" ? stats?.mail.ready || 0 : item.count === "apply" ? stats?.opportunities.apply || 0 : 0;
                  const countTitle = item.count === "ready" ? `${n} ready to send` : `${n} to apply on their site`;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-sm py-2.5 text-sm transition-colors ${
                        rail ? "justify-center" : "px-3"
                      } ${active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
                    >
                      <span className="relative flex">
                        <Icon name={item.icon} />
                        {rail && n > 0 && (
                          <span className="absolute -right-2.5 -top-2 min-w-4 rounded-sm bg-accent px-[3px] text-center font-mono text-[10px] font-medium leading-4 tabular-nums text-on-accent">
                            {n}
                          </span>
                        )}
                      </span>
                      <span className={rail ? "sr-only" : "flex-1 whitespace-nowrap"}>{item.label}</span>
                      {!rail && n > 0 && (
                        <span
                          title={countTitle}
                          className="rounded-sm bg-accent px-1.5 py-px font-mono text-[11px] font-medium tabular-nums text-on-accent"
                        >
                          {n}
                        </span>
                      )}
                      {rail && <Tip>{n > 0 ? `${item.label} · ${countTitle}` : item.label}</Tip>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`mt-auto ${rail ? "flex flex-col items-center gap-2" : "space-y-3"}`}>
          {stats && rail && (
            <Link
              href="/runs"
              aria-label={stats.pipeline_running ? "Pipeline running" : `Next run ${fmtTime(next)}`}
              className="group relative flex h-10 w-10 items-center justify-center rounded-sm text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {stats.pipeline_running ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
              ) : (
                <Icon name="clock" />
              )}
              <Tip>
                {stats.pipeline_running ? "pipeline running…" : `next run ${fmtTime(next)}${next ? ` · ${untilLabel(next, now)}` : ""}`}
              </Tip>
            </Link>
          )}
          {stats && !rail && (
            <Link
              href="/runs"
              className="panel block whitespace-nowrap border border-line bg-surface px-3.5 py-3 font-mono transition-colors hover:border-faint"
            >
              {stats.pipeline_running ? (
                <div className="flex items-center gap-2 text-xs text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  pipeline running…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[11px] text-subtle">
                    <Icon name="clock" className="h-3 w-3" />
                    next run
                  </div>
                  <div className="mt-1.5 text-[13px] text-fg">{fmtTime(next)}</div>
                  {next && <div className="mt-1 text-[11px] text-accent">{untilLabel(next, now)}</div>}
                </>
              )}
            </Link>
          )}
          <div
            className={`flex items-center gap-2 border-t border-line pt-3 ${
              rail ? "w-full flex-col" : "justify-between px-0.5"
            }`}
          >
            <ThemeSwitch vertical={rail} />
            <button
              onClick={logout}
              title={rail ? undefined : "Sign out"}
              aria-label="Sign out"
              className={`group relative flex items-center gap-1.5 whitespace-nowrap rounded-sm text-xs text-muted hover:bg-surface-2 hover:text-fg ${
                rail ? "w-10 justify-center py-2" : "px-2 py-1.5"
              }`}
            >
              <Icon name="logout" className="h-3.5 w-3.5" />
              {rail ? <Tip>Sign out</Tip> : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      {desktop && (
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={`fixed top-[26px] z-50 flex h-6 w-6 items-center justify-center border border-line bg-bg text-subtle transition-[left,color,border-color] duration-200 hover:border-faint hover:text-fg ${
            collapsed ? "left-[52px]" : "left-[228px]"
          }`}
        >
          <Icon name="chevronLeft" className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      )}
    </>
  );
}

export function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-accent/60 bg-accent/10 font-mono text-xs font-medium text-accent">
        JM
      </span>
      <div className={`whitespace-nowrap leading-tight ${iconOnly ? "sr-only" : ""}`}>
        <div className="text-sm font-semibold tracking-tight text-fg">Jack Miro</div>
        <div className="font-mono text-[11px] text-subtle">job & project agent</div>
      </div>
    </div>
  );
}

const THEMES: [ThemePref, IconName, string][] = [
  ["light", "sun", "Light"],
  ["dark", "moon", "Dark"],
  ["system", "monitor", "Match system"],
];

/** Icon-only light / dark / system switch (stacked in the collapsed sidebar). */
export function ThemeSwitch({ vertical = false }: { vertical?: boolean }) {
  const { pref, setPref } = useTheme();
  return (
    <div className={`inline-flex border border-line bg-surface p-0.5 ${vertical ? "flex-col" : ""}`} role="radiogroup" aria-label="Theme">
      {THEMES.map(([value, icon, label]) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          title={label}
          aria-label={label}
          onClick={() => setPref(value)}
          className={`rounded-sm p-1.5 transition-colors ${
            pref === value ? "bg-accent/10 text-accent" : "text-subtle hover:text-fg"
          }`}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
