"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 30_000 });
  const now = useNow();
  const next = stats?.next_runs.daily_pipeline;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-bg px-3.5 py-5 transition-transform duration-200 lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between px-1.5">
          <Brand />
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden" aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className="flex flex-col gap-6">
          {NAV.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-3 font-mono text-[11px] text-faint">// {group.title}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const n = item.count === "ready" ? stats?.mail.ready || 0 : item.count === "apply" ? stats?.opportunities.apply || 0 : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                        active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      <Icon name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      {n > 0 && (
                        <span
                          title={`${n} ready to send`}
                          className="rounded-sm bg-accent px-1.5 py-px font-mono text-[11px] font-medium tabular-nums text-on-accent"
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {stats && (
            <Link
              href="/runs"
              className="panel block border border-line bg-surface px-3.5 py-3 font-mono transition-colors hover:border-faint"
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
          <div className="flex items-center justify-between gap-2 border-t border-line px-0.5 pt-3">
            <ThemeSwitch />
            <button
              onClick={logout}
              title="Sign out"
              className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Icon name="logout" className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center border border-accent/60 bg-accent/10 font-mono text-xs font-medium text-accent">
        JM
      </span>
      <div className="leading-tight">
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

/** Icon-only light / dark / system switch. */
export function ThemeSwitch() {
  const { pref, setPref } = useTheme();
  return (
    <div className="inline-flex border border-line bg-surface p-0.5" role="radiogroup" aria-label="Theme">
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
