"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stats, errorMessage, getStats, startRun } from "@/lib/api";
import {
  Bar,
  Button,
  Card,
  PageHeader,
  Spinner,
  StatCard,
  StatusBadge,
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
    <div>
      <PageHeader title="Overview" sub="Daily job applications and project pitches from jack@jackmiro.pt.">
        <Button
          variant="primary"
          busy={run.isPending || data?.pipeline_running}
          onClick={() => run.mutate()}
        >
          {data?.pipeline_running ? "Pipeline running…" : "Run pipeline now"}
        </Button>
      </PageHeader>
      {run.isError && <div className="mt-2 text-xs text-rose-300">{errorMessage(run.error)}</div>}

      {isLoading && <div className="mt-8"><Spinner label="Loading…" /></div>}
      {isError && (
        <div className="mt-8 text-sm text-rose-400">
          Could not reach the API. Start it with <code className="text-slate-300">python main.py serve</code>.
        </div>
      )}

      {data && (
        <>
          <SetupChecklist data={data} />

          <Card className="mt-5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Today&apos;s sending</div>
                <div className="mt-1 text-sm text-slate-300">
                  <span className="text-2xl font-semibold tabular-nums text-slate-100">{data.mail.sent_today}</span>
                  <span className="text-slate-500"> / {data.mail.allowance_today} allowed today</span>
                  {data.mail.allowance_today < data.mail.daily_limit && (
                    <span className="ml-2 text-xs text-amber-300/80">
                      warm-up (target {data.mail.daily_limit}/day)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                {data.mail.sending_enabled ? (
                  <span className="text-emerald-400">● sending on</span>
                ) : (
                  <span className="text-amber-300">● sending paused</span>
                )}
                <div>
                  window {data.mail.window_open ? "open" : data.mail.window_reason} · {data.mail.queued} queued
                </div>
                {data.mail.next_send_at && data.mail.sending_enabled && (
                  <div>next send {timeAgo(data.mail.next_send_at)}</div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Bar value={data.mail.sent_today} max={Math.max(1, data.mail.allowance_today)} />
            </div>
          </Card>

          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Sent (7 days)"
              value={data.sent_7d}
              sub={data.reply_rate_30d !== null ? `${Math.round(data.reply_rate_30d * 100)}% reply rate (30d)` : "no sends yet"}
            />
            <StatCard label="Replies (7 days)" value={data.replies_7d} accent sub={`${data.applications.replied || 0} total`} />
            <StatCard
              label="Strong matches"
              value={data.opportunities.high_matches}
              sub={`${data.opportunities.jobs} jobs · ${data.opportunities.leads} leads found`}
            />
            <StatCard
              label="Bounce rate (30d)"
              value={data.bounce_rate_30d !== null ? `${(data.bounce_rate_30d * 100).toFixed(1)}%` : "—"}
              sub="keep under 2% to protect jackmiro.pt"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-400">Recent replies</div>
                <Link href="/outbox" className="text-xs text-emerald-400 hover:underline">Outbox →</Link>
              </div>
              {data.recent_replies.length === 0 && (
                <div className="mt-4 text-sm text-slate-500">No replies yet.</div>
              )}
              <div className="mt-3 divide-y divide-[#1e293b]">
                {data.recent_replies.map((a) => (
                  <Link key={a.id} href={`/outbox?id=${a.id}`} className="block py-2.5 hover:bg-[#111a2e]/50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-200">{a.company || a.reply_from}</span>
                      <span className="text-xs text-violet-300">{(a.reply_class || "").replace("_", " ")}</span>
                      <span className="ml-auto text-xs text-slate-500">{timeAgo(a.replied_at)}</span>
                    </div>
                    <div className="truncate text-xs text-slate-400">{a.reply_snippet}</div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-400">Pipeline</div>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Next daily run" value={fmtTime(data.next_runs.daily_pipeline)} />
                <Row
                  label="Last run"
                  value={
                    data.last_run ? (
                      <span className="flex items-center gap-2">
                        <StatusBadge status={data.last_run.status} /> {timeAgo(data.last_run.started_at)}
                      </span>
                    ) : "never"
                  }
                />
                <Row label="New today" value={data.opportunities.new_today} />
                <Row label="Waiting for an email" value={<Link className="text-amber-300 hover:underline" href="/jobs">{data.opportunities.no_contact}</Link>} />
              </div>
              <div className="mt-5 text-xs uppercase tracking-wide text-slate-400">SerpAPI credits</div>
              <div className="mt-2 space-y-2 text-sm">
                {!data.serpapi.configured ? (
                  <div className="text-xs text-amber-300">SERPAPI_API_KEY not set — Google Jobs/Maps/search are skipped.</div>
                ) : (
                  <>
                    <Row label="Left this month" value={data.serpapi.plan_searches_left ?? "?"} />
                    <Row label="Used today" value={`${data.serpapi.used_today} (budget left ${data.serpapi.budget_left_today})`} />
                  </>
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-5 p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400">Funnel</div>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Ready to email", data.opportunities.by_status.ready || 0, "bg-emerald-500"],
                  ["Drafted", data.opportunities.by_status.drafted || 0, "bg-indigo-500"],
                  ["Queued", data.applications.queued || 0, "bg-emerald-400"],
                  ["Sent", data.applications.sent || 0, "bg-sky-500"],
                  ["Replied", data.applications.replied || 0, "bg-violet-500"],
                  ["Interview / won", (data.opportunities.by_status.interview || 0) + (data.opportunities.by_status.won || 0), "bg-fuchsia-500"],
                ] as const
              ).map(([label, n, color], _i, all) => {
                const max = Math.max(1, ...all.map((x) => x[1] as number));
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-slate-400">{label}</div>
                    <div className="h-2 flex-1 rounded bg-[#111a2e]">
                      <div className={`h-2 rounded ${color}`} style={{ width: `${((n as number) / max) * 100}%` }} />
                    </div>
                    <div className="w-10 text-right text-xs tabular-nums text-slate-300">{n}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

/** First-run checklist: everything that must be true before mail goes out. */
function SetupChecklist({ data }: { data: Stats }) {
  const items: [boolean, string, string][] = [
    [data.mail.smtp_configured, "SMTP configured for jack@jackmiro.pt", "set SMTP_* in the server .env"],
    [data.mail.imap_configured, "IMAP configured (reply & bounce tracking)", "set IMAP_* in the server .env"],
    [data.mail.cv_uploaded, "CV uploaded", "Settings → Profile"],
    [data.serpapi.configured, "SerpAPI key", "set SERPAPI_API_KEY (free sources still work without it)"],
    [data.mail.sending_enabled, "Sending enabled", "Settings → Sending, after a test email + reviewing drafts"],
  ];
  if (items.every(([ok]) => ok)) return null;
  return (
    <Card className="mt-5 border-amber-500/20 p-5">
      <div className="text-xs uppercase tracking-wide text-amber-300/90">Setup</div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map(([ok, label, hint]) => (
          <li key={label} className="flex items-center gap-2">
            <span className={ok ? "text-emerald-400" : "text-slate-600"}>{ok ? "✓" : "○"}</span>
            <span className={ok ? "text-slate-400" : "text-slate-200"}>{label}</span>
            {!ok && <span className="text-xs text-slate-500">— {hint}</span>}
          </li>
        ))}
      </ul>
      {!data.mail.sending_enabled && (
        <div className="mt-3 text-xs text-slate-500">
          <Link href="/settings" className="text-emerald-400 hover:underline">Open settings →</Link>
        </div>
      )}
    </Card>
  );
}

