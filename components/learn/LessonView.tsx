"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { CodeBlock, Inline, Options, Paras, Verdict, isCorrect, pad } from "@/components/prep/parts";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import { practiceSlug } from "@/lib/learn/practice";
import type { Subject } from "@/lib/learn/subjects";
import type { Block, Lesson, LessonMeta } from "@/lib/learn/types";
import { load, recordQ, save, shuffle } from "@/lib/prep/engine";
import type { Question } from "@/lib/prep/types";
import { Blocks } from "./Blocks";
import { READING_FONTS, READING_SIZES, ReadingPanel, useReading } from "./reading";

type Near = Pick<LessonMeta, "id" | "n" | "title"> | null;
export type Learned = Record<string, number>;

/** /prep/learn/<subject>/<lesson>: the lesson, its quick checks, and prev / next. */
export function LessonView({
  subject,
  lesson,
  prev,
  next,
  total,
}: {
  subject: Subject;
  lesson: Lesson;
  prev: Near;
  next: Near;
  total: number;
}) {
  const slug = practiceSlug(subject.slug);
  const base = `/prep/learn/${subject.slug}`;
  const [learned, setLearned] = useState(() => !!load<Learned>(slug, "learned", {})[lesson.id]);
  const toggle = () => {
    const marks = load<Learned>(slug, "learned", {});
    if (learned) delete marks[lesson.id];
    else marks[lesson.id] = Date.now();
    save(slug, "learned", marks);
    setLearned(!learned);
  };
  const [reading, setReading] = useReading();
  const [readingOpen, setReadingOpen] = useState(false);
  const font = READING_FONTS[reading.font];
  const toc = lesson.blocks.filter((b): b is Extract<Block, { t: "h2" }> => b.t === "h2");
  const checks = lesson.checks;

  const learnedButton = (
    <Button variant={learned ? "ghost" : "primary"} onClick={toggle} aria-pressed={learned} className={learned ? "text-good!" : ""}>
      <Icon name={learned ? "check" : "circle"} className="h-3.5 w-3.5" />
      {learned ? "Learned" : "Mark as learned"}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={lesson.title}
        trail={[
          { href: "/prep", label: "test prep" },
          { href: base, label: subject.name.toLowerCase() },
        ]}
        sub={lesson.summary}
      >
        {learnedButton}
      </PageHeader>
      <div className="-mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-subtle">
        <span>
          lesson {pad(lesson.n)} of {pad(total)}
        </span>
        <span className="text-faint">·</span>
        <span>{lesson.level}</span>
        <span className="text-faint">·</span>
        <span>~{lesson.minutes} min read</span>
        {checks.length > 0 && (
          <>
            <span className="text-faint">·</span>
            <a href="#quick-check" className="hover:text-fg">
              {checks.length} quick checks
            </a>
          </>
        )}
        <button
          onClick={() => setReadingOpen(!readingOpen)}
          aria-expanded={readingOpen}
          className={`ml-auto inline-flex items-center gap-1.5 border px-2 py-1 transition-colors hover:text-fg ${
            readingOpen ? "border-accent/50 text-accent" : "border-line"
          }`}
        >
          <span className="font-sans text-[13px] font-semibold leading-none">Aa</span> text
        </button>
      </div>
      {readingOpen && <ReadingPanel reading={reading} onChange={setReading} />}

      {/* the reading column is sized in the chosen font, so lines stay near 68 characters whatever the font and size */}
      <div
        className={`grid items-start gap-10 xl:grid-cols-[minmax(0,var(--measure))_220px] ${READING_SIZES[reading.size].cls}`}
        style={{ fontFamily: font.css, "--measure": `calc(${font.measure} + 4rem)` } as React.CSSProperties}
      >
        <div className="min-w-0 max-w-[var(--measure)] xl:max-w-none">
          <Card className="px-5 py-6 sm:px-8 sm:py-8">
            <article>
              <Blocks blocks={lesson.blocks} />
            </article>
          </Card>

          {checks.length > 0 && (
            <section id="quick-check" className="mt-8 scroll-mt-20">
              <Label>Quick check</Label>
              <p className="mt-1.5 text-sm text-muted">
                Pick an answer, then check it. Your results feed the {subject.name} review, which brings missed questions back first.
              </p>
              <div className="mt-4 space-y-4">
                {checks.map((q, k) => (
                  <QuickCheck key={q.id} q={q} n={k + 1} total={checks.length} slug={slug} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <span className="text-sm text-muted">
              {learned
                ? "Marked as learned. It shows as done on the subject page."
                : "Comfortable with this one? Mark it, and the subject page tracks it."}
            </span>
            {learnedButton}
          </div>
          <nav aria-label="Lessons" className="mt-4 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`${base}/${prev.id}`}
                className="panel group border border-line bg-surface p-4 transition-colors hover:border-faint"
              >
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                  <Icon name="arrowLeft" className="h-3 w-3" /> previous · {pad(prev.n)}
                </span>
                <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">{prev.title}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Link
              href={next ? `${base}/${next.id}` : base}
              className="panel group border border-line bg-surface p-4 text-right transition-colors hover:border-faint"
            >
              <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] text-subtle">
                {next ? `next · ${pad(next.n)}` : "that was the last lesson"} <Icon name="arrowRight" className="h-3 w-3" />
              </span>
              <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">
                {next ? next.title : `All ${subject.name} lessons`}
              </span>
            </Link>
          </nav>
        </div>

        <aside className="hidden xl:sticky xl:top-8 xl:block">
          <Label>On this page</Label>
          <ul className="mt-3 space-y-0.5 border-l border-line">
            {toc.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="-ml-px block border-l border-transparent py-1 pl-3 text-[13px] leading-snug text-muted transition-colors hover:border-accent hover:text-fg"
                >
                  <Inline text={h.text} />
                </a>
              </li>
            ))}
            {checks.length > 0 && (
              <li>
                <a
                  href="#quick-check"
                  className="-ml-px block border-l border-transparent py-1 pl-3 text-[13px] leading-snug text-accent transition-colors hover:border-accent"
                >
                  Quick check
                </a>
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** One question with instant feedback; the result goes into the subject's per-question record. */
function QuickCheck({ q, n, total, slug }: { q: Question; n: number; total: number; slug: string }) {
  const [order, setOrder] = useState(() => shuffle(q.opts.map((_, i) => i)));
  const [sel, setSel] = useState<number[]>([]);
  const [shown, setShown] = useState(false);
  const ok = isCorrect(q, sel);

  const choose = (oi: number) =>
    setSel((prev) => (q.type === "multi" ? (prev.includes(oi) ? prev.filter((x) => x !== oi) : [...prev, oi]) : [oi]));
  const check = () => {
    recordQ(slug, q.id, ok);
    setShown(true);
  };
  const retry = () => {
    setOrder(shuffle(order));
    setSel([]);
    setShown(false);
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-2 font-mono text-[11px] text-subtle">
        <span>
          check {n} of {total}
        </span>
        {q.type === "multi" && <span>select all that apply</span>}
      </div>
      <Paras text={q.q} className="mt-2 text-base leading-relaxed text-fg" />
      {q.code && <CodeBlock src={q.code.src} lang={q.code.lang} />}
      <Options q={q} order={order} sel={sel} show={shown} onChoose={choose} compact />
      {shown ? (
        <>
          <Verdict ok={ok} exp={q.exp} />
          <Button size="sm" variant="subtle" className="mt-3" onClick={retry}>
            Try again
          </Button>
        </>
      ) : (
        <Button size="sm" variant="primary" className="mt-4" disabled={!sel.length} onClick={check}>
          Check
        </Button>
      )}
    </Card>
  );
}
