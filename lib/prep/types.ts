/** Shape of a technical-test prep pack. Add a new test by writing one `PrepTest`
 *  under lib/prep/tests/ and listing it in lib/prep/index.ts — the simulator
 *  (mock exam, sprint, drills, coding lab, history) works off this data alone. */

export type SnippetLang = "python" | "js" | "ts" | "sql";
export type TaskLang = "python" | "js";

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
  /** Python: an expression evaluated after the user's code. JS: an expression, awaited. */
  expr: string;
  /** Python: a Python literal as a string ("[1, 2]"). JS: the expected JSON value. */
  expected: unknown;
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
  /** helpers the tests use, run after the user's code */
  setup?: string;
  tests: TaskTest[];
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
  sections: PrepSection[];
  questions: Question[];
  tasks: CodingTask[];
}
