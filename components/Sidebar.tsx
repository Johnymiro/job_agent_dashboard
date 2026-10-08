"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStats, logout } from "@/lib/api";
import { Icon, type IconName } from "@/components/icons";
import { useTheme, type ThemePref } from "@/components/theme";
import { fmtTime } from "@/components/ui";

type NavItem = { href: string; label: string; icon: IconName; count?: "ready" };

const NAV: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "Overview", icon: "overview" },
      { href: "/outbox", label: "Outbox", icon: "send", count: "ready" },
      { href: "/jobs", label: "Jobs", icon: "briefcase" },
      { href: "/leads", label: "Leads & Projects", icon: "target" },
    ],
  },
  {
    title: "Setup",
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

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface px-3 py-5 transition-transform duration-200 lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Brand />
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden" aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className="flex flex-col gap-5">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-faint">{group.title}</div>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const n = item.count === "ready" ? stats?.mail.ready || 0 : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      <Icon name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      {n > 0 && (
                        <span
                          title={`${n} ready to send`}
                          className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold tabular-nums text-on-accent"
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
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-subtle hover:bg-surface-2 hover:text-fg"
            >
              {stats.pipeline_running ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-accent">Pipeline running…</span>
                </>
              ) : (
                <>
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  Next run {fmtTime(stats.next_runs.daily_pipeline)}
                </>
              )}
            </Link>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-1 pt-3">
            <ThemeSwitch />
            <button
              onClick={logout}
              title="Sign out"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-fg"
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
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[11px] font-bold text-on-accent">JM</span>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-fg">Jack Miro</div>
        <div className="text-[11px] text-subtle">Job & project agent</div>
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
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5" role="radiogroup" aria-label="Theme">
      {THEMES.map(([value, icon, label]) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          title={label}
          aria-label={label}
          onClick={() => setPref(value)}
          className={`rounded-md p-1.5 transition-colors ${
            pref === value ? "bg-surface text-fg shadow-sm" : "text-subtle hover:text-fg"
          }`}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
