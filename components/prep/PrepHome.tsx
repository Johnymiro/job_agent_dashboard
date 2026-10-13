"use client";

import { Button, Card, Notice, PageHeader, PanelTitle } from "@/components/ui";
import {
  type Bank,
  type Mode,
  type QStats,
  type Session,
  type Summary,
  type TaskBest,
  isAnswered,
  load,
  mockShape,
  pendingSession,
} from "@/lib/prep/engine";
import { FILL, LangChip, TEXT, dur, levelTone, mmss } from "./parts";

const LANG = { python: "Python", js: "JavaScript" };

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="flex flex-wrap gap-x-7 gap-y-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">{k}</dt>
          <dd className="font-mono text-[15px] font-medium tabular-nums text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="border border-b-2 border-line bg-surface px-1 font-mono text-[10.5px] text-muted">{children}</kbd>;
}

/** What the simulator hands its start page (tests use PrepHome; subjects have their own). */
export interface HomeProps {
  bank: Bank;
  onStart: (mode: Mode, opt?: { section?: string; start?: number }) => void;
  onResume: () => void;
  onDiscard: () => void;
  onClearHistory: () => void;
}

/** The test's start page. Reads progress from this browser's storage on every render. */
export function PrepHome({ bank, onStart, onResume, onDiscard, onClearHistory }: HomeProps) {
  const { test } = bank;
  const hist = load<Summary[]>(test.slug, "history", []);
  const st = load<QStats>(test.slug, "qstats", {});
  const best = load<TaskBest>(test.slug, "taskbest", {});
  const pend = pendingSession(bank);
  const seen = Object.keys(st).filter((id) => bank.Q[id]).length;
  const mock = mockShape(test);

  // "one Python and one JavaScript coding task"
  const perLang: Record<string, number> = {};
  test.mock?.tasks.forEach((l) => (perLang[l] = (perLang[l] || 0) + 1));
  const taskPhrase = Object.entries(perLang)
    .map(([l, c]) => `${c === 1 ? "one" : c} ${LANG[l as keyof typeof LANG]}`)
    .join(" and ");
  const plural = Object.values(perLang).some((c) => c > 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.company}
        trail={[{ href: "/prep", label: "test prep" }]}
        sub={
          <>
            <span className="font-medium text-fg">{test.title}.</span> {test.summary}
          </>
        }
      />
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {test.sections.map((sec) => (
          <span key={sec.id} className="border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">
            {sec.tag} {test.questions.filter((q) => q.s === sec.id).length}
          </span>
        ))}
        {test.tasks.length > 0 && (
          <span className="border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">CODE {test.tasks.length}</span>
        )}
      </div>

      {pend && <ResumeNotice bank={bank} pend={pend} onResume={onResume} onDiscard={onDiscard} />}

      {(mock || test.sprint) && (
        <div>
          <PanelTitle index="01" className="mb-3">
            Timed practice
          </PanelTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {mock && (
              <Card className="flex flex-col gap-3.5 border-t-2 border-t-accent p-5 sm:p-6">
                <h2 className="text-xl font-semibold tracking-tight text-fg">Full mock exam</h2>
                <Facts
                  items={[
                    ["time", `${mock.minutes} min`],
                    ["items", mock.items],
                    ["points", mock.points],
                  ]}
                />
                <p className="max-w-[52ch] text-sm leading-relaxed text-muted">
                  {test.mock!.perSection} multiple-choice items from each of the {test.sections.length} sections
                  {taskPhrase && ` plus ${taskPhrase} coding task${plural ? "s" : ""}`}, under one clock. No feedback until you submit, like
                  an online assessment. Questions you haven&apos;t seen or missed come first
                  {seen ? ` (${seen} of ${test.questions.length} seen so far)` : ""}.
                </p>
                <Button variant="primary" className="mt-auto self-start" onClick={() => onStart("mock")}>
                  Start mock exam
                </Button>
              </Card>
            )}
            {test.sprint && (
              <Card className="flex flex-col gap-3.5 p-5 sm:p-6">
                <h2 className="text-xl font-semibold tracking-tight text-fg">Sprint</h2>
                <Facts
                  items={[
                    ["time", `${test.sprint.minutes} min`],
                    ["items", Math.min(test.sprint.count, test.questions.length)],
                    ["coding", "none"],
                  ]}
                />
                <p className="max-w-[52ch] text-sm leading-relaxed text-muted">
                  {Math.min(test.sprint.count, test.questions.length)} mixed questions spread across all sections. A quick daily warm-up, or
                  a last check the evening before the test.
                </p>
                <Button className="mt-auto self-start" onClick={() => onStart("sprint")}>
                  Start sprint
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      <div>
        <PanelTitle
          index="02"
          className="mb-3"
          aside={<span className="text-xs text-subtle">Untimed · answer and explanation after each question</span>}
        >
          Topic drills
        </PanelTitle>
        <Card className="divide-y divide-line">
          {test.sections.map((sec) => {
            const qs = test.questions.filter((q) => q.s === sec.id);
            const seenQs = qs.filter((q) => st[q.id]);
            const pct = seenQs.length ? Math.round((seenQs.filter((q) => st[q.id].last).length / seenQs.length) * 100) : null;
            const tone = levelTone(pct, test.target);
            return (
              <div
                key={sec.id}
                className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[48px_minmax(0,1fr)_64px_minmax(130px,200px)_auto]"
              >
                <span className="border border-accent/60 py-0.5 text-center font-mono text-[11px] font-medium text-accent">{sec.tag}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{sec.name}</span>
                  <span className="block text-xs text-subtle">{sec.blurb}</span>
                </span>
                <span className="hidden font-mono text-xs text-muted sm:block">{qs.length} items</span>
                <span
                  className="col-start-2 flex items-center gap-2.5 font-mono text-[11px] text-muted sm:col-start-auto"
                  title="Share of seen questions answered correctly last time"
                >
                  <span className="h-1.5 min-w-10 flex-1 bg-surface-2">
                    {tone && <span className={`block h-full ${FILL[tone]}`} style={{ width: `${pct}%` }} />}
                  </span>
                  <span className="whitespace-nowrap">{pct == null ? "not started" : `${pct}% · ${seenQs.length}/${qs.length} seen`}</span>
                </span>
                <Button
                  size="sm"
                  className="col-start-3 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto"
                  onClick={() => onStart("drill", { section: sec.id })}
                >
                  Drill
                </Button>
              </div>
            );
          })}
        </Card>
      </div>

      {test.tasks.length > 0 && (
        <div>
          <PanelTitle
            index="03"
            className="mb-3"
            aside={<span className="text-xs text-subtle">Untimed · reference solutions included</span>}
          >
            Coding lab
          </PanelTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
            {test.tasks.map((t, idx) => {
              const b = best[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => onStart("lab", { start: idx })}
                  className="panel flex flex-col gap-2 border border-line bg-surface p-4 text-left transition-colors hover:border-accent/60"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] text-subtle">
                    <LangChip lang={t.lang} /> {t.level} · ~{t.minutes} min
                  </span>
                  <span className="text-[15px] font-semibold text-fg">{t.title}</span>
                  <span className={`mt-auto text-xs ${b && b.p === b.t ? "text-good" : "text-subtle"}`}>
                    {b ? `best: ${b.p}/${b.t} tests` : "not attempted"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-subtle">
            Python runs in this tab on Brython (loaded on first run); JavaScript runs in a sandboxed worker.
          </p>
        </div>
      )}

      <div>
        <PanelTitle
          index="04"
          className="mb-3"
          aside={
            hist.length > 0 && (
              <Button size="sm" variant="subtle" onClick={onClearHistory}>
                Clear history
              </Button>
            )
          }
        >
          Your attempts
        </PanelTitle>
        <AttemptsTable hist={hist} target={test.target} />
      </div>

      <footer className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-subtle">
        {test.disclaimer && <p className="max-w-[60ch]">{test.disclaimer}</p>}
        <p className="flex flex-wrap gap-x-3.5 gap-y-1">
          <span>
            <Kbd>1</Kbd>–<Kbd>5</Kbd> or <Kbd>A</Kbd>–<Kbd>E</Kbd> answer
          </span>
          <span>
            <Kbd>←</Kbd> <Kbd>→</Kbd> move
          </span>
          <span>
            <Kbd>F</Kbd> flag
          </span>
          <span>
            <Kbd>Enter</Kbd> check
          </span>
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> run code
          </span>
        </p>
      </footer>
    </div>
  );
}

/** "Unfinished: …" banner with Resume / Discard. */
export function ResumeNotice({
  bank,
  pend,
  onResume,
  onDiscard,
}: {
  bank: Bank;
  pend: Session;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const answered = pend.items.filter((_, i) => isAnswered(bank, pend, i)).length;
  const expired = !!pend.ends && pend.ends <= Date.now();
  return (
    <Notice tone="info" icon="clock">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-[16rem] flex-1">
          <b className="font-medium text-fg">Unfinished: {pend.title}</b> · {answered} of {pend.items.length} answered.
          {pend.ends ? (expired ? " The clock ran out while you were away." : ` ${mmss(pend.ends - Date.now())} left on the clock.`) : ""}
        </span>
        <Button size="sm" variant="primary" onClick={onResume}>
          {expired ? "Submit and see results" : "Resume"}
        </Button>
        <Button size="sm" variant="subtle" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </Notice>
  );
}

/** Past sessions, newest first (12 shown). */
export function AttemptsTable({ hist, target }: { hist: Summary[]; target: number }) {
  return (
    <Card>
      {hist.length === 0 ? (
        <p className="px-5 py-6 text-sm text-subtle">No attempts yet. Scores are kept in this browser only.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                <th className="px-4 py-2.5 font-normal">When</th>
                <th className="px-4 py-2.5 font-normal">Session</th>
                <th className="px-4 py-2.5 font-normal">Score</th>
                <th className="px-4 py-2.5 font-normal">Correct</th>
                <th className="px-4 py-2.5 font-normal">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hist.slice(0, 12).map((h) => {
                const tone = levelTone(h.pct, target);
                return (
                  <tr key={h.at}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                      {new Date(h.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 text-fg">{h.title}</td>
                    <td className={`px-4 py-2.5 font-mono font-medium tabular-nums ${tone ? TEXT[tone] : ""}`}>{h.pct}%</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-muted">
                      {h.correct}/{h.n}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dur(h.secs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
