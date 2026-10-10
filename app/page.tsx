"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Application, Meeting, Stats, errorMessage, getStats, startRun } from "@/lib/api";
import { Icon } from "@/components/icons";
import {
  Button,
  Card,
  Cells,
  Empty,
  Label,
  Msg,
  Notice,
  PageHeader,
  PanelTitle,
  ReplyTag,
  Spinner,
  StatCard,
  StatusBadge,
  buttonClass,
  fmtTime,
  humanize,
  timeAgo,
  useNow,
} from "@/components/ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function OverviewPage() {
  const qc = useQueryClient();
  const now = useNow();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 20_000,
  });
  const run = useMutation({
    mutationFn: () => startRun("daily"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });

  // panels are numbered [01], [02] … in the order they render
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        sub={
          <>
            Daily job applications and project pitches from{" "}
            <span className="font-mono text-fg">{data?.mail.from ?? "dev@jackmiro.pt"}</span>
          </>
        }
      >
        <Button size="lg" className="font-medium" busy={run.isPending || data?.pipeline_running} onClick={() => run.mutate()}>
          {!run.isPending && !data?.pipeline_running && <Icon name="play" className="h-3.5 w-3.5" />}
          {data?.pipeline_running ? "Pipeline running…" : "Run pipeline now"}
        </Button>
      </PageHeader>
      {run.isError && <Msg msg={{ ok: false, text: errorMessage(run.error) }} />}

      {isLoading && <Spinner label="Loading…" />}
      {isError && (
        <Notice tone="bad">
          Could not reach the API. Start it with <code className="font-mono text-fg">python main.py serve</code>.
        </Notice>
      )}

      {data && (
        <>
          <SetupChecklist data={data} />
          {data.needs_input > 0 && (
            <Notice tone="warn" icon="message">
              {data.needs_input} {data.needs_input === 1 ? "reply is" : "replies are"} waiting for your answer: they asked
              something your profile doesn&apos;t say.{" "}
              <Link href="/outbox" className="font-medium text-accent hover:underline">Answer in the Outbox →</Link>
            </Notice>
          )}
          <TodayCard data={data} index={idx()} />
          {data.meetings.length > 0 && <CallsCard meetings={data.meetings} index={idx()} />}

          <StatRow data={data} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <RecentReplies replies={data.recent_replies} index={idx()} className="lg:col-span-3" />
            <Pipeline data={data} now={now} index={idx()} className="lg:col-span-2" />
          </div>

          <Funnel data={data} index={idx()} />
        </>
      )}
    </div>
  );
}

/** The one thing to do today: review and send what the agent wrote. */
function TodayCard({ data, index }: { data: Stats; index: string }) {
  const m = data.mail;
  const allowance = m.allowance_today;
  const slots = Math.max(0, allowance - m.sent_today);
  const queued = Math.min(m.ready, slots); // the part of the queue that fits today
  const free = slots - queued;
  const waiting = m.ready - queued;
  const warmup = allowance < m.daily_limit;
  const capped = m.sent_today >= allowance;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <PanelTitle index={index}>Today&apos;s sending</PanelTitle>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-5xl font-medium tabular-nums text-fg">{m.sent_today}</span>
            <span className="font-mono text-2xl text-faint">/</span>
            <span className="font-mono text-2xl tabular-nums text-muted">{allowance}</span>
            <span className="text-sm text-muted">allowed today</span>
            {warmup && (
              <span className="self-center border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
                warm-up · target {m.daily_limit}/day
              </span>
            )}
          </div>

          <div className="mt-5 max-w-3xl">
            <Cells total={Math.max(1, allowance)} filled={m.sent_today} hatched={queued} maxCells={40} className="h-7" />
            <Axis max={allowance} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-xs text-muted">
            <Legend swatch="bg-accent">
              sent <b className="font-medium text-fg">{m.sent_today}</b>
            </Legend>
            <Legend swatch="hatch border border-accent/70">
              queued for review <b className="font-medium text-fg">{m.ready}</b>
            </Legend>
            <Legend swatch="border border-line bg-surface-2/60">
              free after review <b className="font-medium text-fg">{free}</b>
            </Legend>
          </div>
          <div className="mt-2 font-mono text-[11px] text-subtle tabular-nums">
            applications {m.applications_today}/{m.daily_applications} · pitches {m.pitches_today}/{m.daily_pitches}
            {m.pitches_today > m.applications_today && m.job_share_percent > 0 && " · pitches wait until applications catch up"}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 lg:items-end lg:pt-7 lg:text-right">
          {m.ready > 0 ? (
            <>
              <Link href="/outbox" className={buttonClass("primary", "lg", "w-full lg:w-auto")}>
                Review {m.ready} email{m.ready === 1 ? "" : "s"}
                <Icon name="arrowRight" />
              </Link>
              <div className="flex items-center gap-1.5 text-sm text-muted lg:justify-end">
                <Icon name={capped ? "clock" : m.auto_send ? "send" : "lock"} className="h-3.5 w-3.5" />
                {capped
                  ? "Today's limit reached — they'll keep for tomorrow"
                  : m.auto_send
                    ? `Auto-send is on: ${m.send_on_weekends ? "every day" : "weekdays"} ${m.send_hours[0]}:00–${m.send_hours[1]}:00`
                    : "Nothing goes out until you press Send"}
              </div>
              <div className="font-mono text-[11px] text-subtle tabular-nums">
                {m.ready} queued · {slots} slot{slots === 1 ? "" : "s"} left ·{" "}
                {waiting > 0 ? <span className="text-warn">{waiting} wait for tomorrow</span> : "all fit today"}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 lg:flex-row-reverse">
              <span className="flex h-9 w-9 items-center justify-center border border-good/40 bg-good/10 text-good">
                <Icon name="check" />
              </span>
              <div>
                <div className="text-sm font-medium text-fg">All caught up</div>
                <div className="text-xs text-subtle">New drafts arrive after the next run · {fmtTime(data.next_runs.daily_pipeline)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** 0 … max scale under a meter, five ticks. */
function Axis({ max }: { max: number }) {
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max)))];
  return (
    <div className="relative mt-1.5 h-3.5 font-mono text-[10px] text-subtle tabular-nums">
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute"
          style={
            t === 0 ? { left: 0 } : t === max ? { right: 0 } : { left: `${(t / max) * 100}%`, transform: "translateX(-50%)" }
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 ${swatch}`} />
      <span>{children}</span>
    </span>
  );
}

function StatRow({ data }: { data: Stats }) {
  const o = data.opportunities;
  const found = o.jobs + o.leads;
  const share = found ? o.high_matches / found : 0;
  const bounce = data.bounce_rate_30d;
  const over = bounce !== null && bounce > 0.02;
  // the replies meter is drawn against this week's sends, so both cards line up
  const week = Math.max(10, data.sent_7d);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Sent · 7 days"
        glyph="Σ"
        value={data.sent_7d}
        sub={data.reply_rate_30d !== null ? `${pct(data.reply_rate_30d)} reply rate (30d)` : "No sends yet"}
      >
        <Cells total={week} filled={data.sent_7d} />
      </StatCard>
      <StatCard label="Replies · 7 days" glyph="r" value={data.replies_7d} accent sub={`${data.applications.replied || 0} total`}>
        <Cells total={week} filled={Math.min(week, data.replies_7d)} />
      </StatCard>
      <StatCard label="Strong matches" glyph="ρ" value={o.high_matches} sub={`${o.jobs} jobs · ${o.leads} leads found`}>
        <Meter value={share} max={1} label={pct(share)} maxLabel="100%" />
      </StatCard>
      <StatCard
        label="Bounce rate · 30d"
        value={bounce !== null ? `${(bounce * 100).toFixed(1)}%` : "—"}
        valueClass={over ? "text-warn" : "text-fg"}
        badge={
          over ? (
            <span className="inline-flex items-center gap-1 border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warn">
              <Icon name="alert" className="h-3 w-3" />
              over limit
            </span>
          ) : undefined
        }
        sub={bounce !== null ? "Keep under 2% to protect jackmiro.pt" : "No sends in the last 30 days"}
      >
        {bounce !== null && (
          <Meter value={bounce * 100} max={10} label={`${(bounce * 100).toFixed(1)}%`} maxLabel="10%" limit={2} warn={over} />
        )}
      </StatCard>
    </div>
  );
}

/** Thin bar with its value marked underneath; `limit` draws a "max" tick. */
function Meter({
  value,
  max,
  label,
  maxLabel,
  limit,
  warn = false,
}: {
  value: number;
  max: number;
  label: string;
  maxLabel: string;
  limit?: number;
  warn?: boolean;
}) {
  const at = Math.min(100, Math.max(0, (value / max) * 100));
  const limitAt = limit !== undefined ? (limit / max) * 100 : null;
  // keep the value label clear of the 0 / max / limit labels
  const showLabel = at > 6 && at < 88 && (limitAt === null || Math.abs(at - limitAt) > 14);
  return (
    <div>
      <div className="relative h-1.5 bg-surface-2">
        <div className={`h-full ${warn ? "bg-warn" : "bg-accent"}`} style={{ width: `${at}%` }} />
        {limitAt !== null && <span className="absolute -top-1.5 h-[18px] w-0.5 bg-fg" style={{ left: `${limitAt}%` }} />}
      </div>
      <div className="relative mt-1.5 h-3.5 font-mono text-[10px] text-subtle tabular-nums">
        <span className="absolute left-0">0</span>
        {limitAt !== null && (
          <span className="absolute -translate-x-1/2 text-fg-2" style={{ left: `${limitAt}%` }}>
            max {limit}
          </span>
        )}
        {showLabel && (
          <span className={`absolute -translate-x-1/2 ${warn ? "text-warn" : "text-accent"}`} style={{ left: `${at}%` }}>
            {label}
          </span>
        )}
        <span className="absolute right-0">{maxLabel}</span>
      </div>
    </div>
  );
}

/** Replies the inbox needs you to act on. */
const ACTION_NEEDED = new Set(["question", "interested"]);

/** The inbox stores "[one-line summary]\n\n<their email>". */
function splitSnippet(s: string | null): { summary: string | null; quote: string } {
  if (!s) return { summary: null, quote: "" };
  const m = s.match(/^\[([\s\S]+?)\]\n\n/);
  const rest = m ? s.slice(m[0].length) : s;
  return { summary: m ? m[1] : null, quote: rest.replace(/\s+/g, " ").trim() };
}

function RecentReplies({ replies, index, className = "" }: { replies: Application[]; index: string; className?: string }) {
  const counts: Record<string, number> = {};
  for (const a of replies) counts[a.reply_class || "other"] = (counts[a.reply_class || "other"] || 0) + 1;

  return (
    <Card className={`flex flex-col p-5 sm:p-6 ${className}`}>
      <PanelTitle
        index={index}
        aside={
          <Link href="/outbox" className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline">
            Outbox <Icon name="arrowRight" className="h-3 w-3" />
          </Link>
        }
      >
        Recent replies · {replies.length}
      </PanelTitle>

      {replies.length === 0 ? (
        <Empty icon="message">No replies yet — they show up here as soon as the inbox check sees one.</Empty>
      ) : (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {replies.map((a) => {
            const { summary, quote } = splitSnippet(a.reply_snippet);
            return (
              <li key={a.id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-5 sm:grid-cols-[5.5rem_1fr]">
                <div className="pt-0.5 font-mono text-xs text-subtle">{timeAgo(a.replied_at)}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-semibold text-fg">{a.company || a.reply_from}</span>
                    <ReplyTag cls={a.reply_class} />
                    {ACTION_NEEDED.has(a.reply_class || "") && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-warn">
                        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                        action needed
                      </span>
                    )}
                  </div>
                  {summary && <p className="mt-2 text-sm leading-relaxed text-fg-2">{summary}</p>}
                  {quote && <p className="mt-1.5 truncate font-mono text-xs text-subtle">&gt; {quote}</p>}
                  <Link href={`/outbox?id=${a.id}`} className={buttonClass("ghost", "md", "mt-3")}>
                    <Icon name="mail" className="h-3.5 w-3.5" />
                    Open thread
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {replies.length > 0 && (
        <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-line pt-4 font-mono text-[11px] text-subtle">
          <span>— end of log —</span>
          <span>
            {Object.entries(counts)
              .map(([c, k]) => `${humanize(c)} ${k}`)
              .join(" · ")}
          </span>
        </div>
      )}
    </Card>
  );
}

function Pipeline({ data, now, index, className = "" }: { data: Stats; now: number; index: string; className?: string }) {
  const next = data.next_runs.daily_pipeline;
  const last = data.last_run;
  const s = data.serpapi;
  const budget = s.used_today + s.budget_left_today;

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <PanelTitle index={index}>Pipeline</PanelTitle>

      <div className="mt-5 flex items-center gap-5">
        <RunDial running={data.pipeline_running} lastAt={last?.started_at ?? null} nextAt={next} now={now} />
        <div className="min-w-0">
          <Label className="text-[10px]">Next daily run</Label>
          <div className="mt-1 font-mono text-lg text-fg">{fmtTime(next)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            Last run
            {last ? (
              <>
                <StatusBadge status={last.status} />
                <span>{timeAgo(last.started_at)}</span>
              </>
            ) : (
              <span>never</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <LeaderRow label="New today" value={data.opportunities.new_today} />
        <LeaderRow
          label="Waiting for an email"
          value={
            <Link className="text-warn hover:underline" href="/jobs">
              {data.opportunities.no_contact}
            </Link>
          }
        />
      </div>

      <div className="my-5 border-t border-line" />

      <Label>SerpAPI credits</Label>
      {!s.configured ? (
        <div className="mt-3 text-xs text-warn">SERPAPI_API_KEY not set — Google Jobs/Maps/search are skipped.</div>
      ) : (
        <>
          <div className="mt-3 space-y-3 text-sm">
            <LeaderRow label="Left this month" value={s.plan_searches_left ?? "?"} />
            <LeaderRow
              label="Used today"
              value={
                <>
                  {s.used_today} <span className="text-subtle">/ {budget}</span>
                </>
              }
            />
          </div>
          <Cells
            total={Math.max(1, budget)}
            filled={s.used_today}
            className="mt-3 h-2"
            fillClass={s.budget_left_today === 0 ? "bg-warn" : "bg-accent"}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[11px]">
            <span className="text-subtle">daily budget</span>
            <span className={s.budget_left_today === 0 ? "text-warn" : "text-accent"}>{s.budget_left_today} left today</span>
          </div>
        </>
      )}
    </Card>
  );
}

/** Ring that fills from the last run to the next one, countdown in the middle. */
function RunDial({
  running,
  lastAt,
  nextAt,
  now,
}: {
  running: boolean;
  lastAt: string | null;
  nextAt: string | null | undefined;
  now: number;
}) {
  const end = nextAt ? new Date(nextAt).getTime() : null;
  const start = lastAt ? new Date(lastAt).getTime() : null;
  const frac = running ? 0.25 : end && start && end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const mins = end ? Math.round((end - now) / 60_000) : null;
  const left = mins === null ? "—" : mins <= 0 ? "now" : mins < 60 ? `${mins}m` : mins < 2880 ? `${Math.floor(mins / 60)}h` : `${Math.round(mins / 1440)}d`;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-20 w-20" aria-hidden="true">
        <circle cx="40" cy="40" r="37" fill="none" stroke="var(--faint)" strokeWidth="2.5" strokeDasharray="1 4.81" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
        <g className={running ? "animate-spin" : ""} style={{ transformBox: "view-box", transformOrigin: "40px 40px" }}>
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeDasharray={`${frac * c} ${c}`}
            transform="rotate(-90 40 40)"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono leading-none">
        {running ? (
          <span className="text-[11px] text-accent">running</span>
        ) : (
          <>
            <span className="text-sm text-fg">{left}</span>
            {mins !== null && mins > 0 && <span className="mt-1 text-[9px] uppercase tracking-wider text-subtle">to go</span>}
          </>
        )}
      </div>
    </div>
  );
}

function LeaderRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted">{label}</span>
      <span className="leader" />
      <span className="font-mono font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

/** Booked calls (and booking links to act on). The full briefing went to Telegram. */
function CallsCard({ meetings, index }: { meetings: Meeting[]; index: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <PanelTitle index={index}>Upcoming calls · {meetings.length}</PanelTitle>
      <ul className="mt-4 divide-y divide-line border-t border-line">
        {meetings.map((m) => (
          <li key={m.id} className="py-3.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Icon name="calendar" className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-fg">{m.when || "Not booked yet"}</span>
              {m.status === "pending" && <span className="font-mono text-[11px] text-warn">confirmation not sent yet</span>}
              {m.status === "needs_booking" && <span className="font-mono text-[11px] text-warn">pick a slot</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-5.5 text-xs text-muted">
              <span className="truncate">{[m.company, m.opportunity_title].filter(Boolean).join(" · ") || m.title}</span>
              {m.with_whom && <span>with {m.with_whom}</span>}
              {m.join_url?.startsWith("http") && (
                <a className="font-medium text-accent hover:underline" href={m.join_url} target="_blank" rel="noreferrer">join</a>
              )}
              {m.booking_url && m.status === "needs_booking" && (
                <a className="font-medium text-accent hover:underline" href={m.booking_url} target="_blank" rel="noreferrer">book a slot</a>
              )}
            </div>
            {m.note && <div className="mt-1 pl-5.5 text-xs text-warn">{m.note}</div>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Funnel({ data, index }: { data: Stats; index: string }) {
  const by = data.opportunities.by_status;
  const apps = data.applications;
  const rows: [string, number, boolean][] = [
    ["Email found", by.ready || 0, false],
    ["Ready to send", (apps.draft || 0) + (apps.failed || 0), true],
    ["Sent", apps.sent || 0, false],
    ["Replied", apps.replied || 0, false],
    ["Interview / won", (by.interview || 0) + (by.won || 0), false],
  ];
  const base = rows[0][1];
  const max = Math.max(4, Math.ceil(Math.max(...rows.map((r) => r[1])) / 4) * 4); // divisible into 4 ticks
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const grid = "grid grid-cols-[6.5rem_1fr_2.25rem_3rem] items-center gap-x-3 sm:grid-cols-[10rem_1fr_3rem_4rem] sm:gap-x-4";

  return (
    <Card className="p-5 sm:p-6">
      <PanelTitle
        index={index}
        aside={<span className="hidden font-mono text-[11px] text-subtle sm:inline">% relative to email found ({base})</span>}
      >
        Funnel
      </PanelTitle>

      <div className={`${grid} mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle`}>
        <span>Stage</span>
        <span />
        <span className="text-right">N</span>
        <span className="text-right">%</span>
      </div>

      <div className="mt-2 space-y-1">
        {rows.map(([label, k, queue]) => (
          <div key={label} className={`${grid} py-1.5`}>
            <span className="truncate text-sm text-fg-2">
              {label}
              {queue && <span className="ml-1.5 hidden font-mono text-[10px] text-subtle sm:inline">queue</span>}
            </span>
            <div className="relative h-3.5">
              {ticks.slice(1).map((t) => (
                <span key={t} className="absolute inset-y-[-6px] w-px bg-line" style={{ left: `${(t / max) * 100}%` }} />
              ))}
              <div
                className={`relative h-full ${queue ? "hatch border border-accent/70" : "bg-accent"} ${k === 0 ? "w-0.5" : ""}`}
                style={k ? { width: `${(k / max) * 100}%` } : undefined}
              />
            </div>
            <span className="text-right font-mono text-sm font-medium tabular-nums text-fg">{k}</span>
            <span className="text-right font-mono text-sm tabular-nums text-subtle">{base ? pct(k / base) : "—"}</span>
          </div>
        ))}
      </div>

      <div className={`${grid} mt-1`}>
        <span />
        <div className="relative h-3.5 font-mono text-[10px] text-subtle tabular-nums">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute"
              style={t === 0 ? { left: 0 } : t === max ? { right: 0 } : { left: `${(t / max) * 100}%`, transform: "translateX(-50%)" }}
            >
              {t}
            </span>
          ))}
        </div>
        <span />
        <span />
      </div>
    </Card>
  );
}

/** First-run checklist: everything that must be true before mail goes out. */
function SetupChecklist({ data }: { data: Stats }) {
  const items: [boolean, string, string][] = [
    [data.mail.smtp_configured, `SMTP configured for ${data.mail.from}`, "set SMTP_* in the server .env"],
    [data.mail.imap_configured, "IMAP configured (reply & bounce tracking)", "set IMAP_* in the server .env"],
    [data.mail.cv_uploaded, "CV uploaded", "Settings → Profile"],
    [data.serpapi.configured, "SerpAPI key", "set SERPAPI_API_KEY (free sources still work without it)"],
  ];
  if (items.every(([ok]) => ok)) return null;
  const done = items.filter(([ok]) => ok).length;
  return (
    <Card className="border-warn/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-fg">Finish setup</div>
          <div className="font-mono text-[11px] text-subtle">{done} of {items.length} done</div>
        </div>
        <Link href="/settings" className={buttonClass("ghost", "sm")}>
          Open settings <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map(([ok, label, hint]) => (
          <li key={label} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${
                ok ? "bg-good/15 text-good" : "border border-faint"
              }`}
            >
              {ok && <Icon name="check" className="h-2.5 w-2.5" />}
            </span>
            <span className={ok ? "text-subtle line-through decoration-faint" : "text-fg"}>{label}</span>
            {!ok && <span className="text-xs leading-5 text-subtle">— {hint}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
