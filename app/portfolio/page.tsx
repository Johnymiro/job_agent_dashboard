"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Analytics,
  EnquiryStatus,
  LeadVisit,
  PortfolioEnquiry,
  errorMessage,
  getAnalytics,
  getApplication,
  getEnquiries,
  setEnquiryStatus,
} from "@/lib/api";
import { DrawerShell, OpportunityDrawer } from "@/components/OpportunityTable";
import {
  Button,
  Card,
  Empty,
  Msg,
  Notice,
  PageHeader,
  PanelTitle,
  Pill,
  ReplyTag,
  Segmented,
  Spinner,
  StatCard,
  Tabs,
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
      {data?.configured ? <Report data={data} /> : !isLoading && <Enquiries index="01" />}
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

      <Enquiries index={idx()} />

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
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                <th className="pb-2 text-left font-normal">Page</th>
                <th className="w-16 pb-2 text-right font-normal">Visits</th>
                <th className="w-16 pb-2 text-right font-normal">Views</th>
                <th className="w-20 pb-2 text-right font-normal">Time</th>
                <th className="w-24 pb-2 text-right font-normal">Scrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.path ?? "?"}>
                  <td className="truncate py-2 pr-3 font-mono text-fg-2" title={p.path ?? undefined}>{p.path ?? "—"}</td>
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

const ENQUIRY_TABS = [
  { value: "inbox", label: "Inbox" },
  { value: "replied", label: "Replied" },
  { value: "spam", label: "Spam" },
] as const;
type EnquiryTab = (typeof ENQUIRY_TABS)[number]["value"];
const inTab = (e: PortfolioEnquiry, tab: EnquiryTab) =>
  tab === "inbox" ? e.status === "new" || e.status === "read" : e.status === tab;

/** Messages from the portfolio's contact form (a copy the portfolio posts to the server). */
function Enquiries({ index }: { index: string }) {
  const [tab, setTab] = useState<EnquiryTab>("inbox");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["enquiries"],
    queryFn: getEnquiries,
    refetchInterval: 60_000,
  });
  const all = data ?? [];
  const rows = all.filter((e) => inTab(e, tab));
  const fresh = all.filter((e) => e.status === "new").length;

  return (
    <Card>
      <div className="space-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <PanelTitle
          index={index}
          aside={fresh > 0 && <span className="font-mono text-[11px] text-accent">{fresh} new</span>}
        >
          Enquiries from the contact form
        </PanelTitle>
        <Tabs
          value={tab}
          onChange={setTab}
          options={ENQUIRY_TABS.map((t) => ({ ...t, count: all.filter((e) => inTab(e, t.value)).length }))}
        />
      </div>
      {isLoading ? (
        <div className="py-8">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="px-5 py-6 sm:px-6">
          <Msg msg={{ ok: false, text: errorMessage(error) }} />
        </div>
      ) : rows.length === 0 ? (
        <Empty icon="message">
          {tab === "inbox"
            ? "No enquiries yet. Messages sent from the contact form on jackmiro.pt show up here."
            : `Nothing marked ${tab}.`}
        </Empty>
      ) : (
        <div className="mt-3 divide-y divide-line">
          {rows.map((e) => (
            <EnquiryRow key={e.id} e={e} />
          ))}
        </div>
      )}
    </Card>
  );
}

function EnquiryRow({ e }: { e: PortfolioEnquiry }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [emailId, setEmailId] = useState<number | null>(null);
  const status = useMutation({
    mutationFn: (s: EnquiryStatus) => setEnquiryStatus(e.id, s),
    onSettled: () => qc.invalidateQueries({ queryKey: ["enquiries"] }),
  });
  const set = (s: EnquiryStatus) => status.mutate(s);
  const chips = [e.service, e.budget, e.timeline].filter(Boolean) as string[];
  const preferred = (c: string) =>
    e.preferred_contact === c ? <span className="ml-1 text-[10px] text-subtle">(preferred)</span> : null;
  const link = "text-fg-2 underline decoration-line underline-offset-2 hover:text-accent hover:decoration-accent";

  return (
    <div className={`px-5 py-4 sm:px-6 ${e.status === "new" ? "bg-accent/[0.04]" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-fg">{e.name}</span>
        {e.company && <span className="text-sm text-muted">{e.company}</span>}
        {e.status === "new" && <Pill tone="info">new</Pill>}
        {e.status === "replied" && <Pill tone="plum">replied</Pill>}
        {e.status === "spam" && <Pill tone="dim">spam</Pill>}
        {e.locale && e.locale !== "en" && <span className="font-mono text-[11px] uppercase text-subtle">{e.locale}</span>}
        <span className="ml-auto text-xs text-subtle" title={fmtTime(e.created_at)}>
          {timeAgo(e.created_at)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        {e.email && (
          <a className={link} href={`mailto:${e.email}`}>
            {e.email}
            {preferred("email")}
          </a>
        )}
        {e.telegram && (
          <a className={link} href={`https://t.me/${encodeURIComponent(e.telegram)}`} target="_blank" rel="noreferrer">
            @{e.telegram} · Telegram
            {preferred("telegram")}
          </a>
        )}
        {e.whatsapp && (
          <a className={link} href={`https://wa.me/${e.whatsapp}`} target="_blank" rel="noreferrer">
            +{e.whatsapp} · WhatsApp
          </a>
        )}
        {e.site && (
          <a className={link} href={/^https?:\/\//i.test(e.site) ? e.site : `https://${e.site}`} target="_blank" rel="noreferrer">
            {e.site.replace(/^https?:\/\//i, "")}
          </a>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="border border-line bg-surface-2 px-1.5 py-px text-[11px] text-fg-2">
              {c}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={open ? "Show less" : "Show the whole message"}
        className={`mt-2 block w-full whitespace-pre-wrap break-words text-left text-sm text-fg-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${open ? "" : "line-clamp-3"}`}
      >
        {e.message}
      </button>

      {e.application && (
        <button
          type="button"
          onClick={() => setEmailId(e.application!.id)}
          className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted hover:text-accent"
          title="Open the job and the email that brought them"
        >
          <span className="text-subtle">Came from your email</span>
          <span className="truncate text-fg-2">
            {e.application.company || e.application.to_email} · {e.application.subject}
          </span>
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {e.status === "new" && (
          <Button size="sm" variant="subtle" busy={status.isPending} onClick={() => set("read")}>
            Mark read
          </Button>
        )}
        {e.status !== "replied" && e.status !== "spam" && (
          <Button size="sm" variant="ghost" busy={status.isPending} onClick={() => set("replied")}>
            Replied
          </Button>
        )}
        {e.status === "replied" && (
          <Button size="sm" variant="subtle" busy={status.isPending} onClick={() => set("read")}>
            Not replied yet
          </Button>
        )}
        {e.status === "spam" ? (
          <Button size="sm" variant="subtle" busy={status.isPending} onClick={() => set("read")}>
            Not spam
          </Button>
        ) : (
          <Button size="sm" variant="subtle" busy={status.isPending} onClick={() => set("spam")}>
            Spam
          </Button>
        )}
        {status.isError && <Msg msg={{ ok: false, text: errorMessage(status.error) }} />}
      </div>
      {emailId !== null && <LeadDrawer emailId={emailId} onClose={() => setEmailId(null)} />}
    </div>
  );
}

/** Sent emails whose portfolio link was opened (the ?r= ref on the link). */
function LeadVisits({ leads, index }: { leads: LeadVisit[]; index: string }) {
  const [openId, setOpenId] = useState<number | null>(null);
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
            <div
              key={l.application.id}
              role="button"
              tabIndex={0}
              title="Open the job, its description and the emails"
              onClick={() => setOpenId(l.application.id)}
              onKeyDown={(e) => e.key === "Enter" && setOpenId(l.application.id)}
              className="cursor-pointer px-5 py-4 outline-none transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2 sm:px-6"
            >
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
      {openId !== null && <LeadDrawer emailId={openId} onClose={() => setOpenId(null)} />}
    </Card>
  );
}

/** The job (or lead) behind a sent email, with that email's conversation. The
 *  visit only knows the email, so the email says which job it's for. */
function LeadDrawer({ emailId, onClose }: { emailId: number; onClose: () => void }) {
  const { data: a, error } = useQuery({ queryKey: ["app", emailId], queryFn: () => getApplication(emailId) });
  if (a) return <OpportunityDrawer id={a.opportunity_id} emailId={emailId} onClose={onClose} />;
  return (
    <DrawerShell label="" onClose={onClose}>
      {error ? <Msg msg={{ ok: false, text: errorMessage(error) }} /> : <Spinner />}
    </DrawerShell>
  );
}
