"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Card, Label, Pill } from "@/components/ui";
import {
  type Bank,
  type Session,
  type StoredRun,
  codeTouched,
  feedbackMode,
  grade,
  isAnswered,
  recordQ,
  recordTask,
} from "@/lib/prep/engine";
import { loadPython, pythonReady, runTask } from "@/lib/prep/runners";
import type { TaskLang } from "@/lib/prep/types";
import type { DialogSpec } from "./Dialog";
import { CodeBlock, ErrorBox, LETTERS, LangChip, LogBox, Options, Paras, Reveal, TestList, Verdict, mmss, pad } from "./parts";

const XL = "(min-width: 80rem)";

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="hidden font-mono text-[11px] font-normal opacity-70 sm:inline">{children}</span>;
}

function Bubble({ letter, state, square }: { letter: string; state: "none" | "on" | "ok" | "bad"; square: boolean }) {
  const tone = {
    none: "border-accent/50 text-accent",
    on: "border-fg bg-fg text-bg",
    ok: "border-good bg-good text-bg",
    bad: "border-bad bg-bad text-bg",
  }[state];
  return (
    <i
      className={`grid h-[15px] w-[15px] place-items-center border text-[8.5px] font-semibold not-italic leading-none ${
        square ? "rounded-[2px]" : "rounded-full"
      } ${tone}`}
    >
      {letter}
    </i>
  );
}

export function Exam({
  bank,
  s,
  update,
  ask,
  dialogOpen,
  onFinish,
  onLeave,
}: {
  bank: Bank;
  s: Session;
  /** pure updater over the open session */
  update: (fn: (s: Session) => Session) => void;
  ask: (d: DialogSpec) => void;
  dialogOpen: boolean;
  onFinish: (reason: "submit" | "time") => void;
  onLeave: () => void;
}) {
  const slug = bank.test.slug;
  const fb = feedbackMode(s);
  const n = s.items.length;
  const cur = s.cur;
  const it = s.items[cur];

  const [running, setRunning] = useState<number | false>(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  // exam clock; time running out submits
  useEffect(() => {
    if (!s.ends) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [s.ends]);
  useEffect(() => {
    if (s.ends && now >= s.ends) onFinish("time");
  }, [now, s.ends, onFinish]);

  // warm up the Python runtime while the task is being read
  useEffect(() => {
    if (it.k !== "t" || bank.T[it.id].lang !== "python") return;
    const t = setTimeout(() => loadPython().catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [it, bank]);

  // keep the new item in view after moving
  useEffect(() => {
    const top = topRef.current;
    if (!top) return;
    const y = top.getBoundingClientRect().top + window.scrollY - 84;
    if (window.scrollY > y) window.scrollTo(0, Math.max(0, y));
  }, [cur]);

  const goto = (i: number) => {
    if (i < 0 || i >= n) return;
    update((x) => ({ ...x, cur: i }));
    if (!window.matchMedia(XL).matches) setSheetOpen(false);
  };

  const choose = (oi: number) => {
    if (it.k !== "q" || s.checked[cur]) return;
    const prev = s.ans[cur] || [];
    const sel = bank.Q[it.id].type === "multi" ? (prev.includes(oi) ? prev.filter((x) => x !== oi) : [...prev, oi]) : [oi];
    update((x) => ({ ...x, ans: { ...x.ans, [cur]: sel } }));
  };

  const check = () => {
    if (it.k !== "q" || s.checked[cur] || !(s.ans[cur] || []).length) return;
    recordQ(slug, it.id, grade(bank, s, cur).correct);
    update((x) => ({ ...x, checked: { ...x.checked, [cur]: true } }));
    // the options get disabled, so move focus to Next
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-fwd]")?.focus({ preventScroll: true }));
  };

  const toggleFlag = () => update((x) => ({ ...x, flags: { ...x.flags, [x.cur]: !x.flags[x.cur] } }));

  const setCode = (i: number, code: string) => update((x) => ({ ...x, code: { ...x.code, [i]: code } }));

  const runCurrent = async () => {
    if (running !== false || it.k !== "t") return;
    const i = cur;
    const t = bank.T[it.id];
    const code = s.code[i] ?? "";
    setRunning(i);
    // let the spinner paint: Brython runs synchronously on this thread
    await new Promise((r) => setTimeout(r, 40));
    const run: StoredRun = { ...(await runTask(t, code)), code };
    if (run.tests.length) recordTask(slug, t.id, run.tests.filter((x) => x.passed).length, run.tests.length);
    update((x) => (x.started === s.started ? { ...x, runs: { ...x.runs, [i]: run } } : x));
    setRunning(false);
  };

  const resetCode = () =>
    ask({
      title: "Reset your code?",
      body: "This replaces your code for this task with the starter code.",
      confirm: {
        label: "Reset",
        onConfirm: () =>
          update((x) => {
            const item = x.items[x.cur];
            if (item.k !== "t") return x;
            const runs = { ...x.runs };
            delete runs[x.cur];
            return { ...x, code: { ...x.code, [x.cur]: bank.T[item.id].starter }, runs };
          }),
      },
    });

  const answered = s.items.filter((_, i) => isAnswered(bank, s, i)).length;

  const askFinish = () => {
    const unanswered = n - answered;
    const flagged = Object.values(s.flags).filter(Boolean).length;
    const parts = [
      unanswered ? `${unanswered} ${unanswered === 1 ? "item is" : "items are"} still unanswered` : "Every item has an answer",
    ];
    if (flagged) parts.push(`${flagged} flagged for review`);
    const hasCode = s.items.some((x) => x.k === "t");
    ask({
      title: fb ? "Finish this session?" : "Submit your exam?",
      body:
        parts.join(", ") +
        "." +
        (hasCode && !fb ? " Coding tasks are tested when you submit." : "") +
        (s.ends ? " You can't change answers after submitting." : ""),
      cancelLabel: "Keep working",
      confirm: { label: fb ? "Finish" : "Submit", onConfirm: () => onFinish("submit") },
    });
  };

  // keyboard: 1–8 / A–E answer, ←/→ (or P/N) move, F flag, Enter check / next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = ((e.target as HTMLElement | null)?.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select") return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const move = k === "ArrowRight" || k === "n" ? 1 : k === "ArrowLeft" || k === "p" ? -1 : 0;
      if (move) {
        e.preventDefault();
        goto(cur + move);
        return;
      }
      if (k === "f") {
        e.preventDefault();
        toggleFlag();
        return;
      }
      if (it.k !== "q") return;
      if (k === "Enter" && tag !== "button" && tag !== "a" && tag !== "summary") {
        e.preventDefault();
        if (fb && !s.checked[cur]) check();
        else if (cur < n - 1) goto(cur + 1);
        else askFinish();
        return;
      }
      const pos = /^[1-8]$/.test(k) ? +k - 1 : /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      if (pos >= 0 && pos < it.order.length) {
        e.preventDefault();
        choose(it.order[pos]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // ---- strip gauge: time left, or a running score when untimed ----
  let gauge: { label: string; value: string; low?: boolean };
  if (s.ends) {
    const left = s.ends - now;
    gauge = { label: "time left", value: mmss(left), low: left <= 5 * 60_000 };
  } else if (s.mode === "drill" || s.mode === "review") {
    const checked = s.items.map((_, i) => i).filter((i) => s.checked[i]);
    gauge = { label: "correct", value: `${checked.filter((i) => grade(bank, s, i).correct).length}/${checked.length}` };
  } else {
    gauge = { label: "solved", value: `${s.items.filter((_, i) => grade(bank, s, i).correct).length}/${n}` };
  }

  const itemHead = (label: string) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <div className="font-mono text-xs text-subtle">
        item {pad(cur + 1)} of {n} <span className="text-faint">·</span> <span className="text-fg">{label}</span>
      </div>
      <Button
        size="sm"
        aria-pressed={!!s.flags[cur]}
        onClick={toggleFlag}
        className={s.flags[cur] ? "border-warn/50! bg-warn/10! text-warn!" : ""}
      >
        {s.flags[cur] ? "Flagged" : "Flag for review"} <Kbd>F</Kbd>
      </Button>
    </div>
  );

  const nav = () => {
    const last = cur === n - 1;
    const showCheck = fb && it.k === "q" && !s.checked[cur];
    return (
      <nav aria-label="Question navigation" className="mt-8 flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-5">
        <Button disabled={cur === 0} onClick={() => goto(cur - 1)}>
          <Icon name="arrowLeft" className="h-3.5 w-3.5" /> Previous
        </Button>
        <div className="flex flex-wrap gap-2">
          {showCheck && (
            <Button variant="primary" disabled={!(s.ans[cur] || []).length} onClick={check}>
              Check answer <Kbd>Enter</Kbd>
            </Button>
          )}
          {last ? (
            <Button variant={showCheck ? "ghost" : "primary"} data-fwd onClick={askFinish}>
              {fb ? "Finish session" : "Review and submit"}
            </Button>
          ) : (
            <Button variant={showCheck ? "ghost" : "primary"} data-fwd onClick={() => goto(cur + 1)}>
              Next <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </nav>
    );
  };

  const questionView = () => {
    if (it.k !== "q") return null;
    const q = bank.Q[it.id];
    const shown = !!s.checked[cur];
    const ok = shown && grade(bank, s, cur).correct;
    return (
      <>
        {itemHead(bank.S[q.s].name)}
        <Paras text={q.q} className="mt-5 max-w-[70ch] text-[17px] leading-relaxed text-fg" />
        {q.code && <CodeBlock src={q.code.src} lang={q.code.lang} />}
        {q.type === "multi" && <p className="mt-3 text-xs font-medium text-subtle">Select all that apply. Scored all-or-nothing.</p>}
        <Options q={q} order={it.order} sel={s.ans[cur] || []} show={shown} onChoose={choose} />
        {shown && <Verdict ok={ok} exp={q.exp} />}
        {nav()}
      </>
    );
  };

  const runOutput = (i: number, lang: TaskLang, total: number) => {
    if (running === i) {
      return (
        <div role="status" className="flex items-center gap-2 text-sm text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
          {lang === "python" && !pythonReady() ? "Loading the Python runtime (first run only, a few seconds)…" : "Running tests…"}
        </div>
      );
    }
    const run = s.runs[i];
    if (!run) {
      return (
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <Pill tone="info">not run yet</Pill>
          <span className="text-xs text-subtle">
            {fb ? "Run as often as you like." : "Run as often as you like. When you submit, your final code is tested and scored."}
          </span>
        </div>
      );
    }
    const passed = run.tests.filter((x) => x.passed).length;
    const of = run.tests.length || total;
    const pill =
      run.error && !run.tests.length ? (
        <Pill tone="bad">error</Pill>
      ) : passed === of ? (
        <Pill tone="good">all tests pass</Pill>
      ) : passed ? (
        <Pill tone="warn">partly passing</Pill>
      ) : (
        <Pill tone="bad">failing</Pill>
      );
    return (
      <>
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {pill}
          <span className="font-mono font-medium tabular-nums text-fg">
            {passed}/{of} tests
          </span>
          {run.code !== s.code[i] && <span className="text-xs text-subtle">Code changed since this run</span>}
        </div>
        {run.error && <ErrorBox>{run.error}</ErrorBox>}
        {run.tests.length > 0 && <TestList tests={run.tests} />}
        {run.logs && <LogBox logs={run.logs} />}
      </>
    );
  };

  const taskView = () => {
    if (it.k !== "t") return null;
    const t = bank.T[it.id];
    return (
      <>
        {itemHead("Coding")}
        <div className="mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-mono text-xs text-subtle">
          <LangChip lang={t.lang} long />
          <span>{t.level}</span>
          <span>~{t.minutes} min</span>
          <span>
            {bank.test.taskPoints} points · {t.tests.length} tests
          </span>
        </div>
        <h2 className="mt-2.5 text-2xl font-semibold tracking-tight text-fg">{t.title}</h2>
        <Paras text={t.prompt} className="mt-3 max-w-[74ch] text-[15.5px] leading-relaxed text-fg-2" />
        <div className="mt-5 border border-line bg-surface-2/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface py-1.5 pl-3 pr-1.5">
            <span className="font-mono text-xs text-muted">{t.lang === "python" ? "solution.py" : "solution.js"}</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="subtle" onClick={resetCode}>
                Reset
              </Button>
              <Button size="sm" variant="primary" disabled={running !== false} onClick={runCurrent}>
                <Icon name="play" className="h-3 w-3" /> Run tests <Kbd>Ctrl ↵</Kbd>
              </Button>
            </div>
          </div>
          <CodeEditor key={cur} value={s.code[cur] ?? ""} lang={t.lang} onChange={(v) => setCode(cur, v)} onRun={runCurrent} />
        </div>
        <p className="mt-2 text-xs text-subtle">
          {t.lang === "python"
            ? "Python runs in this tab on Brython. An infinite loop will freeze the tab. Tab indents; Esc leaves the editor."
            : "Runs as plain JavaScript in a sandboxed worker, so remove TypeScript annotations. Tab indents; Esc leaves the editor."}
        </p>
        <div className="mt-4">{runOutput(cur, t.lang, t.tests.length)}</div>
        {fb && (
          <Reveal label="Reference solution">
            <CodeBlock flush src={t.solution} lang={t.lang} />
          </Reveal>
        )}
        {nav()}
      </>
    );
  };

  return (
    <>
      {/* proctor strip: flush with the top of the page, under the mobile header (and up to the top when it hides) */}
      <div className="sticky top-[57px] z-20 -mx-4 -mt-6 mb-5 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur transition-[top] duration-200 motion-reduce:transition-none header-hidden:top-0 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:-mt-8 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 rounded-sm py-1 pr-1 text-sm text-muted transition-colors hover:text-fg"
          >
            <Icon name="arrowLeft" className="h-3.5 w-3.5" />
            <span className="font-medium">{bank.test.company}</span>
          </button>
          <div className="order-3 min-w-0 flex-[1_1_100%] sm:order-none sm:flex-[1_1_220px]">
            <div className="flex justify-between gap-3 text-xs">
              <span className="truncate text-fg-2">{s.title}</span>
              <span className="shrink-0 font-mono tabular-nums text-subtle">
                {answered}/{n} answered
              </span>
            </div>
            <div className="mt-1.5 h-1 bg-surface-2">
              <div className="h-1 bg-accent transition-[width] duration-300" style={{ width: `${(answered / n) * 100}%` }} />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div
              className={`flex flex-col items-end border px-2.5 py-1 leading-tight ${
                gauge.low ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-fg"
              }`}
            >
              <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${gauge.low ? "text-warn" : "text-subtle"}`}>
                {gauge.label}
              </span>
              <b className="font-mono text-lg font-medium tabular-nums">{gauge.value}</b>
            </div>
            <Button variant="primary" onClick={askFinish} disabled={running !== false}>
              {fb ? "Finish" : "Submit"}
            </Button>
          </div>
        </div>
      </div>

      <div ref={topRef} className="grid items-start gap-5 xl:grid-cols-[212px_minmax(0,1fr)]">
        {/* scrolling lives on the inner box: the panel's corner ticks sit 1px outside and would add scrollbars */}
        <aside aria-label="Answer sheet" className="panel border border-line bg-surface xl:sticky xl:top-20">
          <div className="p-3 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
            <button
              onClick={() => setSheetOpen((o) => !o)}
              aria-expanded={sheetOpen}
              className="flex w-full items-center justify-between xl:hidden"
            >
              <Label>Answer sheet</Label>
              <span className="font-mono text-[11px] text-subtle">
                {answered}/{n} marked {sheetOpen ? "▴" : "▾"}
              </span>
            </button>
            <div className="hidden items-baseline justify-between xl:flex">
              <Label>Answer sheet</Label>
              <span className="font-mono text-[11px] text-subtle">
                {answered}/{n}
              </span>
            </div>
            <div className={`${sheetOpen ? "mt-3 block" : "hidden"} xl:mt-3 xl:block`}>
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-x-2 gap-y-px xl:flex xl:flex-col">
                {s.items.map((item, i) => {
                  let marks: React.ReactNode;
                  if (item.k === "q") {
                    const q = bank.Q[item.id];
                    const sel = s.ans[i] || [];
                    const shown = !!s.checked[i];
                    marks = (
                      <span className="flex gap-[5px]">
                        {item.order.map((oi, pos) => (
                          <Bubble
                            key={oi}
                            letter={LETTERS[pos]}
                            square={q.type === "multi"}
                            state={shown ? (q.a.includes(oi) ? "ok" : sel.includes(oi) ? "bad" : "none") : sel.includes(oi) ? "on" : "none"}
                          />
                        ))}
                      </span>
                    );
                  } else {
                    const run = s.runs[i];
                    marks = (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                        <LangChip lang={bank.T[item.id].lang} />
                        {run?.tests.length
                          ? `${run.tests.filter((x) => x.passed).length}/${run.tests.length} tests`
                          : codeTouched(bank, s, i)
                            ? "edited"
                            : "not started"}
                      </span>
                    );
                  }
                  return (
                    <li key={i}>
                      <button
                        onClick={() => goto(i)}
                        aria-current={i === cur ? "step" : undefined}
                        aria-label={`Item ${i + 1}${s.flags[i] ? ", flagged" : ""}`}
                        className={`grid w-full grid-cols-[22px_minmax(0,1fr)_8px] items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors ${
                          i === cur ? "bg-accent/10 shadow-[inset_2px_0_0_var(--accent)]" : "hover:bg-surface-2"
                        }`}
                      >
                        <span className="font-mono text-[11px] text-muted">{pad(i + 1)}</span>
                        {marks}
                        <span
                          className={`h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent border-l-warn ${s.flags[i] ? "" : "invisible"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-dashed border-line pt-2.5 text-[11px] text-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Bubble letter="A" state="on" square={false} /> marked
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bubble letter="A" state="none" square /> multi-select
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent border-l-warn" /> flagged
                </span>
              </div>
            </div>
          </div>
        </aside>

        <Card className="min-w-0 p-5 sm:p-7 lg:p-9">
          <section aria-live="polite">{it.k === "q" ? questionView() : taskView()}</section>
        </Card>
      </div>
    </>
  );
}

/** Plain textarea with a line-number gutter, Tab indent and auto-indent on Enter. */
function CodeEditor({ value, lang, onChange, onRun }: { value: string; lang: TaskLang; onChange: (v: string) => void; onRun: () => void }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLPreElement>(null);
  const unit = lang === "python" ? "    " : "  ";
  const lines = value.split("\n").length;

  // execCommand keeps the browser's undo stack; setRangeText is the fallback
  const insert = (text: string) => {
    const el = ta.current!;
    el.focus();
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, text);
    } catch {
      ok = false;
    }
    if (!ok) {
      el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    } else if (e.key === "Escape") {
      el.blur();
    } else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      insert(unit);
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent.isComposing) {
      const start = el.selectionStart;
      const line = el.value.slice(el.value.lastIndexOf("\n", start - 1) + 1, start);
      const lead = (line.match(/^[ \t]*/) || [""])[0];
      e.preventDefault();
      insert("\n" + lead + (/[:{[(]\s*$/.test(line) ? unit : ""));
    }
  };

  return (
    <div className="grid max-h-[520px] grid-cols-[auto_minmax(0,1fr)]">
      <pre
        ref={gutter}
        aria-hidden="true"
        className="min-w-[42px] select-none overflow-hidden border-r border-line py-3.5 pl-3 pr-2.5 text-right font-mono text-[13px] leading-[1.6] text-faint"
      >
        {Array.from({ length: lines }, (_, k) => k + 1).join("\n") + "\n"}
      </pre>
      <textarea
        ref={ta}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={() => {
          if (gutter.current && ta.current) gutter.current.scrollTop = ta.current.scrollTop;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        aria-label="Code editor"
        className="block h-[360px] max-h-[520px] min-h-[300px] w-full resize-y overflow-auto whitespace-pre bg-transparent px-4 py-3.5 font-mono text-[13px] leading-[1.6] text-fg outline-none [tab-size:4] focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]"
      />
    </div>
  );
}
