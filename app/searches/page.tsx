"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Kind,
  RunRow,
  SearchRow,
  createSearch,
  deleteSearch,
  errorMessage,
  getRun,
  getSearches,
  getStats,
  runSearch,
  updateSearch,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { Button, Card, Empty, Field, Label, Msg, PageHeader, Spinner, Toggle, controlCls, inputCls, timeAgo } from "@/components/ui";

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
  landing_jobs: "Optional keywords to keep (Landing.jobs: tech jobs, mostly in Portugal).",
  himalayas: "Comma-separated keywords, one search each · params {\"country\":\"Portugal\",\"pages\":2}: remote jobs open to that country.",
  working_nomads: "Comma-separated keywords to keep (remote development jobs).",
  weworkremotely: "Comma-separated keywords to keep (We Work Remotely full-stack, front-end and back-end feeds).",
  rss: "Funding-news feed URL (RSS/Atom).",
};

export default function SearchesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["searches"], queryFn: getSearches });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });

  return (
    <div className="space-y-6">
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
      {isLoading && <Spinner />}
      {data &&
        (["job", "lead"] as Kind[]).map((kind) => {
          const rows = data.items.filter((s) => s.kind === kind);
          const on = rows.filter((s) => s.enabled).length;
          return (
            <div key={kind}>
              <div className="mb-3 flex items-baseline gap-2">
                <Label>{kind === "job" ? "Job searches" : "Lead / project searches"}</Label>
                <span className="text-xs text-faint">{on} of {rows.length} on</span>
              </div>
              <Card className="divide-y divide-line">
                {rows.length === 0 && <Empty icon="compass">No {kind} searches yet — add one above.</Empty>}
                {rows.map((s) => <SearchItem key={s.id} s={s} />)}
              </Card>
            </div>
          );
        })}
    </div>
  );
}

function SearchItem({ s }: { s: SearchRow }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState(s.query);
  const [location, setLocation] = useState(s.location || "");
  const [params, setParams] = useState(JSON.stringify(s.params));
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  const [runId, setRunId] = useState<number | null>(null);
  const run = useMutation({
    mutationFn: () => runSearch(s.id),
    onSuccess: (r) => {
      setErr("");
      setRunId(r.id);
    },
    onError: (e) => setErr(errorMessage(e)),
  });
  // follow the run (search, then scoring of what it found) until it finishes
  const { data: runRow } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId as number),
    enabled: runId !== null,
    refetchInterval: (q) => (!q.state.data || q.state.data.status === "running" ? 2000 : false),
  });
  const finished = runRow && runRow.status !== "running";
  useEffect(() => {
    if (!finished) return;
    qc.invalidateQueries({ queryKey: ["searches"] });
    qc.invalidateQueries({ queryKey: ["opps"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }, [finished, qc]);
  // the "Delete?" confirmation times out if you don't click again
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle checked={s.enabled} onChange={() => save.mutate({ enabled: !s.enabled })} />
        <span className={`inline-flex w-32 items-center gap-1.5 font-mono text-xs ${s.enabled ? "text-fg-2" : "text-faint"}`}>
          {s.source}
          {s.paid && (
            <span title="Uses SerpAPI credits" className="rounded bg-warn/10 px-1 font-sans text-[10px] font-semibold text-warn">
              paid
            </span>
          )}
        </span>
        <div className={`flex min-w-0 flex-1 flex-wrap items-center gap-2 ${s.enabled ? "" : "opacity-60"}`}>
          <input
            aria-label="Query"
            className={`${controlCls} min-w-[220px] flex-1`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="query"
          />
          <input
            aria-label="Location"
            className={`${controlCls} w-full sm:w-44`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="location"
          />
          <input
            aria-label="Params (JSON)"
            title="Extra params as JSON"
            className={`${controlCls} w-full font-mono text-xs sm:w-40`}
            value={params}
            onChange={(e) => setParams(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {dirty && <Button variant="primary" busy={save.isPending} onClick={saveAll}>Save</Button>}
          <Button busy={run.isPending || runRow?.status === "running"} onClick={() => run.mutate()} title="Run this search now">
            {!(run.isPending || runRow?.status === "running") && <Icon name="play" className="h-3 w-3" />} Run
          </Button>
          {confirmDelete ? (
            <Button variant="danger" busy={del.isPending} onClick={() => del.mutate()}>Delete?</Button>
          ) : (
            <Button variant="subtle" onClick={() => setConfirmDelete(true)} title="Delete search" aria-label="Delete search">
              <Icon name="trash" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle sm:pl-11">
        <span>{HELP[s.source]}</span>
        <span className="text-faint">last run {timeAgo(s.last_run_at)} · {s.last_found} new</span>
        {s.last_error && <span className="text-bad">{s.last_error}</span>}
        {runRow && (
          <span className={runRow.status === "done" ? "text-good" : runRow.status === "running" ? "text-info" : "text-bad"}>
            {runSummary(runRow)}
          </span>
        )}
        {err && <span className="text-warn">{err}</span>}
      </div>
    </div>
  );
}

/** One line on what a "Run" did: found, scored, or why it didn't. */
function runSummary(r: RunRow): string {
  if (r.status === "running") return r.notes || "Running…";
  if (r.status !== "done") return `${r.status}: ${(r.notes || "").split("\n")[0]}`;
  const d = r.stats.discover || {};
  const sc = r.stats.score || {};
  if (Number(d.skipped_no_credits) > 0 && !Number(d.searches)) return "Skipped — no SerpAPI credits left";
  if (Number(d.errors) > 0) return "Search failed — see the error above";
  const parts = [`${d.new ?? 0} new`];
  if (sc.scored !== undefined) parts.push(`${sc.scored} scored, ${sc.qualified} good matches`);
  if (Number(sc.filtered)) parts.push(`${sc.filtered} filtered out`);
  if (sc.first_error) parts.push(`scoring error: ${sc.first_error}`);
  return `Done — ${parts.join(" · ")}`;
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
    <Card className="p-4 sm:p-5">
      <div className="mb-3 text-sm font-semibold text-fg">Add a search</div>
      <form
        className="grid grid-cols-2 gap-3 md:grid-cols-[110px_150px_1fr_200px_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
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
        <div className="col-span-2 md:col-span-1">
          <Field label="Query">
            <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. senior next.js developer" />
          </Field>
        </div>
        <div className="col-span-2 md:col-span-1">
          <Field label="Location">
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Netherlands" />
          </Field>
        </div>
        <Button type="submit" variant="primary" className="col-span-2 md:col-span-1" busy={create.isPending}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-subtle">
        <Icon name="info" className="mt-px h-3.5 w-3.5 text-faint" />
        {HELP[source]}
      </div>
      {create.isError && <div className="mt-2"><Msg msg={{ ok: false, text: errorMessage(create.error) }} /></div>}
    </Card>
  );
}
