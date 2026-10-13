import { notFound } from "next/navigation";
import { LessonView } from "@/components/learn/LessonView";
import { loadLessons } from "@/lib/learn/content";
import { SUBJECTS } from "@/lib/learn/subjects";

// one static page per lesson file
export const dynamicParams = false;
export function generateStaticParams() {
  return SUBJECTS.flatMap((s) => loadLessons(s.slug).map((l) => ({ subject: s.slug, lesson: l.id })));
}

export default async function Page({ params }: { params: Promise<{ subject: string; lesson: string }> }) {
  const { subject, lesson } = await params;
  const s = SUBJECTS.find((x) => x.slug === subject);
  const lessons = s ? loadLessons(s.slug) : [];
  const k = lessons.findIndex((l) => l.id === lesson);
  if (!s || k < 0) notFound();
  const near = (i: number) => (lessons[i] ? { id: lessons[i].id, n: lessons[i].n, title: lessons[i].title } : null);
  return <LessonView subject={s} lesson={lessons[k]} prev={near(k - 1)} next={near(k + 1)} total={lessons.length} />;
}
