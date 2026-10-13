"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { pad } from "@/components/prep/parts";
import { AttemptsTable, type HomeProps, ResumeNotice } from "@/components/prep/PrepHome";
import { Simulator } from "@/components/prep/Simulator";
import { Bar, Button, Card, Cells, PageHeader, PanelTitle, Pill, buttonClass } from "@/components/ui";
import { practiceTest } from "@/lib/learn/practice";
import type { Subject } from "@/lib/learn/subjects";
import type { LessonMeta, Level } from "@/lib/learn/types";
import { type QStats, type Summary, bankFor, load, pendingSession } from "@/lib/prep/engine";
import type { Learned } from "./LessonView";

/** /prep/learn/<subject>: lessons plus a review of their quick checks (run by the test simulator). */
export function SubjectPage({ subject, lessons }: { subject: Subject; lessons: LessonMeta[] }) {
  const bank = useMemo(() => bankFor(practiceTest(subject, lessons)), [subject, lessons]);
  return <Simulator bank={bank} renderHome={(p) => <SubjectHome {...p} subject={subject} lessons={lessons} />} />;
}

const LEVEL_TONE: Record<Level, "neutral" | "info" | "plum"> = { core: "neutral", intermediate: "info", advanced: "plum" };

function SubjectHome({
  bank,
  onStart,
  onResume,
  onDiscard,
  onClearHistory,
  subject,
  lessons,
}: HomeProps & { subject: Subject; lessons: LessonMeta[] }) {
  const slug = bank.test.slug;
  const base = `/prep/learn/${subject.slug}`;
  const st = load<QStats>(slug, "qstats", {});
  const learned = load<Learned>(slug, "learned", {});
  const hist = load<Summary[]>(slug, "history", []);
  const pend = pendingSession(bank);

  const done = lessons.filter((l) => learned[l.id]).length;
  const next = lessons.find((l) => !learned[l.id]);
  const qs = bank.test.questions;
  const seen = qs.filter((q) => st[q.id]).length;
  const right = qs.filter((q) => st[q.id]?.last).length;
  const reviewN = Math.min(bank.test.review?.count ?? 10, qs.length);
  const minutes = lessons.reduce((m, l) => m + l.minutes, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={subject.name} trail={[{ href: "/prep", label: "test prep" }]} sub={subject.blurb}>
        {next ? (
          <Link href={`${base}/${next.id}`} className={buttonClass("primary", "md")}>
            {done ? "Continue" : "Start"}: {next.title} <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <Pill tone="good">every lesson learned</Pill>
        )}
      </PageHeader>

      {pend && <ResumeNotice bank={bank} pend={pend} onResume={onResume} onDiscard={onDiscard} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <PanelTitle index="01">Progress</PanelTitle>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">lessons learned</div>
              <div className="mt-1 font-mono text-3xl font-medium tabular-nums text-fg">
                {done}
                <span className="text-xl text-faint">/{lessons.length}</span>
              </div>
              <Cells total={lessons.length} filled={done} className="mt-3 h-3" />
            </div>
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">quick checks right</div>
              <div className="mt-1 font-mono text-3xl font-medium tabular-nums text-fg">
                {right}
                <span className="text-xl text-faint">/{qs.length}</span>
              </div>
              <div className="mt-4">
                <Bar value={right} max={qs.length} />
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-subtle">
            A check counts as right if your latest answer was.{" "}
            {seen - right === 1
              ? "1 needs another go; the review starts with it."
              : seen - right > 1
                ? `${seen - right} need another go; the review starts with them.`
                : ""}
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-5 sm:p-6">
          <PanelTitle index="02">Quick review</PanelTitle>
          <p className="text-sm leading-relaxed text-muted">
            {`${reviewN} questions from across the lessons, untimed, with the answer and explanation after each one. Missed questions come first, then ones you haven't seen. A few minutes a day keeps it sharp.`}
          </p>
          <Button variant="primary" className="mt-auto self-start" disabled={!qs.length} onClick={() => onStart("review")}>
            Start review
          </Button>
        </Card>
      </div>

      <div>
        <PanelTitle
          index="03"
          className="mb-3"
          aside={
            <span className="text-xs text-subtle">
              {lessons.length} lessons · about {Math.round(minutes / 5) * 5} min of reading
            </span>
          }
        >
          Lessons
        </PanelTitle>
        <Card className="divide-y divide-line">
          {lessons.map((l) => {
            const answered = l.checks.filter((q) => st[q.id]);
            const ok = l.checks.filter((q) => st[q.id]?.last).length;
            return (
              <Link
                key={l.id}
                href={`${base}/${l.id}`}
                className="group grid grid-cols-[28px_minmax(0,1fr)_20px] items-center gap-x-4 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:grid-cols-[32px_minmax(0,1fr)_104px_92px_20px]"
              >
                <span className="font-mono text-xs text-subtle">{pad(l.n)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg group-hover:text-accent">{l.title}</span>
                  <span className="block text-xs leading-relaxed text-subtle">{l.summary}</span>
                </span>
                <span className="hidden sm:block">
                  <Pill tone={LEVEL_TONE[l.level]}>{l.level}</Pill>
                </span>
                <span className="hidden font-mono text-[11px] text-muted sm:block">
                  {answered.length ? `${ok}/${l.checks.length} checks` : `~${l.minutes} min`}
                </span>
                <span
                  className={learned[l.id] ? "text-good" : "text-faint"}
                  title={learned[l.id] ? "Learned" : "Not marked as learned yet"}
                >
                  <Icon name={learned[l.id] ? "check" : "circle"} className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </Card>
      </div>

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
          Your reviews
        </PanelTitle>
        <AttemptsTable hist={hist} target={bank.test.target} />
      </div>
    </div>
  );
}
