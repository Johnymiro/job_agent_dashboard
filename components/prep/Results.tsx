"use client";

import { useState } from "react";
import { Button, Card, PageHeader, PanelTitle, Pill, Tabs } from "@/components/ui";
import { type Bank, type Mode, type Session, type Summary, findRound, grade, integrityLevel, taskPointsFor } from "@/lib/prep/engine";
import { CodeBlock, ErrorBox, FILL, Inline, LangChip, Options, Paras, Reveal, TestList, dur, levelTone, pad } from "./parts";

type Filter = "all" | "wrong" | "flagged" | "code";

export function Results({
  bank,
  r,
  sess,
  onRetryMissed,
  onDrill,
  onNew,
  onHome,
}: {
  bank: Bank;
  r: Summary;
  sess: Session;
  onRetryMissed: () => void;
  onDrill: (section: string) => void;
  onNew: (mode: Mode, round?: string) => void;
  onHome: () => void;
}) {
  const { test } = bank;
  const [filter, setFilter] = useState<Filter>(r.correct < r.n ? "wrong" : "all");

  const band =
    r.pct >= 80
      ? ([
          "good",
          "strong result",
          `Comfortably above the ${test.target}% target. Keep the edge by drilling your weakest section.`,
        ] as const)
      : r.pct >= test.target
        ? (["good", "on target", `At or above the ${test.target}% target. Review the misses below to make it consistent.`] as const)
        : r.pct >= 50
          ? ([
              "warn",
              "close",
              `Below the ${test.target}% target. Go through the misses below, drill the weakest section, then retake.`,
            ] as const)
          : (["bad", "needs work", `Well below the ${test.target}% target. Drill one section at a time, then try again.`] as const);

  const order = [...test.sections.map((x) => x.id), "code"].filter((k) => r.by[k]);
  const weakest = order
    .filter((k) => k !== "code")
    .map((k) => ({ k, pct: r.by[k].e / r.by[k].p }))
    .sort((a, b) => a.pct - b.pct)[0];
  const graded = sess.items.map((_, i) => grade(bank, sess, i));
  const missedQs = sess.items.filter((it, i) => it.k === "q" && !graded[i].correct).length;

  const counts: Record<Filter, number> = {
    all: sess.items.length,
    wrong: graded.filter((g) => !g.correct).length,
    flagged: sess.items.filter((_, i) => sess.flags[i]).length,
    code: sess.items.filter((it) => it.k === "t").length,
  };
  const keep = (i: number) =>
    filter === "wrong" ? !graded[i].correct : filter === "flagged" ? !!sess.flags[i] : filter === "code" ? sess.items[i].k === "t" : true;
  const tabs = (
    [
      ["all", "All"],
      ["wrong", "Missed"],
      ["flagged", "Flagged"],
      ["code", "Coding"],
    ] as const
  )
    .filter(([k]) => k === "all" || counts[k])
    .map(([value, label]) => ({ value, label, count: counts[value] }));
  const again = r.mode === "sprint" || r.mode === "review" ? r.mode : "mock";
  const round = r.mode === "coderbyte" ? findRound(test, r.round) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={test.company}
        trail={[{ href: "/prep", label: "test prep" }]}
        sub={
          <>
            {r.title} · results{r.reason === "time" && <span className="text-warn"> · time ran out</span>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <PanelTitle index="01">Score</PanelTitle>
          <div className="font-mono text-7xl font-medium leading-none tracking-tight tabular-nums text-fg">
            {r.pct}
            <span className="ml-1 text-3xl text-subtle">%</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
            <Pill tone={band[0]}>{band[1]}</Pill>
            <span>
              <b className="font-mono font-medium text-fg">
                {r.earned}/{r.possible}
              </b>{" "}
              points
            </span>
            <span>
              <b className="font-mono font-medium text-fg">
                {r.correct}/{r.n}
              </b>{" "}
              fully correct
            </span>
            <span>
              <b className="font-mono font-medium text-fg">{dur(r.secs)}</b> used
            </span>
          </div>
          <p className="max-w-[48ch] text-sm text-muted">{band[2]}</p>
          {r.mode === "coderbyte" && <IntegrityReport r={r} />}
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {missedQs > 0 && (
              <Button variant="primary" onClick={onRetryMissed}>
                Retry the {missedQs} missed
              </Button>
            )}
            {weakest && r.mode !== "drill" && <Button onClick={() => onDrill(weakest.k)}>Drill {bank.S[weakest.k].name}</Button>}
            {round ? (
              <Button onClick={() => onNew("coderbyte", round.id)}>New {round.name}</Button>
            ) : (
              test[again] && <Button onClick={() => onNew(again)}>New {again === "mock" ? "mock exam" : again}</Button>
            )}
            <Button variant="subtle" onClick={onHome}>
              Back to {test.company}
            </Button>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <PanelTitle index="02" aside={<span className="font-mono text-[11px] text-subtle">dashed line · {test.target}% target</span>}>
            By section
          </PanelTitle>
          <div className="mt-3 divide-y divide-line">
            {order.map((k) => {
              const b = r.by[k];
              const pct = b.p ? Math.round((b.e / b.p) * 100) : 0;
              const name = k === "code" ? (round ? "Challenges" : "Coding tasks") : bank.S[k].name;
              const tone = levelTone(b.p ? pct : null, test.target);
              return (
                <div
                  key={k}
                  className="grid grid-cols-[minmax(0,104px)_minmax(0,1fr)_76px] items-center gap-3 py-2.5 text-sm sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_92px]"
                >
                  <span className="truncate text-fg-2">{name}</span>
                  <span className="relative h-2.5 bg-surface-2" role="img" aria-label={`${name} ${pct}%`}>
                    {tone && <span className={`block h-full ${FILL[tone]}`} style={{ width: `${pct}%` }} />}
                    <span
                      className="absolute -inset-y-0.5 border-l-[1.5px] border-dashed border-subtle"
                      style={{ left: `${test.target}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs tabular-nums text-muted">
                    {k === "code" ? (b.p ? `${b.e}/${b.p} pts` : "not scored") : `${b.c}/${b.n} · ${pct}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div>
        <PanelTitle index="03" className="mb-3">
          Review
        </PanelTitle>
        <Tabs value={filter} onChange={setFilter} options={tabs} className="mb-3" />
        <div className="space-y-3">
          {sess.items.some((_, i) => keep(i)) ? (
            sess.items.map((_, i) => (keep(i) ? <ReviewItem key={i} bank={bank} sess={sess} i={i} /> : null))
          ) : (
            <p className="py-6 text-sm text-subtle">Nothing in this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ bank, sess, i }: { bank: Bank; sess: Session; i: number }) {
  const it = sess.items[i];
  const g = grade(bank, sess, i);
  const flagged = sess.flags[i];
  const edge = g.correct ? "border-l-good" : g.partial ? "border-l-warn" : "border-l-bad";

  if (it.k === "q") {
    const q = bank.Q[it.id];
    return (
      <Card className={`min-w-0 border-l-4 p-4 sm:p-5 ${edge}`}>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-subtle">
          <span className="font-mono font-medium text-fg">{pad(i + 1)}</span>
          <span>{bank.S[q.s].name}</span>
          <Pill tone={g.correct ? "good" : "bad"}>{g.correct ? "correct" : g.answered ? "incorrect" : "unanswered"}</Pill>
          {flagged && <Pill tone="warn">flagged</Pill>}
        </div>
        <Paras text={q.q} className="max-w-[70ch] text-[15.5px] leading-relaxed text-fg" />
        {q.code && <CodeBlock src={q.code.src} lang={q.code.lang} />}
        <Options q={q} order={it.order} sel={sess.ans[i] || []} show compact />
        <p className="mt-3 max-w-[78ch] text-sm leading-relaxed text-fg-2">
          <b className="font-semibold text-fg">Why: </b>
          <Inline text={q.exp} />
        </p>
      </Card>
    );
  }

  const t = bank.T[it.id];
  const run = sess.runs[i];
  const label = g.unscored
    ? "not scored · runner unavailable"
    : !g.answered
      ? "not attempted"
      : run?.tests.length
        ? `${g.passed}/${g.total} tests · ${g.earned}/${taskPointsFor(bank, sess)} pts`
        : "didn't run";
  return (
    <Card className={`min-w-0 border-l-4 p-4 sm:p-5 ${edge}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-subtle">
        <span className="font-mono font-medium text-fg">{pad(i + 1)}</span>
        <span className="inline-flex items-center gap-1.5">
          Coding <LangChip lang={t.lang} />
        </span>
        <Pill tone={g.correct ? "good" : g.partial ? "warn" : "bad"}>{label}</Pill>
        {flagged && <Pill tone="warn">flagged</Pill>}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-fg">{t.title}</h3>
      {run?.error && <ErrorBox>{run.error}</ErrorBox>}
      {run && run.tests.length > 0 && <TestList tests={run.tests} />}
      {g.answered && (
        <Reveal label="Your code">
          <CodeBlock flush src={sess.code[i]} lang={t.lang} />
        </Reveal>
      )}
      <Reveal label="Reference solution">
        <CodeBlock flush src={t.solution} lang={t.lang} />
      </Reveal>
    </Card>
  );
}

/** What Coderbyte's employer report would show for this round. */
function IntegrityReport({ r }: { r: Summary }) {
  const x = r.integrity ?? { pastes: 0, leaves: 0, awayMs: 0 };
  const level = integrityLevel(x);
  const away = Math.round(x.awayMs / 1000);
  return (
    <div className="border border-line bg-surface-2/40 px-3.5 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">integrity</span>
        <Pill tone={level === "not detected" ? "good" : level === "likely" ? "warn" : "bad"}>cheating {level}</Pill>
      </div>
      <p className="mt-1.5 text-muted">
        {x.pastes} paste{x.pastes === 1 ? "" : "s"} from outside the editor · left the tab {x.leaves} time{x.leaves === 1 ? "" : "s"}
        {x.leaves ? ` (${dur(away)} away)` : ""}.{" "}
        {level === "not detected"
          ? "That's the clean report you want."
          : "On Coderbyte the reviewer sees this. Next time type everything in the editor and stay in the tab."}
      </p>
    </div>
  );
}
