"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stats, errorMessage, getStats, startRun } from "@/lib/api";
import { Icon } from "@/components/icons";
import {
  Bar,
  Button,
  Card,
  Empty,
  Label,
  Msg,
  Notice,
  PageHeader,
  ReplyTag,
  Spinner,
  StatCard,
  StatusBadge,
  buttonClass,
  fmtTime,
  timeAgo,
} from "@/components/ui";

export default function OverviewPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 20_000,
  });
  const run = useMutation({
    mutationFn: () => startRun("daily"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" sub={`Daily job applications and project pitches from ${data?.mail.from ?? "dev@jackmiro.pt"}.`}>
        <Button busy={run.isPending || data?.pipeline_running} onClick={() => run.mutate()}>
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
          <TodayCard data={data} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Sent · 7 days"
              value={data.sent_7d}
              sub={data.reply_rate_30d !== null ? `${Math.round(data.reply_rate_30d * 100)}% reply rate (30d)` : "no sends yet"}
            />
            <StatCard label="Replies · 7 days" value={data.replies_7d} accent sub={`${data.applications.replied || 0} total`} />
            <StatCard
              label="Strong matches"
              value={data.opportunities.high_matches}
              sub={`${data.opportunities.jobs} jobs · ${data.opportunities.leads} leads found`}
            />
            <StatCard
              label="Bounce rate · 30d"
              value={data.bounce_rate_30d !== null ? `${(data.bounce_rate_30d * 100).toFixed(1)}%` : "—"}
              sub="keep under 2% to protect jackmiro.pt"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Recent replies</Label>
                <Link href="/outbox" className="text-xs font-medium text-accent hover:underline">
                  Outbox →
                </Link>
              </div>
              {data.recent_replies.length === 0 ? (
                <Empty icon="message">No replies yet — they show up here as soon as the inbox check sees one.</Empty>
              ) : (
                <div className="-mx-2 mt-3 space-y-0.5">
                  {data.recent_replies.map((a) => (
                    <Link
                      key={a.id}
                      href={`/outbox?id=${a.id}`}
                      className="block rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="truncate font-medium text-fg">{a.company || a.reply_from}</span>
                        <ReplyTag cls={a.reply_class} />
                        <span className="ml-auto shrink-0 text-xs text-subtle">{timeAgo(a.replied_at)}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">{a.reply_snippet}</div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <Label>Pipeline</Label>
              <div className="mt-3 space-y-2.5 text-sm">
                <Row label="Next daily run" value={fmtTime(data.next_runs.daily_pipeline)} />
                <Row
                  label="Last run"
                  value={
                    data.last_run ? (
                      <span className="flex items-center gap-2">
                        <StatusBadge status={data.last_run.status} /> {timeAgo(data.last_run.started_at)}
                      </span>
                    ) : (
                      "never"
                    )
                  }
                />
                <Row label="New today" value={data.opportunities.new_today} />
                <Row
                  label="Waiting for an email"
                  value={
                    <Link className="font-medium text-warn hover:underline" href="/jobs">
                      {data.opportunities.no_contact}
                    </Link>
                  }
                />
              </div>
              <Label className="mt-6">SerpAPI credits</Label>
              <div className="mt-3 space-y-2.5 text-sm">
                {!data.serpapi.configured ? (
                  <div className="text-xs text-warn">SERPAPI_API_KEY not set — Google Jobs/Maps/search are skipped.</div>
                ) : (
                  <>
                    <Row label="Left this month" value={data.serpapi.plan_searches_left ?? "?"} />
                    <Row label="Used today" value={`${data.serpapi.used_today} (budget left ${data.serpapi.budget_left_today})`} />
                  </>
                )}
              </div>
            </Card>
          </div>

          <Funnel data={data} />
        </>
      )}
    </div>
  );
}

/** The one thing to do today: review and send what the agent wrote. */
function TodayCard({ data }: { data: Stats }) {
  const m = data.mail;
  const warmup = m.allowance_today < m.daily_limit;
  const capped = m.sent_today >= m.allowance_today;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0 flex-1">
          <Label>Today&apos;s sending</Label>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-fg">{m.sent_today}</span>
            <span className="text-sm text-subtle">of {m.allowance_today} allowed today</span>
            {warmup && (
              <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
                warm-up · target {m.daily_limit}/day
              </span>
            )}
          </div>
          <div className="mt-3 max-w-md">
            <Bar value={m.sent_today} max={Math.max(1, m.allowance_today)} />
          </div>
        </div>

        <div className="sm:text-right">
          {m.ready > 0 ? (
            <>
              <Link href="/outbox" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
                Review {m.ready} email{m.ready === 1 ? "" : "s"}
                <Icon name="arrowRight" />
              </Link>
              <div className="mt-2 text-xs text-subtle">
                {capped ? "Today's limit reached — they'll keep for tomorrow" : "Nothing goes out until you press Send"}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 sm:flex-row-reverse">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-good/10 text-good">
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

function Funnel({ data }: { data: Stats }) {
  const rows = [
    ["Email found", data.opportunities.by_status.ready || 0, "bg-emerald-500"],
    ["Ready to send", (data.applications.draft || 0) + (data.applications.failed || 0), "bg-indigo-500"],
    ["Sent", data.applications.sent || 0, "bg-sky-500"],
    ["Replied", data.applications.replied || 0, "bg-violet-500"],
    ["Interview / won", (data.opportunities.by_status.interview || 0) + (data.opportunities.by_status.won || 0), "bg-fuchsia-500"],
  ] as const;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <Card className="p-5">
      <Label>Funnel</Label>
      <div className="mt-4 space-y-3">
        {rows.map(([label, n, color]) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-xs text-muted sm:w-32">{label}</div>
            <Bar value={n} max={max} className={color} />
            <div className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-fg-2">{n}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-subtle">{label}</span>
      <span className="text-right text-fg">{value}</span>
    </div>
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
          <div className="text-xs text-subtle">{done} of {items.length} done</div>
        </div>
        <Link href="/settings" className={buttonClass("ghost", "sm")}>
          Open settings <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map(([ok, label, hint]) => (
          <li key={label} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
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
