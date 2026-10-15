import type { Question } from "@/lib/prep/types";
import type { VizId } from "./viz-ids";

/** A parsed piece of a lesson body (see lib/learn/markdown.ts for the syntax). */
export type Block =
  | { t: "h2"; text: string; id: string }
  | { t: "h3"; text: string }
  | { t: "p"; text: string }
  | { t: "code"; lang: string; src: string }
  | { t: "list"; ordered: boolean; items: string[] }
  | { t: "task"; items: { done: boolean; text: string }[] }
  | { t: "note"; tone: NoteTone; label: string | null; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "viz"; id: VizId };

/** > **Tip:** / **Pitfall:** / **In the test:** / plain quote */
export type NoteTone = "tip" | "pitfall" | "test" | "note";

export type Level = "core" | "intermediate" | "advanced";

export interface LessonMeta {
  /** URL segment, from the file name without its number */
  id: string;
  /** 1-based position in the subject */
  n: number;
  title: string;
  summary: string;
  level: Level;
  /** reading time, from the word count */
  minutes: number;
  /** the "## Quick check" questions; ids are `<lesson>-<k>`, section = lesson id */
  checks: Question[];
}

export interface Lesson extends LessonMeta {
  blocks: Block[];
}
