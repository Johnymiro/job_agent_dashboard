/** Shape of a technical-test prep pack. Add a new test by writing one `PrepTest`
 *  under lib/prep/tests/ and listing it in lib/prep/index.ts — the simulator
 *  (mock exam, sprint, drills, coding lab, history) works off this data alone. */

export type SnippetLang = "python" | "js" | "jsx" | "ts" | "tsx" | "sql";
/** react: JSX/TSX on React 18 in a sandboxed frame, tested through the DOM */
export type TaskLang = "python" | "js" | "react";

export interface PrepSection {
  id: string;
  name: string;
  /** 2–4 letter tag shown in drills and chips (PY, FE, RAG…) */
  tag: string;
  blurb: string;
}

export interface Question {
  id: string;
  /** section id */
  s: string;
  /** "multi" = select all that apply, scored all-or-nothing */
  type: "single" | "multi";
  /** stem; supports `code`, **bold** and blank-line paragraphs */
  q: string;
  code?: { lang: SnippetLang; src: string };
  opts: string[];
  /** indexes into `opts` (original order — options are shuffled at runtime) */
  a: number[];
  exp: string;
}

export interface TaskTest {
  name: string;
  /** Python: an expression evaluated after the user's code. JS: an expression, awaited.
   *  React: an expression, awaited, on a fresh render of the user's app, with DOM helpers
   *  ($, $$, text, texts, value, click, type, choose, submit, settle, waitFor, source — see runners.ts). */
  expr: string;
  /** Python: a Python literal as a string ("[1, 2]"). JS and React: the expected JSON value. */
  expected: unknown;
  /** Coderbyte rounds show only the sample tests while you work; hidden ones count when you submit */
  hidden?: boolean;
}

export interface CodingTask {
  id: string;
  lang: TaskLang;
  level: "Easy" | "Medium" | "Hard";
  minutes: number;
  title: string;
  prompt: string;
  starter: string;
  solution: string;
  /** helpers the tests use, run after the user's code (React: before each render, e.g. a fake
   *  fetch; it gets `settle()`, which waits for React to finish updating) */
  setup?: string;
  /** Coderbyte-style program: what `input()` (Python) / `readline()` (JS) returns when it
   *  runs, as a Python literal / JS expression. Tests call `_main(value)` (Python) or
   *  `__main(value)` (JS) to run the whole program on another input and get what it printed. */
  stdin?: string;
  tests: TaskTest[];
}

/** A timed round shaped like a Coderbyte assessment: coding challenges first, then
 *  multiple choice, one clock for everything that can't be paused. */
export interface CoderbyteRound {
  /** short id used in the session (python, react) */
  id: string;
  name: string;
  blurb: string;
  minutes: number;
  /** one challenge is drawn from each pool of task ids, in this order */
  challenges: string[][];
  /** multiple-choice questions drawn per section (unseen and missed first) */
  questions: { section: string; count: number }[];
}

export interface PrepTest {
  /** URL segment: /prep/<slug>; also namespaces this test's browser storage */
  slug: string;
  company: string;
  role: string;
  title: string;
  /** one or two sentences shown under the title */
  summary: string;
  disclaimer?: string;
  /** pass mark in %, drawn as the dashed line on results */
  target: number;
  /** points per coding task (each multiple-choice item is worth 1) */
  taskPoints: number;
  /** timed exam: `perSection` questions from every section plus one task per entry in `tasks` */
  mock?: { minutes: number; perSection: number; tasks: TaskLang[] };
  /** short timed mixed round, no coding */
  sprint?: { minutes: number; count: number };
  /** untimed mixed round with answers after each question, missed ones first */
  review?: { count: number };
  /** Coderbyte-style assessments; each challenge is scored out of `points` */
  coderbyte?: { rounds: CoderbyteRound[]; points: number; tips: string[]; sources: string[] };
  sections: PrepSection[];
  questions: Question[];
  tasks: CodingTask[];
}
