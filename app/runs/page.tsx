"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RunRow, errorMessage, getRuns, startRun } from "@/lib/api";
import { Button, Card, Empty, PageHeader, Spinner, StatusBadge, fmtTime } from "@/components/ui";

const STEPS: [string, string, string][] = [
  ["daily", "Full pipeline", "Everything below, in order — what the daily schedule runs."],
  ["discover", "Discover", "Run enabled searches (SerpAPI within today's credit budget + free sources)."],
  ["score", "Score", "Prefilter new finds, then LLM-score the rest against your profile."],
  ["enrich", "Find emails", "Crawl websites of qualified matches for a reachable inbox."],
  ["draft", "Write emails", "Draft applications/pitches to keep ~1.5 days of sends queued."],
  ["followups", "Follow-ups", "Draft one follow-up for unanswered emails after N days."],
];

export default function RunsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: getRuns,
    refetchInterval: (q) => (q.state.data?.running ? 3_000 : 20_000),
  });
  const start = useMutation({
    mutationFn: (kind: string) => startRun(kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  return (
    <div>
      <PageHeader title="Runs" sub="Run the pipeline (or one step) on demand. Sending is separate: it trickles out the queue inside the send window." />

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map(([kind, label, hint]) => (
          <Card key={kind} className="flex flex-col justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-medium text-slate-100">{label}</div>
              <div className="mt-1 text-xs text-slate-500">{hint}</div>
            </div>
            <Button
              variant={kind === "daily" ? "primary" : "ghost"}
              disabled={data?.running || start.isPending}
              onClick={() => start.mutate(kind)}
            >
              Run
            </Button>
          </Card>
        ))}
      </div>
      {start.isError && <div className="mt-2 text-xs text-rose-300">{errorMessage(start.error)}</div>}

      <Card className="mt-6">
        {isLoading && <div className="p-5"><Spinner /></div>}
        {data && data.items.length === 0 && <Empty>No runs yet.</Empty>}
        {data?.items.map((r) => <RunItem key={r.id} r={r} />)}
      </Card>
    </div>
  );
}

function RunItem({ r }: { r: RunRow }) {
  return (
    <div className="border-b border-[#1e293b]/60 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">#{r.id}</span>
        <span className="font-medium text-slate-200">{r.kind}</span>
        <StatusBadge status={r.status} />
        <span className="text-xs text-slate-500">{r.trigger}</span>
        <span className="ml-auto text-xs text-slate-500">
          {fmtTime(r.started_at)}
          {r.finished_at && ` → ${fmtTime(r.finished_at)}`}
        </span>
      </div>
      {Object.keys(r.stats).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {Object.entries(r.stats).map(([step, s]) => (
            <div key={step}>
              <span className="text-slate-400">{step}: </span>
              <span className="text-slate-300">
                {Object.entries(s)
                  .filter(([k]) => k !== "first_error")
                  .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
                  .join(" · ")}
              </span>
              {s.first_error && <div className="text-rose-300/80">{String(s.first_error)}</div>}
            </div>
          ))}
        </div>
      )}
      {r.notes && <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{r.notes}</pre>}
    </div>
  );
}
