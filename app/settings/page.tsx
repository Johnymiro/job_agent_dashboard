"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Prefs,
  Profile,
  addSuppression,
  checkInbox,
  deleteSuppression,
  downloadCv,
  errorMessage,
  getProfile,
  getSettings,
  getSuppressions,
  sendTestEmail,
  updateProfile,
  updateSettings,
  uploadCv,
} from "@/lib/api";
import { Button, Card, Field, PageHeader, Spinner, Toggle, fmtTime, inputCls } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Settings" sub="Your profile and CV drive scoring and writing; sending rules protect the jackmiro.pt domain." />
      <PrefsSection />
      <ProfileSection />
      <MailSection />
      <SuppressionSection />
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="mt-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {right}
      </div>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
function PrefsSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [p, setP] = useState<Prefs | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (data) setP(data.prefs);
  }, [data]);

  const save = useMutation({
    mutationFn: (changes: Partial<Prefs>) => updateSettings(changes),
    onSuccess: (d) => {
      qc.setQueryData(["settings"], d);
      qc.invalidateQueries({ queryKey: ["stats"] });
      setMsg("Saved");
    },
    onError: (e) => setMsg(errorMessage(e)),
  });

  if (!data || !p) return <Section title="Sending & pipeline"><Spinner /></Section>;

  const changed = (Object.keys(p) as (keyof Prefs)[]).filter((k) => p[k] !== data.prefs[k]);
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setP({ ...p, [k]: v });
  const num = (k: keyof Prefs, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input
        className={inputCls}
        inputMode="numeric"
        value={String(p[k])}
        onChange={(e) => set(k, Number(e.target.value.replace(/[^\d]/g, "") || 0) as never)}
      />
    </Field>
  );

  return (
    <Section
      title="Sending & pipeline"
      right={
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-slate-400">{msg}</span>}
          <Button
            variant="primary"
            disabled={!changed.length}
            busy={save.isPending}
            onClick={() => save.mutate(Object.fromEntries(changed.map((k) => [k, p[k]])) as Partial<Prefs>)}
          >
            Save{changed.length ? ` (${changed.length})` : ""}
          </Button>
        </div>
      }
    >
      <div
        className={`mb-5 rounded-lg border p-4 ${
          p.sending_enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <Toggle
          checked={p.sending_enabled}
          onChange={(v) => set("sending_enabled", v)}
          label="Sending enabled"
          hint="Master switch. When on, queued emails go out automatically inside the send window, paced across the day. Send yourself a test email and review a few drafts first."
        />
        <div className="mt-3">
          <Toggle
            checked={p.auto_queue}
            onChange={(v) => set("auto_queue", v)}
            label="Auto-queue new drafts"
            hint="On: every email the agent writes is queued for sending (fully automatic). Off: drafts wait in the Outbox for your approval."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("daily_limit", "Daily limit", "target emails/day")}
        {num("send_start_hour", "Window start (h)", data.timezone)}
        {num("send_end_hour", "Window end (h)", "0–24")}
        {num("company_cooldown_days", "Company cooldown (days)", "one email per company")}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Toggle checked={p.weekdays_only} onChange={(v) => set("weekdays_only", v)} label="Weekdays only" />
        <Toggle checked={p.attach_cv_on_pitches} onChange={(v) => set("attach_cv_on_pitches", v)} label="Attach CV to pitches" hint="Always attached to job applications" />
        <Toggle checked={p.followups_enabled} onChange={(v) => set("followups_enabled", v)} label="One follow-up if no reply" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("followup_after_days", "Follow up after (days)")}
        <div className="col-span-1 flex items-end pb-1.5">
          <Toggle checked={p.warmup_enabled} onChange={(v) => set("warmup_enabled", v)} label="Domain warm-up" />
        </div>
        {num("warmup_start", "Warm-up day 1", "emails on the first sending day")}
        {num("warmup_step", "+ per sending day", `reaches ${p.daily_limit}/day after ${Math.max(0, Math.ceil((p.daily_limit - p.warmup_start) / Math.max(1, p.warmup_step)))} days`)}
      </div>

      <div className="mt-6 mb-2 text-xs uppercase tracking-wide text-slate-500">Qualification</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("min_score", "Min match score", "0–100, to write an email")}
        {num("lead_min_value_usd", "Min project value ($)", "leads below are skipped")}
        {num("us_min_score", "US: min score", "US only when big")}
        {num("us_min_salary_usd", "US: min salary ($)")}
        {num("us_min_project_usd", "US: min project ($)")}
        {num("max_age_days", "Ignore postings older than (days)")}
      </div>
      <div className="mt-4">
        <Toggle
          checked={p.allow_guessed_emails}
          onChange={(v) => set("allow_guessed_emails", v)}
          label="Allow guessed inboxes (careers@ / hello@)"
          hint="Only when no real address is found. More reach, but guesses bounce more — and bounces hurt a new domain."
        />
      </div>

      <div className="mt-6 mb-2 text-xs uppercase tracking-wide text-slate-500">Daily pipeline</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-end pb-1.5">
          <Toggle checked={p.pipeline_enabled} onChange={(v) => set("pipeline_enabled", v)} label="Run daily" />
        </div>
        {num("pipeline_hour", "Hour")}
        {num("pipeline_minute", "Minute")}
        {num("max_score_per_run", "Max LLM scorings / run", "caps LLM spend")}
        {num("serpapi_daily_budget", "SerpAPI credits / day", "0 = auto (monthly left ÷ days left)")}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        LLM: {data.llm.provider} · {data.llm.model} · next run {fmtTime(data.next_runs.daily_pipeline)}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
const LIST_FIELDS: [keyof Profile, string, "comma" | "lines", string?][] = [
  ["skills", "Skills", "comma"],
  ["languages", "Languages you speak", "comma", "emails are written in the posting's language only if it's listed here"],
  ["exclude_keywords", "Exclude job titles containing", "comma", "dropped before any LLM call"],
  ["highlights", "Track record (one per line)", "lines", "the writer may only cite facts from your profile + CV"],
  ["target_roles", "Target roles (one per line)", "lines"],
  ["offers", "What you offer agencies/startups (one per line)", "lines"],
];

function ProfileSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    const f: Record<string, string> = {};
    for (const k of ["name", "headline", "location", "years_experience", "email", "phone", "portfolio_url", "linkedin_url", "github_url", "summary", "rate_note"] as const)
      f[k] = String(data[k] ?? "");
    for (const [k, , mode] of LIST_FIELDS) f[k] = ((data[k] as string[]) || []).join(mode === "comma" ? ", " : "\n");
    setForm(f);
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const out: Record<string, unknown> = { ...form, years_experience: Number(form.years_experience) || 0 };
      for (const [k, , mode] of LIST_FIELDS)
        out[k] = (form[k] || "").split(mode === "comma" ? "," : "\n").map((s) => s.trim()).filter(Boolean);
      return updateProfile(out as Partial<Profile>);
    },
    onSuccess: (d) => {
      qc.setQueryData(["profile"], d);
      setMsg("Saved");
    },
    onError: (e) => setMsg(errorMessage(e)),
  });
  const upload = useMutation({
    mutationFn: (f: File) => uploadCv(f),
    onSuccess: (d) => {
      qc.setQueryData(["profile"], d);
      qc.invalidateQueries({ queryKey: ["stats"] });
      setMsg(d.cv_chars ? `CV uploaded (${d.cv_chars} characters of text extracted)` : "CV uploaded, but no text could be extracted — scoring will use the profile fields only");
    },
    onError: (e) => setMsg(errorMessage(e)),
  });

  if (!data) return <Section title="Profile & CV"><Spinner /></Section>;
  const text = (k: string, label: string) => (
    <Field label={label}>
      <input className={inputCls} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </Field>
  );

  return (
    <Section
      title="Profile & CV"
      right={
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-slate-400">{msg}</span>}
          <Button variant="primary" busy={save.isPending} onClick={() => save.mutate()}>Save profile</Button>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#1e293b] bg-[#111a2e] p-4">
        <div className="flex-1 text-sm">
          {data.cv_uploaded ? (
            <span className="text-slate-200">
              📎 {data.cv_filename} <span className="text-xs text-slate-500">· {data.cv_chars} chars of text for the LLM</span>
            </span>
          ) : (
            <span className="text-amber-300">No CV uploaded — nothing with an attachment will be sent until you add one.</span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
        />
        {data.cv_uploaded && <Button onClick={() => downloadCv()}>View</Button>}
        <Button variant="primary" busy={upload.isPending} onClick={() => fileRef.current?.click()}>
          {data.cv_uploaded ? "Replace CV (PDF)" : "Upload CV (PDF)"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {text("name", "Name (signature)")}
        {text("headline", "Headline")}
        {text("location", "Location")}
        {text("years_experience", "Years of experience")}
        {text("email", "Email")}
        {text("phone", "Phone (signature, optional)")}
        {text("portfolio_url", "Portfolio")}
        {text("linkedin_url", "LinkedIn")}
        {text("github_url", "GitHub")}
      </div>
      <div className="mt-4">
        <Field label="Summary">
          <textarea className={`${inputCls} min-h-[80px]`} value={form.summary || ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {LIST_FIELDS.map(([k, label, mode, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <textarea
              className={`${inputCls} ${mode === "lines" ? "min-h-[110px]" : "min-h-[64px]"}`}
              value={form[k] || ""}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <div className="mt-4">
        {text("rate_note", "Rate note (optional, e.g. “from €550/day”) — leave empty to never mention rates")}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
function MailSection() {
  const { data, refetch } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const test = useMutation({
    mutationFn: () => sendTestEmail(to || undefined),
    onSuccess: (r) => setMsg({ ok: true, text: `Test email sent to ${r.to}. Open it → "Show original" and check SPF, DKIM and DMARC all say PASS.` }),
    onError: (e) => setMsg({ ok: false, text: errorMessage(e) }),
  });
  const inbox = useMutation({
    mutationFn: checkInbox,
    onSuccess: (r) => {
      setMsg({ ok: true, text: `Inbox checked: ${JSON.stringify(r)}` });
      refetch();
    },
    onError: (e) => setMsg({ ok: false, text: errorMessage(e) }),
  });
  if (!data) return null;
  const m = data.mail;
  return (
    <Section title="Mail (jackmiro.pt)">
      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <Status ok={m.smtp_configured} label={`SMTP — sending as ${m.from}`} />
        <Status ok={m.imap_configured} label={`IMAP — replies & bounces (last check ${fmtTime(data.inbox_checked_at)})`} />
        <Status ok={data.imap_save_sent} label="Copies filed in your Sent folder" />
        <Status ok={m.cv_uploaded} label="CV attached to applications" />
      </div>
      <div className="mt-2 text-xs text-slate-500">SMTP/IMAP credentials live in the server&apos;s .env (never in the browser).</div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="w-72">
          <Field label="Send a test email to">
            <input className={inputCls} placeholder={m.from} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Button busy={test.isPending} onClick={() => test.mutate()}>Send test</Button>
        <Button busy={inbox.isPending} onClick={() => inbox.mutate()}>Check inbox now</Button>
      </div>
      {msg && <div className={`mt-3 text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</div>}
    </Section>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? "text-emerald-400" : "text-rose-400"}>{ok ? "✓" : "✕"}</span>
      <span className={ok ? "text-slate-300" : "text-slate-400"}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SuppressionSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["suppressions"], queryFn: getSuppressions });
  const [value, setValue] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["suppressions"] });
  const add = useMutation({
    mutationFn: () => addSuppression(value),
    onSuccess: () => {
      setValue("");
      invalidate();
    },
  });
  const del = useMutation({ mutationFn: (id: number) => deleteSuppression(id), onSuccess: invalidate });
  return (
    <Section title="Do-not-contact list">
      <p className="mb-3 text-xs text-slate-500">
        Opt-outs, bounces and “not interested” replies land here automatically. Add an email or a whole domain
        (e.g. your current employer) to make sure it is never contacted.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value) add.mutate();
        }}
      >
        <input className={`${inputCls} max-w-sm`} placeholder="name@company.com or company.com" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" busy={add.isPending}>Add</Button>
      </form>
      {add.isError && <div className="mt-2 text-xs text-rose-300">{errorMessage(add.error)}</div>}
      <div className="mt-4 max-h-72 overflow-y-auto">
        {data?.length === 0 && <div className="text-sm text-slate-500">Empty.</div>}
        {data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border-b border-[#1e293b]/60 py-1.5 text-sm">
            <span className="text-slate-200">{s.value}</span>
            <span className="text-xs text-slate-500">{s.kind} · {s.reason} · {fmtTime(s.created_at)}</span>
            <button className="ml-auto text-xs text-slate-500 hover:text-rose-300" onClick={() => del.mutate(s.id)}>remove</button>
          </div>
        ))}
      </div>
    </Section>
  );
}
