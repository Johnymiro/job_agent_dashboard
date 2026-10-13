import type { PrepTest } from "@/lib/prep/types";
import type { Subject } from "./subjects";
import type { LessonMeta } from "./types";

/** Storage namespace for a subject's progress (prep.learn-<slug>.*). */
export const practiceSlug = (subject: string) => `learn-${subject}`;

/** A subject's quick checks as a prep "test", so reviews and lesson drills run on the same simulator. */
export function practiceTest(subject: Subject, lessons: LessonMeta[]): PrepTest {
  const withChecks = lessons.filter((l) => l.checks.length);
  return {
    slug: practiceSlug(subject.slug),
    company: subject.name,
    role: "",
    title: `${subject.name} lessons`,
    summary: subject.blurb,
    target: 70,
    taskPoints: 0,
    review: { count: 10 },
    sections: withChecks.map((l) => ({ id: l.id, name: l.title, tag: String(l.n).padStart(2, "0"), blurb: l.summary })),
    questions: withChecks.flatMap((l) => l.checks),
    tasks: [],
  };
}
