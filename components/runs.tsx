"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RunItemRow, RunRow, errorMessage, getRunItems } from "@/lib/api";
import { OpportunityDrawer } from "@/components/OpportunityTable";
import { Icon } from "@/components/icons";
import {
  Button,
  Card,
  Empty,
  Msg,
  Notice,
  PageHeader,
  PanelTitle,
  Pill,
  ScoreBadge,
  Spinner,
  StatusBadge,
  Tabs,
  fmtTime,
  humanize,
} from "@/components/ui";

export const STEPS: [string, string, string][] = [
  ["discover", "Discover", "Run enabled searches (SerpAPI within today's credit budget + free sources)."],
  ["score", "Score", "Prefilter new finds, then LLM-score the rest against your profile."],
  ["enrich", "Find emails", "Crawl websites of qualified matches for a reachable inbox."],
  ["draft", "Write emails", "Draft applications/pitches to keep ~1.5 days of emails ready to send."],
  ["followups", "Follow-ups", "Draft one follow-up for unanswered emails after N days."],
];
export const RUN_LABEL: Record<string, string> = {
  daily: "Full pipeline",
  refill: "Refill outbox",
  rescore: "Score the queue again",
  ...Object.fromEntries(STEPS.map(([k, l]) => [k, l])),
};

/** The per-step counts a run stored (new 48 · scored 40 · …), one chip per step. */
export function RunStats({ stats }: { stats: RunRow["stats"] }) {
  if (Object.keys(stats).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {Object.entries(stats).map(([step, s]) => (
        <div key={step} className="rounded-lg bg-surface-2 px-2.5 py-1.5">
          <span className="font-medium text-fg-2">{RUN_LABEL[step] || step}: </span>
          <span className="text-muted">
            {Object.entries(s)
              .filter(([k, v]) => k !== "first_error" && typeof v !== "object")
              .map(([k, v]) => `${humanize(k)} ${v}`)
              .join(" · ")}
          </span>
          {s.first_error && <div className="mt-0.5 text-bad">{String(s.first_error)}</div>}
        </div>
      ))}
    </div>
  );
}

// ---- One run in full --------------------------------------------------------
type Tone = NonNullable<Parameters<typeof Pill>[0]["tone"]>;
/** What a step did with an item, in words (an opportunity's own statuses keep their badge). */
const OUTCOME: Record<string, [string, Tone]> = {
  new: ["new", "neutral"],
  scored: ["qualified", "good"],
  low_score: ["low score", "dim"],
  filtered: ["filtered out", "dim"],
  ready: ["email found", "good"],
  apply: ["apply on site", "orchid"],
  no_contact: ["no email", "warn"],
  draft: ["draft", "info"],
  held: ["held for review", "warn"],
  skipped: ["skipped", "dim"],
  kept: ["still qualifies", "good"],
  redraft: ["new pitch", "iris"],
  dropped: ["dropped", "dim"],
  error: ["error", "bad"],
};

function Outcome({ outcome }: { outcome: string }) {
  const [label, tone] = OUTCOME[outcome] || [humanize(outcome), "neutral"];
  return <Pill tone={tone}>{label}</Pill>;
}

/** Pipeline order; each heading says what that step did. */
const SECTIONS: { step: string; title: string; empty: string }[] = [
  { step: "discover", title: "Discovered", empty: "No searches ran." },
  { step: "score", title: "Scored", empty: "Nothing was scored." },
  { step: "rescore", title: "Scored again", empty: "Nothing was scored again." },
  { step: "enrich", title: "Emails found", empty: "No email lookups." },
  { step: "draft", title: "Emails written", empty: "No emails written." },
  { step: "followups", title: "Follow-ups written", empty: "No follow-ups written." },
];

type Open = { id: number; emailId?: number } | null;

export function RunDetailView({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["run-items", id],
    queryFn: () => getRunItems(id),
    refetchInterval: (q) => (q.state.data?.run.status === "running" ? 4_000 : false),
  });
  const [open, setOpen] = useState<Open>(null);
  const byStep = useMemo(() => {
    const m: Record<string, RunItemRow[]> = {};
    for (const i of data?.items || []) (m[i.step] ||= []).push(i);
    return m;
  }, [data]);

  const r = data?.run;
  const sections = SECTIONS.filter((s) => byStep[s.step]?.length);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Run #${id}`}
        trail={[{ href: "/runs", label: "runs" }]}
        sub={r ? `${RUN_LABEL[r.kind] || r.kind} · ${r.trigger} · ${fmtTime(r.started_at)}${r.finished_at ? ` → ${fmtTime(r.finished_at)}` : ""}` : undefined}
      />
      {isLoading && <Spinner />}
      {error && <Msg msg={{ ok: false, text: errorMessage(error) }} />}

      {r && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-fg">{RUN_LABEL[r.kind] || r.kind}</span>
            <StatusBadge status={r.status} />
            {r.status === "running" && <span className="text-xs text-subtle">updates live</span>}
          </div>
          <RunStats stats={r.stats} />
          {r.notes && <pre className="whitespace-pre-wrap font-sans text-xs text-subtle">{r.notes}</pre>}
        </Card>
      )}

      {data?.rebuilt && (
        <Notice tone="warn">
          This run is from before run details were recorded, so this list is rebuilt from timestamps: what was found,
          scored, given an email and drafted while it ran, with today&apos;s status. A posting scored again by a later
          run shows under that run instead.
        </Notice>
      )}

      {data && sections.length === 0 && (
        <Card>
          <Empty icon="activity">This run didn&apos;t find, score or write anything.</Empty>
        </Card>
      )}

      {sections.map((s, i) => (
        <Card key={s.step} className="p-5">
          {s.step === "discover" ? (
            <DiscoverSection index={String(i + 1)} title={s.title} items={byStep[s.step]} onOpen={setOpen} />
          ) : (
            <StepSection index={String(i + 1)} title={s.title} items={byStep[s.step]} onOpen={setOpen} />
          )}
        </Card>
      ))}

      {open && <OpportunityDrawer id={open.id} emailId={open.emailId} onClose={() => setOpen(null)} />}
    </div>
  );
}

const SHOW = 60;

/** Searches it ran (found / new / error), each with the new postings under it. */
function DiscoverSection({ index, title, items, onOpen }: {
  index: string; title: string; items: RunItemRow[]; onOpen: (o: Open) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, { head: RunItemRow | null; search: RunItemRow["search"]; found: RunItemRow[] }>();
    for (const i of items) {
      const key = i.search ? String(i.search.id) : "-";
      const g = m.get(key) || { head: null, search: i.search, found: [] };
      if (i.outcome === "new") g.found.push(i);
      else g.head = i;
      m.set(key, g);
    }
    return [...m.values()];
  }, [items]);
  const total = items.filter((i) => i.outcome === "new").length;
  const searches = groups.filter((g) => g.head).length;
  const [all, setAll] = useState(false);
  const quiet = groups.filter((g) => !g.found.length);

  return (
    <div className="space-y-4">
      <PanelTitle index={index} aside={<span className="text-xs text-subtle">{total} new{searches ? ` from ${searches} searches` : ""}</span>}>
        {title}
      </PanelTitle>
      {groups.filter((g) => g.found.length).map((g, n) => (
        <div key={n} className="space-y-1">
          <SearchHead g={g} />
          <div className="divide-y divide-line rounded-lg border border-line">
            {g.found.map((i, k) => <ItemLine key={k} i={i} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
      {quiet.length > 0 && (
        <div className="space-y-1">
          <button className="text-xs text-subtle hover:text-fg" onClick={() => setAll(!all)}>
            {all ? "Hide" : "Show"} {quiet.length} searches with nothing new
          </button>
          {all && <div className="space-y-1.5 pt-1">{quiet.map((g, n) => <SearchHead key={n} g={g} />)}</div>}
        </div>
      )}
    </div>
  );
}

function SearchHead({ g }: { g: { head: RunItemRow | null; search: RunItemRow["search"]; found: RunItemRow[] } }) {
  const s = g.search;
  const failed = g.head?.outcome === "error";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
      <span className="font-mono text-fg-2">{s ? s.source : "unknown search"}</span>
      {s?.query && <span className="max-w-full truncate text-muted" title={s.query}>{s.query}</span>}
      {s?.location && <span className="text-subtle">· {s.location}</span>}
      <span className={`ml-auto ${failed ? "text-bad" : "text-subtle"}`}>
        {g.head?.note || `${g.found.length} new`}
      </span>
    </div>
  );
}

/** A step's items with a filter by what happened to them (qualified, low score…). */
function StepSection({ index, title, items, onOpen }: {
  index: string; title: string; items: RunItemRow[]; onOpen: (o: Open) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.outcome] = (c[i.outcome] || 0) + 1;
    return c;
  }, [items]);
  const [filter, setFilter] = useState<string>("");
  const [limit, setLimit] = useState(SHOW);
  const shown = filter ? items.filter((i) => i.outcome === filter) : items;
  const options = [
    { value: "", label: "All", count: items.length },
    ...Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([o, n]) => ({ value: o, label: (OUTCOME[o] || [humanize(o)])[0], count: n })),
  ];

  return (
    <div className="space-y-3">
      <PanelTitle index={index} aside={<span className="text-xs text-subtle">{items.length}</span>}>{title}</PanelTitle>
      {options.length > 2 && <Tabs value={filter} onChange={(v) => { setFilter(v); setLimit(SHOW); }} options={options} />}
      <div className="divide-y divide-line rounded-lg border border-line">
        {shown.slice(0, limit).map((i, k) => <ItemLine key={k} i={i} onOpen={onOpen} />)}
      </div>
      {shown.length > limit && (
        <Button size="sm" variant="subtle" onClick={() => setLimit(shown.length)}>
          Show all {shown.length}
        </Button>
      )}
    </div>
  );
}

/** One posting or email: score, title, what this step did, why; opens the posting. */
function ItemLine({ i, onOpen }: { i: RunItemRow; onOpen: (o: Open) => void }) {
  const o = i.opportunity;
  const e = i.email;
  const open = () => o && onOpen({ id: o.id, emailId: e?.id });
  // where it stands today, when that moved on from what this step did
  const now = o && !e && o.status !== i.outcome ? o.status : null;
  const sentNow = e && e.status !== i.outcome && !(e.status === "failed" && i.outcome === "held") ? e.status : null;
  return (
    <div
      role={o ? "button" : undefined}
      tabIndex={o ? 0 : undefined}
      onClick={open}
      onKeyDown={(ev) => ev.key === "Enter" && open()}
      className={`flex items-start gap-3 px-3 py-2.5 text-sm ${o ? "cursor-pointer outline-none transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2" : ""}`}
    >
      <ScoreBadge score={i.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-fg" title={e?.subject || o?.title}>
            {e ? e.subject : o?.title || "—"}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle">
          {o && <span className="font-mono text-faint">{o.kind}</span>}
          {e ? (
            <span className="truncate">to {e.to} · {o?.company || o?.title}</span>
          ) : (
            <span className="truncate">{[o?.company, o?.location].filter(Boolean).join(" · ") || o?.source}</span>
          )}
        </div>
        {i.note && !e && <div className="mt-0.5 line-clamp-2 text-xs text-muted">{i.note}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Outcome outcome={i.outcome} />
        {sentNow && <span className="text-[11px] text-subtle">now: <StatusBadge status={sentNow} /></span>}
        {now && <span className="text-[11px] text-subtle">now: <StatusBadge status={now} /></span>}
      </div>
      {o && <Icon name="arrowRight" className="mt-1 h-3.5 w-3.5 shrink-0 text-faint" />}
    </div>
  );
}
