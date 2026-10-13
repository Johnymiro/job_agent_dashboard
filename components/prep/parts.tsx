import React from "react";
import type { TestResult } from "@/lib/prep/runners";
import type { Question } from "@/lib/prep/types";

export const LETTERS = "ABCDEFGH";
export const pad = (n: number) => String(n).padStart(2, "0");
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
};
export const dur = (secs: number) =>
  secs >= 3600
    ? `${Math.floor(secs / 3600)} h ${Math.round((secs % 3600) / 60)} min`
    : secs >= 60
      ? `${Math.round(secs / 60)} min`
      : `${secs} s`;

/** good at/above target, warn from 50%, bad below; null = no data */
export const levelTone = (pct: number | null, target: number) => (pct == null ? null : pct >= target ? "good" : pct >= 50 ? "warn" : "bad");
export const FILL = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" } as const;
export const TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad" } as const;

// ---- inline text: `code`, **bold**, [links](https://…), blank-line paragraphs ----------
const LINK = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/;

export function Inline({ text }: { text: string }) {
  return (
    <>
      {/* odd indexes are the captured `code` / **bold** / [link](url) tokens */}
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : part.startsWith("[") ? (
          <a
            key={i}
            href={part.match(LINK)![2]}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            {part.match(LINK)![1]}
          </a>
        ) : part.startsWith("`") ? (
          <code
            key={i}
            className="whitespace-break-spaces rounded-sm border border-line bg-surface-2 px-[0.3em] py-px font-mono text-[0.86em]"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <strong key={i} className="font-semibold text-fg">
            {part.slice(2, -2)}
          </strong>
        ),
      )}
    </>
  );
}

export function Paras({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i}>
          <Inline text={p} />
        </p>
      ))}
    </div>
  );
}

// ---- syntax highlighting -----------------------------------------------------------
const KW: Record<"python" | "js" | "sql", Set<string>> = {
  python: new Set(
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(
      " ",
    ),
  ),
  js: new Set(
    "const let var function return if else for while do of in new class extends import export from async await try catch finally throw typeof instanceof null undefined true false this switch case break continue default yield type interface".split(
      " ",
    ),
  ),
  sql: new Set(
    "SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL ON GROUP BY HAVING ORDER AS AND OR NOT NULL IS IN OVER PARTITION ROWS RANGE BETWEEN UNBOUNDED PRECEDING CURRENT ROW DISTINCT LIMIT WITH CASE WHEN THEN ELSE END INSERT UPDATE DELETE MERGE INTO VALUES SET COUNT SUM".split(
      " ",
    ),
  ),
};
// groups: 1 comment, 2 string, 3 number, 4 identifier
const RX = {
  python:
    /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfu]?"(?:\\.|[^"\\\n])*"|[rbfu]?'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_]\w*)/g,
  js: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g,
  sql: /(--[^\n]*)|('(?:''|[^'])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g,
};

const GRAMMAR: Record<string, keyof typeof RX> = { python: "python", py: "python", js: "js", jsx: "js", ts: "js", tsx: "js", sql: "sql" };

function highlight(src: string, lang: string) {
  const key = GRAMMAR[lang];
  if (!key) return [src]; // bash, text, json…: plain
  const re = new RegExp(RX[key].source, "g");
  const kw = KW[key];
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const k = out.length;
    if (m[1])
      out.push(
        <span key={k} className="italic text-subtle">
          {m[1]}
        </span>,
      );
    else if (m[2])
      out.push(
        <span key={k} className="text-good">
          {m[2]}
        </span>,
      );
    else if (m[3])
      out.push(
        <span key={k} className="text-info">
          {m[3]}
        </span>,
      );
    else if (kw.has(key === "sql" ? m[4].toUpperCase() : m[4]))
      out.push(
        <span key={k} className="font-medium text-warn">
          {m[4]}
        </span>,
      );
    else if (src[re.lastIndex] === "(")
      out.push(
        <span key={k} className="text-iris">
          {m[4]}
        </span>,
      );
    else out.push(m[4]);
    last = re.lastIndex;
  }
  out.push(src.slice(last));
  return out;
}

/** Highlighted code; `flush` drops the outer border (inside <details>). */
export function CodeBlock({ src, lang, flush = false }: { src: string; lang: string; flush?: boolean }) {
  return (
    <div className={`relative ${flush ? "" : "mt-4"}`}>
      <span className="pointer-events-none absolute right-3 top-2 font-mono text-[10.5px] text-subtle">{lang}</span>
      <pre
        className={`overflow-x-auto bg-surface-2/60 px-4 py-3.5 font-mono text-[13px] leading-[1.6] text-fg [tab-size:4] ${
          flush ? "border-t border-line" : "border border-line"
        }`}
      >
        <code>{highlight(src, lang)}</code>
      </pre>
    </div>
  );
}

export function Reveal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mt-4 border border-line">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm font-medium text-fg-2 hover:text-fg">{label}</summary>
      {children}
    </details>
  );
}

// ---- answer options ------------------------------------------------------------------
/** Bubble + text per option, in `order` (shuffled indexes into q.opts).
 *  Clickable until `show`, which marks the right and wrong answers. */
export function Options({
  q,
  order,
  sel,
  show,
  onChoose,
  compact = false,
}: {
  q: Question;
  order: number[];
  sel: number[];
  show: boolean;
  onChoose?: (oi: number) => void;
  compact?: boolean;
}) {
  const multi = q.type === "multi";
  return (
    <div
      className={`flex max-w-[78ch] flex-col gap-2 ${compact ? "mt-3" : "mt-6"}`}
      role={multi ? "group" : "radiogroup"}
      aria-label="Answer options"
    >
      {order.map((oi, pos) => {
        const on = sel.includes(oi);
        const right = show && q.a.includes(oi);
        const wrong = show && on && !right;
        const box = right
          ? "border-good/60 bg-good/10"
          : wrong
            ? "border-bad/60 bg-bad/10"
            : on
              ? "border-fg bg-surface"
              : `border-line bg-surface ${show ? "" : "hover:border-accent/60 hover:bg-accent/5"}`;
        const bub = right
          ? "border-good bg-good text-bg"
          : wrong
            ? "border-bad bg-bad text-bg"
            : on
              ? "border-fg bg-fg text-bg"
              : "border-accent/60 text-accent";
        return (
          <button
            key={oi}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            data-opt={oi}
            disabled={show}
            onClick={() => onChoose?.(oi)}
            className={`grid w-full grid-cols-[28px_minmax(0,1fr)] items-start gap-3 border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default ${
              compact ? "px-3 py-2" : "px-3.5 py-2.5"
            } ${box}`}
          >
            <span
              className={`grid place-items-center border font-semibold transition-colors ${multi ? "rounded-[3px]" : "rounded-full"} ${
                compact ? "h-[22px] w-[22px] text-[11px]" : "h-[26px] w-[26px] text-xs"
              } ${bub}`}
            >
              {LETTERS[pos]}
            </span>
            <span className={`min-w-0 pt-0.5 leading-relaxed text-fg [overflow-wrap:anywhere] ${compact ? "text-sm" : "text-[15px]"}`}>
              <Inline text={q.opts[oi]} />
              {(right || wrong) && (
                <span className={`mt-1 block font-mono text-[11px] uppercase tracking-wider ${right ? "text-good" : "text-bad"}`}>
                  {right ? (on ? "your answer · correct" : "correct answer") : "your answer"}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Right / wrong banner with the explanation, after a question is checked. */
export function Verdict({ ok, exp }: { ok: boolean; exp: string }) {
  return (
    <div role="status" className={`mt-5 max-w-[78ch] border bg-surface-2/40 px-4 py-3.5 ${ok ? "border-good/50" : "border-bad/50"}`}>
      <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${ok ? "text-good" : "text-bad"}`}>
        {ok ? "Correct" : "Not quite"}
      </div>
      <Paras text={exp} className="mt-1.5 text-[15px] leading-relaxed text-fg-2" />
    </div>
  );
}

export const isCorrect = (q: Question, sel: number[]) => sel.length === q.a.length && q.a.every((x) => sel.includes(x));

// ---- coding test results ----------------------------------------------------------------
const showVal = (v: string | undefined) => (v == null ? "" : v.replace(/"__undefined__"/g, "undefined"));

export function TestList({ tests }: { tests: TestResult[] }) {
  return (
    <ul className="mt-3 divide-y divide-line border border-line">
      {tests.map((t, k) => (
        <li key={k} className="grid grid-cols-[12px_minmax(0,1fr)] gap-2.5 px-3 py-2 text-sm">
          <span className={`mt-[7px] h-2 w-2 rounded-full ${t.passed ? "bg-good" : "bg-bad"}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className="font-medium text-fg">{t.name}</span>
            {t.passed ? (
              <span className="sr-only"> passed</span>
            ) : (
              <span className="mt-1 block whitespace-pre-wrap font-mono text-xs text-muted [overflow-wrap:anywhere]">
                {t.expr + "\n" + (t.error ? t.error : `expected ${showVal(t.expected)}\n     got ${showVal(t.actual)}`)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto whitespace-pre-wrap border border-bad/40 bg-bad/5 px-3.5 py-3 font-mono text-xs leading-relaxed text-fg [overflow-wrap:anywhere]">
      {children}
    </div>
  );
}

export function LogBox({ logs }: { logs: string }) {
  return (
    <div className="mt-3 overflow-x-auto whitespace-pre-wrap border border-line bg-surface-2/60 px-3.5 py-3 font-mono text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">
      <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.14em] text-subtle">Output</div>
      {logs}
    </div>
  );
}

/** Python / JavaScript chip. */
export function LangChip({ lang, long = false }: { lang: "python" | "js"; long?: boolean }) {
  return (
    <span className="rounded-sm bg-fg px-1.5 py-px font-mono text-[10.5px] font-medium text-bg">
      {long ? (lang === "python" ? "Python" : "JavaScript") : lang === "python" ? "PY" : "JS"}
    </span>
  );
}
