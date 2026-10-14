"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader, PanelTitle, Pill } from "@/components/ui";
import { TEXT, levelTone } from "@/components/prep/parts";
import type { Learned } from "@/components/learn/LessonView";
import { practiceSlug } from "@/lib/learn/practice";
import type { Subject } from "@/lib/learn/subjects";
import { PREP_TESTS, type PrepTest } from "@/lib/prep";
import { type QStats, type Summary, bankFor, load, pendingSession } from "@/lib/prep/engine";

/** What /prep needs to know about a subject (read from its lessons at build time). */
export interface SubjectSummary extends Subject {
  lessons: { id: string; title: string; checks: string[] }[];
}

/** /prep: the test simulators and the subjects to learn, with progress from this browser. */
export function PrepIndex({ subjects }: { subjects: SubjectSummary[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Test prep"
        sub="Simulators for technical tests you've been invited to, and lessons to learn a subject properly and stay sharp. Progress is kept in this browser."
      />
      <PanelTitle index="01">Tests</PanelTitle>
      <div className="-mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

      <PanelTitle index="02" className="pt-2">
        Subjects
      </PanelTitle>
      <div className="-mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {subjects.map((s) => (
          <SubjectCard key={s.slug} subject={s} />
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const slug = practiceSlug(subject.slug);
  const learned = load<Learned>(slug, "learned", {});
  const st = load<QStats>(slug, "qstats", {});
  const checks = subject.lessons.flatMap((l) => l.checks);
  const done = subject.lessons.filter((l) => learned[l.id]).length;
  const right = checks.filter((id) => st[id]?.last).length;
  const next = subject.lessons.find((l) => !learned[l.id]);

  return (
    <Link
      href={`/prep/learn/${subject.slug}`}
      className="panel group flex flex-col gap-4 border border-line bg-surface p-5 transition-colors hover:border-faint sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            <Icon name="book" className="h-3.5 w-3.5" /> subject
          </div>
          <div className="mt-1.5 text-lg font-semibold tracking-tight text-fg">{subject.name}</div>
          <div className="mt-1 text-sm leading-relaxed text-muted">{subject.blurb}</div>
        </div>
        <span className="border border-line px-1.5 py-px font-mono text-[10.5px] text-muted">{subject.tag}</span>
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">learned</dt>
          <dd className="mt-0.5 font-mono text-[15px] font-medium tabular-nums text-fg">
            {done}/{subject.lessons.length}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">checks right</dt>
          <dd className="mt-0.5 font-mono text-[15px] font-medium tabular-nums text-fg">
            {right}/{checks.length}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">next up</dt>
          <dd className="mt-0.5 truncate text-sm text-fg-2" title={next?.title}>
            {next ? next.title : "all done"}
          </dd>
        </div>
      </dl>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        {done ? "Continue learning" : "Start learning"}
        <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function TestCard({ test }: { test: PrepTest }) {
  const hist = load<Summary[]>(test.slug, "history", []);
  const st = load<QStats>(test.slug, "qstats", {});
  const seen = test.questions.filter((q) => st[q.id]).length;
  const mocks = hist.filter((h) => h.mode === "mock");
  const bestMock = mocks.length ? Math.max(...mocks.map((h) => h.pct)) : null;
  const rounds = hist.filter((h) => h.mode === "coderbyte");
  const bestRound = rounds.length ? Math.max(...rounds.map((h) => h.pct)) : null;
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
        {test.coderbyte && <span className="border border-accent/60 px-1.5 py-px font-mono text-[10.5px] text-accent">CODERBYTE</span>}
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        {stat("seen", `${seen}/${test.questions.length}`)}
        {test.coderbyte
          ? stat("best coderbyte", bestRound == null ? "—" : `${bestRound}%`, bestRound == null ? "text-faint" : tone(bestRound))
          : stat("last", last ? `${last.pct}%` : "—", last ? tone(last.pct) : "text-faint")}
        {stat("best mock", bestMock == null ? "—" : `${bestMock}%`, bestMock == null ? "text-faint" : tone(bestMock))}
      </dl>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        {pending ? "Resume" : hist.length ? "Continue" : "Start practising"}
        <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
