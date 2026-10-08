"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RunRow, errorMessage, getRuns, startRun } from "@/lib/api";
import { Icon } from "@/components/icons";
import { Button, Card, Empty, Label, Msg, Notice, PageHeader, Spinner, StatusBadge, fmtTime, humanize } from "@/components/ui";

const STEPS: [string, string, string][] = [
  ["discover", "Discover", "Run enabled searches (SerpAPI within today's credit budget + free sources)."],
  ["score", "Score", "Prefilter new finds, then LLM-score the rest against your profile."],
  ["enrich", "Find emails", "Crawl websites of qualified matches for a reachable inbox."],
  ["draft", "Write emails", "Draft applications/pitches to keep ~1.5 days of emails ready to send."],
  ["followups", "Follow-ups", "Draft one follow-up for unanswered emails after N days."],
];
const LABEL: Record<string, string> = { daily: "Full pipeline", ...Object.fromEntries(STEPS.map(([k, l]) => [k, l])) };

export default function RunsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: getRuns,
    refetchInterval: (q) => (q.state.data?.running ? 3_000 : 20_000),
  });
  const start = useMutation({
    mutationFn: (kind: string) => startRun(kind),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
  const blocked = !!data?.running || start.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Runs" sub="Run the pipeline (or one step) on demand. It never sends — drafts wait in the Outbox until you press Send." />

      {data?.running && (
        <Notice tone="good" icon="activity">
          A run is in progress — this page updates live. New buttons unlock when it finishes.
        </Notice>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-fg">Full pipeline</div>
            <div className="mt-1 text-sm text-subtle">
              All five steps below, in order — the same thing the daily schedule runs.
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            busy={start.isPending && start.variables === "daily"}
            disabled={blocked}
            onClick={() => start.mutate("daily")}
          >
            <Icon name="play" className="h-3.5 w-3.5" /> Run full pipeline
          </Button>
        </div>
        {start.isError && <div className="mt-3"><Msg msg={{ ok: false, text: errorMessage(start.error) }} /></div>}
      </Card>

      <div>
        <Label className="mb-3">Or run one step</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {STEPS.map(([kind, label, hint], i) => (
            <Card key={kind} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-fg">{label}</span>
              </div>
              <div className="flex-1 text-xs leading-relaxed text-subtle">{hint}</div>
              <Button size="sm" busy={start.isPending && start.variables === kind} disabled={blocked} onClick={() => start.mutate(kind)}>
                Run
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-3">History</Label>
        <Card className="divide-y divide-line">
          {isLoading && <div className="p-5"><Spinner /></div>}
          {data && data.items.length === 0 && <Empty icon="activity">No runs yet.</Empty>}
          {data?.items.map((r) => <RunItem key={r.id} r={r} />)}
        </Card>
      </div>
    </div>
  );
}

function RunItem({ r }: { r: RunRow }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xs tabular-nums text-faint">#{r.id}</span>
        <span className="font-medium text-fg">{LABEL[r.kind] || r.kind}</span>
        <StatusBadge status={r.status} />
        <span className="text-xs text-subtle">{r.trigger}</span>
        <span className="ml-auto text-xs text-subtle">
          {fmtTime(r.started_at)}
          {r.finished_at && ` → ${fmtTime(r.finished_at)}`}
        </span>
      </div>
      {Object.keys(r.stats).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
          {Object.entries(r.stats).map(([step, s]) => (
            <div key={step} className="rounded-lg bg-surface-2 px-2.5 py-1.5">
              <span className="font-medium text-fg-2">{LABEL[step] || step}: </span>
              <span className="text-muted">
                {Object.entries(s)
                  .filter(([k]) => k !== "first_error")
                  .map(([k, v]) => `${humanize(k)} ${v}`)
                  .join(" · ")}
              </span>
              {s.first_error && <div className="mt-0.5 text-bad">{String(s.first_error)}</div>}
            </div>
          ))}
        </div>
      )}
      {r.notes && <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-subtle">{r.notes}</pre>}
    </div>
  );
}
