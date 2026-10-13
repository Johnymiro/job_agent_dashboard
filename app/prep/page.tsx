import { PrepIndex } from "@/components/prep/PrepIndex";
import { lessonMetas } from "@/lib/learn/content";
import { SUBJECTS } from "@/lib/learn/subjects";

export default function Page() {
  const subjects = SUBJECTS.map((s) => ({
    ...s,
    lessons: lessonMetas(s.slug).map((l) => ({ id: l.id, title: l.title, checks: l.checks.map((q) => q.id) })),
  }));
  return <PrepIndex subjects={subjects} />;
}
