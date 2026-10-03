"use client";

import { useState } from "react";
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
  setOpportunityStatus,
} from "@/lib/api";
import {
  Button,
  Card,
  Empty,
  RegionBadge,
  ScoreBadge,
  Spinner,
  StatusBadge,
  controlCls,
  inputCls,
  timeAgo,
  usd,
} from "@/components/ui";

const STATUS_FILTERS: [string, string][] = [
  ["scored,ready,no_contact,drafted,applied,replied,interview,won", "Active"],
  ["ready", "Ready to email"],
  ["no_contact", "No email (apply manually)"],
  ["drafted", "Drafted"],
  ["applied", "Applied / pitched"],
  ["replied,interview,won", "Replied"],
  ["low_score", "Low score"],
  ["filtered", "Filtered out"],
  ["skipped,closed", "Skipped / closed"],
  ["", "All"],
];

const SOURCES: Record<Kind, string[]> = {
  job: ["google_jobs", "remotive", "remoteok", "arbeitnow", "jobicy", "hn_hiring", "greenhouse", "lever", "ashby"],
  lead: ["google_maps", "rss", "google", "hn_freelance"],
};

const PAGE = 50;

export function OpportunityTable({ kind }: { kind: Kind }) {
  const [status, setStatus] = useState(STATUS_FILTERS[0][0]);
  const [region, setRegion] = useState("");
  const [source, setSource] = useState("");
  const [minScore, setMinScore] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "recent">("score");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["opps", params],
    queryFn: () => getOpportunities(params),
  });

  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select className={`${controlCls} w-auto`} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          {STATUS_FILTERS.map(([v, l]) => (
            <option key={l} value={v}>{l}</option>
          ))}
        </select>
        <select className={`${controlCls} w-auto`} value={region} onChange={(e) => reset(setRegion)(e.target.value)}>
          <option value="">All regions</option>
          <option value="europe,global">EU + remote</option>
          <option value="europe">EU / UK / CH</option>
          <option value="global">Remote (global)</option>
          <option value="us">US</option>
          <option value="other,unknown">Other / unknown</option>
        </select>
        <select className={`${controlCls} w-auto`} value={source} onChange={(e) => reset(setSource)(e.target.value)}>
          <option value="">All sources</option>
          {SOURCES[kind].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className={`${controlCls} w-28`}
          placeholder="Min score"
          inputMode="numeric"
          value={minScore}
          onChange={(e) => reset(setMinScore)(e.target.value.replace(/\D/g, ""))}
        />
        <input
          className={`${controlCls} w-64`}
          placeholder="Search title, company, location…"
          value={q}
          onChange={(e) => reset(setQ)(e.target.value)}
        />
        <select className={`${controlCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as "score" | "recent")}>
          <option value="score">Best match first</option>
          <option value="recent">Newest first</option>
        </select>
        {data && <span className="ml-auto text-xs text-slate-500">{data.total} results</span>}
      </div>

      <Card className="mt-4 overflow-x-auto">
        {isLoading && <div className="p-5"><Spinner /></div>}
        {isError && <Empty>Could not load. Is the API running?</Empty>}
        {data && data.items.length === 0 && (
          <Empty>
            Nothing here yet. Run the pipeline from <Link className="text-emerald-400" href="/runs">Runs</Link>.
          </Empty>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-[#1e293b] text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">{kind === "job" ? "Role" : "Lead"}</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Where</th>
                <th className="px-4 py-3">{kind === "job" ? "Type" : "Est. value"}</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Found</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <Row key={o.id} o={o} kind={kind} onOpen={() => setOpenId(o.id)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.total > PAGE && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500">
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span>
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, data.total)} of {data.total}
          </span>
          <Button disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {openId !== null && <Drawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Row({ o, kind, onOpen }: { o: Opportunity; kind: Kind; onOpen: () => void }) {
  return (
    <tr onClick={onOpen} className="cursor-pointer border-b border-[#1e293b]/60 hover:bg-[#111a2e]/60">
      <td className="px-4 py-2.5"><ScoreBadge score={o.score} /></td>
      <td className="max-w-[340px] px-4 py-2.5">
        <div className="truncate text-slate-200">{o.title}</div>
        {o.signal && kind === "lead" && <div className="truncate text-xs text-slate-500">{o.signal}</div>}
      </td>
      <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-300">{o.company || "—"}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <RegionBadge region={o.region} />
          <span className="max-w-[150px] truncate text-xs text-slate-500">{o.location}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">
        {kind === "job" ? (o.engagement || "—").replace("_", " ") : usd(o.est_value_usd)}
      </td>
      <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-slate-400">{o.contact_email || "—"}</td>
      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{timeAgo(o.found_at)}</td>
    </tr>
  );
}

function Drawer({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: o, isLoading } = useQuery({ queryKey: ["opp", id], queryFn: () => getOpportunity(id) });
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#1e293b] bg-[#0b1220] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <Button variant="subtle" onClick={onClose}>Close ✕</Button>
        </div>
        {isLoading || !o ? (
          <Spinner />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <ScoreBadge score={o.score} />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-100">{o.title}</h2>
                <div className="mt-0.5 text-sm text-slate-400">
                  {o.company || "Unknown company"} · <RegionBadge region={o.region} /> {o.location}
                  {o.remote && ` · ${o.remote}`}
                  {o.engagement && ` · ${o.engagement.replace("_", " ")}`}
                  {o.salary && ` · ${o.salary}`}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge status={o.status} />
                  <span className="text-slate-500">{o.source}</span>
                  {o.est_value_usd ? <span className="text-slate-400">est. {usd(o.est_value_usd)}</span> : null}
                  {o.status_note && <span className="text-slate-500">— {o.status_note}</span>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(o.apply_url || o.url) && (
                <a href={o.apply_url || o.url || "#"} target="_blank" rel="noreferrer">
                  <Button>Open posting ↗</Button>
                </a>
              )}
              {o.website && (
                <a href={o.website} target="_blank" rel="noreferrer">
                  <Button>Website ↗</Button>
                </a>
              )}
              <Button variant="primary" busy={draft.isPending} onClick={() => draft.mutate(undefined)} disabled={!o.contacts.length && !o.contact_email}>
                Write email
              </Button>
              <Button busy={enrich.isPending} onClick={() => enrich.mutate()}>Find email</Button>
              <select
                className={`${controlCls} w-auto`}
                value=""
                onChange={(e) => e.target.value && status.mutate(e.target.value)}
              >
                <option value="">Mark as…</option>
                <option value="interview">Interview</option>
                <option value="won">Won</option>
                <option value="closed">Closed / rejected</option>
                <option value="skipped">Skip</option>
                <option value="ready">Ready (re-open)</option>
              </select>
            </div>
            {msg && (
              <div className={`mt-3 text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</div>
            )}

            {(o.hook || o.reasons.length > 0 || o.red_flags.length > 0 || o.signal) && (
              <Card className="mt-5 space-y-2 p-4 text-sm">
                {o.signal && <div><span className="text-slate-500">Signal: </span><span className="text-slate-200">{o.signal}</span></div>}
                {o.hook && <div><span className="text-slate-500">Hook: </span><span className="text-slate-200">{o.hook}</span></div>}
                {o.reasons.length > 0 && (
                  <ul className="list-inside list-disc text-slate-300">
                    {o.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
                {o.red_flags.length > 0 && (
                  <ul className="list-inside list-disc text-rose-300/80">
                    {o.red_flags.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </Card>
            )}

            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Contacts</div>
              {o.contacts.length === 0 && !o.contact_email && (
                <div className="text-sm text-slate-500">No email yet.</div>
              )}
              <div className="space-y-1.5">
                {o.contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className={c.suppressed ? "text-slate-600 line-through" : "text-slate-200"}>{c.email}</span>
                    <span className="text-xs text-slate-500">{c.source} · {Math.round(c.confidence * 100)}%</span>
                    {!c.suppressed && (
                      <button className="text-xs text-emerald-400 hover:underline" onClick={() => draft.mutate(c.id)}>
                        write to this
                      </button>
                    )}
                  </div>
                ))}
                {o.contacts.length === 0 && o.contact_email && (
                  <div className="text-sm text-slate-200">{o.contact_email} <span className="text-xs text-slate-500">from posting</span></div>
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
              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Emails</div>
                {o.applications.map((a) => (
                  <Link key={a.id} href={`/outbox?id=${a.id}`} className="flex items-center gap-3 py-1 text-sm hover:underline">
                    <StatusBadge status={a.status} />
                    <span className="truncate text-slate-300">{a.subject}</span>
                    <span className="text-xs text-slate-500">{a.kind}</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Description</div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {o.description || "—"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
