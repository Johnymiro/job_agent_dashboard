import React, { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`panel border border-line bg-surface shadow-card ${className}`}>
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
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-3xl">
        <div className="mb-1.5 font-mono text-xs text-subtle">
          jackmiro.pt <span className="text-faint">/</span> agent <span className="text-faint">/</span>{" "}
          <span className="text-accent">{title.toLowerCase()}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">{title}</h1>
        {sub && <p className="mt-1.5 text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Small uppercase mono heading used above card content. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono text-[11px] uppercase tracking-[0.14em] text-muted ${className}`}>{children}</div>
  );
}

/** Numbered panel heading: [01] TODAY'S SENDING, with an optional link/aside on the right. */
export function PanelTitle({
  index,
  children,
  aside,
  className = "",
}: {
  index?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <Label>
        {index && <span className="mr-2 text-accent">[{index}]</span>}
        {children}
      </Label>
      {aside}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = false,
  glyph,
  badge,
  valueClass,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  /** faint symbol in the top-right corner (Σ, ρ …) */
  glyph?: string;
  /** replaces the glyph, e.g. an "over limit" warning */
  badge?: React.ReactNode;
  valueClass?: string;
  /** a small meter between the number and the caption */
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex min-h-6 items-start justify-between gap-2">
        <Label className="pt-0.5">{label}</Label>
        {badge ?? (glyph && <span className="font-serif text-lg italic leading-none text-subtle">{glyph}</span>)}
      </div>
      <div
        className={`mt-3 font-mono text-4xl font-medium tabular-nums tracking-tight ${
          valueClass ?? (accent ? "text-accent" : "text-fg")
        }`}
      >
        {value}
      </div>
      {children && <div className="mt-4">{children}</div>}
      {sub && <div className="mt-auto pt-4 text-sm text-muted">{sub}</div>}
    </Card>
  );
}

/** Segmented meter: `filled` solid cells, then `hatched` striped ones, the rest empty.
 *  Long counts are scaled so it never gets more than `maxCells` cells. */
export function Cells({
  total,
  filled,
  hatched = 0,
  maxCells = 30,
  className = "h-4",
  fillClass = "bg-accent",
}: {
  total: number;
  filled: number;
  hatched?: number;
  maxCells?: number;
  className?: string;
  fillClass?: string;
}) {
  const per = Math.max(1, Math.ceil(total / maxCells));
  const n = Math.max(1, Math.ceil(total / per));
  const f = Math.min(n, Math.round(filled / per));
  const h = Math.min(n - f, Math.round(hatched / per));
  return (
    <div className={`flex gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`min-w-0 flex-1 ${
            i < f ? fillClass : i < f + h ? "hatch border border-accent/70" : "border border-line bg-surface-2/60"
          }`}
        />
      ))}
    </div>
  );
}

// ---- Tones -----------------------------------------------------------------
const TONE = {
  neutral: "bg-surface-2 text-muted border-line",
  dim: "bg-surface-2 text-subtle border-line",
  good: "bg-good/10 text-good border-good/30",
  info: "bg-info/10 text-info border-info/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  bad: "bg-bad/10 text-bad border-bad/30",
  plum: "bg-plum/10 text-plum border-plum/30",
  iris: "bg-iris/10 text-iris border-iris/30",
  orchid: "bg-orchid/10 text-orchid border-orchid/30",
};
type Tone = keyof typeof TONE;

const STATUS_TONE: Record<string, Tone> = {
  // opportunities
  new: "neutral",
  filtered: "dim",
  low_score: "dim",
  scored: "info",
  no_contact: "warn",
  apply: "orchid",
  ready: "good",
  drafted: "iris",
  applied: "info",
  interview: "orchid",
  won: "good",
  closed: "dim",
  // applications
  draft: "neutral",
  needs_input: "warn",
  sent: "info",
  replied: "plum",
  bounced: "bad",
  failed: "bad",
  skipped: "dim",
  // runs
  running: "good",
  done: "info",
  error: "bad",
  interrupted: "warn",
};

const STATUS_LABEL: Record<string, string> = {
  no_contact: "no email",
  apply: "apply on site",
  low_score: "low score",
  needs_input: "needs your answer",
};

export const humanize = (s: string) => s.replace(/_/g, " ");

export function StatusBadge({ status }: { status: string | null }) {
  const s = status || "—";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[11px] ${
        TONE[STATUS_TONE[s] || "neutral"]
      }`}
    >
      {STATUS_LABEL[s] || humanize(s)}
    </span>
  );
}

const REPLY_TONE: Record<string, Tone> = {
  interested: "good",
  question: "info",
  rejection: "dim",
  not_interested: "dim",
  unsubscribe: "bad",
  auto_reply: "dim",
  other: "neutral",
};

/** How the inbox classified a reply (interested, question, rejection…). */
export function ReplyTag({ cls }: { cls: string | null }) {
  const c = cls || "other";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[11px] ${
        TONE[REPLY_TONE[c] || "neutral"]
      }`}
    >
      {humanize(cls || "reply")}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <span className="inline-flex w-9 justify-center text-xs text-faint">—</span>;
  const tone: Tone = score >= 85 ? "good" : score >= 70 ? "info" : score >= 50 ? "warn" : "dim";
  return (
    <span
      title="Match score (0–100)"
      className={`inline-flex w-9 shrink-0 justify-center rounded-md border py-0.5 text-xs font-semibold tabular-nums ${TONE[tone]}`}
    >
      {score}
    </span>
  );
}

const REGION: Record<string, [string, string]> = {
  europe: ["EU", "text-good"],
  us: ["US", "text-info"],
  global: ["Remote", "text-plum"],
  other: ["Other", "text-bad"],
  unknown: ["?", "text-subtle"],
};

export function RegionBadge({ region }: { region: string | null }) {
  const [label, cls] = REGION[region || "unknown"] || REGION.unknown;
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label || "Loading…"}
    </div>
  );
}

/** Coloured callout: tips, warnings, "x found but not scored yet"… */
export function Notice({
  tone = "info",
  icon,
  children,
  className = "",
}: {
  tone?: "info" | "good" | "warn" | "bad";
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = {
    info: "border-info/25 bg-info/5",
    good: "border-good/25 bg-good/5",
    warn: "border-warn/30 bg-warn/5",
    bad: "border-bad/30 bg-bad/5",
  }[tone];
  const ic = { info: "text-info", good: "text-good", warn: "text-warn", bad: "text-bad" }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-fg-2 ${cls} ${className}`}>
      <span className={`mt-0.5 ${ic}`}>
        <Icon name={icon || (tone === "warn" || tone === "bad" ? "alert" : "info")} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ---- Buttons ---------------------------------------------------------------
type BtnVariant = "primary" | "ghost" | "danger" | "subtle";
type BtnSize = "sm" | "md" | "lg";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  ghost: "border border-line bg-surface text-fg-2 hover:border-faint hover:bg-surface-2 hover:text-fg",
  danger: "border border-bad/30 text-bad hover:bg-bad/10",
  subtle: "text-muted hover:bg-surface-2 hover:text-fg",
};
const SIZE: Record<BtnSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-5 py-3 text-[15px] font-semibold",
};

/** Button look for links (<Link className={buttonClass("primary")}>). */
export function buttonClass(variant: BtnVariant = "ghost", size: BtnSize = "md", extra = "") {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${SIZE[size]} ${BTN[variant]} ${extra}`;
}

export function Button({
  variant = "ghost",
  size = "md",
  busy = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; busy?: boolean }) {
  return (
    <button {...rest} disabled={busy || rest.disabled} className={buttonClass(variant, size, className)}>
      {busy && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

/** Pill tabs with optional counts — status filters, outbox folders. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={`no-scrollbar flex gap-1 overflow-x-auto ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {o.label}
            {!!o.count && (
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-accent/15 text-accent" : "bg-surface-2 text-subtle"
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact two/three-way switch (Edit | Preview, HTML | Text, theme…). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            o.value === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-faint/60"
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
  if (!label) return sw;
  return (
    <label className={`flex items-start gap-3 ${disabled ? "" : "cursor-pointer"}`}>
      {sw}
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
    </label>
  );
}

/** Base form-control style without a width (set one per use: w-auto, w-64…). */
export const controlCls =
  "rounded-lg border border-line bg-field px-3 py-1.5 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:opacity-60";
/** Full-width form control (forms, fields). */
export const inputCls = `w-full ${controlCls}`;

/** Text input with a magnifier, for list searches. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint">
        <Icon name="search" className="h-3.5 w-3.5" />
      </span>
      <input
        type="search"
        className={`${controlCls} w-full pl-8`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-subtle">{hint}</span>}
    </label>
  );
}

export function Bar({ value, max, className = "bg-accent" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden bg-surface-2">
      <div className={`h-1.5 transition-[width] ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Inline ok / error message after an action. */
export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${msg.ok ? "text-good" : "text-bad"}`}>
      <Icon name={msg.ok ? "check" : "alert"} className="h-3.5 w-3.5" />
      {msg.text}
    </span>
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

/** Current time, refreshed every `ms` so countdowns tick without refetching. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** "in 19h 05m" / "in 12m" / "due now" until an ISO time. */
export function untilLabel(iso: string, now: number): string {
  const m = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (m <= 0) return "due now";
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  return h < 48 ? `in ${h}h ${String(m % 60).padStart(2, "0")}m` : `in ${Math.round(h / 24)}d`;
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

export function Empty({ children, icon }: { children: React.ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-sm text-subtle">
      {icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-faint">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}
