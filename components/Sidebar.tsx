"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/jobs", label: "Jobs" },
  { href: "/leads", label: "Leads & Projects" },
  { href: "/outbox", label: "Outbox" },
  { href: "/searches", label: "Searches" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-[#1e293b] bg-[#0b1220] px-4 py-6">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">Jack Miro</span>
        </div>
        <div className="mt-1 pl-[18px] text-xs text-slate-500">Job & project agent</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "text-slate-400 hover:bg-[#111a2e] hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <button
          onClick={logout}
          className="mb-4 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-[#111a2e] hover:text-slate-200"
        >
          Sign out
        </button>
        <div className="px-3 text-[11px] leading-relaxed text-slate-600">
          Discover → score → find email → write → send (paced) → track replies. Opt-outs and
          bounces are never contacted again.
        </div>
      </div>
    </aside>
  );
}
