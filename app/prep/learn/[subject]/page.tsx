import { notFound } from "next/navigation";
import { SubjectPage } from "@/components/learn/SubjectPage";
import { lessonMetas } from "@/lib/learn/content";
import { SUBJECTS } from "@/lib/learn/subjects";

export const dynamicParams = false;
export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ subject: s.slug }));
}

export default async function Page({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = SUBJECTS.find((x) => x.slug === subject);
  if (!s) notFound();
  return <SubjectPage subject={s} lessons={lessonMetas(s.slug)} />;
}
