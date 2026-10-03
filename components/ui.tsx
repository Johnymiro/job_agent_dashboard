import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[#1e293b] bg-[#0b1220] ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={`mt-2 text-3xl font-semibold tabular-nums ${
          accent ? "text-emerald-400" : "text-slate-100"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  // opportunities
  new: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  filtered: "bg-slate-800/60 text-slate-500 border-slate-700/40",
  low_score: "bg-slate-800/60 text-slate-500 border-slate-700/40",
  scored: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  no_contact: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  ready: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  drafted: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  applied: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  interview: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  won: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  closed: "bg-slate-800/60 text-slate-400 border-slate-700/40",
  // applications
  draft: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  queued: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sent: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  replied: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  bounced: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  skipped: "bg-rose-500/10 text-rose-300/70 border-rose-500/20",
  // runs
  running: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  done: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  error: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  interrupted: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status || "—";
  const cls = STATUS_STYLES[s] || STATUS_STYLES.new;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {s.replace("_", " ")}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <span className="text-xs text-slate-600">—</span>;
  const cls =
    score >= 85
      ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
      : score >= 70
        ? "text-sky-300 bg-sky-500/10 border-sky-500/30"
        : score >= 50
          ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
          : "text-slate-400 bg-slate-800/60 border-slate-700/40";
  return (
    <span
      className={`inline-flex w-9 justify-center rounded border py-0.5 text-xs font-semibold tabular-nums ${cls}`}
    >
      {score}
    </span>
  );
}

const REGION: Record<string, [string, string]> = {
  europe: ["EU", "text-emerald-300"],
  us: ["US", "text-sky-300"],
  global: ["Remote", "text-violet-300"],
  other: ["Other", "text-rose-300/80"],
  unknown: ["?", "text-slate-500"],
};

export function RegionBadge({ region }: { region: string | null }) {
  const [label, cls] = REGION[region || "unknown"] || REGION.unknown;
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
      {label || "Loading…"}
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "subtle";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-emerald-500/90 text-slate-950 hover:bg-emerald-400",
  ghost: "border border-[#1e293b] text-slate-300 hover:bg-[#111a2e] hover:text-slate-100",
  danger: "border border-rose-500/30 text-rose-300 hover:bg-rose-500/10",
  subtle: "text-slate-400 hover:text-slate-200",
};

export function Button({
  variant = "ghost",
  busy = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
    >
      {busy && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Base form-control style without a width (set one per use: w-auto, w-64…). */
export const controlCls =
  "rounded-lg border border-[#1e293b] bg-[#111a2e] px-3 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500/50";
/** Full-width form control (forms, fields). */
export const inputCls = `w-full ${controlCls}`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded bg-[#111a2e]">
      <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 0) {
    const m = Math.round(-s / 60);
    return m < 60 ? `in ${m}m` : m < 1440 ? `in ${Math.round(m / 60)}h` : `in ${Math.round(m / 1440)}d`;
  }
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function usd(n: number | null | undefined): string {
  if (!n) return "—";
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}
