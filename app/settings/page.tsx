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
  testNotify,
  updateProfile,
  updateSettings,
  uploadCv,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { useTheme } from "@/components/theme";
import { Button, Card, Field, Label, Msg, Notice, PageHeader, Segmented, Spinner, Toggle, fmtTime, inputCls } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Settings" sub="Your profile and CV drive scoring and writing; sending rules protect the jackmiro.pt domain." />
      <nav className="no-scrollbar z-20 mt-4 flex gap-1 overflow-x-auto bg-bg/90 py-2 backdrop-blur lg:sticky lg:top-0">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">
            {label}
          </a>
        ))}
      </nav>
      <PrefsSection />
      <ProfileSection />
      <MailSection />
      <SuppressionSection />
      <AppearanceSection />
    </div>
  );
}

const SECTIONS: [string, string][] = [
  ["sending", "Sending & automation"],
  ["profile", "Profile & CV"],
  ["mail", "Mail"],
  ["dnc", "Do-not-contact"],
  ["appearance", "Appearance"],
];

function Section({
  id,
  title,
  desc,
  children,
  right,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card id={id} className="mt-6 scroll-mt-20 p-5 sm:p-6 lg:scroll-mt-16">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-fg">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-subtle">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

/** Saved / error note next to a Save button. */
function SaveNote({ text }: { text: string }) {
  if (!text) return null;
  return <Msg msg={{ ok: text === "Saved" || text.startsWith("CV uploaded ("), text }} />;
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

  if (!data || !p) return <Section id="sending" title="Sending & automation"><Spinner /></Section>;

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
      id="sending"
      title="Sending & automation"
      desc="How much goes out, to whom, when, and what the agent answers by itself."
      right={
        <div className="flex items-center gap-3">
          <SaveNote text={msg} />
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
      <Notice tone={data.prefs.auto_send ? "warn" : "good"} icon={data.prefs.auto_send ? "send" : "check"} className="mb-6">
        {data.prefs.auto_send
          ? `Auto-send is on: drafts go out by themselves on weekdays between ${data.prefs.send_hour_start}:00 and ${data.prefs.send_hour_end}:00, one every ${data.prefs.send_gap_minutes}–${Math.max(data.prefs.send_gap_minutes, data.prefs.send_gap_max_minutes)} minutes: up to ${data.prefs.daily_applications} job applications and ${data.prefs.daily_pitches} pitches a day, within the daily limit, at least ${data.prefs.job_share_percent}% of them applications. Skip anything you don't want sent in the `
          : "Nothing is sent automatically. The daily pipeline writes drafts; each one waits in the "}
        <a href="/outbox" className="font-medium text-accent hover:underline">Outbox</a>
        {data.prefs.auto_send ? "." : " until you review it and press Send."}
      </Notice>

      <Label className="mb-3">Automation</Label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Toggle
          checked={p.auto_send}
          onChange={(v) => set("auto_send", v)}
          label="Send drafts by themselves"
          hint="Weekdays inside send hours, best match first. A draft that looks unfinished, or whose job you dropped, is held instead."
        />
        <Toggle
          checked={p.auto_reply}
          onChange={(v) => set("auto_reply", v)}
          label="Answer their replies"
          hint="A one-line thank-you on a rejection, call times inside your window, facts from your profile and CV. Never to no-reply addresses; anything your profile can't answer waits for you."
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("send_hour_start", "Send from (hour)", data.timezone)}
        {num("send_hour_end", "Send until (hour)")}
        {num("send_gap_minutes", "Gap between emails: from (min)", "a random wait in this range")}
        {num("send_gap_max_minutes", "Gap: to (minutes)", p.send_gap_max_minutes < p.send_gap_minutes ? "lower than 'from': 'from' is used" : `${Math.round((p.daily_limit * (p.send_gap_minutes + Math.max(p.send_gap_minutes, p.send_gap_max_minutes))) / 2 / 60)}h for ${p.daily_limit} emails`)}
        {num("reply_delay_minutes", "Reply after (minutes)", "an instant answer reads like a bot")}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("meeting_hour_start", "Calls from (hour)", "weekdays only")}
        {num("meeting_hour_end", "Calls until (hour)")}
        {num("meeting_minutes", "Call length (minutes)")}
      </div>
      <TelegramStatus t={data.telegram} />

      <Label className="mt-8 mb-3">Sending</Label>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("daily_limit", "Daily limit", "most sends per day, all kinds")}
        {num("daily_applications", "Job applications per day", "follow-ups to them included")}
        {num("daily_pitches", "Project pitches per day", p.daily_applications + p.daily_pitches > p.daily_limit ? `together over the daily limit (${p.daily_limit}): the limit wins` : "agencies & funded startups, follow-ups included")}
        {num("job_share_percent", "Job applications: min % of a day", "a pitch only goes while applications stay at least this share")}
        {num("company_cooldown_days", "Company cooldown (days)", "one email per company")}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Toggle checked={p.attach_cv_on_pitches} onChange={(v) => set("attach_cv_on_pitches", v)} label="Attach CV to pitches" hint="Always attached to job applications" />
        <Toggle checked={p.followups_enabled} onChange={(v) => set("followups_enabled", v)} label="One follow-up if no reply" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {num("followup_after_days", "Follow up after (days)")}
        <div className="col-span-1 flex items-end pb-1.5">
          <Toggle checked={p.warmup_enabled} onChange={(v) => set("warmup_enabled", v)} label="Domain warm-up" />
        </div>
        {num("warmup_start", "Warm-up day 1", "emails on the first sending day")}
        {num("warmup_step", "+ per weekday", `reaches ${p.daily_limit}/day after ${Math.max(0, Math.ceil((p.daily_limit - p.warmup_start) / Math.max(1, p.warmup_step)))} days`)}
      </div>

      <Label className="mt-8 mb-3">Qualification</Label>
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

      <Label className="mt-8 mb-3">Daily pipeline</Label>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-end pb-1.5">
          <Toggle checked={p.pipeline_enabled} onChange={(v) => set("pipeline_enabled", v)} label="Run daily" />
        </div>
        {num("pipeline_hour", "Hour")}
        {num("pipeline_minute", "Minute")}
        {num("max_score_per_run", "Max LLM scorings / run", "caps LLM spend")}
        {num("serpapi_daily_budget", "SerpAPI credits / day", "0 = auto (monthly left ÷ days left)")}
      </div>
      <div className="mt-4 text-xs text-subtle">
        LLM: {data.llm.provider} · {data.llm.model} · next run {fmtTime(data.next_runs.daily_pipeline)}
      </div>
    </Section>
  );
}

/** Telegram goes through the smm-server's bot (its contact endpoint). */
function TelegramStatus({ t }: { t: { configured: boolean; queued: number; last_error: string | null } }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const test = useMutation({
    mutationFn: testNotify,
    onSuccess: () => setMsg({ ok: true, text: "Sent, check Telegram." }),
    onError: (e) => setMsg({ ok: false, text: errorMessage(e) }),
  });
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface-2/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Status
          ok={t.configured}
          label={
            t.configured
              ? `Telegram: briefings, reminders and questions via the smm-server bot${t.queued ? ` · ${t.queued} waiting (rate limit)` : ""}`
              : "Telegram: off, set TELEGRAM_RELAY_KEY in the server .env"
          }
        />
        {t.configured && (
          <Button size="sm" className="sm:ml-auto" busy={test.isPending} onClick={() => test.mutate()}>
            Send test message
          </Button>
        )}
      </div>
      {t.last_error && t.queued > 0 && <div className="mt-1 text-xs text-subtle">Last error: {t.last_error}</div>}
      {msg && <div className="mt-2"><Msg msg={msg} /></div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
const LIST_FIELDS: [keyof Profile, string, "comma" | "lines", string?][] = [
  ["skills", "Skills", "comma"],
  ["languages", "Languages you speak", "comma", "emails are written in the posting's language only if it's listed here"],
  ["work_countries", "Countries you can work in", "comma", "on-site/hybrid jobs elsewhere, and remote jobs limited to other countries, are filtered out"],
  ["exclude_keywords", "Exclude job titles containing", "comma", "dropped before any LLM call"],
  ["highlights", "Track record (one per line)", "lines", "the writer may only cite facts from your profile + CV"],
  ["target_roles", "Target roles (one per line)", "lines"],
  ["offers", "What you offer agencies/startups (one per line)", "lines"],
  ["answers", "Answers you gave the agent (one per line)", "lines", "reused when a company asks the same thing; edit or delete freely"],
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
    for (const k of ["name", "headline", "location", "years_experience", "email", "phone", "portfolio_url", "linkedin_url", "github_url", "summary", "rate_note", "availability", "b2b_company"] as const)
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

  if (!data) return <Section id="profile" title="Profile & CV"><Spinner /></Section>;
  const text = (k: string, label: string) => (
    <Field label={label}>
      <input className={inputCls} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </Field>
  );

  return (
    <Section
      id="profile"
      title="Profile & CV"
      desc="What the AI knows about you — used to score matches and write emails."
      right={
        <div className="flex items-center gap-3">
          <SaveNote text={msg} />
          <Button variant="primary" busy={save.isPending} onClick={() => save.mutate()}>Save profile</Button>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2/60 p-4">
        <div className="flex-1 text-sm">
          {data.cv_uploaded ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 text-fg">
              <Icon name="paperclip" className="h-3.5 w-3.5 text-subtle" />
              {data.cv_filename} <span className="text-xs text-subtle">· {data.cv_chars} chars of text for the LLM</span>
            </span>
          ) : (
            <span className="text-warn">No CV uploaded — nothing with an attachment will be sent until you add one.</span>
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
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {text("availability", "Availability (optional, e.g. “from 1 November, 30-40 h/week”) — leave empty to never mention it")}
        {text("rate_note", "Rate note (optional, e.g. “from €550/day”) — leave empty to never mention rates")}
        {text("b2b_company", "Company you invoice through (B2B, e.g. “Mirox Lda (Portugal)”) — mentioned in pitches and contract roles")}
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
    onSuccess: (r) => setMsg({ ok: true, text: `Test email sent to ${r.to} in the real layout. Check it looks right, then "Show original" → SPF, DKIM and DMARC should all say PASS.` }),
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
    <Section id="mail" title="Mail (jackmiro.pt)" desc="Delivery setup and a test send.">
      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <Status ok={m.smtp_configured} label={`SMTP — sending as ${m.from}`} />
        <Status ok={m.imap_configured} label={`IMAP — replies & bounces (last check ${fmtTime(data.inbox_checked_at)})`} />
        <Status
          ok={data.imap_save_sent || data.provider_files_sent}
          label={data.provider_files_sent ? "Copies in your Sent folder (Gmail files them itself)" : "Copies filed in your Sent folder"}
        />
        <Status ok={m.cv_uploaded} label="CV attached to applications" />
      </div>
      <div className="mt-3 text-xs text-subtle">SMTP/IMAP credentials live in the server&apos;s .env (never in the browser).</div>
      <div className="mt-5 flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-72">
          <Field label="Send a test email to">
            <input className={inputCls} placeholder={m.from} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Button busy={test.isPending} onClick={() => test.mutate()}>Send test</Button>
        <Button busy={inbox.isPending} onClick={() => inbox.mutate()}>Check inbox now</Button>
      </div>
      {msg && <div className="mt-3"><Msg msg={msg} /></div>}
    </Section>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}
      >
        <Icon name={ok ? "check" : "x"} className="h-2.5 w-2.5" />
      </span>
      <span className={ok ? "text-fg-2" : "text-muted"}>{label}</span>
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
    <Section id="dnc" title="Do-not-contact list">
      <p className="-mt-2 mb-4 text-xs text-subtle">
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
      {add.isError && <div className="mt-2"><Msg msg={{ ok: false, text: errorMessage(add.error) }} /></div>}
      <div className="mt-4 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
        {data?.length === 0 && <div className="px-3 py-4 text-sm text-subtle">Empty.</div>}
        {data?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
            <span className="text-fg">{s.value}</span>
            <span className="text-xs text-subtle">{s.kind} · {s.reason} · {fmtTime(s.created_at)}</span>
            <button className="ml-auto text-xs text-subtle hover:text-bad" onClick={() => del.mutate(s.id)}>Remove</button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
function AppearanceSection() {
  const { pref, setPref } = useTheme();
  return (
    <Section id="appearance" title="Appearance" desc="Saved in this browser. Also in the sidebar footer.">
      <div className="flex flex-wrap items-center gap-4">
        <Segmented
          value={pref}
          onChange={setPref}
          options={[
            { value: "light", label: <><Icon name="sun" className="h-3.5 w-3.5" /> Light</> },
            { value: "dark", label: <><Icon name="moon" className="h-3.5 w-3.5" /> Dark</> },
            { value: "system", label: <><Icon name="monitor" className="h-3.5 w-3.5" /> System</> },
          ]}
        />
        <span className="text-xs text-subtle">System follows your OS light/dark setting.</span>
      </div>
    </Section>
  );
}
