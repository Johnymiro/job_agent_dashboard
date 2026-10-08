"use client";

import { type ReactNode, useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppAction,
  Application,
  EmailFields,
  Kind,
  applicationAction,
  bulkApplications,
  errorMessage,
  getApplication,
  getApplications,
  getOpportunity,
  getStats,
  previewApplication,
  updateApplication,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { MatchReasons, OpportunityDescription, OpportunityFacts } from "@/components/OpportunityTable";
import {
  Button,
  Card,
  Empty,
  Field,
  Msg,
  PageHeader,
  ReplyTag,
  ScoreBadge,
  SearchInput,
  Segmented,
  Spinner,
  StatusBadge,
  Tabs,
  Toggle,
  buttonClass,
  fmtTime,
  inputCls,
  timeAgo,
  usd,
} from "@/components/ui";

const READY = "draft,failed";
const TABS: [string, string][] = [
  [READY, "Ready to send"],
  ["sent", "Sent"],
  ["replied", "Replied"],
  ["bounced", "Bounced"],
  ["skipped", "Skipped"],
  ["", "All"],
];

// Job applications and project outreach (pitches) are reviewed separately;
// a follow-up goes with its opportunity.
const TYPES: [Kind, string][] = [
  ["job", "Job applications"],
  ["lead", "Project acquisition"],
];

const EDITABLE = ["draft", "failed", "skipped"];
const SENDABLE = ["draft", "failed"];

export default function OutboxPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<Kind>("job");
  const [tab, setTab] = useState(READY);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  // deep link from the opportunity drawer: /outbox?id=123
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      setSelected(Number(id));
      setTab("");
      getApplication(Number(id)).then((a) => a.opportunity_kind && setType(a.opportunity_kind), () => {});
    }
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const { data, isLoading } = useQuery({
    queryKey: ["apps", type, tab, q],
    queryFn: () => getApplications({ opp_kind: type, status: tab || undefined, q: q || undefined, limit: 200 }),
    refetchInterval: 30_000,
  });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 30_000 });

  const bulk = useMutation({
    mutationFn: (action: "skip" | "restore") => bulkApplications([...checked], action),
    onSuccess: () => {
      setChecked(new Set());
      qc.invalidateQueries({ queryKey: ["apps"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((a) => checked.has(a.id));
  const mail = stats?.mail;

  /** After a send/skip, open the next email in the list (fast review loop). */
  const advance = (id: number, note: string) => {
    const i = items.findIndex((x) => x.id === id);
    const next = items[i + 1] || items[i - 1];
    setSelected(next && next.id !== id ? next.id : null);
    setFlash(note);
  };

  const count = (v: string, kind: Kind = type) => {
    const byStatus = stats?.applications_by_kind?.[kind] || {};
    return v.split(",").reduce((n, s) => n + (byStatus[s] || 0), 0);
  };

  return (
    <div>
      <PageHeader
        title="Outbox"
        sub={
          mail ? (
            <>
              Nothing goes out until you press Send · <b className="font-medium text-fg-2">{mail.sent_today}/{mail.allowance_today}</b> sent today
              {mail.allowance_today < mail.daily_limit && " (warm-up)"}
            </>
          ) : (
            "Review, edit and send the emails the agent wrote."
          )
        }
      />

      {mail && (!mail.smtp_configured || !mail.cv_uploaded) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {!mail.smtp_configured && <span className="rounded-full bg-bad/10 px-2.5 py-1 font-medium text-bad">SMTP not configured</span>}
          {!mail.cv_uploaded && <span className="rounded-full bg-bad/10 px-2.5 py-1 font-medium text-bad">No CV uploaded</span>}
        </div>
      )}

      {flash && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-good/30 bg-surface px-4 py-2 text-sm font-medium text-good shadow-lg">
          <Icon name="check" /> {flash}
        </div>
      )}

      <div className="mt-5">
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v);
            setSelected(null);
            setChecked(new Set());
          }}
          options={TYPES.map(([value, label]) => ({
            value,
            label: (
              <>
                {label}
                {count(READY, value) > 0 && (
                  <span className="rounded-full bg-accent/10 px-1.5 text-xs font-medium text-accent">{count(READY, value)}</span>
                )}
              </>
            ),
            title: `${count(READY, value)} ready to send`,
          }))}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tabs
          className="-mx-1 px-1"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setChecked(new Set());
          }}
          options={TABS.map(([value, label]) => ({ value, label, count: count(value) }))}
        />
        <SearchInput
          className="w-full sm:ml-auto sm:w-64"
          placeholder="Search company, subject, email…"
          value={q}
          onChange={setQ}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* on small screens: list OR editor; side by side from xl */}
        <Card className={`flex max-h-[calc(100vh-200px)] flex-col overflow-hidden ${selected ? "hidden xl:flex" : ""}`}>
          {items.length > 0 && (
            <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-4 py-2 text-xs text-subtle">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? new Set() : new Set(items.map((a) => a.id)))}
              />
              {checked.size > 0 ? (
                <>
                  <span className="font-medium text-fg-2">{checked.size} selected</span>
                  <span className="ml-auto flex gap-1.5">
                    <Button size="sm" variant="danger" busy={bulk.isPending} onClick={() => bulk.mutate("skip")}>Skip</Button>
                    <Button size="sm" busy={bulk.isPending} onClick={() => bulk.mutate("restore")}>Restore</Button>
                  </span>
                </>
              ) : (
                <span>{data?.total} emails{tab === READY && " · best match first"}</span>
              )}
            </div>
          )}
          <div className="flex-1 divide-y divide-line overflow-y-auto">
            {isLoading && <div className="p-5"><Spinner /></div>}
            {!isLoading && items.length === 0 && (
              <Empty icon={tab === READY ? "check" : "mail"}>
                {tab === READY ? "All caught up — new drafts arrive after the daily pipeline run." : "No emails here."}
              </Empty>
            )}
            {items.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelected(a.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(a.id)}
                tabIndex={0}
                className={`relative flex cursor-pointer gap-3 px-4 py-3 outline-none transition-colors focus-visible:bg-surface-2 ${
                  selected === a.id ? "bg-accent/5" : "hover:bg-surface-2/70"
                }`}
              >
                {selected === a.id && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                <input
                  type="checkbox"
                  className="mt-1"
                  aria-label="Select"
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
                    <span className="truncate text-sm font-medium text-fg">{a.company || a.to_email}</span>
                    <span className="ml-auto shrink-0 text-xs text-subtle">
                      {timeAgo(a.replied_at || a.sent_at || a.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-fg-2">{a.subject}</div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <StatusBadge status={a.status === "draft" ? "ready" : a.status} />
                    <span className="text-subtle">{a.kind}</span>
                    <span className="truncate text-subtle">{a.to_email}</span>
                    {a.reply_class && <ReplyTag cls={a.reply_class} />}
                    {a.error && <span className="truncate text-bad">{a.error}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className={selected ? "" : "hidden xl:block"}>
          {selected ? (
            <>
              <Button variant="subtle" size="sm" className="mb-3 xl:hidden" onClick={() => setSelected(null)}>
                <Icon name="arrowLeft" className="h-3.5 w-3.5" /> Back to list
              </Button>
              <Editor key={selected} id={selected} onDone={advance} />
            </>
          ) : (
            <Card>
              <Empty icon="mail">Select an email to review and send it.</Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Editor({ id, onDone }: { id: number; onDone: (id: number, note: string) => void }) {
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({ queryKey: ["app", id], queryFn: () => getApplication(id) });
  const [form, setForm] = useState<EmailFields | null>(null);
  const [mode, setMode] = useState<"edit" | "preview" | "job" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!a) return;
    setForm({ to_email: a.to_email, to_name: a.to_name, subject: a.subject, body: a.body, attach_cv: a.attach_cv });
    setMode((m) => m ?? (EDITABLE.includes(a.status) ? "edit" : "preview"));
  }, [a]);

  const refresh = (d: Application) => {
    qc.setQueryData(["app", id], d);
    qc.invalidateQueries({ queryKey: ["apps"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const fail = (e: unknown) => setMsg({ ok: false, text: errorMessage(e) });

  const save = useMutation({
    mutationFn: () => updateApplication(id, { ...form, to_name: form?.to_name ?? undefined }),
    onSuccess: (d) => {
      refresh(d);
      setMsg({ ok: true, text: "Saved" });
    },
    onError: fail,
  });
  const act = useMutation({
    mutationFn: async (action: AppAction) => {
      if (dirty && action === "send") await save.mutateAsync();
      return applicationAction(id, action);
    },
    onSuccess: (d, action) => {
      refresh(d);
      if (action === "send") onDone(id, `Sent to ${d.to_email}`);
      else if (action === "skip") onDone(id, `Skipped ${d.company || d.to_email}`);
      else setMsg({ ok: true, text: action === "restore" ? "Back in Ready to send" : "Re-written" });
    },
    onError: fail,
  });

  if (isLoading || !a || !form || !mode) return <Card className="p-5"><Spinner /></Card>;

  const editable = EDITABLE.includes(a.status);
  const sendable = SENDABLE.includes(a.status);
  const dirty =
    form.to_email !== a.to_email ||
    (form.to_name || "") !== (a.to_name || "") ||
    form.subject !== a.subject ||
    form.body !== a.body ||
    form.attach_cv !== a.attach_cv;
  const busy = save.isPending || act.isPending;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ScoreBadge score={a.score} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fg">{a.company || "—"}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
            <span className="truncate">{a.opportunity_title}</span>
            {a.opportunity_url && (
              <a
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline"
                href={a.opportunity_url}
                target="_blank"
                rel="noreferrer"
              >
                posting <Icon name="external" className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={a.status === "draft" ? "ready" : a.status} />
          <div className="mt-1 text-xs text-subtle">{a.kind}{a.language ? ` · ${a.language}` : ""}</div>
        </div>
      </div>

      {a.sent_at && <div className="mt-3 text-xs text-subtle">Sent {fmtTime(a.sent_at)}</div>}
      {a.error && <div className="mt-3 rounded-lg border border-bad/25 bg-bad/5 px-3 py-2 text-xs text-bad">{a.error}</div>}

      {a.reply_snippet && (
        <div className="mt-4 rounded-lg border border-plum/30 bg-plum/5 p-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
            <Icon name="message" className="h-3.5 w-3.5 text-plum" />
            <ReplyTag cls={a.reply_class} />
            <span className="text-subtle">from {a.reply_from} · {fmtTime(a.replied_at)}</span>
          </div>
          {a.reply_subject && <div className="mb-1 text-xs font-medium text-muted">{a.reply_subject}</div>}
          <div className="whitespace-pre-wrap text-sm text-fg">{a.reply_snippet}</div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
            {
              value: "job",
              label: (
                <>
                  <Icon name={a.opportunity_kind === "lead" ? "target" : "briefcase"} className="h-3.5 w-3.5" />
                  {a.opportunity_kind === "lead" ? "Lead" : "Job"}
                </>
              ),
              title: "What you're writing to: the posting's details and full description",
            },
          ]}
        />
        {dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs text-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" /> unsaved changes
          </span>
        )}
      </div>

      {mode === "edit" ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Field
              label="Message"
              hint='Blank line = new paragraph · lines starting with "- " become a bullet list · links are clickable. Sign-off, signature (and the opt-out line on cold pitches) are added automatically — check Preview.'
            >
              <textarea
                className={`${inputCls} min-h-[340px] py-2.5 font-[inherit] leading-relaxed`}
                disabled={!editable}
                value={form.body || ""}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Toggle
              checked={!!form.attach_cv}
              disabled={!editable}
              onChange={(v) => setForm({ ...form, attach_cv: v })}
              label="Attach CV (PDF)"
            />
          </div>
        </>
      ) : mode === "preview" ? (
        <PreviewPane id={id} fields={form} />
      ) : (
        <JobPane id={a.opportunity_id} />
      )}

      {editable ? (
        // stays in view while you scroll a long message
        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex flex-wrap items-center gap-2 rounded-b-xl border-t border-line bg-surface/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
          {sendable && (
            <Button variant="primary" busy={act.isPending && act.variables === "send"} disabled={busy} onClick={() => act.mutate("send")}>
              <Icon name="send" className="h-3.5 w-3.5" />
              Send<span className="hidden max-w-[220px] truncate sm:inline"> to {form.to_email}</span>
            </Button>
          )}
          {a.status === "skipped" && (
            <Button variant="primary" disabled={busy} onClick={() => act.mutate("restore")}>Restore to ready</Button>
          )}
          <Button busy={save.isPending} disabled={!dirty || busy} onClick={() => save.mutate()}>Save</Button>
          {a.kind !== "followup" && sendable && (
            <Button
              disabled={busy}
              busy={act.isPending && act.variables === "redraft"}
              onClick={() => act.mutate("redraft")}
              title="Ask the AI for a new version (replaces the text)"
            >
              <Icon name="sparkles" className="h-3.5 w-3.5" /> Re-write
            </Button>
          )}
          {sendable && (
            <Button variant="danger" className="sm:ml-auto" disabled={busy} onClick={() => act.mutate("skip")}>Skip</Button>
          )}
          {msg && <div className="basis-full"><Msg msg={msg} /></div>}
        </div>
      ) : (
        msg && <div className="mt-3"><Msg msg={msg} /></div>
      )}
    </Card>
  );
}

/** What the email is about, without leaving the draft: the posting's facts,
 *  why it scored, and its full description. */
function JobPane({ id }: { id: number }) {
  const { data: o, error } = useQuery({ queryKey: ["opp", id], queryFn: () => getOpportunity(id) });

  if (error) return <div className="mt-4"><Msg msg={{ ok: false, text: errorMessage(error) }} /></div>;
  if (!o) return <div className="mt-4"><Spinner /></div>;

  const posting = o.apply_url || o.url;
  return (
    <div className="mt-4">
      <div className="rounded-lg border border-line p-4">
        <div className="font-semibold leading-snug text-fg">{o.title}</div>
        <div className="mt-1 text-sm text-muted">
          <span className="font-medium text-fg-2">{o.company || "Unknown company"}</span> · <OpportunityFacts o={o} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          <span>{o.source}</span>
          {o.posted_at && <span>posted {timeAgo(o.posted_at)}</span>}
          {o.est_value_usd ? <span>est. {usd(o.est_value_usd)}</span> : null}
        </div>
        {(posting || o.website) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {posting && (
              <a className={buttonClass("ghost", "sm")} href={posting} target="_blank" rel="noreferrer">
                Posting <Icon name="external" className="h-3.5 w-3.5" />
              </a>
            )}
            {o.website && (
              <a className={buttonClass("ghost", "sm")} href={o.website} target="_blank" rel="noreferrer">
                Website <Icon name="external" className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
      <MatchReasons o={o} className="mt-4" />
      <OpportunityDescription o={o} className="mt-5" />
    </div>
  );
}

/** The email as the recipient will see it, rendered by the server from the
 *  editor's current (possibly unsaved) text. */
function PreviewPane({ id, fields }: { id: number; fields: EmailFields }) {
  const debounced = useDebounced(fields, 400);
  const [format, setFormat] = useState<"html" | "text">("html");
  const [height, setHeight] = useState(480);
  const { data, isFetching, error } = useQuery({
    queryKey: ["preview", id, debounced],
    queryFn: () => previewApplication(id, debounced),
    placeholderData: keepPreviousData,
  });

  if (error) return <div className="mt-4"><Msg msg={{ ok: false, text: errorMessage(error) }} /></div>;
  if (!data) return <div className="mt-4"><Spinner label="Rendering…" /></div>;

  // Framed like the email itself: white, ink and mono labels (deliberately the
  // same in light and dark — it's what the recipient sees).
  const row = (label: string, value: ReactNode, strong = false) => (
    <div className="flex items-baseline gap-3">
      <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#57534b]">{label}</span>
      <span className={`min-w-0 break-words ${strong ? "font-semibold text-[#121212]" : "text-[#262626]"}`}>{value}</span>
    </div>
  );
  return (
    <div className="mt-4 overflow-hidden border-2 border-[#121212] bg-white text-[#121212]">
      <div className="space-y-1.5 border-b-2 border-[#121212] bg-white px-4 py-3 text-xs">
        {row("From", data.from)}
        {row("To", data.to)}
        {row("Subject", data.subject, true)}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0" />
          {data.attachment && (
            <span
              className={`border-2 px-2 py-0.5 font-mono text-[11px] ${
                data.cv_uploaded ? "border-[#121212] bg-[#ffc81f] text-[#121212]" : "border-[#cc2620] text-[#cc2620]"
              }`}
            >
              📎 {data.attachment}{!data.cv_uploaded && " — not uploaded yet"}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {isFetching && <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#57534b]">updating…</span>}
            <span className="flex border-2 border-[#121212]">
              {(["html", "text"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
                    format === f ? "bg-[#121212] text-white" : "text-[#57534b] hover:bg-[#ededed] hover:text-[#121212]"
                  }`}
                >
                  {f === "html" ? "HTML" : "Plain text"}
                </button>
              ))}
            </span>
          </span>
        </div>
      </div>
      {format === "html" ? (
        <iframe
          title="Email preview"
          sandbox="allow-same-origin"
          srcDoc={data.html}
          className="block w-full bg-white"
          style={{ height }}
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            if (!doc) return;
            doc.body.style.margin = "20px 24px"; // mail clients pad the message themselves
            setHeight(Math.max(240, doc.documentElement.scrollHeight + 4));
          }}
        />
      ) : (
        <pre className="whitespace-pre-wrap bg-white p-5 font-mono text-[13px] leading-relaxed text-[#121212]">{data.text}</pre>
      )}
    </div>
  );
}
