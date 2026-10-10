"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Analytics, LeadVisit, errorMessage, getAnalytics } from "@/lib/api";
import {
  Card,
  Empty,
  Notice,
  PageHeader,
  PanelTitle,
  ReplyTag,
  Segmented,
  Spinner,
  StatCard,
  StatusBadge,
  fmtTime,
  timeAgo,
} from "@/components/ui";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;
type Range = (typeof RANGES)[number]["value"];

/** The portfolio's own events (portfolio_26 src/lib/analytics.ts). */
const EVENT_LABEL: Record<string, string> = {
  contact_opened: "Opened the contact form",
  contact_submitted: "Sent an enquiry",
  contact_failed: "Enquiry failed to send",
  email_copied: "Copied your email",
  case_opened: "Opened a case study",
  resume_printed: "Printed the résumé",
};

const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);

function duration(s: number | null | undefined): string {
  if (s === null || s === undefined) return "—";
  const r = Math.round(s);
  return r < 60 ? `${r}s` : `${Math.floor(r / 60)}m ${String(r % 60).padStart(2, "0")}s`;
}

function flag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

const source = (s: string | null) => (!s || s === "$direct" ? "Direct, or an email app" : s);

export default function PortfolioPage() {
  const [range, setRange] = useState<Range>("30");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => getAnalytics(Number(range)),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000, // the server caches PostHog for 5 minutes
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portfolio visitors"
        sub={
          <>
            Who visits <span className="font-mono text-fg">jackmiro.pt</span>, from where, and what they do there. Tracked
            without cookies, so a reload or a return visit counts as a new visit: these are visits, not people.
          </>
        }
      >
        <Segmented value={range} onChange={setRange} options={[...RANGES]} />
      </PageHeader>

      {isLoading && <Spinner label="Asking PostHog…" />}
      {isError && <Notice tone="bad">Couldn&apos;t load the analytics: {errorMessage(error)}</Notice>}
      {data && !data.configured && <SetupNotice />}
      {data?.configured && <Report data={data} />}
    </div>
  );
}

function SetupNotice() {
  return (
    <Notice tone="warn" icon="globe">
      <div className="font-medium text-fg">PostHog isn&apos;t connected on the server yet.</div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Portfolio (Netlify): set <code className="font-mono text-fg">NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN</code> to the
          project token (<span className="font-mono">phc_…</span>) and redeploy.
        </li>
        <li>
          Server <code className="font-mono text-fg">.env</code>: <code className="font-mono text-fg">POSTHOG_PROJECT_ID</code> and{" "}
          <code className="font-mono text-fg">POSTHOG_API_KEY</code>, a personal API key with only the &ldquo;Query: Read&rdquo; scope.
          Then <code className="font-mono text-fg">docker compose up -d --force-recreate</code>.
        </li>
      </ol>
    </Notice>
  );
}

function Report({ data }: { data: Analytics }) {
  // panels are numbered [01], [02] … in the order they render
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");
  const t = data.totals;
  const errors = Object.entries(data.errors);
  const opened = data.events?.find((e) => e.event === "contact_opened")?.visits ?? 0;

  return (
    <>
      {errors.length > 0 && (
        <Notice tone="warn">
          Some panels couldn&apos;t load:{" "}
          {errors.map(([k, v]) => (
            <span key={k} className="block font-mono text-xs text-muted">
              {k}: {v}
            </span>
          ))}
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
        <StatCard label="Visits" value={t?.visits ?? "—"} sub={`${t?.pageviews ?? 0} pages viewed`} accent />
        <StatCard label="Time on page" value={duration(data.engagement?.avg_seconds)} sub="average" />
        <StatCard label="Scrolled" value={pct(data.engagement?.avg_scroll)} sub="of a page, on average" />
        <StatCard label="Enquiries" value={t?.enquiries ?? "—"} sub={`${opened} visits opened the form`} />
        <StatCard label="From your emails" value={t?.lead_visits ?? "—"} sub="visits via a link you sent" />
      </div>

      <Daily data={data} days={data.days} index={idx()} />

      <LeadVisits leads={data.leads} index={idx()} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel index={idx()} title="Countries" empty={!data.countries?.length}>
          <BarList
            rows={(data.countries ?? []).map((c) => ({
              key: c.code ?? "?",
              label: c.name ? `${flag(c.code)} ${c.name}` : "Unknown",
              value: c.visits,
            }))}
          />
        </Panel>
        <Panel index={idx()} title="Cities" empty={!data.cities?.length}>
          <BarList rows={(data.cities ?? []).map((c) => ({ key: `${c.city}-${c.code}`, label: `${flag(c.code)} ${c.city}`, value: c.visits }))} />
        </Panel>
      </div>

      <Pages data={data} index={idx()} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel index={idx()} title="Where they came from" empty={!data.sources?.length}>
          <BarList rows={(data.sources ?? []).map((s) => ({ key: s.source ?? "-", label: source(s.source), value: s.visits }))} />
        </Panel>
        <Panel index={idx()} title="What they did" empty={!data.events?.length}>
          <BarList
            rows={[...(data.events ?? [])]
              .sort((a, b) => b.visits - a.visits)
              .map((e) => ({ key: e.event, label: EVENT_LABEL[e.event] ?? e.event, value: e.visits, note: e.count !== e.visits ? `${e.count}×` : undefined }))}
          />
        </Panel>
        <Panel index={idx()} title="Most clicked" empty={!data.clicks?.length}>
          <BarList rows={(data.clicks ?? []).map((c) => ({ key: c.label, label: c.label, value: c.count }))} />
        </Panel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Panel index={idx()} title="Devices" empty={!data.devices?.length}>
            <BarList rows={(data.devices ?? []).map((d) => ({ key: d.device ?? "?", label: d.device ?? "Unknown", value: d.visits }))} />
          </Panel>
          <Panel index={idx()} title="Language" empty={!data.languages?.length}>
            <BarList
              rows={(data.languages ?? []).map((l) => ({ key: l.lang, label: l.lang === "pt" ? "Português (/pt)" : "English", value: l.visits }))}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Panel({ index, title, empty, children, aside }: { index: string; title: string; empty?: boolean; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <PanelTitle index={index} aside={aside}>{title}</PanelTitle>
      <div className="mt-4">{empty ? <div className="py-6 text-center text-sm text-subtle">No data yet.</div> : children}</div>
    </Card>
  );
}

/** label · bar · number, bars relative to the largest row. */
function BarList({ rows }: { rows: { key: string; label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_3.5rem] items-center gap-x-3 py-1">
          <span className="truncate text-sm text-fg-2" title={r.label}>{r.label}</span>
          <div className="h-3">
            <div className="h-full bg-accent" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          <span className="text-right font-mono text-sm tabular-nums text-fg">
            {r.value}
            {r.note && <span className="ml-1 text-[11px] text-subtle">{r.note}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Visits per day, one column each; days without a visit show as empty. */
function Daily({ data, days, index }: { data: Analytics; days: number; index: string }) {
  const byDay = new Map((data.daily ?? []).map((d) => [d.day.slice(0, 10), d]));
  const today = new Date();
  const cols = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key, date: d, visits: byDay.get(key)?.visits ?? 0, pageviews: byDay.get(key)?.pageviews ?? 0 };
  });
  const max = Math.max(1, ...cols.map((c) => c.visits));
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Card className="p-5 sm:p-6">
      <PanelTitle index={index} aside={<span className="font-mono text-[11px] text-subtle">peak {max} / day</span>}>
        Visits per day
      </PanelTitle>
      <div className="mt-5 flex h-32 items-end gap-[2px]" role="img" aria-label={`Visits per day over the last ${days} days`}>
        {cols.map((c) => (
          <div
            key={c.key}
            title={`${fmt(c.date)}: ${c.visits} visits, ${c.pageviews} pages`}
            className={`min-w-0 flex-1 ${c.visits ? "bg-accent" : "bg-surface-2"}`}
            style={{ height: c.visits ? `${Math.max(4, (c.visits / max) * 100)}%` : "2px" }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-subtle">
        <span>{fmt(cols[0].date)}</span>
        <span>today</span>
      </div>
    </Card>
  );
}

function Pages({ data, index }: { data: Analytics; index: string }) {
  const rows = data.pages ?? [];
  return (
    <Card className="p-5 sm:p-6">
      <PanelTitle index={index}>Pages</PanelTitle>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-subtle">No data yet.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                <th className="pb-2 text-left font-normal">Page</th>
                <th className="pb-2 text-right font-normal">Visits</th>
                <th className="pb-2 text-right font-normal">Views</th>
                <th className="pb-2 text-right font-normal">Time</th>
                <th className="pb-2 text-right font-normal">Scrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.path ?? "?"}>
                  <td className="max-w-[18rem] truncate py-2 font-mono text-fg-2">{p.path ?? "—"}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-fg">{p.visits}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted">{p.pageviews}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted">{duration(p.avg_seconds)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted">{pct(p.avg_scroll)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Sent emails whose portfolio link was opened (the ?r= ref on the link). */
function LeadVisits({ leads, index }: { leads: LeadVisit[]; index: string }) {
  return (
    <Card>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <PanelTitle
          index={index}
          aside={<span className="hidden font-mono text-[11px] text-subtle sm:inline">newest visit first</span>}
        >
          Visits from your emails
        </PanelTitle>
      </div>
      {leads.length === 0 ? (
        <Empty icon="globe">
          No one has opened the portfolio from an email yet. Emails sent from now on carry a visit ref on the jackmiro.pt link.
        </Empty>
      ) : (
        <div className="mt-3 divide-y divide-line">
          {leads.map((l) => (
            <div key={l.application.id} className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-fg">{l.application.company || l.application.to_email}</span>
                <span className="text-xs text-subtle">{l.application.kind}</span>
                <StatusBadge status={l.application.status} />
                {l.application.reply_class && <ReplyTag cls={l.application.reply_class} />}
                {l.enquiries > 0 && (
                  <span className="rounded-sm border border-good/30 bg-good/10 px-1.5 py-px font-mono text-[11px] text-good">
                    sent an enquiry
                  </span>
                )}
                <span className="ml-auto text-xs text-subtle" title={fmtTime(l.last_visit)}>
                  last visit {timeAgo(l.last_visit)}
                </span>
              </div>
              <div className="mt-1 truncate text-sm text-fg-2">{l.application.subject}</div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted">
                <span>
                  <b className="font-medium text-fg">{l.visits}</b> {l.visits === 1 ? "visit" : "visits"} ·{" "}
                  <b className="font-medium text-fg">{l.pageviews}</b> {l.pageviews === 1 ? "page" : "pages"}
                </span>
                {l.seconds ? <span>{duration(l.seconds)} on the site</span> : null}
                {(l.city || l.country) && <span>{[l.city, l.country].filter(Boolean).join(", ")}</span>}
                <span>sent {fmtTime(l.application.sent_at)}</span>
              </div>
              {l.pages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.pages.map((p) => (
                    <span key={p} className="border border-line bg-surface-2 px-1.5 py-px font-mono text-[11px] text-fg-2">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
