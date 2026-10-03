"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Kind,
  SearchRow,
  createSearch,
  deleteSearch,
  errorMessage,
  getSearches,
  getStats,
  runSearch,
  updateSearch,
} from "@/lib/api";
import { Button, Card, Field, PageHeader, Spinner, controlCls, inputCls, timeAgo } from "@/components/ui";

const HELP: Record<string, string> = {
  google_jobs: "Search terms · location = country or city (e.g. Germany). Aggregates LinkedIn, Indeed, Glassdoor & company sites. 1 credit/page.",
  google: "Google query — quotes, OR and site: work. params {\"tbs\":\"qdr:w\"} = past week. 1 credit.",
  google_maps: "What to look for (e.g. software development agency) · location = \"City, Country\". 1 credit/page.",
  remotive: "Optional search term (remote software jobs).",
  remoteok: "Comma-separated keywords to keep.",
  arbeitnow: "Comma-separated keywords to keep (DE/EU board).",
  jobicy: "One tag, e.g. react · params {\"geo\":\"europe\"}.",
  hn_hiring: "Comma-separated keywords a post must mention (monthly HN thread).",
  hn_freelance: "Optional keywords (HN 'Seeking freelancer' posts only).",
  greenhouse: "Comma-separated Greenhouse board slugs, e.g. n26, gitlab.",
  lever: "Comma-separated Lever company slugs.",
  ashby: "Comma-separated Ashby board slugs, e.g. ramp, linear.",
  rss: "Funding-news feed URL (RSS/Atom).",
};

export default function SearchesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["searches"], queryFn: getSearches });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });

  return (
    <div>
      <PageHeader
        title="Searches"
        sub={
          <>
            What the daily discovery runs. Free sources run every day; paid (SerpAPI) searches rotate,
            least-recently-run first, within today&apos;s credit budget
            {stats?.serpapi.configured && ` (${stats.serpapi.budget_left_today} left today, ${stats.serpapi.plan_searches_left ?? "?"} this month)`}.
          </>
        }
      />
      <NewSearch sources={data?.sources || []} />
      {isLoading && <div className="mt-6"><Spinner /></div>}
      {(["job", "lead"] as Kind[]).map((kind) => (
        <div key={kind} className="mt-6">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            {kind === "job" ? "Job searches" : "Lead / project searches"}
          </div>
          <Card>
            {data?.items.filter((s) => s.kind === kind).map((s) => <SearchItem key={s.id} s={s} />)}
          </Card>
        </div>
      ))}
    </div>
  );
}

function SearchItem({ s }: { s: SearchRow }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState(s.query);
  const [location, setLocation] = useState(s.location || "");
  const [params, setParams] = useState(JSON.stringify(s.params));
  const [err, setErr] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["searches"] });

  const save = useMutation({
    mutationFn: (changes: Partial<SearchRow>) => updateSearch(s.id, changes),
    onSuccess: () => {
      setErr("");
      invalidate();
    },
    onError: (e) => setErr(errorMessage(e)),
  });
  const del = useMutation({ mutationFn: () => deleteSearch(s.id), onSuccess: invalidate });
  const run = useMutation({
    mutationFn: () => runSearch(s.id),
    onSuccess: () => setErr("Started — results appear in Jobs/Leads; scoring runs with the next pipeline."),
    onError: (e) => setErr(errorMessage(e)),
  });

  const dirty = query !== s.query || location !== (s.location || "") || params !== JSON.stringify(s.params);
  const saveAll = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(params || "{}");
    } catch {
      setErr("params must be JSON, e.g. {\"pages\": 2}");
      return;
    }
    save.mutate({ query, location, params: parsed });
  };

  return (
    <div className={`border-b border-[#1e293b]/60 px-4 py-3 ${s.enabled ? "" : "opacity-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input type="checkbox" checked={s.enabled} onChange={() => save.mutate({ enabled: !s.enabled })} title="enabled" />
        <span className="w-28 text-xs font-medium text-slate-300">
          {s.source}
          {s.paid && <span className="ml-1 text-amber-300/80">$</span>}
        </span>
        <input className={`${controlCls} min-w-[280px] flex-1`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="query" />
        <input className={`${controlCls} w-48`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="location" />
        <input className={`${controlCls} w-44 font-mono text-xs`} value={params} onChange={(e) => setParams(e.target.value)} />
        {dirty && <Button variant="primary" busy={save.isPending} onClick={saveAll}>Save</Button>}
        <Button busy={run.isPending} onClick={() => run.mutate()}>Run</Button>
        <Button variant="subtle" onClick={() => del.mutate()}>✕</Button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 pl-6 text-xs text-slate-500">
        <span>{HELP[s.source]}</span>
        <span>last run {timeAgo(s.last_run_at)} · {s.last_found} new</span>
        {s.last_error && <span className="text-rose-300/80">{s.last_error}</span>}
        {err && <span className="text-amber-300">{err}</span>}
      </div>
    </div>
  );
}

function NewSearch({ sources }: { sources: string[] }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("job");
  const [source, setSource] = useState("google_jobs");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const create = useMutation({
    mutationFn: () => createSearch({ kind, source, query, location: location || null, params: {} }),
    onSuccess: () => {
      setQuery("");
      setLocation("");
      qc.invalidateQueries({ queryKey: ["searches"] });
    },
  });
  return (
    <Card className="mt-5 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[110px_150px_1fr_220px_auto] md:items-end">
        <Field label="Type">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="job">Job</option>
            <option value="lead">Lead</option>
          </select>
        </Field>
        <Field label="Source">
          <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Query">
          <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. senior next.js developer" />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Netherlands" />
        </Field>
        <Button variant="primary" busy={create.isPending} onClick={() => create.mutate()}>Add search</Button>
      </div>
      <div className="mt-2 text-xs text-slate-500">{HELP[source]}</div>
      {create.isError && <div className="mt-2 text-xs text-rose-300">{errorMessage(create.error)}</div>}
    </Card>
  );
}
