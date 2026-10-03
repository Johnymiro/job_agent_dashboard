"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppAction,
  Application,
  applicationAction,
  bulkApplications,
  errorMessage,
  getApplication,
  getApplications,
  getStats,
  updateApplication,
} from "@/lib/api";
import {
  Button,
  Card,
  Empty,
  Field,
  PageHeader,
  ScoreBadge,
  Spinner,
  StatusBadge,
  Toggle,
  fmtTime,
  controlCls,
  inputCls,
  timeAgo,
} from "@/components/ui";

const TABS: [string, string][] = [
  ["queued", "Queued"],
  ["draft", "Drafts"],
  ["sent", "Sent"],
  ["replied", "Replied"],
  ["bounced,failed", "Bounced / failed"],
  ["skipped", "Skipped"],
  ["", "All"],
];

const REPLY_STYLE: Record<string, string> = {
  interested: "text-emerald-300",
  question: "text-sky-300",
  rejection: "text-slate-400",
  not_interested: "text-slate-400",
  unsubscribe: "text-rose-300",
  auto_reply: "text-slate-500",
  other: "text-slate-300",
};

export default function OutboxPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(TABS[0][0]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  // deep link from the opportunity drawer: /outbox?id=123
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      setSelected(Number(id));
      setTab("");
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["apps", tab, q],
    queryFn: () => getApplications({ status: tab || undefined, q: q || undefined, limit: 200 }),
    refetchInterval: 30_000,
  });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 30_000 });

  const bulk = useMutation({
    mutationFn: (action: "queue" | "unqueue" | "skip") => bulkApplications([...checked], action),
    onSuccess: () => {
      setChecked(new Set());
      qc.invalidateQueries({ queryKey: ["apps"] });
    },
  });

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((a) => checked.has(a.id));
  const mail = stats?.mail;

  return (
    <div>
      <PageHeader
        title="Outbox"
        sub={
          mail ? (
            <>
              {mail.sending_enabled ? (
                <span className="text-emerald-400">Sending on</span>
              ) : (
                <span className="text-amber-300">Sending paused (Settings)</span>
              )}{" "}
              · {mail.sent_today}/{mail.allowance_today} sent today · {mail.queued} queued
              {mail.next_send_at && mail.sending_enabled && ` · next ${timeAgo(mail.next_send_at)}`}
              {!mail.window_open && ` · window ${mail.window_reason}`}
              {!mail.cv_uploaded && <span className="text-rose-300"> · no CV uploaded</span>}
            </>
          ) : (
            "Every email the agent wrote — review, edit, queue or send."
          )
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TABS.map(([v, l]) => (
          <button
            key={l}
            onClick={() => {
              setTab(v);
              setChecked(new Set());
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === v ? "bg-emerald-500/10 text-emerald-300" : "text-slate-400 hover:bg-[#111a2e]"
            }`}
          >
            {l}
            {stats && v && v.split(",").reduce((n, s) => n + (stats.applications[s] || 0), 0) > 0 && (
              <span className="ml-1.5 text-xs text-slate-500">
                {v.split(",").reduce((n, s) => n + (stats.applications[s] || 0), 0)}
              </span>
            )}
          </button>
        ))}
        <input
          className={`${controlCls} ml-auto w-64`}
          placeholder="Search company, subject, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {checked.size > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          {checked.size} selected
          <Button busy={bulk.isPending} onClick={() => bulk.mutate("queue")}>Queue</Button>
          <Button busy={bulk.isPending} onClick={() => bulk.mutate("unqueue")}>Back to drafts</Button>
          <Button variant="danger" busy={bulk.isPending} onClick={() => bulk.mutate("skip")}>Skip</Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className="max-h-[calc(100vh-220px)] overflow-y-auto">
          {isLoading && <div className="p-5"><Spinner /></div>}
          {!isLoading && items.length === 0 && <Empty>No emails here.</Empty>}
          {items.length > 0 && (
            <div className="flex items-center gap-3 border-b border-[#1e293b] px-4 py-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? new Set() : new Set(items.map((a) => a.id)))}
              />
              {data?.total} emails
            </div>
          )}
          {items.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`flex cursor-pointer gap-3 border-b border-[#1e293b]/60 px-4 py-3 hover:bg-[#111a2e]/60 ${
                selected === a.id ? "bg-[#111a2e]" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked.has(a.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  const next = new Set(checked);
                  if (next.has(a.id)) next.delete(a.id);
                  else next.add(a.id);
                  setChecked(next);
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ScoreBadge score={a.score} />
                  <span className="truncate text-sm text-slate-200">{a.company || a.to_email}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {timeAgo(a.replied_at || a.sent_at || a.created_at)}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">{a.subject}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <StatusBadge status={a.status} />
                  <span className="text-slate-500">{a.kind}</span>
                  {a.reply_class && (
                    <span className={REPLY_STYLE[a.reply_class] || "text-slate-400"}>
                      {a.reply_class.replace("_", " ")}
                    </span>
                  )}
                  {a.error && <span className="truncate text-rose-300/80">{a.error}</span>}
                </div>
              </div>
            </div>
          ))}
        </Card>

        <div>
          {selected ? (
            <Editor key={selected} id={selected} />
          ) : (
            <Card>
              <Empty>Select an email to review it.</Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Editor({ id }: { id: number }) {
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({ queryKey: ["app", id], queryFn: () => getApplication(id) });
  const [form, setForm] = useState<Partial<Application> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (a) setForm({ to_email: a.to_email, to_name: a.to_name, subject: a.subject, body: a.body, attach_cv: a.attach_cv });
  }, [a]);

  const after = (d: Application, text: string) => {
    qc.setQueryData(["app", id], d);
    qc.invalidateQueries({ queryKey: ["apps"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    setMsg({ ok: true, text });
  };
  const fail = (e: unknown) => setMsg({ ok: false, text: errorMessage(e) });

  const save = useMutation({
    mutationFn: () =>
      updateApplication(id, {
        to_email: form?.to_email,
        to_name: form?.to_name ?? undefined,
        subject: form?.subject,
        body: form?.body,
        attach_cv: form?.attach_cv,
      }),
    onSuccess: (d) => after(d, "Saved"),
    onError: fail,
  });
  const act = useMutation({
    mutationFn: async (action: AppAction) => {
      if (dirty && action !== "skip" && action !== "redraft") await save.mutateAsync();
      return applicationAction(id, action);
    },
    onSuccess: (d, action) =>
      after(d, { queue: "Queued — it will go out within the send window", unqueue: "Moved back to drafts", skip: "Skipped", send: "Sent ✓", redraft: "Re-drafted" }[action]),
    onError: fail,
  });

  if (isLoading || !a || !form) return <Card className="p-5"><Spinner /></Card>;

  const editable = ["draft", "queued", "failed", "skipped"].includes(a.status);
  const dirty =
    form.to_email !== a.to_email ||
    (form.to_name || "") !== (a.to_name || "") ||
    form.subject !== a.subject ||
    form.body !== a.body ||
    form.attach_cv !== a.attach_cv;
  const busy = save.isPending || act.isPending;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <ScoreBadge score={a.score} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100">{a.company || "—"}</div>
          <div className="truncate text-xs text-slate-400">
            {a.opportunity_title}
            {a.opportunity_url && (
              <a className="ml-2 text-emerald-400 hover:underline" href={a.opportunity_url} target="_blank" rel="noreferrer">
                posting ↗
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={a.status} />
          <div className="mt-1 text-xs text-slate-500">{a.kind}{a.language ? ` · ${a.language}` : ""}</div>
        </div>
      </div>

      {a.sent_at && <div className="mt-3 text-xs text-slate-500">Sent {fmtTime(a.sent_at)}</div>}
      {a.error && <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{a.error}</div>}

      {a.reply_snippet && (
        <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className={REPLY_STYLE[a.reply_class || "other"]}>{(a.reply_class || "reply").replace("_", " ")}</span>
            <span className="text-slate-500">from {a.reply_from} · {fmtTime(a.replied_at)}</span>
          </div>
          {a.reply_subject && <div className="mb-1 text-xs text-slate-400">{a.reply_subject}</div>}
          <div className="whitespace-pre-wrap text-sm text-slate-200">{a.reply_snippet}</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="To (email)">
          <input className={inputCls} disabled={!editable} value={form.to_email || ""} onChange={(e) => setForm({ ...form, to_email: e.target.value })} />
        </Field>
        <Field label="To (name)">
          <input className={inputCls} disabled={!editable} value={form.to_name || ""} onChange={(e) => setForm({ ...form, to_name: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Subject">
          <input className={inputCls} disabled={!editable} value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Message" hint="Sign-off, signature (and the opt-out line on cold pitches) are added automatically.">
          <textarea
            className={`${inputCls} min-h-[300px] font-[inherit] leading-relaxed`}
            disabled={!editable}
            value={form.body || ""}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Toggle
          checked={!!form.attach_cv}
          onChange={(v) => editable && setForm({ ...form, attach_cv: v })}
          label="Attach CV (PDF)"
        />
      </div>

      {editable && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button busy={save.isPending} disabled={!dirty || busy} onClick={() => save.mutate()}>Save</Button>
          {a.status !== "queued" && (
            <Button variant="primary" disabled={busy} onClick={() => act.mutate("queue")}>Approve & queue</Button>
          )}
          {a.status === "queued" && <Button disabled={busy} onClick={() => act.mutate("unqueue")}>Back to drafts</Button>}
          <Button disabled={busy} onClick={() => act.mutate("send")}>Send now</Button>
          {a.kind !== "followup" && ["draft", "queued"].includes(a.status) && (
            <Button disabled={busy} onClick={() => act.mutate("redraft")}>Re-write</Button>
          )}
          {a.status !== "skipped" && <Button variant="danger" disabled={busy} onClick={() => act.mutate("skip")}>Skip</Button>}
          {busy && <Spinner label="Working…" />}
        </div>
      )}
      {msg && <div className={`mt-3 text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</div>}

      <button className="mt-5 text-xs text-slate-500 hover:text-slate-300" onClick={() => setShowPreview(!showPreview)}>
        {showPreview ? "▾" : "▸"} Exactly as sent (saved version)
      </button>
      {showPreview && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-[#1e293b] bg-[#111a2e] p-3 font-[inherit] text-sm text-slate-300">
          {`Subject: ${a.subject}\n\n${a.preview}`}
        </pre>
      )}
    </Card>
  );
}
