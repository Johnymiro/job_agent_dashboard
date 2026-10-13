/* Session logic for a prep test: building item lists, grading, scoring and the
   per-test browser storage (history, per-question record, best coding runs). */
import type { RunResult } from "./runners";
import type { CodingTask, PrepSection, PrepTest, Question } from "./types";

export type Mode = "mock" | "sprint" | "drill" | "lab";

export type Item = { k: "q"; id: string; order: number[] } | { k: "t"; id: string };

export interface StoredRun extends RunResult {
  /** the code that produced this run (so we know when it's stale) */
  code: string;
}

export interface Session {
  v: 1;
  mode: Mode;
  section: string | null;
  title: string;
  items: Item[];
  ans: Record<number, number[]>;
  checked: Record<number, boolean>;
  flags: Record<number, boolean>;
  code: Record<number, string>;
  runs: Record<number, StoredRun>;
  cur: number;
  started: number;
  /** epoch ms when time runs out; 0 = untimed */
  ends: number;
  done: boolean;
  finished?: number;
  reason?: "submit" | "time";
}

export interface Grade {
  earned: number;
  possible: number;
  answered: boolean;
  correct: boolean;
  partial?: boolean;
  /** the code runner wasn't available, so the task doesn't count */
  unscored?: boolean;
  passed?: number;
  total?: number;
}

export interface Summary {
  at: number;
  mode: Mode;
  title: string;
  earned: number;
  possible: number;
  pct: number;
  /** per section id (and "code"): earned, possible, items, fully correct */
  by: Record<string, { e: number; p: number; n: number; c: number }>;
  n: number;
  correct: number;
  answered: number;
  secs: number;
  reason: string;
}

/** last = 1 if the most recent answer was right */
export type QStats = Record<string, { n: number; c: number; last: number }>;
export type TaskBest = Record<string, { p: number; t: number }>;

/** A test plus id lookups. */
export interface Bank {
  test: PrepTest;
  Q: Record<string, Question>;
  T: Record<string, CodingTask>;
  S: Record<string, PrepSection>;
}

const banks = new WeakMap<PrepTest, Bank>();
export function bankFor(test: PrepTest): Bank {
  let b = banks.get(test);
  if (!b) {
    b = {
      test,
      Q: Object.fromEntries(test.questions.map((q) => [q.id, q])),
      T: Object.fromEntries(test.tasks.map((t) => [t.id, t])),
      S: Object.fromEntries(test.sections.map((s) => [s.id, s])),
    };
    banks.set(test, b);
  }
  return b;
}

// ---- storage (this browser only) ---------------------------------------------
type StoreName = "session" | "history" | "qstats" | "taskbest";
const key = (slug: string, name: StoreName) => `prep.${slug}.${name}.v1`;

export function load<T>(slug: string, name: StoreName, fallback: T): T {
  try {
    const v = localStorage.getItem(key(slug, name));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function save(slug: string, name: StoreName, value: unknown) {
  try {
    localStorage.setItem(key(slug, name), JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}
export function drop(slug: string, name: StoreName) {
  try {
    localStorage.removeItem(key(slug, name));
  } catch {
    /* storage unavailable */
  }
}

export function recordQ(slug: string, qid: string, correct: boolean) {
  const st = load<QStats>(slug, "qstats", {});
  const r = st[qid] || { n: 0, c: 0, last: 0 };
  st[qid] = { n: r.n + 1, c: r.c + (correct ? 1 : 0), last: correct ? 1 : 0 };
  save(slug, "qstats", st);
}

export function recordTask(slug: string, tid: string, passed: number, total: number) {
  const best = load<TaskBest>(slug, "taskbest", {});
  if (!best[tid] || passed / total > best[tid].p / best[tid].t) {
    best[tid] = { p: passed, t: total };
    save(slug, "taskbest", best);
  }
}

export function clearProgress(slug: string) {
  drop(slug, "history");
  drop(slug, "qstats");
  drop(slug, "taskbest");
}

/** The saved unfinished session, if it still matches this test's items. */
export function pendingSession(bank: Bank): Session | null {
  const s = load<Session | null>(bank.test.slug, "session", null);
  if (!s || s.v !== 1 || s.done || !Array.isArray(s.items)) return null;
  if (!s.items.every((it) => (it.k === "q" ? bank.Q[it.id] : bank.T[it.id]))) return null;
  return s;
}

// ---- building sessions --------------------------------------------------------
export function shuffle<T>(a: T[]): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const qItem = (q: Question): Item => ({ k: "q", id: q.id, order: shuffle(q.opts.map((_, i) => i)) });
const tItem = (t: CodingTask): Item => ({ k: "t", id: t.id });

/** Unseen, then previously missed, then the rest; shuffled within each group. */
function prioritized(slug: string, list: Question[]) {
  const st = load<QStats>(slug, "qstats", {});
  return shuffle(list)
    .map((q) => ({ q, p: !st[q.id] ? 1 : st[q.id].last ? 0 : 2 }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.q);
}

const inSection = (test: PrepTest, sid: string) => test.questions.filter((q) => q.s === sid);

/** Item and point counts of a mock exam (for the start page). */
export function mockShape(test: PrepTest) {
  if (!test.mock) return null;
  const qs = test.sections.reduce((n, s) => n + Math.min(test.mock!.perSection, inSection(test, s.id).length), 0);
  const left: Record<string, number> = {};
  test.tasks.forEach((t) => (left[t.lang] = (left[t.lang] || 0) + 1));
  const tasks = test.mock.tasks.filter((lang) => (left[lang] = (left[lang] || 0) - 1) >= 0).length;
  return { minutes: test.mock.minutes, items: qs + tasks, points: qs + tasks * test.taskPoints, tasks };
}

function buildItems(test: PrepTest, mode: Mode, section?: string): Item[] {
  if (mode === "mock" && test.mock) {
    const qs = shuffle(test.sections.flatMap((s) => prioritized(test.slug, inSection(test, s.id)).slice(0, test.mock!.perSection)));
    const pools: Record<string, CodingTask[]> = {};
    const tasks = test.mock.tasks
      .map((lang) => (pools[lang] ??= shuffle(test.tasks.filter((t) => t.lang === lang))).shift())
      .filter((t): t is CodingTask => !!t);
    return qs.map(qItem).concat(tasks.map(tItem));
  }
  if (mode === "sprint" && test.sprint) {
    const pools = shuffle(test.sections).map((s) => prioritized(test.slug, inSection(test, s.id)));
    const picked: Question[] = [];
    for (let r = 0; picked.length < test.sprint.count && pools.some((p) => p.length); r++) {
      const q = pools[r % pools.length].shift();
      if (q) picked.push(q);
    }
    return shuffle(picked).map(qItem);
  }
  if (mode === "drill" && section) return shuffle(inSection(test, section)).map(qItem);
  return test.tasks.map(tItem);
}

export function newSession(
  bank: Bank,
  mode: Mode,
  opt: { section?: string; items?: Item[]; title?: string; start?: number } = {},
): Session {
  const { test } = bank;
  const items = opt.items || buildItems(test, mode, opt.section);
  const minutes = mode === "mock" ? (test.mock?.minutes ?? 0) : mode === "sprint" ? (test.sprint?.minutes ?? 0) : 0;
  const title =
    opt.title ||
    (mode === "drill"
      ? "Drill · " + bank.S[opt.section!].name
      : mode === "sprint"
        ? `Sprint · ${items.length} questions`
        : mode === "mock"
          ? "Full mock exam"
          : "Coding lab");
  const code: Record<number, string> = {};
  items.forEach((it, i) => {
    if (it.k === "t") code[i] = bank.T[it.id].starter;
  });
  const now = Date.now();
  return {
    v: 1,
    mode,
    section: opt.section || null,
    title,
    items,
    ans: {},
    checked: {},
    flags: {},
    code,
    runs: {},
    cur: opt.start || 0,
    started: now,
    ends: minutes ? now + minutes * 60_000 : 0,
    done: false,
  };
}

// ---- grading ------------------------------------------------------------------
/** Drills and the coding lab show answers as you go; mock and sprint wait for submit. */
export const feedbackMode = (s: Session) => s.mode === "drill" || s.mode === "lab";

export const codeTouched = (bank: Bank, s: Session, i: number) => (s.code[i] || "").trim() !== bank.T[s.items[i].id].starter.trim();

export function isAnswered(bank: Bank, s: Session, i: number) {
  return s.items[i].k === "q" ? (s.ans[i] || []).length > 0 : codeTouched(bank, s, i);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function grade(bank: Bank, s: Session, i: number): Grade {
  const it = s.items[i];
  if (it.k === "q") {
    const q = bank.Q[it.id];
    const sel = s.ans[i] || [];
    const correct = sel.length === q.a.length && q.a.every((x) => sel.includes(x));
    return { earned: correct ? 1 : 0, possible: 1, answered: sel.length > 0, correct };
  }
  const t = bank.T[it.id];
  const pts = bank.test.taskPoints;
  const run = s.runs[i];
  const touched = codeTouched(bank, s, i);
  if (run?.runtimeMissing)
    return { earned: 0, possible: 0, answered: touched, correct: false, unscored: true, passed: 0, total: t.tests.length };
  if (!touched || !run || !run.tests.length)
    return { earned: 0, possible: pts, answered: touched, correct: false, passed: 0, total: t.tests.length };
  const passed = run.tests.filter((x) => x.passed).length;
  return {
    earned: round1((pts * passed) / t.tests.length),
    possible: pts,
    answered: true,
    correct: passed === t.tests.length,
    partial: passed > 0 && passed < t.tests.length,
    passed,
    total: t.tests.length,
  };
}

export function summarize(bank: Bank, s: Session): Summary {
  const by: Summary["by"] = {};
  let earned = 0,
    possible = 0,
    correct = 0,
    answered = 0;
  s.items.forEach((it, i) => {
    const g = grade(bank, s, i);
    const k = it.k === "q" ? bank.Q[it.id].s : "code";
    const b = (by[k] ??= { e: 0, p: 0, n: 0, c: 0 });
    b.e += g.earned;
    b.p += g.possible;
    b.n += 1;
    b.c += g.correct ? 1 : 0;
    earned += g.earned;
    possible += g.possible;
    correct += g.correct ? 1 : 0;
    answered += g.answered ? 1 : 0;
  });
  Object.values(by).forEach((b) => (b.e = round1(b.e)));
  return {
    at: Date.now(),
    mode: s.mode,
    title: s.title,
    earned: round1(earned),
    possible,
    pct: possible ? round1((earned / possible) * 100) : 0,
    by,
    n: s.items.length,
    correct,
    answered,
    secs: Math.round(((s.finished || Date.now()) - s.started) / 1000),
    reason: s.reason || "",
  };
}
