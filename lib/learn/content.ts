/* Reads lessons from content/learn/<subject>/ at build time.
   Server-only (node:fs): import it from server pages, never from "use client" files. */
import fs from "node:fs";
import path from "node:path";
import { parseBlocks, parseFrontmatter, readingMinutes, splitChecks } from "./markdown";
import type { Lesson, LessonMeta, Level } from "./types";
import { isVizId } from "./viz-ids";

const ROOT = path.join(process.cwd(), "content", "learn");
const LEVELS: Level[] = ["core", "intermediate", "advanced"];
const cache = new Map<string, Lesson[]>();

export function loadLessons(subject: string): Lesson[] {
  // re-read in dev so edits to the .md files show on refresh
  if (process.env.NODE_ENV === "production" && cache.has(subject)) return cache.get(subject)!;
  const dir = path.join(ROOT, subject);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+-[a-z0-9-]+\.md$/.test(f))
    .sort();
  const lessons = files.map((file, k): Lesson => {
    const where = `content/learn/${subject}/${file}`;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const id = file.replace(/^\d+-/, "").replace(/\.md$/, "");
    for (const key of ["title", "summary", "level"]) if (!meta[key]) throw new Error(`${where}: front matter needs "${key}"`);
    if (!LEVELS.includes(meta.level as Level)) throw new Error(`${where}: level must be one of ${LEVELS.join(", ")}`);
    const { body: blocks, checks } = splitChecks(parseBlocks(body), id, where);
    for (const b of blocks) if (b.t === "viz" && !isVizId(b.id)) throw new Error(`${where}: unknown diagram "${b.id}" (see lib/learn/viz-ids.ts)`);
    return {
      id,
      n: k + 1,
      title: meta.title,
      summary: meta.summary,
      level: meta.level as Level,
      minutes: readingMinutes(body),
      blocks,
      checks,
    };
  });
  cache.set(subject, lessons);
  return lessons;
}

/** Everything but the bodies: for lists, progress and practice sessions. */
export const lessonMetas = (subject: string): LessonMeta[] => loadLessons(subject).map(({ blocks: _, ...meta }) => meta);
