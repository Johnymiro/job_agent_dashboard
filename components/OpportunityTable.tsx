"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Kind,
  Opportunity,
  OpportunityDetail,
  addOpportunityContact,
  draftOpportunity,
  enrichOpportunity,
  errorMessage,
  getOpportunities,
  getOpportunity,
  getStats,
  setOpportunityStatus,
  startRun,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import {
  Button,
  Card,
  Empty,
  Label,
  Msg,
  Notice,
  RegionBadge,
  ScoreBadge,
  SearchInput,
  Spinner,
  StatusBadge,
  Tabs,
  buttonClass,
  controlCls,
  humanize,
  inputCls,
  timeAgo,
  usd,
} from "@/components/ui";

const ACTIVE = "scored,ready,no_contact,drafted,applied,replied,interview,won";
/** The filters you use daily, as tabs… */
const MAIN_FILTERS: { value: string; label: string }[] = [
  { value: ACTIVE, label: "Active" },
  { value: "ready", label: "Ready to email" },
  { value: "no_contact", label: "No email" },
  { value: "applied", label: "Applied" },
  { value: "replied,interview,won", label: "Replied" },
  { value: "", label: "All" },
];
/** …and the rest behind "More". */
const MORE_FILTERS: [string, string][] = [
  ["drafted", "Drafted"],
  ["low_score", "Low score"],
  ["filtered", "Filtered out"],
  ["skipped,closed", "Skipped / closed"],
];

const SOURCES: Record<Kind, string[]> = {
  job: ["google_jobs", "remotive", "remoteok", "arbeitnow", "jobicy", "hn_hiring", "greenhouse", "lever", "ashby"],
  lead: ["google_maps", "rss", "google", "hn_freelance"],
};

const PAGE = 50;

/** Finds that discovery stored but nobody has scored yet are hidden from the
 *  default "Active" view — say how many there are and offer to score them. */
function UnscoredBanner({ kind, running }: { kind: Kind; running: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["opps", "unscored", kind],
    queryFn: () => getOpportunities({ kind, status: "new", limit: 1 }),
    refetchInterval: running ? 10_000 : 60_000,
  });
  const score = useMutation({
    mutationFn: () => startRun("score"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });
  const n = data?.total || 0;
  if (!n) return null;
  return (
    <Notice tone="info" className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1">
          <b className="font-semibold text-fg">{n}</b> {kind === "job" ? "jobs" : "leads"} found but not scored yet
          {running ? " — the pipeline is running, matches appear here as they're scored." : "."}
        </span>
        {!running && (
          <Button variant="primary" size="sm" busy={score.isPending} onClick={() => score.mutate()}>
            Score now
          </Button>
        )}
        {score.isError && <Msg msg={{ ok: false, text: errorMessage(score.error) }} />}
      </div>
    </Notice>
  );
}

export function OpportunityTable({ kind }: { kind: Kind }) {
  const [status, setStatus] = useState(ACTIVE);
  const [region, setRegion] = useState("");
  const [source, setSource] = useState("");
  const [minScore, setMinScore] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "recent">("score");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const params = {
    kind,
    status: status || undefined,
    region: region || undefined,
    source: source || undefined,
    min_score: minScore ? Number(minScore) : undefined,
    q: q || undefined,
    sort,
    limit: PAGE,
    offset: page * PAGE,
  };
  // while the pipeline runs, keep the list fresh so scored matches pop in
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, refetchInterval: 15_000 });
  const running = !!stats?.pipeline_running;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["opps", params],
    queryFn: () => getOpportunities(params),
    refetchInterval: running ? 10_000 : false,
  });

  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };
  const extraFilters = [region, source, minScore].filter(Boolean).length;
  const inMore = MORE_FILTERS.some(([v]) => v === status);

  return (
    <>
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            className="-mx-1 px-1"
            value={inMore ? "__more" : status}
            onChange={reset(setStatus)}
            options={MAIN_FILTERS}
          />
          <select
            aria-label="More statuses"
            className={`${controlCls} w-auto ${inMore ? "border-accent/50 text-accent" : "text-muted"}`}
            value={inMore ? status : ""}
            onChange={(e) => e.target.value && reset(setStatus)(e.target.value)}
          >
            <option value="">More…</option>
            {MORE_FILTERS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            className="w-full sm:w-72"
            placeholder="Search title, company, location…"
            value={q}
            onChange={reset(setQ)}
          />
          <select
            aria-label="Sort"
            className={`${controlCls} w-auto`}
            value={sort}
            onChange={(e) => setSort(e.target.value as "score" | "recent")}
          >
            <option value="score">Best match first</option>
            <option value="recent">Newest first</option>
          </select>
          <Button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
            <Icon name="filter" className="h-3.5 w-3.5" />
            Filters
            {extraFilters > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">{extraFilters}</span>
            )}
          </Button>
          {extraFilters > 0 && (
            <Button
              variant="subtle"
              onClick={() => {
                setRegion("");
                setSource("");
                setMinScore("");
                setPage(0);
              }}
            >
              Clear
            </Button>
          )}
          {data && <span className="ml-auto text-xs text-subtle">{data.total} results</span>}
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface-2/50 p-3">
            <label className="text-xs font-medium text-muted">
              Region
              <select className={`${controlCls} mt-1 block w-44`} value={region} onChange={(e) => reset(setRegion)(e.target.value)}>
                <option value="">All regions</option>
                <option value="europe,global">EU + remote</option>
                <option value="europe">EU / UK / CH</option>
                <option value="global">Remote (global)</option>
                <option value="us">US</option>
                <option value="other,unknown">Other / unknown</option>
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Source
              <select className={`${controlCls} mt-1 block w-44`} value={source} onChange={(e) => reset(setSource)(e.target.value)}>
                <option value="">All sources</option>
                {SOURCES[kind].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Min score
              <input
                className={`${controlCls} mt-1 block w-28`}
                placeholder="0–100"
                inputMode="numeric"
                value={minScore}
                onChange={(e) => reset(setMinScore)(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          </div>
        )}
      </div>

      <UnscoredBanner kind={kind} running={running} />

      <Card className="mt-4 overflow-x-auto">
        {isLoading && <div className="p-5"><Spinner /></div>}
        {isError && <Empty icon="alert">Could not load. Is the API running?</Empty>}
        {data && data.items.length === 0 && (
          <Empty icon={kind === "job" ? "briefcase" : "target"}>
            Nothing matches these filters.
            <div className="mt-1">
              New finds arrive with each run — see{" "}
              <Link className="font-medium text-accent hover:underline" href="/runs">Runs</Link>.
            </div>
          </Empty>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50 text-left text-xs font-medium text-subtle">
              <tr>
                <th className="w-14 px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">{kind === "job" ? "Role" : "Lead"}</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Company</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Where</th>
                <th className="hidden px-4 py-2.5 font-medium xl:table-cell">{kind === "job" ? "Type" : "Est. value"}</th>
                <th className="hidden px-4 py-2.5 font-medium xl:table-cell">Contact</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Found</th>
                <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((o) => (
                <Row key={o.id} o={o} kind={kind} onOpen={() => setOpenId(o.id)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.total > PAGE && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-subtle">
          <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <Icon name="arrowLeft" className="h-3 w-3" /> Prev
          </Button>
          <span className="tabular-nums">
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, data.total)} of {data.total}
          </span>
          <Button size="sm" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)}>
            Next <Icon name="arrowRight" className="h-3 w-3" />
          </Button>
        </div>
      )}

      {openId !== null && <Drawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

/** Statuses where "you applied / contacted them" no longer makes sense. */
const CONTACTED = new Set(["applied", "replied", "interview", "won", "closed"]);

/** For jobs you applied to on their website (or leads you contacted yourself):
 *  marks it applied and starts the company cooldown so the app won't email them. */
function MarkAppliedButton({ o, kind }: { o: Opportunity; kind: Kind }) {
  const qc = useQueryClient();
  const mark = useMutation({
    mutationFn: () => setOpportunityStatus(o.id, "applied"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opps"] });
      qc.invalidateQueries({ queryKey: ["opp", o.id] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["apps"] });
    },
  });
  if (CONTACTED.has(o.status)) return null;
  const label = kind === "job" ? "Applied" : "Contacted";
  return (
    <Button
      size="sm"
      busy={mark.isPending}
      title={kind === "job" ? "I applied on their website: mark as applied" : "I contacted them myself: mark as contacted"}
      onClick={(e) => {
        e.stopPropagation();
        mark.mutate();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Icon name="check" className="h-3.5 w-3.5" /> {mark.isError ? "Retry" : label}
    </Button>
  );
}

function Row({ o, kind, onOpen }: { o: Opportunity; kind: Kind; onOpen: () => void }) {
  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      className="cursor-pointer outline-none transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2"
    >
      <td className="px-4 py-3 align-top sm:align-middle"><ScoreBadge score={o.score} /></td>
      <td className="max-w-[340px] px-4 py-3">
        <div className="truncate font-medium text-fg">{o.title}</div>
        {/* on small screens the hidden columns collapse into this line */}
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-subtle md:hidden">
          <span className="truncate">{o.company || "—"}</span>
          <RegionBadge region={o.region} />
          <span className="sm:hidden"><StatusBadge status={o.status} /></span>
        </div>
        {o.signal && kind === "lead" && <div className="mt-0.5 hidden truncate text-xs text-subtle md:block">{o.signal}</div>}
      </td>
      <td className="hidden max-w-[180px] truncate px-4 py-3 text-fg-2 md:table-cell">{o.company || "—"}</td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <div className="flex items-center gap-2">
          <RegionBadge region={o.region} />
          <span className="max-w-[150px] truncate text-xs text-subtle">{o.location}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-xs text-muted xl:table-cell">
        {kind === "job" ? humanize(o.engagement || "—") : usd(o.est_value_usd)}
      </td>
      <td className="hidden max-w-[200px] truncate px-4 py-3 text-xs text-muted xl:table-cell">{o.contact_email || "—"}</td>
      <td className="hidden px-4 py-3 sm:table-cell"><StatusBadge status={o.status} /></td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-subtle md:table-cell">{timeAgo(o.found_at)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right"><MarkAppliedButton o={o} kind={kind} /></td>
    </tr>
  );
}

function Drawer({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: o, isLoading } = useQuery({ queryKey: ["opp", id], queryFn: () => getOpportunity(id) });
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refresh = (d?: OpportunityDetail) => {
    if (d) qc.setQueryData(["opp", id], d);
    else qc.invalidateQueries({ queryKey: ["opp", id] });
    qc.invalidateQueries({ queryKey: ["opps"] });
  };
  const fail = (e: unknown) => setMsg({ ok: false, text: errorMessage(e) });

  const enrich = useMutation({
    mutationFn: () => enrichOpportunity(id),
    onSuccess: (d) => {
      refresh(d);
      setMsg({ ok: d.contacts.length > 0, text: d.contacts.length ? `Found ${d.contacts.length} email(s)` : "No email found on their site" });
    },
    onError: fail,
  });
  const addContact = useMutation({
    mutationFn: () => addOpportunityContact(id, email),
    onSuccess: (d) => {
      refresh(d);
      setEmail("");
      setMsg({ ok: true, text: "Email added" });
    },
    onError: fail,
  });
  const draft = useMutation({
    mutationFn: (contactId?: number) => draftOpportunity(id, contactId),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["apps"] });
      setMsg({ ok: true, text: "Draft created — review it in the Outbox" });
    },
    onError: fail,
  });
  const status = useMutation({
    mutationFn: (s: string) => setOpportunityStatus(id, s),
    onSuccess: () => refresh(),
    onError: fail,
  });

  const hasEmail = !!o && (o.contacts.length > 0 || !!o.contact_email);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-2xl flex-col border-l border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">{kindLabel(o)}</span>
          <Button variant="subtle" size="sm" onClick={onClose} title="Close (Esc)">
            <Icon name="x" className="h-3.5 w-3.5" /> Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading || !o ? (
            <Spinner />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <ScoreBadge score={o.score} />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-snug text-fg">{o.title}</h2>
                  <div className="mt-1 text-sm text-muted">
                    <span className="font-medium text-fg-2">{o.company || "Unknown company"}</span> · <OpportunityFacts o={o} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <StatusBadge status={o.status} />
                    <span className="text-subtle">{o.source}</span>
                    {o.est_value_usd ? <span className="text-muted">est. {usd(o.est_value_usd)}</span> : null}
                    {o.status_note && <span className="text-subtle">— {o.status_note}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  busy={draft.isPending}
                  onClick={() => draft.mutate(undefined)}
                  disabled={!hasEmail}
                  title={hasEmail ? "Let the AI draft an email — it waits in the Outbox for you" : "Find or add an email first"}
                >
                  <Icon name="sparkles" className="h-3.5 w-3.5" /> Write email
                </Button>
                <Button busy={enrich.isPending} onClick={() => enrich.mutate()}>
                  <Icon name="search" className="h-3.5 w-3.5" /> Find email
                </Button>
                {(o.apply_url || o.url) && (
                  <a className={buttonClass()} href={o.apply_url || o.url || "#"} target="_blank" rel="noreferrer">
                    Posting <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                )}
                {o.website && (
                  <a className={buttonClass()} href={o.website} target="_blank" rel="noreferrer">
                    Website <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                )}
                <select
                  aria-label="Mark as"
                  className={`${controlCls} w-auto`}
                  value=""
                  onChange={(e) => e.target.value && status.mutate(e.target.value)}
                >
                  <option value="">Mark as…</option>
                  {!CONTACTED.has(o.status) && (
                    <option value="applied">{o.kind === "job" ? "Applied on their website" : "Contacted (outside the app)"}</option>
                  )}
                  <option value="interview">Interview</option>
                  <option value="won">Won</option>
                  <option value="closed">Closed / rejected</option>
                  <option value="skipped">Skip</option>
                  <option value="ready">Ready (re-open)</option>
                </select>
              </div>
              {msg && <div className="mt-3"><Msg msg={msg} /></div>}

              <MatchReasons o={o} className="mt-6" />

              <div className="mt-6">
                <Label className="mb-2">Contacts</Label>
                {o.contacts.length === 0 && !o.contact_email && (
                  <div className="text-sm text-subtle">No email yet — try “Find email”, or add one you found yourself.</div>
                )}
                <div className="divide-y divide-line">
                  {o.contacts.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <span className={c.suppressed ? "text-faint line-through" : "text-fg"}>{c.email}</span>
                      <span className="text-xs text-subtle">{c.source} · {Math.round(c.confidence * 100)}%</span>
                      {!c.suppressed && (
                        <button className="ml-auto text-xs font-medium text-accent hover:underline" onClick={() => draft.mutate(c.id)}>
                          Write to this →
                        </button>
                      )}
                    </div>
                  ))}
                  {o.contacts.length === 0 && o.contact_email && (
                    <div className="py-2 text-sm text-fg">{o.contact_email} <span className="text-xs text-subtle">from posting</span></div>
                  )}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email) addContact.mutate();
                  }}
                >
                  <input className={inputCls} placeholder="Add an email you found yourself…" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button busy={addContact.isPending} type="submit">Add</Button>
                </form>
              </div>

              {o.applications.length > 0 && (
                <div className="mt-6">
                  <Label className="mb-2">Emails</Label>
                  <div className="divide-y divide-line">
                    {o.applications.map((a) => (
                      <Link key={a.id} href={`/outbox?id=${a.id}`} className="group flex items-center gap-3 py-2 text-sm">
                        <StatusBadge status={a.status === "draft" ? "ready" : a.status} />
                        <span className="truncate text-fg-2 group-hover:text-fg group-hover:underline">{a.subject}</span>
                        <span className="ml-auto text-xs text-subtle">{a.kind}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <OpportunityDescription o={o} className="mt-6" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const kindLabel = (o?: OpportunityDetail) => (!o ? "" : o.kind === "job" ? "Job" : "Lead");

// ---------------------------------------------------------------------------
// Pieces of the drawer that the Outbox's Job tab shows too.
// ---------------------------------------------------------------------------

/** Region, location, remote, engagement and salary on one line. */
export function OpportunityFacts({ o }: { o: Opportunity }) {
  return (
    <>
      <RegionBadge region={o.region} /> {o.location}
      {o.remote && ` · ${o.remote}`}
      {o.engagement && ` · ${humanize(o.engagement)}`}
      {o.salary && ` · ${o.salary}`}
    </>
  );
}

/** The scorer's signal, hook, reasons and red flags (nothing if it gave none). */
export function MatchReasons({ o, className = "" }: { o: OpportunityDetail; className?: string }) {
  if (!(o.hook || o.reasons.length > 0 || o.red_flags.length > 0 || o.signal)) return null;
  return (
    <div className={`space-y-3 rounded-lg border border-line bg-surface-2/50 p-4 text-sm ${className}`}>
      <Label>Why it matches</Label>
      {o.signal && <div><span className="text-subtle">Signal: </span><span className="text-fg">{o.signal}</span></div>}
      {o.hook && <div><span className="text-subtle">Hook: </span><span className="text-fg">{o.hook}</span></div>}
      {o.reasons.length > 0 && (
        <ul className="space-y-1 text-fg-2">
          {o.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-good" />
              {r}
            </li>
          ))}
        </ul>
      )}
      {o.red_flags.length > 0 && (
        <ul className="space-y-1 text-bad">
          {o.red_flags.map((r) => (
            <li key={r} className="flex gap-2">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OpportunityDescription({ o, className = "" }: { o: OpportunityDetail; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-2">Description</Label>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{o.description || "—"}</div>
    </div>
  );
}
