import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({ baseURL, timeout: 180_000 });

// ---- Auth -----------------------------------------------------------------
const TOKEN_KEY = "jobagent_token";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Any 401 means the token is missing/expired — drop it and bounce to /login.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/** Human-readable message from an axios error (FastAPI puts it in `detail`). */
export function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);
  return e?.message || "Request failed";
}

export const login = (email: string, password: string) =>
  api
    .post<{ token: string; email: string }>("/api/login", { email, password })
    .then((r) => {
      setToken(r.data.token);
      return r.data;
    });

export const logout = () => {
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/login";
};

// ---- Types (mirror the FastAPI responses) ---------------------------------
export type Kind = "job" | "lead";

export interface Opportunity {
  id: number;
  kind: Kind;
  source: string;
  title: string;
  company: string | null;
  company_id: number | null;
  location: string | null;
  country: string | null;
  region: string | null;
  remote: string | null;
  engagement: string | null;
  salary: string | null;
  url: string | null;
  apply_url: string | null;
  website: string | null;
  score: number | null;
  est_value_usd: number | null;
  status: string;
  status_note: string | null;
  signal: string | null;
  hook: string | null;
  language: string | null;
  contact_email: string | null;
  posted_at: string | null;
  found_at: string | null;
  application_id: number | null;
  application_status: string | null;
}

export interface ContactRow {
  id: number;
  email: string;
  name: string | null;
  source: string | null;
  confidence: number;
  suppressed: boolean;
}

export interface OpportunityDetail extends Opportunity {
  description: string | null;
  reasons: string[];
  red_flags: string[];
  contact_name: string | null;
  contacts: ContactRow[];
  applications: Application[];
}

export interface Application {
  id: number;
  opportunity_id: number;
  parent_id: number | null;
  kind: "application" | "pitch" | "followup" | "reply";
  status: string; // draft | needs_input | failed | sent | replied | bounced | skipped
  to_email: string;
  to_name: string | null;
  subject: string;
  language: string | null;
  attach_cv: boolean;
  priority: number;
  error: string | null;
  created_at: string | null;
  sent_at: string | null;
  replied_at: string | null;
  reply_class: string | null;
  reply_from: string | null;
  reply_snippet: string | null;
  opportunity_title: string | null;
  opportunity_kind: Kind | null;
  company: string | null;
  score: number | null;
  opportunity_url: string | null;
  /** Its readers on the portfolio (PostHog); null = no visit seen (or not connected). */
  portfolio?: PortfolioVisit | null;
  // full=true only
  body?: string;
  reply_subject?: string | null;
  inbound?: InboundEmail | null; // kind=reply: the email this answers
}

/** Their email that one of our replies answers. */
export interface InboundEmail {
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
  summary: string | null;
  intent: string | null;
  needs: string[]; // what only you can answer (status needs_input)
  answer: string | null;
}

export interface Meeting {
  id: number;
  status: "confirmed" | "pending" | "needs_booking" | "cancelled";
  source: "email" | "invite" | "link";
  start_at: string | null;
  minutes: number;
  when: string | null; // "Tuesday 13 October, 12:00-12:30 Lisbon time (UTC+1)"
  title: string | null;
  with_whom: string | null;
  join_url: string | null;
  booking_url: string | null;
  note: string | null;
  prep: string | null;
  company: string | null;
  opportunity_id: number | null;
  application_id: number | null;
  opportunity_title: string | null;
  opportunity_url: string | null;
}

/** An email exactly as the recipient gets it (rendered from unsaved edits). */
export interface EmailPreview {
  from: string;
  to: string;
  subject: string;
  attachment: string | null;
  cv_uploaded: boolean;
  html: string;
  text: string;
}

export interface MailStatus {
  smtp_configured: boolean;
  imap_configured: boolean;
  sent_today: number;
  applications_today: number; // job applications + their follow-ups
  pitches_today: number; // pitches + their follow-ups
  daily_applications: number;
  daily_pitches: number;
  job_share_percent: number;
  allowance_today: number;
  daily_limit: number;
  warmup_started_on: string | null;
  ready: number; // drafts waiting for your Send
  cv_uploaded: boolean;
  from: string;
  auto_send: boolean;
  auto_reply: boolean;
  send_hours: [number, number];
  send_on_weekends: boolean;
  ramp_held: number | null; // bounces at 2%+: warm-up held at this many a day
}

export interface SerpSummary {
  configured: boolean;
  plan_searches_left: number | null;
  searches_per_month: number | null;
  this_month_usage: number | null;
  used_today: number;
  budget_left_today: number;
}

export interface RunRow {
  id: number;
  kind: string;
  trigger: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  stats: Record<string, Record<string, number | string>>;
  notes: string | null;
}

export interface Stats {
  opportunities: {
    jobs: number;
    leads: number;
    new_today: number;
    by_status: Record<string, number>;
    high_matches: number;
    no_contact: number;
    apply: number; // jobs to apply to on their site
  };
  applications: Record<string, number>;
  applications_by_kind?: Partial<Record<Kind, Record<string, number>>>;
  sent_7d: number;
  replies_7d: number;
  reply_rate_30d: number | null;
  bounce_rate_30d: number | null;
  recent_replies: Application[];
  pipeline_running: boolean;
  last_run: RunRow | null;
  mail: MailStatus;
  next_runs: Record<string, string | null>;
  serpapi: SerpSummary;
  meetings: Meeting[];
  needs_input: number;
}

export interface Prefs {
  daily_limit: number;
  auto_send: boolean;
  auto_reply: boolean;
  send_hour_start: number;
  send_hour_end: number;
  send_on_weekends: boolean;
  send_gap_minutes: number;
  send_gap_max_minutes: number;
  reply_delay_minutes: number;
  refill_retry_minutes: number;
  refill_search_every_hours: number;
  job_share_percent: number;
  daily_applications: number;
  daily_pitches: number;
  meeting_hour_start: number;
  meeting_hour_end: number;
  meeting_minutes: number;
  warmup_enabled: boolean;
  warmup_start: number;
  warmup_step: number;
  attach_cv_on_pitches: boolean;
  company_cooldown_days: number;
  followups_enabled: boolean;
  followup_after_days: number;
  min_score: number;
  us_min_score: number;
  us_min_salary_usd: number;
  us_min_project_usd: number;
  lead_min_value_usd: number;
  max_age_days: number;
  allow_guessed_emails: boolean;
  job_generic_inbox: boolean;
  pipeline_enabled: boolean;
  pipeline_on_weekends: boolean;
  pipeline_hour: number;
  pipeline_minute: number;
  max_score_per_run: number;
  serpapi_daily_budget: number;
}

export interface SettingsResponse {
  prefs: Prefs;
  defaults: Prefs;
  mail: MailStatus;
  inbox_checked_at: string | null;
  next_runs: Record<string, string | null>;
  serpapi: SerpSummary;
  llm: { provider: string; model: string };
  timezone: string;
  imap_save_sent: boolean;
  provider_files_sent: boolean; // Gmail / Workspace keep SMTP-sent mail in Sent themselves
  telegram: { configured: boolean; queued: number; last_error: string | null };
}

export interface Profile {
  name: string;
  legal_name: string;
  headline: string;
  location: string;
  years_experience: number;
  email: string;
  phone: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  languages: string[];
  work_countries: string[];
  b2b_company: string;
  summary: string;
  skills: string[];
  highlights: string[];
  target_roles: string[];
  offers: string[];
  rate_note: string;
  availability: string;
  exclude_keywords: string[];
  answers: string[]; // what you told the agent, reused when the question comes up again
  cv_filename: string | null;
  cv_chars: number;
  cv_uploaded: boolean;
}

export interface SearchRow {
  id: number;
  kind: Kind;
  source: string;
  query: string;
  location: string | null;
  params: Record<string, unknown>;
  enabled: boolean;
  paid: boolean;
  last_run_at: string | null;
  last_found: number;
  last_error: string | null;
}

export interface Suppression {
  id: number;
  value: string;
  kind: string;
  reason: string | null;
  created_at: string | null;
}

// ---- Fetchers --------------------------------------------------------------
export const getStats = () => api.get<Stats>("/api/stats").then((r) => r.data);

export interface OppQuery {
  kind?: Kind;
  status?: string;
  region?: string;
  source?: string;
  min_score?: number;
  q?: string;
  sort?: "score" | "recent";
  limit?: number;
  offset?: number;
}
export const getOpportunities = (params: OppQuery) =>
  api
    .get<{ total: number; items: Opportunity[] }>("/api/opportunities", { params })
    .then((r) => r.data);
export const getOpportunity = (id: number) =>
  api.get<OpportunityDetail>(`/api/opportunities/${id}`).then((r) => r.data);
export const setOpportunityStatus = (id: number, status: string) =>
  api
    .post<Opportunity>(`/api/opportunities/${id}/status`, null, { params: { status } })
    .then((r) => r.data);
export const enrichOpportunity = (id: number) =>
  api.post<OpportunityDetail>(`/api/opportunities/${id}/enrich`).then((r) => r.data);
export const addOpportunityContact = (id: number, email: string, name?: string) =>
  api
    .post<OpportunityDetail>(`/api/opportunities/${id}/contacts`, { email, name })
    .then((r) => r.data);
export const draftOpportunity = (id: number, contact_id?: number) =>
  api
    .post<Application>(`/api/opportunities/${id}/draft`, null, { params: { contact_id } })
    .then((r) => r.data);

export interface CoverNote {
  subject: string;
  body: string;
  held: string | null; // what the fact-check still flags
  form: string | null; // their application form
}

/** A note to paste into their application form (nothing is stored or sent). */
export const coverNote = (id: number) =>
  api.post<CoverNote>(`/api/opportunities/${id}/cover-note`).then((r) => r.data);

export const getApplications = (params: {
  status?: string;
  kind?: string;
  opp_kind?: Kind;
  q?: string;
  limit?: number;
  offset?: number;
}) =>
  api
    .get<{ total: number; items: Application[] }>("/api/applications", { params })
    .then((r) => r.data);
export const getApplication = (id: number) =>
  api.get<Application>(`/api/applications/${id}`).then((r) => r.data);
export const updateApplication = (id: number, changes: EmailFields) =>
  api.put<Application>(`/api/applications/${id}`, changes).then((r) => r.data);
export type AppAction = "send" | "skip" | "restore" | "redraft";
export const applicationAction = (id: number, action: AppAction) =>
  api.post<Application>(`/api/applications/${id}/${action}`).then((r) => r.data);
export type EmailFields = Partial<Pick<Application, "to_email" | "to_name" | "subject" | "body" | "attach_cv">>;
export const previewApplication = (id: number, fields: EmailFields) =>
  api.post<EmailPreview>(`/api/applications/${id}/preview`, fields).then((r) => r.data);
/** Your answer to what a held reply needs; the agent rewrites the reply with it. */
export const answerApplication = (id: number, text: string) =>
  api
    .post<Application & { missing: string[] }>(`/api/applications/${id}/answer`, { text })
    .then((r) => r.data);
export const getMeetings = () =>
  api.get<{ upcoming: Meeting[]; past: Meeting[]; free: string[] }>("/api/meetings").then((r) => r.data);
export const cancelMeeting = (id: number) =>
  api.post<Meeting>(`/api/meetings/${id}/cancel`).then((r) => r.data);
export const testNotify = () => api.post<{ ok: boolean }>("/api/notify/test").then((r) => r.data);
export const bulkApplications = (ids: number[], action: "skip" | "restore") =>
  api
    .post<{ updated: number }>("/api/applications-bulk", { ids, action })
    .then((r) => r.data);

export const getSearches = () =>
  api
    .get<{ sources: string[]; paid_sources: string[]; items: SearchRow[] }>("/api/searches")
    .then((r) => r.data);
export const createSearch = (s: Partial<SearchRow>) =>
  api.post<SearchRow>("/api/searches", s).then((r) => r.data);
export const updateSearch = (id: number, s: Partial<SearchRow>) =>
  api.put<SearchRow>(`/api/searches/${id}`, s).then((r) => r.data);
export const deleteSearch = (id: number) =>
  api.delete(`/api/searches/${id}`).then((r) => r.data);
export const runSearch = (id: number) =>
  api.post<RunRow>(`/api/searches/${id}/run`).then((r) => r.data);

export const getRuns = () =>
  api.get<{ running: boolean; items: RunRow[] }>("/api/runs").then((r) => r.data);
export const getRun = (id: number) => api.get<RunRow>(`/api/runs/${id}`).then((r) => r.data);
export const startRun = (kind: string) =>
  api.post<RunRow>("/api/runs", null, { params: { kind } }).then((r) => r.data);

export const getSettings = () =>
  api.get<SettingsResponse>("/api/settings").then((r) => r.data);
export const updateSettings = (changes: Partial<Prefs>) =>
  api.post<SettingsResponse>("/api/settings", changes).then((r) => r.data);
export const sendTestEmail = (to?: string) =>
  api
    .post<{ ok: boolean; to: string }>("/api/mail/test", null, { params: { to } })
    .then((r) => r.data);
export const checkInbox = () =>
  api.post<Record<string, number | string>>("/api/mail/check-inbox").then((r) => r.data);

export const getProfile = () => api.get<Profile>("/api/profile").then((r) => r.data);
export const updateProfile = (changes: Partial<Profile>) =>
  api.put<Profile>("/api/profile", changes).then((r) => r.data);
export const uploadCv = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Profile>("/api/profile/cv", form).then((r) => r.data);
};
export const downloadCv = async () => {
  const r = await api.get("/api/profile/cv", { responseType: "blob" });
  const url = URL.createObjectURL(r.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getSuppressions = () =>
  api.get<Suppression[]>("/api/suppressions").then((r) => r.data);
export const addSuppression = (value: string, reason = "manual") =>
  api.post("/api/suppressions", { value, reason }).then((r) => r.data);
export const deleteSuppression = (id: number) =>
  api.delete(`/api/suppressions/${id}`).then((r) => r.data);

// ---- Portfolio visitors (PostHog, read by the server: src/analytics.py) ------
/** What the readers of one sent email did on the portfolio (its ?r= visit ref). */
export interface PortfolioVisit {
  visits: number;
  pageviews: number;
  first_visit: string | null;
  last_visit: string | null;
  city: string | null;
  country: string | null;
  pages: string[];
  enquiries: number;
  seconds: number | null;
}

export interface LeadVisit extends PortfolioVisit {
  application: {
    id: number;
    kind: Application["kind"];
    status: string;
    to_email: string;
    subject: string;
    sent_at: string | null;
    reply_class: string | null;
    opportunity_kind: Kind | null;
    opportunity_title: string | null;
    company: string | null;
  };
}

type Visits = { visits: number };

export interface Analytics {
  configured: true;
  days: number;
  /** section → error; that section is null */
  errors: Record<string, string>;
  totals: { visits: number; pageviews: number; contact_opens: number; enquiries: number; lead_visits: number } | null;
  engagement: { avg_seconds: number | null; avg_scroll: number | null } | null;
  daily: ({ day: string; pageviews: number } & Visits)[] | null;
  countries: ({ code: string | null; name: string | null } & Visits)[] | null;
  cities: ({ city: string; code: string | null } & Visits)[] | null;
  pages: ({ path: string | null; pageviews: number; avg_seconds: number | null; avg_scroll: number | null } & Visits)[] | null;
  sources: ({ source: string | null } & Visits)[] | null;
  devices: ({ device: string | null } & Visits)[] | null;
  languages: ({ lang: string } & Visits)[] | null;
  events: ({ event: string; count: number } & Visits)[] | null;
  clicks: ({ label: string; count: number } & Visits)[] | null;
  leads: LeadVisit[];
}

export const getAnalytics = (days: number) =>
  api.get<Analytics | { configured: false }>("/api/analytics", { params: { days } }).then((r) => r.data);
