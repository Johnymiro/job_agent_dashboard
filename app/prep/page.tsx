"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader, Pill } from "@/components/ui";
import { TEXT, levelTone } from "@/components/prep/parts";
import { PREP_TESTS, type PrepTest } from "@/lib/prep";
import { type QStats, type Summary, bankFor, load, pendingSession } from "@/lib/prep/engine";

export default function PrepPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Test prep"
        sub="Practice simulators for technical tests you've been invited to: timed mock exams, topic drills and a coding lab with real tests. Progress is kept in this browser."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {PREP_TESTS.map((t) => (
          <TestCard key={t.slug} test={t} />
        ))}
        <div className="flex flex-col justify-center gap-2 border border-dashed border-line px-5 py-6 text-sm text-subtle sm:px-6">
          <span className="flex items-center gap-2 font-medium text-muted">
            <Icon name="plus" className="h-3.5 w-3.5" /> Got another test?
          </span>
          <span>
            Add <code className="font-mono text-xs text-fg-2">lib/prep/tests/&lt;slug&gt;.ts</code> exporting a{" "}
            <code className="font-mono text-xs text-fg-2">PrepTest</code>, then list it in{" "}
            <code className="font-mono text-xs text-fg-2">lib/prep/index.ts</code>. It gets its own page here.
          </span>
        </div>
      </div>
    </div>
  );
}

function TestCard({ test }: { test: PrepTest }) {
  const hist = load<Summary[]>(test.slug, "history", []);
  const st = load<QStats>(test.slug, "qstats", {});
  const seen = test.questions.filter((q) => st[q.id]).length;
  const mocks = hist.filter((h) => h.mode === "mock");
  const bestMock = mocks.length ? Math.max(...mocks.map((h) => h.pct)) : null;
  const last = hist[0];
  const pending = pendingSession(bankFor(test));

  const stat = (label: string, value: React.ReactNode, cls = "text-fg") => (
    <div>
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">{label}</dt>
      <dd className={`mt-0.5 font-mono text-[15px] font-medium tabular-nums ${cls}`}>{value}</dd>
    </div>
  );
  const tone = (pct: number) => TEXT[levelTone(pct, test.target)!];

  return (
    <Link
      href={`/prep/${test.slug}`}
      className="panel group flex flex-col gap-4 border border-line bg-surface p-5 transition-colors hover:border-faint sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{test.company}</div>
          <div className="mt-1.5 text-lg font-semibold tracking-tight text-fg">{test.title}</div>
          <div className="text-sm text-muted">{test.role}</div>
        </div>
        {pending && <Pill tone="info">in progress</Pill>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {test.sections.map((s) => (
          <span key={s.id} className="border border-line px-1.5 py-px font-mono text-[10.5px] text-muted">
            {s.tag}
          </span>
        ))}
        {test.tasks.length > 0 && <span className="border border-line px-1.5 py-px font-mono text-[10.5px] text-muted">CODE</span>}
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        {stat("seen", `${seen}/${test.questions.length}`)}
        {stat("last", last ? `${last.pct}%` : "—", last ? tone(last.pct) : "text-faint")}
        {stat("best mock", bestMock == null ? "—" : `${bestMock}%`, bestMock == null ? "text-faint" : tone(bestMock))}
      </dl>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        {pending ? "Resume" : hist.length ? "Continue" : "Start practising"}
        <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
